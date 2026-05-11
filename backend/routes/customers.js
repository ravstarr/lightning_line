const express = require('express');
const router = express.Router();
const pool = require('../config/database');

// POST /api/customers/checkin  — upsert customer record
router.post('/checkin', async (req, res) => {
  const { trn, firstName, lastName, middleInitial, dob, citizenship, phone } = req.body;

  if (!trn) {
    return res.status(400).json({ error: 'TRN is required.' });
  }

  try {
    const result = await pool.query(
      `INSERT INTO Customers (TRN, first_name, middle_initial, last_name, date_of_birth, citizenship, phone)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (TRN) DO UPDATE SET
         first_name = COALESCE(EXCLUDED.first_name, Customers.first_name),
         last_name  = COALESCE(EXCLUDED.last_name,  Customers.last_name),
         phone      = COALESCE(EXCLUDED.phone,      Customers.phone)
       RETURNING *`,
      [trn, firstName || null, lastName || null, middleInitial || null, dob || null, citizenship || null, phone || null]
    );

    res.json({ customer: result.rows[0] });
  } catch (err) {
    console.error('Customer checkin error:', err);
    res.status(500).json({ error: 'Server error.' });
  }
});

// GET /api/customers/lookup/:trn  — check if TRN exists and return customer info
router.get('/lookup/:trn', async (req, res) => {
  const { trn } = req.params;

  try {
    const result = await pool.query(
      'SELECT first_name, last_name, date_of_birth FROM Customers WHERE TRN = $1',
      [trn]
    );

    if (result.rows.length === 0) {
      return res.json({ found: false });
    }

    const c = result.rows[0];
    let age = 0;
    let priority = 'regular';

    if (c.date_of_birth) {
      const dob = new Date(c.date_of_birth);
      const today = new Date();
      age = today.getFullYear() - dob.getFullYear();
      const m = today.getMonth() - dob.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;
      if (age >= 65) priority = 'senior';
    }

    res.json({
      found: true,
      customer: {
        firstName:  c.first_name,
        lastName:   c.last_name,
        dob:        c.date_of_birth,
        age,
        priority,
      },
    });
  } catch (err) {
    console.error('TRN lookup error:', err);
    res.status(500).json({ error: 'Server error.' });
  }
});

module.exports = router;
