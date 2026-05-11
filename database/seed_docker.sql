-- Docker seed file (plain SQL with pre-generated bcrypt hashes)
-- staff password: staff123 | admin password: admin123

INSERT INTO Services (service_key, service_name, estimated_duration) VALUES
  ('payments',     'Tax Payments',        15),
  ('documents',    'Document Processing', 25),
  ('inquiries',    'General Inquiries',   10),
  ('registration', 'New Registration',    30),
  ('other',        'Other Services',      20)
ON CONFLICT (service_key) DO NOTHING;

INSERT INTO Staff (first_name, last_name, role, username, password_hash, counter_id, service_types, status) VALUES
  ('Sarah',   'Johnson', 'clerk',      '1', '$2a$10$39lb640OQNKOgz9h/DWmKul5DXDDloSe1Ta9abXuTbVFz4Xxx.KYm', 1, '{payments,inquiries}',             'active'),
  ('Michael', 'Brown',   'clerk',      '2', '$2a$10$39lb640OQNKOgz9h/DWmKul5DXDDloSe1Ta9abXuTbVFz4Xxx.KYm', 2, '{payments,documents,registration}', 'active'),
  ('Lisa',    'Chen',    'clerk',      '3', '$2a$10$39lb640OQNKOgz9h/DWmKul5DXDDloSe1Ta9abXuTbVFz4Xxx.KYm', 3, '{inquiries,other}',                 'active'),
  ('Robert',  'Davis',   'supervisor', '4', '$2a$10$39lb640OQNKOgz9h/DWmKul5DXDDloSe1Ta9abXuTbVFz4Xxx.KYm', 4, '{documents,registration}',         'active')
ON CONFLICT (username) DO NOTHING;

INSERT INTO Admins (username, password_hash, name) VALUES
  ('admin', '$2a$10$4/lRZmk3L4iESMeqvo3mY.QEoPlRHAuqU0Um/9/qZQppVdPz.jcSe', 'System Administrator')
ON CONFLICT (username) DO NOTHING;

-- Mock customers for TRN lookup demo
-- Easy demo TRNs: 100000001–800000008  |  Seniors: 100000001–500000005
INSERT INTO Customers (TRN, first_name, last_name, date_of_birth) VALUES
  ('100000001', 'Dorothy',  'Campbell',  '1945-03-12'),
  ('200000002', 'Winston',  'Clarke',    '1952-07-28'),
  ('300000003', 'Cyril',    'Morrison',  '1950-02-19'),
  ('400000004', 'Mabel',    'Brown',     '1948-11-05'),
  ('500000005', 'Neville',  'Thomas',    '1947-04-22'),
  ('600000006', 'Marcus',   'Reid',      '1985-08-14'),
  ('700000007', 'Kezia',    'Thompson',  '1992-03-27'),
  ('800000008', 'Andre',    'Williams',  '1978-11-11'),
  ('104523698', 'Ivy',      'Patterson', '1955-09-30'),
  ('207834512', 'Clarence', 'Walker',    '1943-06-15'),
  ('310945623', 'Eunice',   'James',     '1958-12-08'),
  ('413256734', 'Pauline',  'White',     '1953-08-17'),
  ('516567845', 'Bertram',  'Francis',   '1944-01-09'),
  ('619878956', 'Hyacinth', 'Gordon',    '1956-05-23'),
  ('722189067', 'Lloyd',    'Bennett',   '1949-10-14'),
  ('825490178', 'Shanique', 'Brown',     '1995-06-03'),
  ('928701289', 'Damian',   'Foster',    '1983-09-17'),
  ('131012390', 'Rochelle', 'Davis',     '1999-01-25'),
  ('234323401', 'Kevin',    'Campbell',  '1971-07-04'),
  ('337634512', 'Tanya',    'Morgan',    '1988-12-19'),
  ('440945623', 'Terrence', 'Blake',     '1975-05-08'),
  ('544256734', 'Simone',   'Grant',     '1990-02-14'),
  ('647567845', 'Nadine',   'Stewart',   '1996-07-22'),
  ('750878956', 'Omar',     'Barrett',   '1982-03-31'),
  ('854189067', 'Latoya',   'Edwards',   '1993-05-16')
ON CONFLICT (TRN) DO NOTHING;
