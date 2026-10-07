// HolyLoy Developments Ltd. — web server + MongoDB API
require('dotenv').config({ quiet: true });
const path = require('path');
const crypto = require('crypto');
const express = require('express');
const { MongoClient } = require('mongodb');

const PORT = process.env.PORT || 3000;
const DB_NAME = process.env.DB_NAME || 'holyloy';
const ADMIN_KEY = process.env.ADMIN_KEY || '';
const SESSION_DAYS = 7;

// Shared sandbox account (matches the public demo credentials on the site)
const DEMO = { email: 'demo@holyloydev.com', password: 'HolyLoyDemo@2026', name: 'Demo Investor', shares: 1, paid: 6, sandbox: true };

const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '50kb' }));

/* ---------- MongoDB ---------- */
let db = null, dbError = 'Connecting…';
async function connectDb() {
  if (!process.env.MONGODB_URI) { dbError = 'MONGODB_URI is not set in .env'; return; }
  try {
    const client = new MongoClient(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 8000 });
    await client.connect();
    db = client.db(DB_NAME);
    await db.collection('investors').createIndex({ email: 1 }, { unique: true });
    await db.collection('sessions').createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // auto-delete expired
    await db.collection('demo_requests').createIndex({ createdAt: -1 });
    dbError = null;
    console.log(`✔ MongoDB connected (db: ${DB_NAME})`);
  } catch (e) {
    dbError = e.message;
    console.error('✖ MongoDB connection failed:', e.message);
    setTimeout(connectDb, 15000); // retry
  }
}
const needDb = (req, res, next) => db ? next() : res.status(503).json({ error: 'db_unavailable', message: 'Database is temporarily unavailable. Please try again shortly.' });

/* ---------- helpers ---------- */
const hashPw = (pw) => { const salt = crypto.randomBytes(16); return salt.toString('hex') + ':' + crypto.scryptSync(pw, salt, 64).toString('hex'); };
const checkPw = (pw, stored) => {
  const [s, h] = String(stored).split(':'); if (!s || !h) return false;
  const a = crypto.scryptSync(pw, Buffer.from(s, 'hex'), 64), b = Buffer.from(h, 'hex');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
};
const str = (v, max = 120) => String(v ?? '').trim().slice(0, max);
const emailOk = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);
const phoneOk = (v) => /^\+?[0-9][0-9\s-]{7,16}$/.test(v);
const SHARE_OPTIONS = [1, 5, 10, 20];

// tiny in-memory rate limiter (per IP + route)
const hits = new Map();
const limit = (max, windowMs) => (req, res, next) => {
  const k = req.ip + req.path, now = Date.now();
  const arr = (hits.get(k) || []).filter(t => now - t < windowMs);
  if (arr.length >= max) return res.status(429).json({ error: 'rate_limited', message: 'Too many attempts. Please wait a minute and try again.' });
  arr.push(now); hits.set(k, arr); next();
};

async function newSession(user) {
  const token = crypto.randomBytes(32).toString('hex');
  await db.collection('sessions').insertOne({
    tokenHash: crypto.createHash('sha256').update(token).digest('hex'),
    investor: user.sandbox ? null : user._id, sandbox: !!user.sandbox,
    createdAt: new Date(), expiresAt: new Date(Date.now() + SESSION_DAYS * 864e5)
  });
  return token;
}
const publicUser = (u) => ({ name: u.name, email: u.email, shares: u.shares, paid: u.paid || 0, sandbox: !!u.sandbox, createdAt: u.createdAt });

/* ---------- API ---------- */
app.get('/api/health', (req, res) => res.json({ ok: true, db: !!db, dbError }));

// Demo request (lead capture)
app.post('/api/demo-requests', limit(6, 60000), needDb, async (req, res) => {
  const d = { name: str(req.body.name), email: str(req.body.email).toLowerCase(), phone: str(req.body.phone, 25), tier: Number(req.body.tier) };
  if (!d.name || !emailOk(d.email) || !phoneOk(d.phone) || !SHARE_OPTIONS.includes(d.tier))
    return res.status(400).json({ error: 'invalid', message: 'Please check your name, email, phone and tier.' });
  await db.collection('demo_requests').insertOne({ ...d, createdAt: new Date(), ip: req.ip, status: 'new' });
  // Email delivery is not wired up; the sandbox credentials are shown on screen instead.
  res.status(201).json({ ok: true, credentials: { email: DEMO.email, password: DEMO.password } });
});

// Investor registration
app.post('/api/investors', limit(8, 60000), needDb, async (req, res) => {
  const b = req.body;
  const u = { name: str(b.name), email: str(b.email).toLowerCase(), phone: str(b.phone, 25), nid: str(b.nid, 20).replace(/\s/g, ''),
              nominee: str(b.nominee), shares: Number(b.shares) };
  const pw = String(b.password || '');
  if (!u.name || !emailOk(u.email) || !phoneOk(u.phone) || !/^\d{10}$|^\d{13}$|^\d{17}$/.test(u.nid) || !u.nominee || !SHARE_OPTIONS.includes(u.shares))
    return res.status(400).json({ error: 'invalid', message: 'Please check all fields. NID must be 10, 13 or 17 digits.' });
  if (pw.length < 8) return res.status(400).json({ error: 'weak_password', message: 'Password must be at least 8 characters.' });
  if (b.agree !== true) return res.status(400).json({ error: 'terms', message: 'Please accept the investment terms.' });
  if (u.email === DEMO.email) return res.status(409).json({ error: 'exists', message: 'This email is reserved.' });
  try {
    const r = await db.collection('investors').insertOne({ ...u, passwordHash: hashPw(pw), paid: 0, agreedAt: new Date(), createdAt: new Date(), status: 'pending' });
    const user = { ...u, _id: r.insertedId, paid: 0, createdAt: new Date() };
    res.status(201).json({ ok: true, token: await newSession(user), user: publicUser(user) });
  } catch (e) {
    if (e.code === 11000) return res.status(409).json({ error: 'exists', message: 'This email is already registered. Please log in.' });
    throw e;
  }
});

// Login (investor or sandbox demo)
app.post('/api/login', limit(10, 60000), needDb, async (req, res) => {
  const email = str(req.body.email).toLowerCase(), pw = String(req.body.password || '');
  let user = null;
  if (email === DEMO.email) { if (pw === DEMO.password) user = DEMO; }
  else {
    const inv = await db.collection('investors').findOne({ email });
    if (inv && checkPw(pw, inv.passwordHash)) user = inv;
  }
  if (!user) return res.status(401).json({ error: 'bad_login', message: 'Incorrect email or password.' });
  res.json({ ok: true, token: await newSession(user), user: publicUser(user) });
});

// Current session
app.get('/api/me', needDb, async (req, res) => {
  const token = (req.headers.authorization || '').replace(/^Bearer /, '');
  if (!token) return res.status(401).json({ error: 'no_token' });
  const s = await db.collection('sessions').findOne({ tokenHash: crypto.createHash('sha256').update(token).digest('hex'), expiresAt: { $gt: new Date() } });
  if (!s) return res.status(401).json({ error: 'expired' });
  const user = s.sandbox ? DEMO : await db.collection('investors').findOne({ _id: s.investor });
  if (!user) return res.status(401).json({ error: 'expired' });
  res.json({ user: publicUser(user) });
});
app.post('/api/logout', needDb, async (req, res) => {
  const token = (req.headers.authorization || '').replace(/^Bearer /, '');
  if (token) await db.collection('sessions').deleteOne({ tokenHash: crypto.createHash('sha256').update(token).digest('hex') });
  res.json({ ok: true });
});

// Admin: view leads & investors (header x-admin-key)
const admin = (req, res, next) => {
  const k = Buffer.from(String(req.headers['x-admin-key'] || '')), a = Buffer.from(ADMIN_KEY);
  return ADMIN_KEY && k.length === a.length && crypto.timingSafeEqual(k, a) ? next() : res.status(401).json({ error: 'unauthorized' });
};
app.get('/api/admin/overview', limit(30, 60000), admin, needDb, async (req, res) => {
  const [demos, investors] = await Promise.all([
    db.collection('demo_requests').find({}, { projection: { ip: 0 } }).sort({ createdAt: -1 }).limit(200).toArray(),
    db.collection('investors').find({}, { projection: { passwordHash: 0 } }).sort({ createdAt: -1 }).limit(200).toArray()
  ]);
  res.json({ demos, investors });
});

/* ---------- static site ---------- */
app.use(express.static(path.join(__dirname, '..', 'public'), { extensions: ['html'] }));
app.use('/api', (req, res) => res.status(404).json({ error: 'not_found' }));
app.use((err, req, res, next) => { console.error(err); res.status(500).json({ error: 'server', message: 'Something went wrong. Please try again.' }); });

app.listen(PORT, () => console.log(`✔ HolyLoy site running at http://localhost:${PORT}`));
connectDb();
