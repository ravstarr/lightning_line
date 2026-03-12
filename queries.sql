SELECT * FROM QueueTickets

-- gets the next waiting ticket
SET @ticket_id = (
    SELECT ticket_id
    FROM QueueTickets
    WHERE status = 'waiting'
    ORDER BY checkin_time ASC
    LIMIT 1
);

-- update ticket to "serving"
UPDATE QueueTickets
SET status = 'serving'
WHERE ticket_id = @ticket_id;

-- retrival of staff id
SET @staff_id = (
    SELECT staff_id
    FROM Staff
    WHERE first_name = 'Janet'
      AND last_name = 'Hall'
    LIMIT 1
);

-- start recording time of service
INSERT INTO ServiceSessions (ticket_id, staff_id, start_time)
VALUES (@ticket_id, @staff_id, NOW());

-- update ticket status to completed
UPDATE QueueTickets
SET status = 'completed'
WHERE ticket_id = @ticket_id;

-- stop recording time of service
UPDATE ServiceSessions
SET end_time = NOW()
WHERE ticket_id = @ticket_id
  AND end_time IS NULL;

-- cancell ticket
UPDATE QueueTickets
SET status = 'cancelled',
    cancelled_at = NOW()
WHERE ticket_id = @ticket_id;

-- Waiting time (served ticket)
SELECT
    qt.ticket_id,
    TIMESTAMPDIFF(MINUTE, qt.checkin_time, ss.start_time) AS waiting_minutes
FROM QueueTickets qt
JOIN ServiceSessions ss ON qt.ticket_id = ss.ticket_id
WHERE qt.ticket_id = @ticket_id;

-- Service duration
SELECT
	qt.ticket_id,
    TIMESTAMPDIFF(MINUTE, ss.start_time, ss.end_time) AS service_minutes
FROM QueueTickets qt
JOIN ServiceSessions ss ON qt.ticket_id = ss.ticket_id
WHERE ss.ticket_id = @ticket_id;

-- Total time in office
SELECT
	qt.ticket_id,
    TIMESTAMPDIFF(MINUTE, qt.checkin_time, ss.end_time) AS total_minutes
FROM QueueTickets qt
JOIN ServiceSessions ss ON qt.ticket_id = ss.ticket_id
WHERE qt.ticket_id = @ticket_id;

-- cancelled before service (time spent)
SELECT
	qt.ticket_id,
    TIMESTAMPDIFF(MINUTE, qt.checkin_time, qt.cancelled_at) AS waited_before_cancel
FROM QueueTickets qt
JOIN ServiceSessions ss ON qt.ticket_id = ss.ticket_id
WHERE qt.ticket_id = @ticket_id;


