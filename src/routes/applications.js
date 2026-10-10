const express = require('express');

const STATUSES = ['Applied', 'Online Assessment', 'Interview', 'Offer', 'Rejected'];

function validate(body, { partial = false } = {}) {
  const errors = [];
  const out = {};
  const fields = ['company', 'role', 'status', 'link', 'notes', 'applied_date'];
  for (const f of fields) {
    if (body[f] !== undefined) out[f] = typeof body[f] === 'string' ? body[f].trim() : body[f];
  }
  if (!partial) {
    if (!out.company) errors.push('company is required');
    if (!out.role) errors.push('role is required');
  } else {
    if (out.company === '') errors.push('company cannot be empty');
    if (out.role === '') errors.push('role cannot be empty');
  }
  if (out.status !== undefined && !STATUSES.includes(out.status)) {
    errors.push(`status must be one of: ${STATUSES.join(', ')}`);
  }
  if (out.applied_date !== undefined && !/^\d{4}-\d{2}-\d{2}$/.test(out.applied_date)) {
    errors.push('applied_date must be YYYY-MM-DD');
  }
  return { errors, data: out };
}

module.exports = function applicationRoutes(db) {
  const router = express.Router();

  // GET /api/applications?status=Interview&q=google
  router.get('/', (req, res) => {
    const { status, q } = req.query;
    let sql = 'SELECT * FROM applications WHERE user_id = ?';
    const params = [req.user.id];
    if (status) {
      sql += ' AND status = ?';
      params.push(status);
    }
    if (q) {
      sql += ' AND (company LIKE ? OR role LIKE ?)';
      params.push(`%${q}%`, `%${q}%`);
    }
    sql += ' ORDER BY applied_date DESC, id DESC';
    res.json(db.prepare(sql).all(...params));
  });

  // GET /api/applications/stats  -> counts per status
  router.get('/stats', (req, res) => {
    const rows = db
      .prepare('SELECT status, COUNT(*) AS count FROM applications WHERE user_id = ? GROUP BY status')
      .all(req.user.id);
    const stats = Object.fromEntries(STATUSES.map((s) => [s, 0]));
    let total = 0;
    for (const r of rows) {
      stats[r.status] = r.count;
      total += r.count;
    }
    res.json({ total, byStatus: stats });
  });

  router.post('/', (req, res) => {
    const { errors, data } = validate(req.body || {});
    if (errors.length) return res.status(400).json({ errors });
    const cols = Object.keys(data);
    const info = db
      .prepare(
        `INSERT INTO applications (user_id, ${cols.join(', ')}) VALUES (?, ${cols.map(() => '?').join(', ')})`
      )
      .run(req.user.id, ...cols.map((c) => data[c]));
    const row = db.prepare('SELECT * FROM applications WHERE id = ?').get(info.lastInsertRowid);
    res.status(201).json(row);
  });

  router.put('/:id', (req, res) => {
    const existing = db
      .prepare('SELECT id FROM applications WHERE id = ? AND user_id = ?')
      .get(req.params.id, req.user.id);
    if (!existing) return res.status(404).json({ error: 'Application not found' });

    const { errors, data } = validate(req.body || {}, { partial: true });
    if (errors.length) return res.status(400).json({ errors });
    const cols = Object.keys(data);
    if (!cols.length) return res.status(400).json({ error: 'No fields to update' });

    db.prepare(`UPDATE applications SET ${cols.map((c) => `${c} = ?`).join(', ')} WHERE id = ?`).run(
      ...cols.map((c) => data[c]),
      req.params.id
    );
    res.json(db.prepare('SELECT * FROM applications WHERE id = ?').get(req.params.id));
  });

  router.delete('/:id', (req, res) => {
    const info = db
      .prepare('DELETE FROM applications WHERE id = ? AND user_id = ?')
      .run(req.params.id, req.user.id);
    if (!info.changes) return res.status(404).json({ error: 'Application not found' });
    res.status(204).end();
  });

  return router;
};

module.exports.STATUSES = STATUSES;
