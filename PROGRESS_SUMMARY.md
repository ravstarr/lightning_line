# Project Progress & Technical Overview

## 1. Frontend Progress Summary
**Completed Modules:**
- **Customer Kiosk:** TRN-based check-in with automatic priority detection (55+), Manual check-in option, Service Selection, Digital Ticket Display.
- **Staff Interface:** Login, Personal Dashboard to manage current ticket, call next customer, mark as completed/delayed.
- **Admin Dashboard:** Overview of queue stats (Waiting, Serving, Priority), Counter status monitoring.
- **Routing & State:** React Router for navigation, Redux Toolkit for state management (queue data), Mock Service for backend simulation.

**Current Status:** The frontend is fully functional with mock data. Visuals updated to Dark Blue/Sky Blue theme.

## 2. Technology Stack Rationale

### Why React?
- **Component-Based:** Allows reusable UI elements (e.g., `Logo`, `TRNInput`, `ServiceSelection`).
- **Virtual DOM:** Fast updates for real-time queue status changes without reloading the page.
- **Ecosystem:** Huge library support (Router, Redux) accelerates development.

### Why TypeScript?
- **Type Safety:** Prevents common errors (e.g., passing a string where a number is expected, like calculating wait times).
- **IntelliSense:** Better autocomplete and code navigation, essential for larger projects involving data like `Ticket` and `Service` objects.
- **Maintainability:** Makes the code self-documenting and easier to debug.

### Why JSON Files (package.json, tsconfig.json, etc.)?
- **Configuration:** Not code, but settings. `package.json` tracks dependencies (React, Tailwind), `tsconfig.json` configures TypeScript rules. `manifest.json` provides metadata for the web app (icons, name).

## 3. Addressing Issues
**Why is the Admin Dashboard Blank?**
- The dashboard is protected. If you navigate directly to `/admin/dashboard` without logging in, it redirects you to `/admin/login`.
- **Solution:** Go to **Admin Login** page first. Use credentials: `username: admin`, `password: admin123`.

## 4. Future Implementation: Machine Learning & Database

**Goal:** Predict accurate wait times based on historical data.

### Implementation Plan
1.  **Database (PostgreSQL):** Stores all historical ticket data (Service Type, Time of Day, Day of Week, Staff Speed, Duration).
2.  **Machine Learning Model (Python/Scikit-Learn or TensorFlow):**
    -   **Training:** The model learns patterns from the database (e.g., "Mondays at 9 AM for 'Tax Payment' take 15 mins on average").
    -   **Prediction:** When a new ticket is generated, the model inputs current conditions (Time, Queue Length, Staff Availability) to output a predicted wait time.
3.  **Integration (Docker):**
    -   The ML model runs as a microservice in a Docker container (API endpoint).
    -   The Node.js backend calls this API when a ticket is created to get the `estimatedWait` time.
    -   **Why Docker?** Ensures the ML environment (Python) is isolated and consistent, regardless of where the app is deployed.

This approach ensures the system gets smarter over time, providing highly accurate estimates to customers.

