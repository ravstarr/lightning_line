/**
 * Database seed script — run with: node database/seed.js
 * Requires: npm install bcryptjs pg dotenv  (from the backend folder)
 *
 * Usage:
 *   cd backend && npm install
 *   cd .. && node database/seed.js
 */

require('dotenv').config({ path: './backend/.env' });
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const pool = new Pool({
  host:     process.env.DB_HOST     || 'localhost',
  port:     parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME     || 'lightning_line',
  user:     process.env.DB_USER     || 'postgres',
  password: process.env.DB_PASSWORD || '',
});

async function seed() {
  const client = await pool.connect();
  try {
    console.log('Connected to PostgreSQL. Seeding...');

    // ── Services ──────────────────────────────────────────────────────────
    await client.query(`
      INSERT INTO Services (service_key, service_name, estimated_duration) VALUES
        ('payments',     'Tax Payments',        15),
        ('documents',    'Document Processing', 25),
        ('inquiries',    'General Inquiries',   10),
        ('registration', 'New Registration',    30),
        ('other',        'Other Services',      20)
      ON CONFLICT (service_key) DO UPDATE
        SET service_name = EXCLUDED.service_name,
            estimated_duration = EXCLUDED.estimated_duration
    `);
    console.log('  ✓ Services seeded');

    // ── Staff (username = numeric staff ID as string for easy login) ───────
    const staffMembers = [
      { firstName: 'Sarah',  lastName: 'Johnson', role: 'clerk',      username: '1', password: 'staff123', counter: 1, services: ['payments', 'inquiries'] },
      { firstName: 'Michael',lastName: 'Brown',   role: 'clerk',      username: '2', password: 'staff123', counter: 2, services: ['payments', 'documents', 'registration'] },
      { firstName: 'Lisa',   lastName: 'Chen',    role: 'clerk',      username: '3', password: 'staff123', counter: 3, services: ['inquiries', 'other'] },
      { firstName: 'Robert', lastName: 'Davis',   role: 'supervisor', username: '4', password: 'staff123', counter: 4, services: ['documents', 'registration'] },
    ];

    for (const s of staffMembers) {
      const hash = await bcrypt.hash(s.password, 10);
      await client.query(
        `INSERT INTO Staff (first_name, last_name, role, username, password_hash, counter_id, service_types, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, 'active')
         ON CONFLICT (username) DO UPDATE
           SET first_name    = EXCLUDED.first_name,
               last_name     = EXCLUDED.last_name,
               password_hash = EXCLUDED.password_hash,
               counter_id    = EXCLUDED.counter_id,
               service_types = EXCLUDED.service_types`,
        [s.firstName, s.lastName, s.role, s.username, hash, s.counter, s.services]
      );
    }
    console.log('  ✓ Staff seeded (IDs: 1-4, password: staff123)');

    // ── Admin ─────────────────────────────────────────────────────────────
    const adminHash = await bcrypt.hash('admin123', 10);
    await client.query(
      `INSERT INTO Admins (username, password_hash, name)
       VALUES ('admin', $1, 'System Administrator')
       ON CONFLICT (username) DO UPDATE SET password_hash = EXCLUDED.password_hash`,
      [adminHash]
    );
    console.log('  ✓ Admin seeded (username: admin, password: admin123)');

    console.log('\nSeeding complete!');
  } catch (err) {
    console.error('Seed error:', err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

seed();
