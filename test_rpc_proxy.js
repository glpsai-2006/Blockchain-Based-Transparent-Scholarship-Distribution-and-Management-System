const { ethers } = require('ethers');

async function test() {
  const p = new ethers.JsonRpcProvider('http://localhost:5000/api/rpc');
  const bn = await p.getBlockNumber();
  const accs = await p.listAccounts();
  console.log('RPC Proxy test on http://localhost:5000/api/rpc:');
  console.log('  Block number:', bn);
  console.log('  Accounts count:', accs.length);
  console.log('  Account 0:', accs[0].address);
  console.log('Proxy is 100% working!');
}

test().catch(console.error);
