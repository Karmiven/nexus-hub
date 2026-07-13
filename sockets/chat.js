const db = require('../config/database');

// Store active users in memory
const activeUsers = new Map(); // socket.id -> username
const usedNicknames = new Set(); // Set of lowercase usernames

// Per-socket rate limiting (min interval between messages)
const MESSAGE_COOLDOWN_MS = 500;
const lastMessageTime = new Map(); // socket.id -> timestamp

// Per-username rate limiting (max messages per minute)
const MAX_MESSAGES_PER_MINUTE = 15;
const userMessageTimestamps = new Map(); // lowercase username -> [timestamps]

// Typing indicator debounce (server-side, prevents spam)
const TYPING_COOLDOWN_MS = 2000;
const lastTypingTime = new Map(); // socket.id -> timestamp

// Moderation: muted nicknames (lowercase) -> unmute timestamp (ms)
const mutedUsers = new Map();
const MAX_MUTE_MINUTES = 1440; // 24h

// Staff check is session-based (not join-based) so it can't be spoofed
function staffRole(socket) {
  const su = socket.request && socket.request.session && socket.request.session.user;
  return su && (su.role === 'admin' || su.role === 'gm') ? su : null;
}

// Audit trail for moderation actions (mirrors utils/adminLog for sockets)
function logModeration(staff, action, details) {
  try {
    db.run(
      'INSERT INTO admin_log (username, action, details, ip) VALUES (?, ?, ?, ?)',
      [staff.username, action, String(details).slice(0, 500), '']
    );
  } catch (e) { /* audit must not break moderation */ }
}

function isCommunityEnabled() {
  try {
    const s = db.getCachedSettings('community_enabled');
    return s.community_enabled !== '0';
  } catch (e) {
    return true;
  }
}

module.exports = function(io) {
  io.on('connection', (socket) => {
    if (!isCommunityEnabled()) {
      socket.emit('chat:error', 'Community chat is disabled.');
      socket.disconnect(true);
      return;
    }

    // Send recent messages on connect (role joined for staff badges)
    const messages = db.all(
      `SELECT m.id, m.username, m.message, m.channel, m.created_at, u.role
       FROM chat_messages m
       LEFT JOIN users u ON u.username = m.username COLLATE NOCASE
       WHERE m.channel = 'general' ORDER BY m.created_at DESC LIMIT 50`
    ).reverse();
    socket.emit('chat:history', messages);

    // Send current online users
    socket.emit('chat:online_users', Array.from(activeUsers.values()));

    // Handle user joining
    socket.on('chat:join', (username, callback) => {
      if (typeof callback !== 'function') return;
      if (!isCommunityEnabled()) return callback({ success: false, error: 'Community chat is disabled.' });
      if (!username) return callback({ success: false, error: 'Nickname is required' });
      
      const sanitizedUsername = String(username).slice(0, 30).replace(/[<>&"'/]/g, '').trim();
      if (!sanitizedUsername || sanitizedUsername.length < 2) {
        return callback({ success: false, error: 'Nickname must be at least 2 characters' });
      }
      
      const lowerUsername = sanitizedUsername.toLowerCase();

      if (usedNicknames.has(lowerUsername)) {
        return callback({ success: false, error: 'Nickname is already taken' });
      }

      // Registered usernames are reserved: only the logged-in owner may use them
      // (prevents impersonation of real accounts, e.g. the admin)
      let userRole = null;
      try {
        const registered = db.get('SELECT username, role FROM users WHERE username = ? COLLATE NOCASE', [sanitizedUsername]);
        if (registered) {
          const sessionUser = socket.request?.session?.user;
          if (!sessionUser || sessionUser.username.toLowerCase() !== lowerUsername) {
            return callback({ success: false, error: 'This nickname belongs to a registered user. Please log in to use it.' });
          }
          userRole = registered.role;
        }
      } catch (e) { /* DB unavailable — fall through, nickname collision still enforced above */ }
      socket.data.role = userRole;
      
      // Register user
      activeUsers.set(socket.id, sanitizedUsername);
      usedNicknames.add(lowerUsername);
      
      // Broadcast updated user list
      io.emit('chat:online_users', Array.from(activeUsers.values()));
      
      callback({ success: true, username: sanitizedUsername });
    });

    // Handle new message
    socket.on('chat:message', (data) => {
      if (!isCommunityEnabled()) return;
      if (!data || typeof data !== 'object') return;

      // Ensure user is joined and using their registered nickname
      const registeredUsername = activeUsers.get(socket.id);
      if (!registeredUsername || registeredUsername !== data.username) return;

      if (!data.message) return;

      // Muted users can't post
      const muteUntil = mutedUsers.get(registeredUsername.toLowerCase());
      if (muteUntil) {
        if (Date.now() < muteUntil) {
          const minLeft = Math.ceil((muteUntil - Date.now()) / 60000);
          socket.emit('chat:error', `You are muted for another ${minLeft} min.`);
          return;
        }
        mutedUsers.delete(registeredUsername.toLowerCase());
      }

      // Rate limit: enforce cooldown between messages
      const now = Date.now();
      const lastTime = lastMessageTime.get(socket.id) || 0;
      if (now - lastTime < MESSAGE_COOLDOWN_MS) return;
      lastMessageTime.set(socket.id, now);

      // Per-username rate limit: max N messages per minute
      const lowerUser = registeredUsername.toLowerCase();
      const timestamps = userMessageTimestamps.get(lowerUser) || [];
      const recentTimestamps = timestamps.filter(t => now - t < 60000);
      if (recentTimestamps.length >= MAX_MESSAGES_PER_MINUTE) {
        socket.emit('chat:error', 'Too many messages. Please slow down.');
        return;
      }
      recentTimestamps.push(now);
      userMessageTimestamps.set(lowerUser, recentTimestamps);

      // Store raw text, escape at display time (client uses textContent)
      const message = String(data.message).slice(0, 500).trim();

      if (!message) return;

      const result = db.run(
        'INSERT INTO chat_messages (username, message, channel) VALUES (?, ?, ?)',
        [registeredUsername, message, 'general']
      );

      const msg = {
        id: result.lastInsertRowid,
        username: registeredUsername,
        message,
        channel: 'general',
        role: socket.data.role || null,
        created_at: new Date().toISOString()
      };

      io.emit('chat:message', msg);

      // Cleanup old messages periodically instead of every message
      // We'll do it roughly every 20 messages to save DB performance
      if (result.lastInsertRowid % 20 === 0) {
        const s = db.getCachedSettings('max_chat_messages');
        // Clamp: a value of 0 would otherwise wipe the entire history below
        const maxMessages = Math.min(Math.max(parseInt(s.max_chat_messages) || 200, 10), 1000);
        // Use OFFSET-based delete instead of NOT IN subquery for better performance
        const oldest = db.get(
          `SELECT id FROM chat_messages WHERE channel = 'general' ORDER BY created_at DESC LIMIT 1 OFFSET ?`,
          [maxMessages]
        );
        if (oldest) {
          db.run(`DELETE FROM chat_messages WHERE channel = 'general' AND id <= ?`, [oldest.id]);
        }
      }
    });

    // ── Moderation: delete a message (admin / GM only) ──
    socket.on('chat:delete', (id, callback) => {
      if (typeof callback !== 'function') callback = () => {};
      const staff = staffRole(socket);
      if (!staff) return callback({ success: false, error: 'Not allowed' });
      const msgId = parseInt(id);
      if (!Number.isInteger(msgId)) return callback({ success: false, error: 'Bad id' });
      const msg = db.get('SELECT id, username, message FROM chat_messages WHERE id = ?', [msgId]);
      if (!msg) return callback({ success: false, error: 'Not found' });
      db.run('DELETE FROM chat_messages WHERE id = ?', [msgId]);
      logModeration(staff, 'chat.delete', `#${msgId} ${msg.username}: ${msg.message.slice(0, 80)}`);
      io.emit('chat:deleted', { id: msgId });
      callback({ success: true });
    });

    // ── Moderation: mute a nickname (admin / GM only) ──
    socket.on('chat:mute', (data, callback) => {
      if (typeof callback !== 'function') callback = () => {};
      const staff = staffRole(socket);
      if (!staff) return callback({ success: false, error: 'Not allowed' });
      if (!data || typeof data !== 'object') return callback({ success: false, error: 'Bad request' });

      const target = String(data.username || '').slice(0, 30).trim();
      const minutes = Math.min(Math.max(parseInt(data.minutes) || 10, 1), MAX_MUTE_MINUTES);
      if (target.length < 2) return callback({ success: false, error: 'Bad username' });

      // Staff can't be muted
      const registered = db.get('SELECT role FROM users WHERE username = ? COLLATE NOCASE', [target]);
      if (registered && (registered.role === 'admin' || registered.role === 'gm')) {
        return callback({ success: false, error: 'Cannot mute staff' });
      }

      const lower = target.toLowerCase();
      mutedUsers.set(lower, Date.now() + minutes * 60000);
      logModeration(staff, 'chat.mute', `${target} for ${minutes} min`);

      // Tell the muted user directly if they're online
      for (const [sockId, name] of activeUsers) {
        if (name.toLowerCase() === lower) {
          io.to(sockId).emit('chat:error', `You have been muted for ${minutes} min.`);
        }
      }
      callback({ success: true, minutes });
    });

    // Handle typing indicator with server-side debounce
    socket.on('chat:typing', () => {
      if (!isCommunityEnabled()) return;
      const registeredUsername = activeUsers.get(socket.id);
      if (!registeredUsername) return;
      const now = Date.now();
      const lastTyping = lastTypingTime.get(socket.id) || 0;
      if (now - lastTyping < TYPING_COOLDOWN_MS) return;
      lastTypingTime.set(socket.id, now);
      socket.broadcast.emit('chat:typing', { username: registeredUsername });
    });

    socket.on('disconnect', () => {
      const username = activeUsers.get(socket.id);
      if (username) {
        activeUsers.delete(socket.id);
        usedNicknames.delete(username.toLowerCase());
        userMessageTimestamps.delete(username.toLowerCase());
        io.emit('chat:online_users', Array.from(activeUsers.values()));
      }
      lastMessageTime.delete(socket.id);
      lastTypingTime.delete(socket.id);
    });
  });
};
