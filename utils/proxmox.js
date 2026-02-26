const https = require('https');
const http = require('http');

/**
 * Proxmox VE API Client
 * Uses /cluster/resources (needs Sys.Audit on /) or per-VM endpoints (VM.Audit).
 */
class ProxmoxClient {
  constructor(config = {}) {
    this.host = config.host || '';
    this.port = config.port || 8006;
    this.tokenId = config.tokenId || '';
    this.tokenSecret = config.tokenSecret || '';
    this.node = config.node || '';
    this.verifySsl = config.verifySsl || false;
    this.timeout = config.timeout || 10000;
  }

  isConfigured() {
    return !!(this.host && this.tokenId && this.tokenSecret);
  }

  /** Raw HTTP(S) request to Proxmox API */
  _request(method, apiPath) {
    return new Promise((resolve, reject) => {
      if (!this.isConfigured()) {
        return reject(new Error('Proxmox API not configured'));
      }

      const url = `/api2/json${apiPath}`;
      const options = {
        hostname: this.host,
        port: this.port,
        path: url,
        method,
        headers: {
          'Authorization': `PVEAPIToken=${this.tokenId}=${this.tokenSecret}`,
          'Accept': 'application/json'
        },
        rejectUnauthorized: this.verifySsl,
        timeout: this.timeout
      };

      const proto = this.port === 80 ? http : https;
      const req = proto.request(options, (res) => {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => {
          try {
            const json = JSON.parse(body);
            if (res.statusCode >= 200 && res.statusCode < 300) {
              resolve(json.data);
            } else {
              reject(new Error(`Proxmox API ${res.statusCode}: ${JSON.stringify(json.errors || json)}`));
            }
          } catch (e) {
            reject(new Error(`Proxmox API parse error: ${body.substring(0, 200)}`));
          }
        });
      });

      req.on('error', (err) => reject(new Error(`Proxmox connection error: ${err.message}`)));
      req.on('timeout', () => { req.destroy(); reject(new Error('Proxmox API request timeout')); });
      req.end();
    });
  }

  /** Auto-detect node name via /cluster/resources */
  async _resolveNode() {
    if (this.node) return this.node;
    try {
      const resources = await this._request('GET', '/cluster/resources?type=node');
      if (resources && resources.length > 0) {
        this.node = resources[0].node;
        return this.node;
      }
    } catch (e) { /* fallback below */ }

    // Fallback: try /nodes (requires Sys.Audit on /nodes)
    try {
      const nodes = await this._request('GET', '/nodes');
      if (nodes && nodes.length > 0) {
        this.node = nodes[0].node;
        return this.node;
      }
    } catch (e) { /* fallback below */ }

    throw new Error('Cannot auto-detect node name. Please specify it manually in settings.');
  }

  /**
   * Test connection and return detected node names for auto-fill.
   * Only returns success/fail and list of node names.
   */
  async testConnection() {
    try {
      // Try cluster resources first (lower privilege requirement)
      const resources = await this._request('GET', '/cluster/resources');
      const nodes = resources.filter(r => r.type === 'node').map(r => r.node);
      return { success: true, nodes };
    } catch (err) {
      // Fallback: try /version which needs minimal permissions
      try {
        await this._request('GET', '/version');
        return { success: true, nodes: [] };
      } catch (e2) {
        return { success: false, error: err.message };
      }
    }
  }

  /**
   * Discover all guests (LXC + QEMU) visible to this token.
   * Strategy:
   *   1. Try /cluster/resources — best if token has Datacenter-level audit perms
   *   2. Fallback: enumerate each online node via /nodes/{node}/lxc + /nodes/{node}/qemu
   *      (works with privilege-separated tokens that only have VM.Audit per node)
   */
  async discoverGuests() {
    // ── Strategy 1: /cluster/resources (fast, single call) ──
    try {
      const resources = await this._request('GET', '/cluster/resources');
      const guests = (resources || [])
        .filter(r => r.type === 'lxc' || r.type === 'qemu')
        .map(r => ({
          vmid: r.vmid,
          name: r.name || (r.type === 'lxc' ? `CT ${r.vmid}` : `VM ${r.vmid}`),
          type: r.type,
          status: r.status,
          node: r.node,
          cpus: r.maxcpu || 0,
          maxmem: r.maxmem || 0,
          maxdisk: r.maxdisk || 0
        }));

      if (guests.length > 0) {
        return guests.sort((a, b) => a.node.localeCompare(b.node) || a.vmid - b.vmid);
      }

      // /cluster/resources returned only nodes — token likely has privilege separation.
      // Extract online nodes and fall through to Strategy 2.
      const onlineNodes = (resources || [])
        .filter(r => r.type === 'node' && r.status === 'online')
        .map(r => r.node);

      if (onlineNodes.length > 0) {
        return this._discoverGuestsPerNode(onlineNodes);
      }
    } catch (e) {
      // /cluster/resources failed entirely — still try per-node
    }

    // ── Strategy 2: per-node enumeration ──
    // Need at least one node name
    const nodes = await this._getOnlineNodeNames();
    if (nodes.length === 0) {
      throw new Error('No online nodes found. Check token permissions or specify node name manually.');
    }
    return this._discoverGuestsPerNode(nodes);
  }

  /**
   * Get list of online node names (tries /nodes endpoint, falls back to configured node)
   */
  async _getOnlineNodeNames() {
    try {
      const nodeList = await this._request('GET', '/nodes');
      const online = (nodeList || [])
        .filter(n => n.status === 'online')
        .map(n => n.node);
      if (online.length > 0) return online;
    } catch (e) { /* fallback */ }

    // Last resort: use configured node name
    if (this.node) return [this.node];
    return [];
  }

  /**
   * Discover guests by listing /nodes/{node}/lxc and /nodes/{node}/qemu per node.
   * Works with privilege-separated tokens that have VM.Audit on /vms/{vmid}.
   */
  async _discoverGuestsPerNode(nodeNames) {
    const allGuests = [];

    for (const nodeName of nodeNames) {
      // LXC containers
      try {
        const containers = await this._request('GET', `/nodes/${nodeName}/lxc`);
        for (const ct of (containers || [])) {
          allGuests.push({
            vmid: ct.vmid,
            name: ct.name || `CT ${ct.vmid}`,
            type: 'lxc',
            status: ct.status || 'unknown',
            node: nodeName,
            cpus: ct.cpus || ct.maxcpu || 0,
            maxmem: ct.maxmem || 0,
            maxdisk: ct.maxdisk || 0
          });
        }
      } catch (e) { /* no permission or node issue — skip */ }

      // QEMU VMs
      try {
        const vms = await this._request('GET', `/nodes/${nodeName}/qemu`);
        for (const vm of (vms || [])) {
          allGuests.push({
            vmid: vm.vmid,
            name: vm.name || `VM ${vm.vmid}`,
            type: 'qemu',
            status: vm.status || 'unknown',
            node: nodeName,
            cpus: vm.cpus || vm.maxcpu || 0,
            maxmem: vm.maxmem || 0,
            maxdisk: vm.maxdisk || 0
          });
        }
      } catch (e) { /* no permission or node issue — skip */ }
    }

    return allGuests.sort((a, b) => a.node.localeCompare(b.node) || a.vmid - b.vmid);
  }

  /**
   * Get status for a single LXC container
   */
  async getLxcStatus(node, vmid) {
    const ct = await this._request('GET', `/nodes/${node}/lxc/${vmid}/status/current`);
    return {
      vmid: ct.vmid || vmid,
      name: ct.name || `CT ${vmid}`,
      status: ct.status || 'unknown',
      cpu: (ct.cpu || 0) * 100,
      cpus: ct.cpus || 0,
      mem: ct.mem || 0,
      maxmem: ct.maxmem || 0,
      memUsage: ct.maxmem ? ((ct.mem / ct.maxmem) * 100) : 0,
      uptime: ct.uptime || 0,
      netin: ct.netin || 0,
      netout: ct.netout || 0,
      disk: ct.disk || 0,
      maxdisk: ct.maxdisk || 0,
      type: 'lxc',
      node
    };
  }

  /**
   * Get status for a single QEMU VM
   */
  async getQemuStatus(node, vmid) {
    const vm = await this._request('GET', `/nodes/${node}/qemu/${vmid}/status/current`);
    return {
      vmid: vm.vmid || vmid,
      name: vm.name || `VM ${vmid}`,
      status: vm.status || 'unknown',
      cpu: (vm.cpu || 0) * 100,
      cpus: vm.cpus || 0,
      mem: vm.mem || 0,
      maxmem: vm.maxmem || 0,
      memUsage: vm.maxmem ? ((vm.mem / vm.maxmem) * 100) : 0,
      uptime: vm.uptime || 0,
      netin: vm.netin || 0,
      netout: vm.netout || 0,
      disk: vm.disk || 0,
      maxdisk: vm.maxdisk || 0,
      type: 'qemu',
      node
    };
  }

  /**
   * Get status for a list of selected guests
   * @param {Array} selectedGuests - [{vmid, type, node}]
   */
  async getSelectedGuestsStatus(selectedGuests) {
    const results = await Promise.allSettled(
      selectedGuests.map(g => {
        const n = g.node || this.node;
        if (g.type === 'lxc') return this.getLxcStatus(n, g.vmid);
        if (g.type === 'qemu') return this.getQemuStatus(n, g.vmid);
        return Promise.reject(new Error(`Unknown type: ${g.type}`));
      })
    );

    return results.map((r, i) => {
      if (r.status === 'fulfilled') return r.value;
      // Return a stub for failed queries
      return {
        vmid: selectedGuests[i].vmid,
        name: selectedGuests[i].name || `ID ${selectedGuests[i].vmid}`,
        type: selectedGuests[i].type,
        node: selectedGuests[i].node || this.node,
        status: 'error',
        error: r.reason?.message || 'Unknown error',
        cpu: 0, cpus: 0, mem: 0, maxmem: 0, memUsage: 0,
        uptime: 0, netin: 0, netout: 0, disk: 0, maxdisk: 0
      };
    });
  }
}

module.exports = { ProxmoxClient };
