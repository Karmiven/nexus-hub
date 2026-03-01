const db = require('../config/database');

// Store active users in memory
const activeUsers = new Map(); // socket.id -> username
const usedNicknames = new Set(); // Set of lowercase usernames

// Simple per-socket rate limiting for messages
const MESSAGE_COOLDOWN_MS = 500; // min 500ms between messages
const lastMessageTime = new Map(); // socket.id -> timestamp

module.exports = function(io) {
  io.on('connection', (socket) => {

    // Send recent messages on connect
    const messages = db.all(
      "SELECT * FROM chat_messages WHERE channel = 'general' ORDER BY created_at DESC LIMIT 50"
    ).reverse();
    socket.emit('chat:history', messages);

    // Send current online users
    socket.emit('chat:online_users', Array.from(usedNicknames));

    // Handle user joining
    socket.on('chat:join', (username, callback) => {
      if (typeof callback !== 'function') return;
      if (!username) return callback({ success: false, error: 'Nickname is required' });
      
      const sanitizedUsername = String(username).slice(0, 30).replace(/[<>&"'/]/g, '').trim();
      if (!sanitizedUsername || sanitizedUsername.length < 2) {
        return callback({ success: false, error: 'Nickname must be at least 2 characters' });
      }
      
      const lowerUsername = sanitizedUsername.toLowerCase();
      
      if (usedNicknames.has(lowerUsername)) {
        return callback({ success: false, error: 'Nickname is already taken' });
      }
      
      // Register user
      activeUsers.set(socket.id, sanitizedUsername);
      usedNicknames.add(lowerUsername);
      
      // Broadcast updated user list
      io.emit('chat:online_users', Array.from(activeUsers.values()));
      
      callback({ success: true, username: sanitizedUsername });
    });

    // Handle new message
    socket.on('chat:message', (data) => {
      // Ensure user is joined and using their registered nickname
      const registeredUsername = activeUsers.get(socket.id);
      if (!registeredUsername || registeredUsername !== data.username) return;

      if (!data.message) return;

      // Rate limit: enforce cooldown between messages
      const now = Date.now();
      const lastTime = lastMessageTime.get(socket.id) || 0;
      if (now - lastTime < MESSAGE_COOLDOWN_MS) return;
      lastMessageTime.set(socket.id, now);

      // Sanitize
      const message = String(data.message).slice(0, 500).replace(/[<>&"'/]/g, c => {
        const entities = { '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&#39;', '/': '&#x2F;' };
        return entities[c] || c;
      });

      if (!message.trim()) return;

      const result = db.run(
        'INSERT INTO chat_messages (username, message, channel) VALUES (?, ?, ?)',
        [registeredUsername, message, 'general']
      );

      const msg = {
        id: result.lastInsertRowid,
        username: registeredUsername,
        message,
        channel: 'general',
        created_at: new Date().toISOString()
      };

      io.emit('chat:message', msg);

      // Cleanup old messages periodically instead of every message
      // We'll do it roughly every 20 messages to save DB performance
      if (result.lastInsertRowid % 20 === 0) {
        const maxMessages = parseInt(
          db.get("SELECT value FROM settings WHERE key = 'max_chat_messages'")?.value || '200'
        );
        db.run(
          `DELETE FROM chat_messages WHERE channel = 'general' AND id NOT IN (
            SELECT id FROM chat_messages WHERE channel = 'general' ORDER BY created_at DESC LIMIT ?
          )`,
          [maxMessages]
        );
      }
    });

    // Handle typing indicator
    socket.on('chat:typing', () => {
      const registeredUsername = activeUsers.get(socket.id);
      if (registeredUsername) {
        socket.broadcast.emit('chat:typing', { username: registeredUsername });
      }
    });

    socket.on('disconnect', () => {
      const username = activeUsers.get(socket.id);
      if (username) {
        activeUsers.delete(socket.id);
        usedNicknames.delete(username.toLowerCase());
        io.emit('chat:online_users', Array.from(activeUsers.values()));
      }
      lastMessageTime.delete(socket.id);
    });
  });
};
