const net = require('net');
const db = require('../config/database');

/**
 * Check if a TCP port is open on a given host
 * @param {string} host - IP address or hostname
 * @param {number} port - Port number
 * @param {number} timeout - Timeout in ms (default 3000)
 * @returns {Promise<{online: boolean, latency: number}>}
 */
function tcpPing(host, port, timeout = 3000) {
  return new Promise((resolve) => {
    const start = Date.now();
    const socket = new net.Socket();

    socket.setTimeout(timeout);

    socket.on('connect', () => {
      const latency = Date.now() - start;
      socket.destroy();
      resolve({ online: true, latency });
    });

    socket.on('timeout', () => {
      socket.destroy();
      resolve({ online: false, latency: -1 });
    });

    socket.on('error', () => {
      socket.destroy();
      resolve({ online: false, latency: -1 });
    });

    socket.connect(port, host);
  });
}

/**
 * Query Minecraft server for player count (basic protocol)
 * Sends a Server List Ping packet and parses the response
 */
function queryMinecraft(host, port, timeout = 5000) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    socket.setTimeout(timeout);

    let data = Buffer.alloc(0);

    socket.on('connect', () => {
      // Minecraft Server List Ping - legacy ping (works on most servers)
      // Handshake packet
      const hostBuf = Buffer.from(host, 'utf8');
      const handshake = Buffer.alloc(7 + hostBuf.length);
      let offset = 0;

      // Packet ID (0x00)
      handshake[offset++] = 0x00;
      // Protocol version (varint: 47 for 1.8+)
      handshake[offset++] = 47;
      // Host string length (varint)
      handshake[offset++] = hostBuf.length;
      hostBuf.copy(handshake, offset);
      offset += hostBuf.length;
      // Port (unsigned short, big endian)
      handshake.writeUInt16BE(port, offset);
      offset += 2;
      // Next state: 1 (status)
      handshake[offset++] = 0x01;

      // Send handshake with length prefix
      const hsLen = Buffer.alloc(1);
      hsLen[0] = offset;
      socket.write(Buffer.concat([hsLen, handshake.slice(0, offset)]));

      // Send status request (packet id 0x00, length 1)
      socket.write(Buffer.from([0x01, 0x00]));
    });

    socket.on('data', (chunk) => {
      data = Buffer.concat([data, chunk]);

      try {
        // Try to parse the JSON response from the status packet
        const str = data.toString('utf8');
        const jsonStart = str.indexOf('{');
        const jsonEnd = str.lastIndexOf('}');
        if (jsonStart !== -1 && jsonEnd !== -1) {
          const json = JSON.parse(str.substring(jsonStart, jsonEnd + 1));
          socket.destroy();
          resolve({
            online: true,
            players: json.players?.online || 0,
            maxPlayers: json.players?.max || 0,
            version: json.version?.name || 'Unknown',
            motd: typeof json.description === 'string'
              ? json.description
              : json.description?.text || ''
          });
        }
      } catch (e) {
        // Still accumulating data
      }
    });

    socket.on('timeout', () => {
      socket.destroy();
      resolve({ online: false, players: 0, maxPlayers: 0 });
    });

    socket.on('error', () => {
      socket.destroy();
      resolve({ online: false, players: 0, maxPlayers: 0 });
    });
  });
}

/**
 * Check all servers in database and update their status
 */
async function checkAllServers() {
  const servers = db.all('SELECT * FROM servers');

  for (const srv of servers) {
    try {
      let status = 'offline';
      let playerCount = 0;
      let maxPlayers = 0;

      // Always do a TCP ping first to check if port is open
      const ping = await tcpPing(srv.ip, srv.port);
      status = ping.online ? 'online' : 'offline';

      // If online and it's a Minecraft server, try to get player count
      if (ping.online && srv.game.toLowerCase().includes('minecraft') && srv.show_player_count) {
        try {
          const mc = await queryMinecraft(srv.ip, srv.port);
          if (mc.online) {
            playerCount = mc.players || 0;
            maxPlayers = mc.maxPlayers || 0;
          }
        } catch (mcErr) {
          console.error(`Minecraft query failed for ${srv.name}:`, mcErr.message);
        }
      }

      db.run(
        'UPDATE servers SET status = ?, player_count = ?, max_players = ?, last_checked = CURRENT_TIMESTAMP WHERE id = ?',
        [status, playerCount, maxPlayers, srv.id]
      );
    } catch (err) {
      console.error(`Error checking server ${srv.name}:`, err.message);
      db.run(
        'UPDATE servers SET status = ?, player_count = ?, max_players = ?, last_checked = CURRENT_TIMESTAMP WHERE id = ?',
        ['offline', 0, 0, srv.id]
      );
    }
  }
}

/**
 * Start periodic status checking
 */
function startStatusChecker() {
  const intervalSetting = db.get("SELECT value FROM settings WHERE key = 'status_check_interval'");
  const intervalSeconds = parseInt(intervalSetting?.value) || 60;

  // Check immediately on start
  checkAllServers().then(() => {
    console.log('✅ Initial server status check complete');
  });

  // Then check periodically
  setInterval(() => {
    checkAllServers();
  }, intervalSeconds * 1000);

  console.log(`📡 Status checker running every ${intervalSeconds}s`);
}

module.exports = { tcpPing, queryMinecraft, checkAllServers, startStatusChecker };
