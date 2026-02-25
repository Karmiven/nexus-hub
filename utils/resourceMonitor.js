const os = require('os');
const fs = require('fs');
const path = require('path');

/**
 * Resource Monitor Agent - Runs on each server to collect metrics
 * This would be deployed to each Proxmox VM/server
 */
class ResourceMonitor {
  constructor(serverId, config = {}) {
    this.serverId = serverId;
    this.config = {
      interval: config.interval || 30000, // 30 seconds
      dataRetention: config.dataRetention || 24 * 60 * 60 * 1000, // 24 hours
      ...config
    };
    this.metrics = [];
    this.isRunning = false;
    this.intervalId = null;
  }

  /**
   * Collect current system metrics
   */
  collectMetrics() {
    const cpus = os.cpus();
    const loadAvg = os.loadavg();
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    
    // Get disk usage (simplified - in production use proper disk stats)
    let diskUsage = 0;
    try {
      const stats = fs.statSync('.');
      // This is simplified - real implementation would use proper disk space checking
      diskUsage = Math.random() * 100; // Placeholder
    } catch (err) {
      diskUsage = 0;
    }

    const metrics = {
      timestamp: Date.now(),
      serverId: this.serverId,
      cpu: {
        usage: this.calculateCPUUsage(),
        cores: cpus.length,
        loadAverage: loadAvg[0],
        model: cpus[0].model
      },
      memory: {
        total: totalMem,
        used: usedMem,
        free: freeMem,
        usage: (usedMem / totalMem) * 100
      },
      disk: {
        usage: diskUsage,
        free: 100 - diskUsage
      },
      uptime: os.uptime(),
      platform: os.platform(),
      arch: os.arch()
    };

    this.metrics.push(metrics);
    this.cleanupOldData();
    return metrics;
  }

  /**
   * Calculate CPU usage percentage
   */
  calculateCPUUsage() {
    const cpus = os.cpus();
    let totalIdle = 0;
    let totalTick = 0;

    cpus.forEach(cpu => {
      for (const type in cpu.times) {
        totalTick += cpu.times[type];
      }
      totalIdle += cpu.times.idle;
    });

    return ((totalTick - totalIdle) / totalTick) * 100;
  }

  /**
   * Clean up old metrics data
   */
  cleanupOldData() {
    const cutoff = Date.now() - this.config.dataRetention;
    this.metrics = this.metrics.filter(m => m.timestamp > cutoff);
  }

  /**
   * Start monitoring
   */
  start() {
    if (this.isRunning) return;
    
    this.isRunning = true;
    console.log(`📊 Resource monitoring started for server ${this.serverId}`);
    
    // Collect initial metrics
    this.collectMetrics();
    
    // Set up interval
    this.intervalId = setInterval(() => {
      this.collectMetrics();
    }, this.config.interval);
  }

  /**
   * Stop monitoring
   */
  stop() {
    if (!this.isRunning) return;
    
    this.isRunning = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    console.log(`⏹️ Resource monitoring stopped for server ${this.serverId}`);
  }

  /**
   * Get latest metrics
   */
  getLatestMetrics() {
    return this.metrics[this.metrics.length - 1] || null;
  }

  /**
   * Get metrics history
   */
  getMetricsHistory(limit = 100) {
    return this.metrics.slice(-limit);
  }

  /**
   * Export metrics as JSON for API transmission
   */
  exportMetrics() {
    return {
      serverId: this.serverId,
      timestamp: Date.now(),
      current: this.getLatestMetrics(),
      history: this.getMetricsHistory(50)
    };
  }
}

/**
 * Central Resource Monitor Manager
 * Collects metrics from all servers via HTTP API
 */
class ResourceMonitorManager {
  constructor() {
    this.servers = new Map();
    this.lastUpdate = new Map();
  }

  /**
   * Register a server for monitoring
   */
  registerServer(serverId, endpoint) {
    this.servers.set(serverId, {
      id: serverId,
      endpoint: endpoint,
      lastCheck: null,
      status: 'unknown',
      metrics: null
    });
  }

  /**
   * Fetch metrics from a server
   */
  async fetchServerMetrics(serverId) {
    const server = this.servers.get(serverId);
    if (!server) return null;

    try {
      // In production, this would make HTTP request to server's monitoring endpoint
      // For now, simulate with local metrics
      const monitor = new ResourceMonitor(serverId);
      const metrics = monitor.collectMetrics();
      
      server.lastCheck = new Date();
      server.status = 'online';
      server.metrics = metrics;
      
      return metrics;
    } catch (err) {
      server.status = 'offline';
      server.lastCheck = new Date();
      console.error(`Failed to fetch metrics from ${serverId}:`, err.message);
      return null;
    }
  }

  /**
   * Get all server metrics
   */
  async getAllMetrics() {
    const results = {};
    
    for (const [serverId, server] of this.servers) {
      results[serverId] = {
        id: serverId,
        status: server.status,
        lastCheck: server.lastCheck,
        metrics: server.metrics
      };
    }
    
    return results;
  }

  /**
   * Get aggregated statistics
   */
  getAggregatedStats() {
    const stats = {
      totalServers: this.servers.size,
      onlineServers: 0,
      offlineServers: 0,
      totalCPU: 0,
      totalMemory: 0,
      averageCPU: 0,
      averageMemory: 0
    };

    for (const [serverId, server] of this.servers) {
      if (server.status === 'online' && server.metrics) {
        stats.onlineServers++;
        stats.totalCPU += server.metrics.cpu.usage;
        stats.totalMemory += server.metrics.memory.usage;
      } else {
        stats.offlineServers++;
      }
    }

    if (stats.onlineServers > 0) {
      stats.averageCPU = stats.totalCPU / stats.onlineServers;
      stats.averageMemory = stats.totalMemory / stats.onlineServers;
    }

    return stats;
  }
}

module.exports = { ResourceMonitor, ResourceMonitorManager };
