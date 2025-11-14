// server.js
require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const cookieParser = require('cookie-parser');
const path = require('path');
const cors = require('cors');

const User = require('./models/User');

const app = express();

// Security middlewares
app.use(helmet());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// CORS (if you ever host frontend separately, configure origin appropriately)
app.use(cors({
  origin: true,
  credentials: true
}));

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error('MONGODB_URI not set. See .env.example');
  process.exit(1);
}

mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => {
  console.log('Connected to MongoDB');
}).catch(err => {
  console.error('MongoDB connection error:', err);
  process.exit(1);
});

// Session store in MongoDB (so sessions persist across instances)
app.use(session({
  name: 'sessionId',
  secret: process.env.SESSION_SECRET || 'change_this_secret',
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({ mongoUrl: MONGODB_URI }),
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production', // set true if using HTTPS
    maxAge: 1000 * 60 * 60 * 24 // 1 day
  }
}));

// Serve frontend static files from /public
app.use(express.static(path.join(__dirname, 'public')));

// ---------- Routes ----------

// Register user
app.post('/api/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) return res.status(400).json({ error: 'All fields required' });

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) return res.status(409).json({ error: 'Email already registered' });

    const hash = await bcrypt.hash(password, 12);
    const user = new User({ name, email: email.toLowerCase(), password: hash });
    await user.save();

    // set session
    req.session.userId = user._id;
    res.json({ message: 'Registered successfully', user: { id: user._id, name: user.name, email: user.email } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Login
app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Missing credentials' });

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) return res.status(401).json({ error: 'Invalid email or password' });

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(401).json({ error: 'Invalid email or password' });

    req.session.userId = user._id;
    res.json({ message: 'Logged in', user: { id: user._id, name: user.name, email: user.email } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Logout
app.post('/api/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) return res.status(500).json({ error: 'Could not log out' });
    res.clearCookie('sessionId');
    res.json({ message: 'Logged out' });
  });
});

// Middleware to require login
function requireAuth(req, res, next) {
  if (!req.session.userId) return res.status(401).json({ error: 'Unauthorized' });
  next();
}

// Event registration (simple example)
app.post('/api/event/register', requireAuth, async (req, res) => {
  try {
    const { eventName } = req.body;
    if (!eventName) return res.status(400).json({ error: 'Event name required' });

    const user = await User.findById(req.session.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    // prevent duplicate registration for same event
    const already = user.registrations.find(r => r.eventName === eventName);
    if (already) return res.status(409).json({ error: 'Already registered for this event' });

    user.registrations.push({
      eventName,
      registeredAt: new Date()
    });
    await user.save();
    res.json({ message: 'Registered for event', registrations: user.registrations });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get current user
app.get('/api/me', async (req, res) => {
  if (!req.session.userId) return res.json({ user: null });
  const user = await User.findById(req.session.userId).select('-password');
  res.json({ user });
});

// Admin: list all registrations (for demo; in production protect this)
app.get('/api/admin/registrations', async (req, res) => {
  // In production, add proper admin auth
  const users = await User.find().select('name email registrations');
  res.json({ users });
});

// fallback to frontend for any other route (so SPA pages load)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});
