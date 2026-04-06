exports.errorHandler = (err, req, res, next) => {
  console.error("Error:", err.message);

  // PostgreSQL unique violation (code 23505)
  if (err.code === "23505") {
    const field = err.detail?.match(/\(([^)]+)\)/)?.[1] || "field";
    return res.status(409).json({ error: `${field} already exists`, code: "DUPLICATE_ENTRY" });
  }

  // PostgreSQL not-null violation (code 23502)
  if (err.code === "23502") {
    return res.status(400).json({ error: "Required field is missing", code: "NOT_NULL_VIOLATION" });
  }

  // PostgreSQL foreign key violation (code 23503)
  if (err.code === "23503") {
    return res.status(400).json({ error: "Referenced record not found", code: "FOREIGN_KEY_VIOLATION" });
  }

  // PostgreSQL check violation (code 23514)
  if (err.code === "23514") {
    return res.status(400).json({ error: "Invalid data value", code: "CHECK_VIOLATION" });
  }

  // JWT errors
  if (err.name === "JsonWebTokenError") {
    return res.status(401).json({ error: "Invalid token", code: "INVALID_TOKEN" });
  }

  if (err.name === "TokenExpiredError") {
    return res.status(401).json({ error: "Token expired", code: "TOKEN_EXPIRED" });
  }

  // Syntax errors in SQL
  if (err.code === "42601") {
    console.error("SQL syntax error:", err.message);
    return res.status(500).json({ error: "Internal server error", code: "DATABASE_ERROR" });
  }

  // Connection errors
  if (err.code === "ECONNREFUSED" || err.code === "ETIMEDOUT") {
    return res.status(503).json({ error: "Database unavailable", code: "DB_UNAVAILABLE" });
  }

  // Default
  res.status(err.statusCode || 500).json({
    error: process.env.NODE_ENV === "production" ? "Internal server error" : err.message,
    code: err.code || "INTERNAL_ERROR"
  });
};

exports.notFound = (req, res) => {
  res.status(404).json({ error: `Route not found: ${req.originalUrl}`, code: "NOT_FOUND" });
};
