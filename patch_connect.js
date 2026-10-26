const fs = require('fs');
const path = require('path');

const htmlFile = path.join(__dirname, 'ScholarChain.html');
let html = fs.readFileSync(htmlFile, 'utf8');

const targetFunction = `async function connectWallet() {
  const rpc = (document.getElementById('overlay-rpc')?.value ||
               document.getElementById('rpc-input').value || 'http://127.0.0.1:7545').trim();
  document.getElementById('rpc-input').value = rpc;
  try {
    provider = new ethers.JsonRpcProvider(rpc);
    await provider.getBlockNumber();
    accounts = await provider.listAccounts();
    if (!accounts.length) { toast('No accounts in Ganache!','error'); return; }
    currentAccount = accounts[0];
    signer = await provider.getSigner(currentAccount.address || currentAccount);

    // Try to reload saved contract
    try {
      const saved = localStorage.getItem('scholarchain_addr');
      if (saved) { contractAddress = saved; await initContract(saved); }
    } catch(e) { /* localStorage unavailable */ }

    document.getElementById('overlay').style.display = 'none';
    document.getElementById('account-pill').style.display = 'flex';
    document.getElementById('demo-btn').style.display = 'flex';
    updateAccountUI();
    await refreshDashboard();
    toast('Connected to Ganache!','success');
  } catch(err) {
    toast('Connection failed: ' + err.message, 'error', 8000);
  }
}`;

const improvedFunction = `async function connectWallet() {
  let rpc = (document.getElementById('overlay-rpc')?.value ||
             document.getElementById('rpc-input').value || 'http://127.0.0.1:7545').trim();
  document.getElementById('rpc-input').value = rpc;

  // Try direct RPC first, then fallback to same-origin /api/rpc proxy if browser blocks cross-port
  const candidateUrls = [rpc];
  if (!rpc.includes('/api/rpc')) {
    candidateUrls.push(window.location.origin + '/api/rpc');
    candidateUrls.push('http://localhost:5000/api/rpc');
    candidateUrls.push('http://localhost:7545');
    candidateUrls.push('http://127.0.0.1:7545');
  }

  let connected = false;
  let lastError = null;

  for (const url of candidateUrls) {
    try {
      const testProvider = new ethers.JsonRpcProvider(url);
      await testProvider.getBlockNumber();
      const testAccounts = await testProvider.listAccounts();
      if (testAccounts && testAccounts.length > 0) {
        provider = testProvider;
        accounts = testAccounts;
        currentAccount = accounts[0];
        signer = await provider.getSigner(currentAccount.address || currentAccount);
        document.getElementById('rpc-input').value = url;
        connected = true;
        break;
      }
    } catch (e) {
      lastError = e;
    }
  }

  if (connected) {
    try {
      const saved = localStorage.getItem('scholarchain_addr');
      if (saved) { contractAddress = saved; await initContract(saved); }
    } catch(e) {}

    document.getElementById('overlay').style.display = 'none';
    document.getElementById('account-pill').style.display = 'flex';
    document.getElementById('demo-btn').style.display = 'flex';
    await updateAccountUI();
    await refreshDashboard();
    toast('Connected to Ganache Blockchain! (' + accounts.length + ' accounts)', 'success');
  } else {
    toast('Could not reach Ganache: ' + (lastError?.message || 'Check if Ganache is running on port 7545'), 'error', 8000);
  }
}`;

if (html.includes('async function connectWallet()')) {
  // Replace the connectWallet function
  html = html.replace(targetFunction, improvedFunction);
  fs.writeFileSync(htmlFile, html, 'utf8');
  console.log('Successfully patched connectWallet with auto-proxy fallback!');
} else {
  console.log('Target function signature not found directly.');
}
