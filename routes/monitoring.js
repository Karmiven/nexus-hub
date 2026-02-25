const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { ResourceMonitorManager } = require('../utils/resourceMonitor');

// Initialize monitoring manager
const monitorManager = new ResourceMonitorManager();

// Initialize with existing servers
function initializeMonitoring() {
  const servers = db.all('SELECT * FROM servers');
  servers.forEach(server => {
    // Register server with monitoring endpoint
    // In production, this would be the actual monitoring endpoint
    const endpoint = `http://${server.ip}:${server.port + 1000}/metrics`;
    monitorManager.registerServer(server.id, endpoint);
  });
}

// Get all resource metrics (JSON API)
router.get('/resources', async (req, res) => {
  try {
    // Update metrics for all servers
    const metrics = await monitorManager.getAllMetrics();
    const stats = monitorManager.getAggregatedStats();
    
    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      stats,
      servers: metrics
    });
  } catch (err) {
    console.error('Resource monitoring error:', err);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch resource metrics'
    });
  }
});

// Get metrics for specific server
router.get('/resources/:serverId', async (req, res) => {
  try {
    const serverId = parseInt(req.params.serverId);
    const metrics = await monitorManager.fetchServerMetrics(serverId);
    
    if (!metrics) {
      return res.status(404).json({
        success: false,
        error: 'Server not found or offline'
      });
    }
    
    res.json({
      success: true,
      serverId,
      timestamp: new Date().toISOString(),
      metrics
    });
  } catch (err) {
    console.error('Server metrics error:', err);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch server metrics'
    });
  }
});

// Monitoring dashboard page
router.get('/dashboard', (req, res) => {
  const servers = db.all('SELECT * FROM servers ORDER BY sort_order ASC');
  res.render('monitoring/dashboard', {
    title: 'Resource Monitoring',
    servers
  });
});

// Initialize monitoring after database is ready
module.exports = { router, monitorManager, initMonitoring: initializeMonitoring };
