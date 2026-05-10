const express = require("express");
const cors = require("cors");

const healthRoutes = require("./routes/health.routes");
const ticketRoutes = require("./routes/tickets.routes");
const servicesRoutes = require("./routes/services.routes");
const countersRoutes = require("./routes/counters.routes");
const analyticsRoutes = require("./routes/analytics.routes");
const authRoutes = require("./routes/auth.routes");

const errorHandler = require("./middleware/error.middleware");
const notFound = require("./middleware/notfound.middleware");

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/health", healthRoutes);
app.use("/api/tickets", ticketRoutes);
app.use("/api/services", servicesRoutes);
app.use("/api/counters", countersRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/auth", authRoutes);

app.use(errorHandler);
app.use(notFound);

module.exports = app;