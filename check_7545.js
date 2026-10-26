const { ethers } = require('ethers');

async function test() {
  const p = new ethers.JsonRpcProvider('http://127.0.0.1:7545');
  const net = await p.getNetwork();
  const accs = await p.listAccounts();
  console.log('Ganache Port 7545 Status: ONLINE');
  console.log('Chain ID:', net.chainId.toString());
  console.log('Total Accounts:', accs.length);
  console.log('Authority (Account 0):', accs[0].address);
}

test().catch(console.error);
