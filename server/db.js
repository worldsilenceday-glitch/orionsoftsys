const { Pool } = require("pg");
require("dotenv").config();
const fs = require("fs");
const path = require("path");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === "production"
    ? { rejectUnauthorized: false }
    : false
});

// Auto-create tables on startup
async function initDB() {
  try {
    const schemaPath = path.join(__dirname, "schema.sql");
    const schema = fs.readFileSync(schemaPath, "utf-8");
    await pool.query(schema);
    console.log("✅ Database tables initialized");
  } catch (err) {
    console.error("❌ DB initialization error:", err.message);
  }
}

// Helper: run query with params
async function query(text, params) {
  const start = Date.now();
  const res = await pool.query(text, params);
  const duration = Date.now() - start;
  return res;
}

// Helper: get one row
async function one(text, params) {
  const res = await query(text, params);
  return res.rows[0] || null;
}

// Helper: get all rows
async function all(text, params) {
  const res = await query(text, params);
  return res.rows;
}

pool.connect()
  .then(() => {
    console.log("✅ PostgreSQL connected");
    initDB();
  })
  .catch((err) => console.error("❌ PostgreSQL connection error:", err.message));

module.exports = { pool, query, one, all };
