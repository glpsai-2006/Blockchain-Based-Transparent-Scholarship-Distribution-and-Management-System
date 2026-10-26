/**
 * ganache_node.js
 * Runs a standalone Ganache EVM node on port 7545
 * Allows ScholarChain browser frontend to connect without installing Ganache desktop!
 */
const ganache = require('ganache');

const PORT = 7545;

const server = ganache.server({
  wallet: {
    totalAccounts: 10,
    defaultBalance: 1000,
    deterministic: true
  },
  chain: {
    chainId: 1337,
    networkId: 1337
  },
  logging: {
    quiet: false,
    verbose: false
  }
});

server.listen(PORT, (err) => {
  if (err) {
    console.error(`Failed to start Ganache on port ${PORT}:`, err);
    process.exit(1);
  }
  console.log('══════════════════════════════════════════════════════════════');
  console.log(`⛓️  Ganache Consortium Blockchain Node running on http://127.0.0.1:${PORT}`);
  console.log('💰 10 Accounts funded with 1000 ETH each (Deterministic)');
  console.log('🌐 CORS Enabled for browser connections');
  console.log('══════════════════════════════════════════════════════════════');
});
