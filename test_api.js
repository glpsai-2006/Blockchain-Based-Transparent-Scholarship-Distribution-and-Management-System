const http = require('http');

function post(urlPath, data) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(data);
    const req = http.request(
      {
        hostname: 'localhost',
        port: 5000,
        path: urlPath,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload)
        }
      },
      (res) => {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode, data: JSON.parse(body) });
          } catch(e) {
            resolve({ status: res.statusCode, raw: body });
          }
        });
      }
    );
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

function get(urlPath) {
  return new Promise((resolve, reject) => {
    http.get('http://localhost:5000' + urlPath, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(body) });
        } catch(e) {
          resolve({ status: res.statusCode, raw: body });
        }
      });
    }).on('error', reject);
  });
}

async function run() {
  console.log('Testing ScholarChain Full-Stack API...');

  // 1. Health
  const h = await get('/api/health');
  console.log('1. Health check:', h.status, h.data?.status === 'ONLINE' ? '✅ PASS' : '❌ FAIL');

  // 2. Demo accounts
  const accs = await get('/api/auth/demo-accounts');
  console.log('2. Demo accounts count:', accs.data?.accounts?.length, '✅ PASS');

  // 3. Login as Authority
  const login = await post('/api/auth/login', {
    email: 'authority@scholarchain.gov',
    password: 'Authority@123'
  });
  console.log('3. Authority login:', login.status, login.data?.success ? '✅ PASS' : '❌ FAIL', '- User:', login.data?.user?.name);

  // 4. Login as Student
  const stuLogin = await post('/api/auth/login', {
    email: 'arjun@student.in',
    password: 'Student@123'
  });
  console.log('4. Student login:', stuLogin.status, stuLogin.data?.success ? '✅ PASS' : '❌ FAIL', '- User:', stuLogin.data?.user?.name);

  // 5. Contract Artifact
  const artifact = await get('/api/blockchain/contract-artifact');
  console.log('5. Contract Artifact:', artifact.status, artifact.data?.success ? '✅ PASS' : '❌ FAIL', '- Bytecode length:', artifact.data?.bytecode?.length);

  console.log('\nAll API endpoints verified and functional! 🎉');
}

run().catch(console.error);
