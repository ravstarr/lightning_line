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
