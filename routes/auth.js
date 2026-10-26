/**
 * routes/auth.js
 * Sign up, Sign in, Profile, and Role-Switching API
 */
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../database/db');
const { authenticateToken, JWT_SECRET } = require('../middleware/auth');

// Register a new user
router.post('/register', (req, res) => {
  try {
    const { name, email, password, role, institution, studentId, cgpa, annualIncome, wallet } = req.body;

    if (!name || !email || !password || !role) {
      return res.status(400).json({ success: false, message: 'Name, email, password, and role are required.' });
    }

    const validRoles = ['authority', 'college', 'auditor', 'oracle', 'student'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ success: false, message: `Invalid role. Must be one of: ${validRoles.join(', ')}` });
    }

    const existing = db.findUserByEmail(email);
    if (existing) {
      return res.status(409).json({ success: false, message: 'An account with this email already exists.' });
    }

    const salt = bcrypt.genSaltSync(10);
    const passwordHash = bcrypt.hashSync(password, salt);

    const newUser = {
      id: 'usr_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
      name: name.trim(),
      email: email.trim().toLowerCase(),
      passwordHash,
      role,
      institution: institution ? institution.trim() : '',
      studentId: studentId ? studentId.trim() : '',
      cgpa: cgpa ? parseFloat(cgpa) : null,
      annualIncome: annualIncome ? parseInt(annualIncome, 10) : null,
      wallet: wallet ? wallet.trim() : '',
      createdAt: new Date().toISOString()
    };

    db.createUser(newUser);
    db.logActivity({
      userId: newUser.id,
      action: 'USER_REGISTERED',
      detail: `User registered as ${role}: ${newUser.name} (${newUser.email})`
    });

    const token = jwt.sign(
      { id: newUser.id, email: newUser.email, role: newUser.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    const { passwordHash: _, ...safeUser } = newUser;
    return res.status(201).json({
      success: true,
      message: 'Account created successfully!',
      token,
      user: safeUser
    });
  } catch (err) {
    console.error('Register error:', err);
    return res.status(500).json({ success: false, message: 'Internal server error during registration.' });
  }
});

// Login
router.post('/login', (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required.' });
    }

    const user = db.findUserByEmail(email);
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    const isValid = bcrypt.compareSync(password, user.passwordHash);
    if (!isValid) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    db.logActivity({
      userId: user.id,
      action: 'USER_LOGIN',
      detail: `${user.name} logged in (${user.role})`
    });

    const { passwordHash: _, ...safeUser } = user;
    return res.json({
      success: true,
      message: 'Login successful!',
      token,
      user: safeUser
    });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ success: false, message: 'Internal server error during login.' });
  }
});

// Get current profile
router.get('/me', authenticateToken, (req, res) => {
  const { passwordHash: _, ...safeUser } = req.user;
  res.json({ success: true, user: safeUser });
});

// Update wallet address
router.post('/wallet', authenticateToken, (req, res) => {
  const { wallet } = req.body;
  if (!wallet || !wallet.startsWith('0x')) {
    return res.status(400).json({ success: false, message: 'Valid Ethereum wallet address required.' });
  }

  const updated = db.updateUserWallet(req.user.id, wallet.trim());
  db.logActivity({
    userId: req.user.id,
    action: 'WALLET_LINKED',
    detail: `Linked wallet ${wallet} to user ${req.user.name}`
  });

  const { passwordHash: _, ...safeUser } = updated;
  res.json({ success: true, user: safeUser, message: 'Wallet linked successfully.' });
});

// Quick Switch Account (Demo Helper)
router.get('/demo-accounts', (req, res) => {
  const users = db.getUsers().map(u => {
    const { passwordHash: _, ...safe } = u;
    return safe;
  });
  res.json({ success: true, accounts: users });
});

module.exports = router;
