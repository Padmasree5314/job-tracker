const path = require('path');
const express = require('express');
const authRoutes = require('./routes/auth');
const applicationRoutes = require('./routes/applications');
const { requireAuth } = require('./middleware/auth');

function createApp(db, secret) {
  if (!secret) throw new Error('JWT secret is required');
  const app = express();
  app.use(express.json());
  app.use(express.static(path.join(__dirname, '..', 'public')));

  app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));
  app.use('/api/auth', authRoutes(db, secret));
  app.use('/api/applications', requireAuth(secret), applicationRoutes(db));

  app.use('/api', (_req, res) => res.status(404).json({ error: 'Not found' }));
  // Central error handler (e.g. malformed JSON bodies)
  // eslint-disable-next-line no-unused-vars
  app.use((err, _req, res, _next) => {
    if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'Invalid JSON' });
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  });
  return app;
}

module.exports = { createApp };
