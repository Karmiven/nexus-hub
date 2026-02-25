const db = require('../config/database');

module.exports = function(io) {
  io.on('connection', (socket) => {
    console.log('💬 User connected to chat:', socket.id);

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

      // Cleanup old messages (keep only latest maxMessages)
      const maxMessages = parseInt(
        db.get("SELECT value FROM settings WHERE key = 'max_chat_messages'")?.value || '200'
      );
      const allMessages = db.all(
        "SELECT id FROM chat_messages WHERE channel = 'general' ORDER BY created_at DESC"
      );
      if (allMessages.length > maxMessages) {
        const idsToDelete = allMessages.slice(maxMessages).map(m => m.id);
        if (idsToDelete.length > 0) {
          const placeholders = idsToDelete.map(() => '?').join(',');
          db.run(
            `DELETE FROM chat_messages WHERE id IN (${placeholders})`,
            idsToDelete
          );
        }
      }
    });

    // Handle typing indicator
    socket.on('chat:typing', (data) => {
      socket.broadcast.emit('chat:typing', { username: data.username });
    });

    socket.on('disconnect', () => {
      console.log('💬 User disconnected:', socket.id);
    });
  });
};
