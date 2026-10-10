const { createDb } = require('./db');
const { createApp } = require('./app');

const secret = process.env.JWT_SECRET;
if (!secret) {
  console.error('Set JWT_SECRET (see .env.example) before starting the server.');
  process.exit(1);
}
const db = createDb(process.env.DB_FILE || 'tracker.db');
const port = process.env.PORT || 3000;
createApp(db, secret).listen(port, () => console.log(`Job Tracker running on http://localhost:${port}`));
