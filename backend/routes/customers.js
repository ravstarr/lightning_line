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

module.exports = router;
