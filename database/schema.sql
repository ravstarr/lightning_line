-- Lightning Line Queue Management System
-- PostgreSQL Schema

-- Drop tables in reverse dependency order
DROP TABLE IF EXISTS ServiceSessions CASCADE;
DROP TABLE IF EXISTS QueueTickets     CASCADE;
DROP TABLE IF EXISTS Staff            CASCADE;
DROP TABLE IF EXISTS Admins           CASCADE;
DROP TABLE IF EXISTS Services         CASCADE;
DROP TABLE IF EXISTS Customers        CASCADE;

-- Customers (identified by TRN - Tax Registration Number)
CREATE TABLE Customers (
    TRN             VARCHAR(20) PRIMARY KEY,
    first_name      VARCHAR(50),
    middle_initial  VARCHAR(5),
    last_name       VARCHAR(50),
    date_of_birth   DATE,
    citizenship     VARCHAR(50),
    phone           VARCHAR(20),
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Services offered by the tax office
CREATE TABLE Services (
    service_id         SERIAL PRIMARY KEY,
    service_key        VARCHAR(50) UNIQUE NOT NULL,  -- 'payments', 'documents', etc.
    service_name       VARCHAR(100) NOT NULL,
    estimated_duration INT NOT NULL DEFAULT 15       -- minutes
);

-- Staff members (clerks, supervisors)
CREATE TABLE Staff (
    staff_id         SERIAL PRIMARY KEY,
    first_name       VARCHAR(100) NOT NULL,
    last_name        VARCHAR(100) NOT NULL,
    role             VARCHAR(50)  NOT NULL DEFAULT 'clerk',
    username         VARCHAR(50)  UNIQUE NOT NULL,
    password_hash    VARCHAR(255) NOT NULL,
    counter_id       INT,
    service_types    TEXT[],                          -- e.g. '{payments,documents}'
    status           VARCHAR(20)  NOT NULL DEFAULT 'active',
    delay_reason     VARCHAR(100),
    delay_minutes    INT,
    delay_started_at TIMESTAMP
);

-- Admin accounts (separate from staff)
CREATE TABLE Admins (
    admin_id      SERIAL PRIMARY KEY,
    username      VARCHAR(50)  UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name          VARCHAR(100) NOT NULL
);

-- Queue tickets issued to customers
CREATE TABLE QueueTickets (
    ticket_id        SERIAL PRIMARY KEY,
    TRN              VARCHAR(20) REFERENCES Customers(TRN) ON DELETE SET NULL,
    service_id       INT NOT NULL REFERENCES Services(service_id),
    status           VARCHAR(20) NOT NULL DEFAULT 'waiting',
        -- waiting | called | serving | completed | cancelled
    priority_level   VARCHAR(20) NOT NULL DEFAULT 'regular',
        -- regular | senior | disabled | emergency
    queue_number     VARCHAR(20) NOT NULL,
    estimated_wait   INT NOT NULL DEFAULT 15,
    position         INT,
    phone            VARCHAR(20),
    has_disability   BOOLEAN NOT NULL DEFAULT FALSE,
    counter_assigned INT,
    checkin_time     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    called_at        TIMESTAMP,
    completed_at     TIMESTAMP,
    cancelled_at     TIMESTAMP
);

-- Service sessions: tracks which staff served which ticket
CREATE TABLE ServiceSessions (
    session_id  SERIAL PRIMARY KEY,
    ticket_id   INT NOT NULL REFERENCES QueueTickets(ticket_id),
    staff_id    INT NOT NULL REFERENCES Staff(staff_id),
    start_time  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    end_time    TIMESTAMP
);

-- Indexes for common query patterns
CREATE INDEX idx_tickets_status       ON QueueTickets(status);
CREATE INDEX idx_tickets_service      ON QueueTickets(service_id);
CREATE INDEX idx_tickets_checkin_date ON QueueTickets(DATE(checkin_time));
CREATE INDEX idx_sessions_staff       ON ServiceSessions(staff_id);
