const db = require('../config/database');

module.exports = function(io) {
  io.on('connection', (socket) => {

    // Send recent messages on connect
    const messages = db.all(
      "SELECT * FROM chat_messages WHERE channel = 'general' ORDER BY created_at DESC LIMIT 50"
    ).reverse();
    socket.emit('chat:history', messages);

    // Handle new message
    socket.on('chat:message', (data) => {
      if (!data.username || !data.message) return;

      // Sanitize
      const username = String(data.username).slice(0, 30).replace(/[<>]/g, '');
      const message = String(data.message).slice(0, 500).replace(/[<>]/g, '');

      if (!message.trim()) return;

      const result = db.run(
        'INSERT INTO chat_messages (username, message, channel) VALUES (?, ?, ?)',
        [username, message, 'general']
      );

      const msg = {
        id: result.lastInsertRowid,
        username,
        message,
        channel: 'general',
        created_at: new Date().toISOString()
      };

      io.emit('chat:message', msg);

      // Cleanup old messages — single efficient DELETE
      const maxMessages = parseInt(
        db.get("SELECT value FROM settings WHERE key = 'max_chat_messages'")?.value || '200'
      );
      db.run(
        `DELETE FROM chat_messages WHERE channel = 'general' AND id NOT IN (
          SELECT id FROM chat_messages WHERE channel = 'general' ORDER BY created_at DESC LIMIT ?
        )`,
        [maxMessages]
      );
    });

    // Handle typing indicator
    socket.on('chat:typing', (data) => {
      socket.broadcast.emit('chat:typing', { username: data.username });
    });

    socket.on('disconnect', () => {});
  });
};
