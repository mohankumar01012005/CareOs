const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const cookieParser = require("cookie-parser");
require("dotenv").config();

const authRoutes = require("./src/routes/auth.routes");
const { notFoundHandler, errorHandler } = require("./src/middleware/error.middleware");

const app = express();

// Global Middlewares
app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    credentials: true,
  })
);
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(cookieParser());

// Root & Health Check Endpoints
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "CareOS Backend API is running.",
    version: "1.0.0",
  });
});

app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    status: "healthy",
    database: mongoose.connection.readyState === 1 ? "connected" : "disconnected",
    timestamp: new Date().toISOString(),
  });
});

// API Routes
app.use("/api/auth", authRoutes);

// Error Handling Middlewares
app.use(notFoundHandler);
app.use(errorHandler);

// Database Connection & Server Startup (when run directly)
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI;

if (require.main === module) {
  if (!MONGO_URI) {
    console.error("CRITICAL: MONGO_URI is not defined in environment variables.");
    process.exit(1);
  }

  mongoose
    .connect(MONGO_URI)
    .then(() => {
      console.log("MongoDB connected successfully.");

      app.listen(PORT, () => {
        console.log(`CareOS Backend Server running on port ${PORT}`);
      });
    })
    .catch((error) => {
      console.error("MongoDB connection failed:", error.message);
      process.exit(1);
    });
}

module.exports = app;