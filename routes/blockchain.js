/**
 * routes/blockchain.js
 * Endpoints for contract info, audit logs, and chain configuration
 */
const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const db = require('../database/db');
const { authenticateToken } = require('../middleware/auth');

// Get contract ABI and Bytecode
router.get('/contract-artifact', (req, res) => {
  try {
    const buildDir = path.join(__dirname, '..', 'build');
    const binFile = path.join(buildDir, 'ScholarshipSystem.bin');
    const jsonFile = path.join(buildDir, 'ScholarshipSystem.json');

    if (!fs.existsSync(binFile) || !fs.existsSync(jsonFile)) {
      return res.status(404).json({ success: false, message: 'Contract build artifacts not found. Please compile first.' });
    }

    const bytecode = fs.readFileSync(binFile, 'utf8').trim();
    const abi = JSON.parse(fs.readFileSync(jsonFile, 'utf8'));

    res.json({
      success: true,
      contractName: 'ScholarshipSystem',
      compiler: 'solc ^0.8.20',
      bytecode,
      abi
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Get or Save Latest Deployed Contract Address
router.get('/config', (req, res) => {
  const latest = db.getLatestContract();
  res.json({
    success: true,
    contract: latest,
    defaultRpc: process.env.GANACHE_RPC || 'http://127.0.0.1:7545'
  });
});

router.post('/config', authenticateToken, (req, res) => {
  const { contractAddress, networkRpc } = req.body;
  if (!contractAddress || !contractAddress.startsWith('0x')) {
    return res.status(400).json({ success: false, message: 'Valid contract address is required.' });
  }

  db.saveContractConfig({
    contractAddress,
    networkRpc: networkRpc || 'http://127.0.0.1:7545',
    deployedBy: req.user.id
  });

  db.logActivity({
    userId: req.user.id,
    action: 'CONTRACT_CONFIGURED',
    detail: `Contract address configured: ${contractAddress}`
  });

  res.json({ success: true, message: 'Contract address saved successfully!' });
});

// System Activity Logs (Audit View)
router.get('/activity-logs', authenticateToken, (req, res) => {
  const logs = db.getActivityLogs();
  res.json({ success: true, logs });
});

module.exports = router;
