/**
 * database/db.js
 * SQLite database setup using better-sqlite3
 * Stores user accounts (off-chain) for authentication
 */
const Database = require('better-sqlite3');
const path     = require('path');
const fs       = require('fs');

const DB_PATH = process.env.DB_PATH || './database/scholarchain.db';

// Ensure directory exists
const dir = path.dirname(path.resolve(DB_PATH));
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

const db = new Database(path.resolve(DB_PATH));

// Enable WAL mode for performance
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// ── SCHEMA ──────────────────────────────────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    name          TEXT    NOT NULL,
    email         TEXT    NOT NULL UNIQUE,
    password_hash TEXT    NOT NULL,
    role          TEXT    NOT NULL CHECK(role IN ('authority','college','auditor','oracle','student')),
    wallet        TEXT,
    institution   TEXT,
    student_id    TEXT,
    cgpa          REAL,
    is_active     INTEGER NOT NULL DEFAULT 1,
    created_at    TEXT    NOT NULL DEFAULT (datetime('now')),
    last_login    TEXT
  );

  CREATE TABLE IF NOT EXISTS contract_config (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    contract_address TEXT NOT NULL,
    network_rpc      TEXT NOT NULL,
    deployed_by      INTEGER REFERENCES users(id),
    deployed_at      TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS activity_log (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id    INTEGER REFERENCES users(id),
    action     TEXT NOT NULL,
    detail     TEXT,
    ip_addr    TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

// ── PREPARED STATEMENTS ──────────────────────────────────────────────────────
const stmts = {
  createUser: db.prepare(`
    INSERT INTO users (name, email, password_hash, role, wallet, institution, student_id, cgpa)
    VALUES (@name, @email, @password_hash, @role, @wallet, @institution, @student_id, @cgpa)
  `),
  findByEmail:    db.prepare('SELECT * FROM users WHERE email = ? AND is_active = 1'),
  findById:       db.prepare('SELECT * FROM users WHERE id = ? AND is_active = 1'),
  updateLastLogin:db.prepare("UPDATE users SET last_login = datetime('now') WHERE id = ?"),
  updateWallet:   db.prepare('UPDATE users SET wallet = ? WHERE id = ?'),

  saveContract: db.prepare(`
    INSERT INTO contract_config (contract_address, network_rpc, deployed_by)
    VALUES (@contract_address, @network_rpc, @deployed_by)
  `),
  getLatestContract: db.prepare(
    'SELECT * FROM contract_config ORDER BY id DESC LIMIT 1'
  ),

  logActivity: db.prepare(`
    INSERT INTO activity_log (user_id, action, detail, ip_addr)
    VALUES (@user_id, @action, @detail, @ip_addr)
  `),
  getActivityLog: db.prepare(
    'SELECT al.*, u.name, u.role FROM activity_log al LEFT JOIN users u ON al.user_id=u.id ORDER BY al.id DESC LIMIT 100'
  ),
  getAllUsers: db.prepare('SELECT id,name,email,role,wallet,institution,created_at,last_login FROM users ORDER BY id'),
};

module.exports = { db, stmts };
