/**
 * database/db.js
 * Lightweight, robust JSON file-backed database with atomic writes
 * Zero native C++ dependency - works across any OS and Node.js version.
 */
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

const DB_DIR = path.join(__dirname);
const DB_FILE = path.join(DB_DIR, 'data.json');

if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

function loadData() {
  if (!fs.existsSync(DB_FILE)) {
    const initialData = {
      users: [],
      contracts: [],
      activityLogs: []
    };
    saveData(initialData);
    return initialData;
  }
  try {
    return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
  } catch (e) {
    console.error('Failed to parse database file, resetting:', e);
    return { users: [], contracts: [], activityLogs: [] };
  }
}

function saveData(data) {
  const tmpFile = DB_FILE + '.tmp';
  fs.writeFileSync(tmpFile, JSON.stringify(data, null, 2), 'utf8');
  fs.renameSync(tmpFile, DB_FILE);
}

// Seed default users if empty
function seedDefaultUsers() {
  const data = loadData();
  if (data.users.length === 0) {
    const salt = bcrypt.genSaltSync(10);
    const hash = (pwd) => bcrypt.hashSync(pwd, salt);

    data.users = [
      {
        id: 'usr_auth_1',
        name: 'National Scholarship Board (Admin)',
        email: 'authority@scholarchain.gov',
        passwordHash: hash('Authority@123'),
        role: 'authority',
        institution: 'Ministry of Education',
        wallet: '0x90F8bf6A479f320ead074411a4B0e7944Ea8c9C1',
        createdAt: new Date().toISOString()
      },
      {
        id: 'usr_col_1',
        name: 'IIT Madras Verification Office',
        email: 'college@iitm.ac.in',
        passwordHash: hash('College@123'),
        role: 'college',
        institution: 'IIT Madras',
        wallet: '0xFFcf8FDEE72ac11b5c542428B35EEF5769C409f0',
        createdAt: new Date().toISOString()
      },
      {
        id: 'usr_aud_1',
        name: 'Comptroller & Auditor General (CAG)',
        email: 'auditor@cag.gov.in',
        passwordHash: hash('Auditor@123'),
        role: 'auditor',
        institution: 'Central Audit Bureau',
        wallet: '0x22d491Bde2303f2f1be6053930bA1d4fF771bEc4',
        createdAt: new Date().toISOString()
      },
      {
        id: 'usr_ora_1',
        name: 'Income Tax Dept Oracle Node',
        email: 'oracle@incometax.gov.in',
        passwordHash: hash('Oracle@123'),
        role: 'oracle',
        institution: 'CBDT Revenue Oracle',
        wallet: '0xE11BA2b4D45Eaed5996Cd0823791E0C93114882d',
        createdAt: new Date().toISOString()
      },
      {
        id: 'usr_stu_1',
        name: 'Arjun Mehta',
        email: 'arjun@student.in',
        passwordHash: hash('Student@123'),
        role: 'student',
        institution: 'IIT Madras',
        studentId: 'CS2025-042',
        cgpa: 8.20,
        annualIncome: 300000,
        wallet: '0xd03ea8624C8C5987235048901fB614fDcA89b117',
        createdAt: new Date().toISOString()
      },
      {
        id: 'usr_stu_2',
        name: 'Priya Sharma',
        email: 'priya@student.in',
        passwordHash: hash('Student@123'),
        role: 'student',
        institution: 'NIT Trichy',
        studentId: 'EE2025-118',
        cgpa: 6.20,
        annualIncome: 200000,
        wallet: '0x95cED97b3779e3c291885470555304b7863d115e',
        createdAt: new Date().toISOString()
      }
    ];

    saveData(data);
    console.log('Seeded 6 default role accounts in database.');
  }
}

seedDefaultUsers();

module.exports = {
  getUsers: () => loadData().users,
  findUserByEmail: (email) => {
    const users = loadData().users;
    return users.find(u => u.email.toLowerCase() === email.toLowerCase());
  },
  findUserById: (id) => {
    const users = loadData().users;
    return users.find(u => u.id === id);
  },
  createUser: (user) => {
    const data = loadData();
    data.users.push(user);
    saveData(data);
    return user;
  },
  updateUserWallet: (id, wallet) => {
    const data = loadData();
    const idx = data.users.findIndex(u => u.id === id);
    if (idx !== -1) {
      data.users[idx].wallet = wallet;
      saveData(data);
      return data.users[idx];
    }
    return null;
  },
  logActivity: (log) => {
    const data = loadData();
    data.activityLogs.unshift({
      ...log,
      id: 'log_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
      timestamp: new Date().toISOString()
    });
    if (data.activityLogs.length > 200) data.activityLogs.pop();
    saveData(data);
  },
  getActivityLogs: () => loadData().activityLogs,
  saveContractConfig: (cfg) => {
    const data = loadData();
    data.contracts.unshift({
      ...cfg,
      id: 'cfg_' + Date.now(),
      deployedAt: new Date().toISOString()
    });
    saveData(data);
  },
  getLatestContract: () => {
    const data = loadData();
    return data.contracts[0] || null;
  }
};
