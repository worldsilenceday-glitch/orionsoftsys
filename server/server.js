require("dotenv").config();
const express = require("express");
const path = require("path");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");

// Import database (auto-connects)
require("./db");

const { generalLimiter } = require("./middleware/rateLimiter");
const { errorHandler, notFound } = require("./middleware/errorHandler");

// Import routes
const authRoutes = require("./routes/auth");
const chatRoutes = require("./routes/chat");
const billingRoutes = require("./routes/billing");
const translateRoutes = require("./routes/translate");

const app = express();

// ==================== MIDDLEWARE ====================
app.use(helmet());
app.use(morgan("dev"));

// CORS
const corsOrigins = process.env.FRONTEND_URL
  ? [process.env.FRONTEND_URL]
  : true;

app.use(
  cors({
    origin: corsOrigins,
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"]
  })
);

// Body parsing
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Rate limiter
app.use("/api", generalLimiter);

// ==================== SERVE STATIC FRONTEND ====================
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
  res.json({
    status: "ok",
    service: "Orion SaaS API",
    version: "1.0.0",
    environment: process.env.NODE_ENV || "development",
    database: "postgresql",
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/billing", billingRoutes);
app.use("/api/translate", translateRoutes);

// ==================== SPA FALLBACK ====================
app.get("*", (req, res, next) => {
  if (req.path.startsWith("/api")) return next();

  const fs = require("fs");
  const filePath = path.join(frontendDir, req.path);
  const exists = fs.existsSync(filePath);

  if (exists && !filePath.includes("..")) {
    return next();
  }

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
