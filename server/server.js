require("dotenv").config();
const express = require("express");
const path = require("path");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const { generalLimiter } = require("./middleware/rateLimiter");
const { errorHandler, notFound } = require("./middleware/errorHandler");

// Import routes
const authRoutes = require("./routes/auth");
const chatRoutes = require("./routes/chat");
const billingRoutes = require("./routes/billing");
const translateRoutes = require("./routes/translate");

const app = express();

// ==================== DATABASE ====================
let mongoose;
const MONGODB_URI = process.env.MONGODB_URI;

if (MONGODB_URI) {
  mongoose = require("mongoose");
  mongoose
    .connect(MONGODB_URI)
    .then(() => console.log("✅ MongoDB connected"))
    .catch((err) => console.warn("⚠️ MongoDB unavailable (will retry):", err.message));
} else {
  console.log("ℹ️ No MONGODB_URI set - running without database");
}

// ==================== MIDDLEWARE ====================
app.use(helmet());
app.use(morgan("dev"));

// CORS - allow all in dev, restrict in prod
const corsOrigins = process.env.FRONTEND_URL
  ? [process.env.FRONTEND_URL]
  : true; // Allow all in development

app.use(
  cors({
    origin: corsOrigins,
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// Body parsing
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// General rate limiter
app.use("/api", generalLimiter);

// ==================== SERVE STATIC FRONTEND ====================
// The frontend lives in the parent directory of /server
const frontendDir = path.join(__dirname, "..");
app.use(express.static(frontendDir, {
  maxAge: process.env.NODE_ENV === "production" ? "1d" : 0,
  setHeaders: (res, filePath) => {
    if (filePath.endsWith(".html")) {
      res.setHeader("Cache-Control", "no-cache");
    }
  }
}));

// ==================== API ROUTES ====================

// Health check (required by Render)
app.get("/api/health", (req, res) => {
  const dbStatus = mongoose
    ? mongoose.connection.readyState === 1
      ? "connected"
      : "disconnected"
    : "not_configured";

  res.json({
    status: "ok",
    service: "Orion SaaS API",
    version: "1.0.0",
    environment: process.env.NODE_ENV || "development",
    database: dbStatus,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/billing", billingRoutes);
app.use("/api/translate", translateRoutes);

// ==================== SPA FALLBACK ====================
// Any non-API route that doesn't match a file serves index.html
app.get("*", (req, res, next) => {
  // Skip if it's an API route
  if (req.path.startsWith("/api")) return next();

  const filePath = path.join(frontendDir, req.path);
  const exists = require("fs").existsSync(filePath);

  if (exists && !filePath.includes("..")) {
    return next(); // Let static middleware handle it
  }

  // Serve index.html for unknown routes (SPA behavior)
  res.sendFile(path.join(frontendDir, "index.html"));
});

// ==================== ERROR HANDLING ====================
app.use(notFound);
app.use(errorHandler);

// ==================== START SERVER ====================
const PORT = process.env.PORT || 5000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Orion SaaS API running on port ${PORT}`);
  console.log(`📡 Environment: ${process.env.NODE_ENV || "development"}`);
  console.log(`🌐 Frontend: http://localhost:${PORT}`);
  console.log(`🔌 API: http://localhost:${PORT}/api/health`);
});

module.exports = app;
