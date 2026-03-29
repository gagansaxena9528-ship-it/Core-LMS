import express from 'express';
console.log('--- SERVER.TS STARTING ---');
import path from 'path';
import { fileURLToPath } from 'url';
// Removed static import to use dynamic import inside startServer
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import dotenv from 'dotenv';
import Stripe from 'stripe';
import nodemailer from 'nodemailer';

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
});

dotenv.config();

const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY) : null;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this';
const PORT = process.env.PORT || 3000;

console.log(`--- SERVER CONFIG: PORT=${PORT}, NODE_ENV=${process.env.NODE_ENV} ---`);
console.log('Starting server...');
async function startServer() {
  console.log('Initializing express...');
  const app = express();
  app.use(express.json());
  app.use(cookieParser());
  app.use(cors({
    origin: true,
    credentials: true
  }));

  // Request logging
  app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
  });

  app.get('/api/debug', (req, res) => res.send('Server is alive'));

  console.log('Connecting to database...');
  let db: any;
  try {
    const DatabaseModule = await import('better-sqlite3');
    const DbClass = DatabaseModule.default || DatabaseModule;
    db = new DbClass('database.sqlite');
    console.log('Database connected successfully (PERSISTENT).');
  } catch (err) {
    console.error('--- DATABASE CONNECTION ERROR ---');
    console.error(err);
    console.log('Server will continue to run with a MOCK database for debugging.');
    
    // Mock DB to prevent crashes
    db = {
      prepare: () => ({ 
        get: () => ({ count: 0 }), 
        all: () => [], 
        run: () => ({ lastInsertRowid: 0, changes: 0 }) 
      }),
      exec: () => { console.log('Mock DB: exec called'); }
    };
  }

  // Create Tables
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      uid TEXT PRIMARY KEY,
      name TEXT,
      email TEXT UNIQUE,
      password TEXT,
      role TEXT,
      phone TEXT,
      course TEXT,
      batch TEXT,
      status TEXT,
      joined TEXT,
      av TEXT,
      color TEXT,
      fatherName TEXT,
      motherName TEXT,
      dob TEXT,
      address TEXT,
      fee REAL,
      paid REAL,
      progress INTEGER,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS collections (
      id TEXT PRIMARY KEY,
      colPath TEXT,
      data TEXT,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT
    );
  `);

  // Migration: Add missing columns to users table if they don't exist
  const columnsToAdd = [
    { name: 'fatherName', type: 'TEXT' },
    { name: 'motherName', type: 'TEXT' },
    { name: 'dob', type: 'TEXT' },
    { name: 'address', type: 'TEXT' },
    { name: 'fee', type: 'REAL' },
    { name: 'paid', type: 'REAL' },
    { name: 'progress', type: 'INTEGER' }
  ];

  for (const col of columnsToAdd) {
    try {
      db.prepare(`ALTER TABLE users ADD COLUMN ${col.name} ${col.type}`).run();
      console.log(`Added column ${col.name} to users table.`);
    } catch (err: any) {
      if (!err.message.includes('duplicate column name')) {
        console.warn(`Could not add column ${col.name}: ${err.message}`);
      }
    }
  }

  // Seed Initial Data if empty
  const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number };
  console.log(`Current user count: ${userCount.count}`);
  
  const allUsers = db.prepare('SELECT email, role FROM users').all();
  console.log('Users in database:', JSON.stringify(allUsers));

  if (userCount.count === 0) {
    console.log('Seeding initial data...');
    const hashedPass = await bcrypt.hash('password123', 10);
    
    // Admin
    db.prepare('INSERT INTO users (uid, email, password, name, role, status, joined, av, color) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
      .run('admin1', 'gagansaxena9528@gmail.com', hashedPass, 'Gagan Admin', 'admin', 'Active', new Date().toISOString(), 'G', '#7c5fe6');
    console.log('Admin user seeded.');

    // Teacher
    db.prepare('INSERT INTO users (uid, email, password, name, role, status, joined, av, color) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
      .run('teacher1', 'teacher@corelms.com', hashedPass, 'John Doe', 'teacher', 'Active', new Date().toISOString(), 'J', '#4f8ef7');

    // Student
    db.prepare('INSERT INTO users (uid, email, password, name, role, status, joined, av, color) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
      .run('student1', 'student@corelms.com', hashedPass, 'Alice Smith', 'student', 'Active', new Date().toISOString(), 'A', '#2ecc8a');

    // Initial Courses
    const courses = [
      { id: 'c1', title: 'Full Stack Web Development', category: 'Programming', teacherId: 'teacher1', price: 9999, duration: '6 Months', level: 'Beginner', status: 'Active', emoji: '💻', description: 'Master MERN stack from scratch.', studentsCount: 150 },
      { id: 'c2', title: 'Digital Marketing Mastery', category: 'Marketing', teacherId: 'teacher1', price: 4999, duration: '3 Months', level: 'Intermediate', status: 'Active', emoji: '📈', description: 'Learn SEO, SEM, and Social Media.', studentsCount: 85 }
    ];

    const insertCol = db.prepare('INSERT INTO collections (id, colPath, data) VALUES (?, ?, ?)');
    for (const c of courses) {
      insertCol.run(c.id, 'courses', JSON.stringify(c));
    }

    // Initial Batches
    const batches = [
      { id: 'b1', name: 'DM-2026-March', courseId: 'c1', teacherId: 'teacher1', studentsCount: 25, startDate: '2026-03-01', status: 'Active', days: ['Mon', 'Wed', 'Fri'], startTime: '10:00 AM' },
      { id: 'b2', name: 'WD-Evening-Batch', courseId: 'c2', teacherId: 'teacher1', studentsCount: 18, startDate: '2026-03-15', status: 'Active', days: ['Tue', 'Thu'], startTime: '06:00 PM' }
    ];

    for (const b of batches) {
      insertCol.run(b.id, 'batches', JSON.stringify(b));
    }
  }

  // Auth Middleware
  const authenticate = (req: any, res: any, next: any) => {
    const token = req.cookies.token;
    if (!token) return res.status(401).json({ error: 'Unauthorized' });
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      req.user = decoded;
      next();
    } catch (err) {
      res.status(401).json({ error: 'Invalid token' });
    }
  };

  // API Routes
  app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

  // Auth Routes
  app.post('/api/auth/register', async (req, res) => {
    const { email, password, name } = req.body;
    try {
      const hashedPassword = await bcrypt.hash(password, 10);
      const uid = Math.random().toString(36).substring(2, 15);
      const isOwner = email === 'gagansaxena9528@gmail.com';
      const role = isOwner ? 'admin' : (req.body.role || 'student');
      const color = isOwner ? '#7c5fe6' : '#4f8ef7';
      
      db.prepare(
        'INSERT INTO users (uid, email, password, name, role, status, joined, av, color) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
      ).run(uid, email, hashedPassword, name, role, 'Active', new Date().toISOString(), name.charAt(0).toUpperCase(), color);
      
      res.json({ uid, email, name, role });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;
    console.log(`Login attempt for: ${email}`);
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email) as any;
    if (!user) {
      console.log(`User not found: ${email}`);
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      console.log(`Password mismatch for: ${email}`);
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    console.log(`Login successful for: ${email}`);
    const token = jwt.sign({ uid: user.uid, email: user.email, role: user.role }, JWT_SECRET);
    res.cookie('token', token, { httpOnly: true, secure: true, sameSite: 'none' });
    const { password: _, ...userWithoutPassword } = user;
    res.json(userWithoutPassword);
  });

  app.post('/api/auth/logout', (req, res) => {
    res.clearCookie('token', { httpOnly: true, secure: true, sameSite: 'none' });
    res.json({ success: true });
  });

  app.get('/api/auth/me', authenticate, async (req: any, res) => {
    const user = db.prepare('SELECT uid, name, email, role, phone, course, batch, status, joined, av, color FROM users WHERE uid = ?').get(req.user.uid);
    res.json(user);
  });

  // Settings Routes
  app.get('/api/settings', authenticate, async (req, res) => {
    const settings = db.prepare('SELECT * FROM settings').all() as any[];
    const result: Record<string, any> = {};
    settings.forEach(s => {
      try {
        result[s.key] = JSON.parse(s.value);
      } catch {
        result[s.key] = s.value;
      }
    });
    res.json(result);
  });

  app.post('/api/settings', authenticate, async (req, res) => {
    const data = req.body;
    const upsert = db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)');
    for (const [key, value] of Object.entries(data)) {
      upsert.run(key, JSON.stringify(value));
    }
    res.json({ success: true });
  });

  // Stripe Payment Intent
  app.post('/api/payments/create-intent', authenticate, async (req, res) => {
    if (!stripe) return res.status(500).json({ error: 'Stripe not configured' });
    const { amount, currency = 'inr' } = req.body;
    try {
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(amount * 100),
        currency,
        automatic_payment_methods: { enabled: true },
      });
      res.json({ clientSecret: paymentIntent.client_secret });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // Email Transporter
  const EMAIL_USER = process.env.EMAIL_USER || 'gagansaxena9528@gmail.com';
  const EMAIL_PASS = process.env.EMAIL_PASS || 'koerolmvlembloev'; // Fallback to provided app password

  console.log('--- EMAIL CONFIG CHECK ---');
  console.log('EMAIL_USER:', EMAIL_USER);
  console.log('EMAIL_PASS length:', EMAIL_PASS ? EMAIL_PASS.length : 0);

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: EMAIL_USER,
      pass: EMAIL_PASS
    }
  });

  // Verify Transporter
  transporter.verify((error, success) => {
    if (error) {
      console.error('--- EMAIL TRANSPORTER ERROR ---');
      console.error(error);
    } else {
      console.log('--- EMAIL SYSTEM READY ---');
    }
  });

  // Email Health Check
  app.get('/api/email/health', authenticate, (req, res) => {
    transporter.verify((error, success) => {
      if (error) {
        res.status(500).json({ 
          status: 'error', 
          error: error.message,
          debug: {
            user: EMAIL_USER,
            passLength: EMAIL_PASS ? EMAIL_PASS.length : 0
          }
        });
      } else {
        res.json({ 
          status: 'ok', 
          user: EMAIL_USER,
          debug: {
            passLength: EMAIL_PASS ? EMAIL_PASS.length : 0
          }
        });
      }
    });
  });

  // Email Route
  app.post('/api/email/send', authenticate, async (req, res) => {
    const { to, subject, text, html } = req.body;
    console.log(`Attempting to send email to: ${to}`);
    
    if (!EMAIL_PASS) {
      console.warn('EMAIL_PASS not set. Skipping email send.');
      return res.status(200).json({ success: true, message: 'Email skipped (no credentials)' });
    }

    try {
      const info = await transporter.sendMail({
        from: `"Core LMS" <${EMAIL_USER}>`,
        to,
        subject,
        text,
        html
      });
      console.log(`Email sent successfully: ${info.messageId}`);
      res.json({ success: true, messageId: info.messageId });
    } catch (err: any) {
      console.error('Email Error Details:', err);
      res.status(500).json({ error: 'Failed to send email: ' + err.message });
    }
  });

  // Generic CRUD Routes
  app.get('/api/data/:colPath', authenticate, async (req, res) => {
    try {
      const { colPath } = req.params;
      if (colPath === 'users') {
        const users = db.prepare('SELECT * FROM users').all();
        // Remove passwords for security
        return res.json(users.map((u: any) => {
          const { password, ...rest } = u;
          return rest;
        }));
      }
      const items = db.prepare('SELECT * FROM collections WHERE colPath = ?').all(colPath) as any[];
      res.json(items.map(item => ({ id: item.id, ...JSON.parse(item.data) })));
    } catch (err: any) {
      console.error('GET Data Error:', err);
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/data/:colPath', authenticate, async (req, res) => {
    try {
      const { colPath } = req.params;
      const data = req.body;
      const id = data.id || Math.random().toString(36).substring(2, 15);
      
      if (colPath === 'users') {
        const { email, password, name, role, ...rest } = data;
        const hashedPassword = password ? await bcrypt.hash(password, 10) : null;
        
        const fields = ['uid', 'email', 'password', 'name', 'role', 'status', 'joined', 'av', 'color', ...Object.keys(rest)];
        const placeholders = fields.map(() => '?').join(', ');
        const values = [
          id, 
          email, 
          hashedPassword, 
          name, 
          role, 
          rest.status || 'Active', 
          rest.joined || new Date().toISOString(), 
          name.charAt(0).toUpperCase(), 
          rest.color || '#4f8ef7',
          ...Object.values(rest)
        ];

        const query = `INSERT INTO users (${fields.join(', ')}) VALUES (${placeholders})`;
        db.prepare(query).run(...values);
        return res.json({ id });
      }

      db.prepare('INSERT INTO collections (id, colPath, data) VALUES (?, ?, ?)')
        .run(id, colPath, JSON.stringify(data));
      res.json({ id });
    } catch (err: any) {
      console.error('POST Data Error:', err);
      if (err.message.includes('UNIQUE constraint failed: users.email')) {
        return res.status(400).json({ error: 'This email address is already registered. Please use a different email.' });
      }
      res.status(500).json({ error: err.message });
    }
  });

  app.put('/api/data/:colPath/:id', authenticate, async (req, res) => {
    try {
      const { colPath, id } = req.params;
      const data = req.body;

      if (colPath === 'users') {
        const fields = Object.keys(data).filter(k => k !== 'uid' && k !== 'password');
        const values = fields.map(f => data[f]);
        const query = `UPDATE users SET ${fields.map(f => `${f} = ?`).join(', ')} WHERE uid = ?`;
        db.prepare(query).run(...values, id);
        return res.json({ success: true });
      }

      db.prepare('UPDATE collections SET data = ?, updatedAt = CURRENT_TIMESTAMP WHERE id = ? AND colPath = ?')
        .run(JSON.stringify(data), id, colPath);
      res.json({ success: true });
    } catch (err: any) {
      console.error('PUT Data Error:', err);
      res.status(500).json({ error: err.message });
    }
  });

  app.delete('/api/data/:colPath/:id', authenticate, async (req, res) => {
    try {
      const { colPath, id } = req.params;
      if (colPath === 'users') {
        db.prepare('DELETE FROM users WHERE uid = ?').run(id);
      } else {
        db.prepare('DELETE FROM collections WHERE id = ? AND colPath = ?').run(id, colPath);
      }
      res.json({ success: true });
    } catch (err: any) {
      console.error('DELETE Data Error:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    console.log(`NODE_ENV is ${process.env.NODE_ENV}. Starting Vite in development mode...`);
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
    console.log('Vite middleware attached.');
  } else {
    console.log('Starting in production mode...');
    // In production, server.js is inside the dist folder along with index.html
    const distPath = __dirname; 
    console.log(`Serving static files from: ${distPath}`);
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(Number(PORT), () => {
    console.log(`--- SERVER IS READY AND LISTENING ON PORT ${PORT} ---`);
  });
}

// Global error handlers for debugging
process.on('uncaughtException', (err) => {
  console.error('--- UNCAUGHT EXCEPTION ---');
  console.error(err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('--- UNHANDLED REJECTION ---');
  console.error('Reason:', reason);
});

// Start the server
startServer().catch(err => {
  console.error('--- STARTUP ERROR ---');
  console.error(err);
  // Do NOT exit, let the process stay alive so we can see logs
});
