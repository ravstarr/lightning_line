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

    // ── Mock Customers (for TRN lookup demo) ─────────────────────────────
    const customers = [
      // Easy demo TRNs — seniors (65+)
      { trn: '100000001', first: 'Dorothy',  last: 'Campbell',  dob: '1945-03-12' },
      { trn: '200000002', first: 'Winston',  last: 'Clarke',    dob: '1952-07-28' },
      { trn: '300000003', first: 'Cyril',    last: 'Morrison',  dob: '1950-02-19' },
      { trn: '400000004', first: 'Mabel',    last: 'Brown',     dob: '1948-11-05' },
      { trn: '500000005', first: 'Neville',  last: 'Thomas',    dob: '1947-04-22' },
      // Easy demo TRNs — regular
      { trn: '600000006', first: 'Marcus',   last: 'Reid',      dob: '1985-08-14' },
      { trn: '700000007', first: 'Kezia',    last: 'Thompson',  dob: '1992-03-27' },
      { trn: '800000008', first: 'Andre',    last: 'Williams',  dob: '1978-11-11' },
      // Realistic TRNs — seniors
      { trn: '104523698', first: 'Ivy',      last: 'Patterson', dob: '1955-09-30' },
      { trn: '207834512', first: 'Clarence', last: 'Walker',    dob: '1943-06-15' },
      { trn: '310945623', first: 'Eunice',   last: 'James',     dob: '1958-12-08' },
      { trn: '413256734', first: 'Pauline',  last: 'White',     dob: '1953-08-17' },
      { trn: '516567845', first: 'Bertram',  last: 'Francis',   dob: '1944-01-09' },
      { trn: '619878956', first: 'Hyacinth', last: 'Gordon',    dob: '1956-05-23' },
      { trn: '722189067', first: 'Lloyd',    last: 'Bennett',   dob: '1949-10-14' },
      // Realistic TRNs — regular
      { trn: '825490178', first: 'Shanique', last: 'Brown',     dob: '1995-06-03' },
      { trn: '928701289', first: 'Damian',   last: 'Foster',    dob: '1983-09-17' },
      { trn: '131012390', first: 'Rochelle', last: 'Davis',     dob: '1999-01-25' },
      { trn: '234323401', first: 'Kevin',    last: 'Campbell',  dob: '1971-07-04' },
      { trn: '337634512', first: 'Tanya',    last: 'Morgan',    dob: '1988-12-19' },
      { trn: '440945623', first: 'Terrence', last: 'Blake',     dob: '1975-05-08' },
      { trn: '544256734', first: 'Simone',   last: 'Grant',     dob: '1990-02-14' },
      { trn: '647567845', first: 'Nadine',   last: 'Stewart',   dob: '1996-07-22' },
      { trn: '750878956', first: 'Omar',     last: 'Barrett',   dob: '1982-03-31' },
      { trn: '854189067', first: 'Latoya',   last: 'Edwards',   dob: '1993-05-16' },
    ];

    for (const c of customers) {
      await client.query(
        `INSERT INTO Customers (TRN, first_name, last_name, date_of_birth)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (TRN) DO UPDATE SET
           first_name    = EXCLUDED.first_name,
           last_name     = EXCLUDED.last_name,
           date_of_birth = EXCLUDED.date_of_birth`,
        [c.trn, c.first, c.last, c.dob]
      );
    }
    console.log('  ✓ Mock customers seeded (25 records — TRNs 100000001–800000008 + realistic)');

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
