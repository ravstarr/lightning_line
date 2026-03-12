CREATE TABLE Customers (
    TRN VARCHAR(20) PRIMARY KEY,
    first_name VARCHAR(50),
    middle_initial VARCHAR(50),
    last_name VARCHAR(50),
    date_of_birth DATE,
    citizenship VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE Services (
    service_id INT AUTO_INCREMENT PRIMARY KEY,
    service_name VARCHAR(100),
    estimated_duration INT
);

CREATE TABLE Staff (
    staff_id INT AUTO_INCREMENT PRIMARY KEY,
    first_name VARCHAR(100), 
    last_name VARCHAR(100),
    role VARCHAR(50)
);

CREATE TABLE QueueTickets (
    ticket_id INT AUTO_INCREMENT PRIMARY KEY,
    TRN VARCHAR(20),
    service_id INT,
    status VARCHAR(20),
    checkin_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    cancelled_at TIMESTAMP NULL,

    FOREIGN KEY (TRN) REFERENCES Customers(TRN),
    FOREIGN KEY (service_id) REFERENCES Services(service_id)
);

CREATE TABLE ServiceSessions (
    session_id INT AUTO_INCREMENT PRIMARY KEY,
    ticket_id INT,
    staff_id INT,
    start_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    end_time TIMESTAMP,
    
    FOREIGN KEY (ticket_id) REFERENCES QueueTickets(ticket_id),
    FOREIGN KEY (staff_id) REFERENCES Staff(staff_id)
);
