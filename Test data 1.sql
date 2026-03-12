INSERT INTO Customers
(TRN, first_name, middle_initial, last_name, date_of_birth, citizenship)
VALUES
('123456789', 'John', 'T', 'Brown', '1998-05-10', 'Jamaican');

INSERT INTO Staff (first_name, last_name, role)
VALUES ('Johnny', 'Baxter', 'Clerk');

INSERT INTO QueueTickets (TRN, service_id, status)
VALUES (
    '123456789',
    (SELECT service_id FROM Services WHERE service_name = 'Payments'),
    'waiting'
);

SELECT * FROM QueueTickets
SELECT * FROM ServiceSessions
SELECT * FROM QueueTickets


