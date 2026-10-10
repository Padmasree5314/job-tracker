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
