const fs = require('fs');
const path = require('path');

const htmlPath = path.join(__dirname, 'ScholarChain.html');
let html = fs.readFileSync(htmlPath, 'utf8');

// 1. Add CSS styles for Auth & Role badges
const authCss = `
/* ── AUTH & USER STYLES ─────────────────────────────────────────── */
#user-pill {
  display: flex;
  align-items: center;
  gap: 8px;
  background: var(--surface2);
  border: 1px solid var(--border);
  padding: 5px 12px;
  border-radius: 20px;
  font-size: 0.8rem;
  cursor: pointer;
  transition: .15s;
}
#user-pill:hover { border-color: var(--accent); }
.user-avatar {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--accent), var(--accent2));
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.7rem;
  font-weight: 700;
  color: #fff;
}
.modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 500;
  background: rgba(13,17,23,.85);
  backdrop-filter: blur(8px);
  display: none;
  align-items: center;
  justify-content: center;
  animation: fadeIn .2s ease;
}
.auth-box {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 30px;
  max-width: 440px;
  width: 90%;
  box-shadow: var(--shadow);
}
.auth-tabs {
  display: flex;
  border-bottom: 1px solid var(--border);
  margin-bottom: 20px;
}
.auth-tab {
  flex: 1;
  text-align: center;
  padding: 10px;
  cursor: pointer;
  font-weight: 600;
  color: var(--text2);
  border-bottom: 2px solid transparent;
}
.auth-tab.active {
  color: var(--primary);
  border-bottom-color: var(--primary);
}
.demo-role-btn {
  padding: 8px 12px;
  border-radius: 6px;
  border: 1px solid var(--border);
  background: var(--surface2);
  color: var(--text);
  font-size: 0.78rem;
  cursor: pointer;
  transition: .15s;
  display: flex;
  align-items: center;
  gap: 6px;
}
.demo-role-btn:hover {
  background: var(--surface3);
  border-color: var(--accent);
}
.demo-role-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  margin-top: 10px;
}
`;

// Insert Auth CSS before </style>
html = html.replace('</style>', authCss + '\n</style>');

// 2. Add Auth Topbar components
const authTopbarHtml = `
  <!-- Auth & Role Quick Switch -->
  <button id="login-modal-btn" class="btn btn-secondary" onclick="openAuthModal('login')" style="padding:6px 12px;font-size:0.8rem">
    🔐 Sign In / Register
  </button>
  <div id="user-pill" style="display:none;" onclick="openAuthModal('switch')">
    <div class="user-avatar" id="u-avatar">A</div>
    <div>
      <div id="u-name" style="font-weight:600;line-height:1.2;">User</div>
      <div id="u-role-sub" style="font-size:0.68rem;color:var(--text3);">Role</div>
    </div>
  </div>
`;

html = html.replace('<div id="account-pill">', authTopbarHtml + '\n  <div id="account-pill">');

// 3. Add Auth Modal HTML before </body>
const authModalHtml = `
<!-- ─── AUTH MODAL ────────────────────────────────────────────────── -->
<div id="auth-modal" class="modal-overlay" onclick="if(event.target===this)closeAuthModal()">
  <div class="auth-box">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
      <h3 style="color:var(--primary);display:flex;align-items:center;gap:8px;">
        🎓 ScholarChain Portal
      </h3>
      <button onclick="closeAuthModal()" style="background:none;border:none;color:var(--text3);font-size:1.2rem;cursor:pointer;">✕</button>
    </div>

    <div class="auth-tabs">
      <div class="auth-tab active" id="tab-btn-login" onclick="switchAuthTab('login')">Sign In</div>
      <div class="auth-tab" id="tab-btn-register" onclick="switchAuthTab('register')">Register</div>
      <div class="auth-tab" id="tab-btn-demo" onclick="switchAuthTab('demo')">Quick Roles</div>
    </div>

    <!-- Sign In Panel -->
    <div id="auth-login-panel">
      <div class="form-group">
        <label>Email Address</label>
        <input type="email" id="login-email" placeholder="authority@scholarchain.gov" value="authority@scholarchain.gov" />
      </div>
      <div class="form-group">
        <label>Password</label>
        <input type="password" id="login-password" placeholder="••••••••" value="Authority@123" />
      </div>
      <button class="btn btn-primary" style="width:100%;justify-content:center;margin-top:10px;" onclick="handleLogin()">
        Sign In
      </button>
    </div>

    <!-- Register Panel -->
    <div id="auth-register-panel" style="display:none;">
      <div class="form-group">
        <label>Full Name</label>
        <input type="text" id="reg-user-name" placeholder="Vikram Patel" />
      </div>
      <div class="form-group">
        <label>Email Address</label>
        <input type="email" id="reg-user-email" placeholder="vikram@student.in" />
      </div>
      <div class="form-group">
        <label>Password</label>
        <input type="password" id="reg-user-pwd" placeholder="Create a strong password" />
      </div>
      <div class="form-group">
        <label>Select Your Role</label>
        <select id="reg-user-role">
          <option value="student">Student (Scholarship Applicant)</option>
          <option value="college">College Verification Officer</option>
          <option value="authority">Scholarship Authority (Admin)</option>
          <option value="auditor">Public Auditor</option>
          <option value="oracle">Income Tax Verification Oracle</option>
        </select>
      </div>
      <div class="form-group">
        <label>Institution / Department</label>
        <input type="text" id="reg-user-inst" placeholder="e.g. IIT Delhi, Income Tax Dept" />
      </div>
      <button class="btn btn-primary" style="width:100%;justify-content:center;margin-top:10px;" onclick="handleRegister()">
        Create Account
      </button>
    </div>

    <!-- Quick Roles Demo Panel -->
    <div id="auth-demo-panel" style="display:none;">
      <p style="font-size:0.8rem;color:var(--text2);margin-bottom:12px;">
        1-Click login as pre-configured consortium participants:
      </p>
      <div class="demo-role-grid">
        <button class="demo-role-btn" onclick="quickLogin('authority')">
          🏛️ <strong>Authority</strong><br><span style="font-size:0.68rem;color:var(--text3)">Deploy & Approve</span>
        </button>
        <button class="demo-role-btn" onclick="quickLogin('college')">
          🏫 <strong>College</strong><br><span style="font-size:0.68rem;color:var(--text3)">Verify Docs</span>
        </button>
        <button class="demo-role-btn" onclick="quickLogin('auditor')">
          🔍 <strong>Auditor</strong><br><span style="font-size:0.68rem;color:var(--text3)">Full Audit Trail</span>
        </button>
        <button class="demo-role-btn" onclick="quickLogin('oracle')">
          🔮 <strong>Oracle</strong><br><span style="font-size:0.68rem;color:var(--text3)">Income Records</span>
        </button>
        <button class="demo-role-btn" onclick="quickLogin('student1')">
          👨‍🎓 <strong>Arjun (CGPA 8.2)</strong><br><span style="font-size:0.68rem;color:var(--text3)">Passes Criteria</span>
        </button>
        <button class="demo-role-btn" onclick="quickLogin('student2')">
          👩‍🎓 <strong>Priya (CGPA 6.2)</strong><br><span style="font-size:0.68rem;color:var(--text3)">Low CGPA</span>
        </button>
      </div>
      <div style="margin-top:14px;text-align:center;">
        <button class="btn btn-danger" style="font-size:0.75rem;padding:4px 10px;" onclick="handleLogout()">Sign Out</button>
      </div>
    </div>
  </div>
</div>
`;

html = html.replace('</body>', authModalHtml + '\n</body>');

// 4. Add Authentication client JavaScript logic
const authJs = `
// ── AUTHENTICATION STATE & LOGIC ───────────────────────────────────────
let currentUser = null;
let authToken = null;

const PRESET_USERS = {
  authority: { email: 'authority@scholarchain.gov', name: 'Scholarship Authority', role: 'authority', accountIdx: 0 },
  college: { email: 'college@iitm.ac.in', name: 'IIT Madras Node', role: 'college', accountIdx: 1 },
  auditor: { email: 'auditor@cag.gov.in', name: 'CAG Auditor', role: 'auditor', accountIdx: 2 },
  oracle: { email: 'oracle@incometax.gov.in', name: 'CBDT Oracle', role: 'oracle', accountIdx: 3 },
  student1: { email: 'arjun@student.in', name: 'Arjun Mehta', role: 'student', accountIdx: 4 },
  student2: { email: 'priya@student.in', name: 'Priya Sharma', role: 'student', accountIdx: 5 },
};

function openAuthModal(tab = 'login') {
  document.getElementById('auth-modal').style.display = 'flex';
  switchAuthTab(tab === 'switch' ? 'demo' : tab);
}

function closeAuthModal() {
  document.getElementById('auth-modal').style.display = 'none';
}

function switchAuthTab(tab) {
  document.getElementById('tab-btn-login').classList.toggle('active', tab === 'login');
  document.getElementById('tab-btn-register').classList.toggle('active', tab === 'register');
  document.getElementById('tab-btn-demo').classList.toggle('active', tab === 'demo');

  document.getElementById('auth-login-panel').style.display = tab === 'login' ? 'block' : 'none';
  document.getElementById('auth-register-panel').style.display = tab === 'register' ? 'block' : 'none';
  document.getElementById('auth-demo-panel').style.display = tab === 'demo' ? 'block' : 'none';
}

async function handleLogin() {
  const email = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;

  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    if (data.success) {
      setSession(data.user, data.token);
      toast('Welcome back, ' + data.user.name + '!', 'success');
      closeAuthModal();
    } else {
      toast(data.message || 'Login failed', 'error');
    }
  } catch (err) {
    // Local fallback if API server is not running directly
    const preset = Object.values(PRESET_USERS).find(u => u.email.toLowerCase() === email.toLowerCase());
    if (preset) {
      setSession(preset, 'local_dummy_jwt');
      toast('Logged in as ' + preset.name + ' (Local)', 'success');
      closeAuthModal();
    } else {
      toast('Login failed: ' + err.message, 'error');
    }
  }
}

async function handleRegister() {
  const name = document.getElementById('reg-user-name').value.trim();
  const email = document.getElementById('reg-user-email').value.trim();
  const password = document.getElementById('reg-user-pwd').value;
  const role = document.getElementById('reg-user-role').value;
  const institution = document.getElementById('reg-user-inst').value.trim();

  if (!name || !email || !password) {
    toast('Please fill all required fields', 'warn');
    return;
  }

  try {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password, role, institution })
    });
    const data = await res.json();
    if (data.success) {
      setSession(data.user, data.token);
      toast('Registration successful! Logged in as ' + name, 'success');
      closeAuthModal();
    } else {
      toast(data.message || 'Registration failed', 'error');
    }
  } catch (err) {
    toast('API error: ' + err.message, 'error');
  }
}

async function quickLogin(presetKey) {
  const p = PRESET_USERS[presetKey];
  if (!p) return;

  try {
    // Try API login first
    const pwd = p.role === 'student' ? 'Student@123' : (p.role.charAt(0).toUpperCase() + p.role.slice(1) + '@123');
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: p.email, password: pwd })
    });
    const data = await res.json();
    if (data.success) {
      setSession(data.user, data.token);
    } else {
      setSession(p, 'demo_token');
    }
  } catch (e) {
    setSession(p, 'demo_token');
  }

  // Switch Ganache account if provider is connected
  if (provider && accounts && accounts.length > p.accountIdx) {
    await switchAccount(accounts[p.accountIdx]);
  }

  toast('Switched role: ' + p.name + ' (' + p.role.toUpperCase() + ')', 'success');
  closeAuthModal();
}

function setSession(user, token) {
  currentUser = user;
  authToken = token;
  try {
    localStorage.setItem('scholarchain_user', JSON.stringify(user));
    localStorage.setItem('scholarchain_token', token);
  } catch(e) {}

  document.getElementById('login-modal-btn').style.display = 'none';
  const pill = document.getElementById('user-pill');
  pill.style.display = 'flex';
  document.getElementById('u-name').textContent = user.name;
  document.getElementById('u-role-sub').textContent = user.role.toUpperCase() + (user.institution ? ' • ' + user.institution : '');
  document.getElementById('u-avatar').textContent = (user.name || 'U').charAt(0).toUpperCase();

  // Highlight default page for role
  if (user.role === 'authority') showPage('schemes');
  else if (user.role === 'college') showPage('verify');
  else if (user.role === 'auditor') showPage('audit');
  else if (user.role === 'oracle') showPage('oracle');
  else if (user.role === 'student') showPage('apply');
}

function handleLogout() {
  currentUser = null;
  authToken = null;
  try {
    localStorage.removeItem('scholarchain_user');
    localStorage.removeItem('scholarchain_token');
  } catch(e) {}
  document.getElementById('login-modal-btn').style.display = 'inline-block';
  document.getElementById('user-pill').style.display = 'none';
  toast('Signed out successfully.', 'info');
  closeAuthModal();
}

// Restore session on page load
window.addEventListener('load', () => {
  try {
    const saved = localStorage.getItem('scholarchain_user');
    if (saved) {
      setSession(JSON.parse(saved), localStorage.getItem('scholarchain_token'));
    }
  } catch(e) {}
});
`;

html = html.replace('// ── INIT ───────────────────────────────────────────────────────────────', authJs + '\n// ── INIT ───────────────────────────────────────────────────────────────');

fs.writeFileSync(htmlPath, html, 'utf8');
console.log('Successfully injected Auth System into ScholarChain.html!');
