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
 * Encode an integer as a Minecraft protocol VarInt
 */
function writeVarInt(value) {
  const bytes = [];
  do {
    let temp = value & 0x7F;
    value >>>= 7;
    if (value !== 0) temp |= 0x80;
    bytes.push(temp);
  } while (value !== 0);
  return Buffer.from(bytes);
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
      // Minecraft Server List Ping (1.7+ protocol)
      // Handshake packet: [packet id 0x00][protocol varint][host len varint][host][port u16][next state 0x01]
      const hostBuf = Buffer.from(host, 'utf8');
      const portBuf = Buffer.alloc(2);
      portBuf.writeUInt16BE(port, 0);
      const handshake = Buffer.concat([
        Buffer.from([0x00]),      // Packet ID
        writeVarInt(47),          // Protocol version (47 = 1.8+)
        writeVarInt(hostBuf.length),
        hostBuf,
        portBuf,
        Buffer.from([0x01])       // Next state: status
      ]);

      // Send handshake with varint length prefix
      socket.write(Buffer.concat([writeVarInt(handshake.length), handshake]));

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
 * Check all servers in database and update their status (in parallel)
 * Pings are done concurrently, then all DB updates run in a single transaction.
 */
async function checkAllServers() {
  const servers = db.all('SELECT * FROM servers');
  if (!servers.length) return;

  // 1. Collect results in parallel (network I/O)
  const updates = await Promise.allSettled(
    servers.map(async (srv) => {
      try {
        let status = 'offline';
        let playerCount = 0;
        let maxPlayers = 0;

        const ping = await tcpPing(srv.ip, srv.port);
        status = ping.online ? 'online' : 'offline';

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

        return { id: srv.id, status, playerCount, maxPlayers };
      } catch (err) {
        console.error(`Error checking server ${srv.name}:`, err.message);
        return { id: srv.id, status: 'offline', playerCount: 0, maxPlayers: 0 };
      }
    })
  );

  // 2. Batch all DB writes in a single transaction
  const batchUpdate = db.transaction((rows) => {
    for (const result of rows) {
      if (result.status !== 'fulfilled') continue;
      const { id, status, playerCount, maxPlayers } = result.value;
      db.run(
        'UPDATE servers SET status = ?, player_count = ?, max_players = ?, last_checked = CURRENT_TIMESTAMP WHERE id = ?',
        [status, playerCount, maxPlayers, id]
      );
    }
  });

  batchUpdate(updates);

  // 3. Log status history for analytics (separate transaction to not break updates)
  try {
    const serverMap = {};
    for (const srv of servers) serverMap[srv.id] = srv.name;

    const batchLog = db.transaction((rows) => {
      for (const result of rows) {
        if (result.status !== 'fulfilled') continue;
        const { id, status, playerCount } = result.value;
        db.run(
          'INSERT INTO server_status_log (server_id, server_name, status, player_count) VALUES (?, ?, ?, ?)',
          [id, serverMap[id] || 'Unknown', status, playerCount]
        );
      }
    });
    batchLog(updates);
  } catch (e) {
    // Analytics logging should never break the status checker
  }
}

/**
 * Start periodic status checking
 */
function startStatusChecker() {
  const s = db.getCachedSettings('status_check_interval');
  const intervalSeconds = Math.max(parseInt(s.status_check_interval) || 60, 10);

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

module.exports = { tcpPing, checkAllServers, startStatusChecker };
