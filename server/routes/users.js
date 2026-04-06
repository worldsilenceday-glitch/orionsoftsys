const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const { query, one, all } = require("../db");

// Helper: get user from token
async function getUserFromToken(req) {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) return null;
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const UserModel = require("../models/User");
    return await UserModel.findById(decoded.id);
  } catch (err) {
    return null;
  }
}

// GET /api/users/stats - Return stats for logged-in user
router.get("/stats", async (req, res) => {
  try {
    const user = await getUserFromToken(req);
    if (!user) {
      return res.status(401).json({ error: "Authentication required", code: "NO_TOKEN" });
    }

    res.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        plan: user.plan,
        messagesThisPeriod: user.messagesThisPeriod,
        totalMessagesAllTime: user.totalMessagesAllTime,
        memberSince: user.createdAt
      }
    });
  } catch (error) {
    res.status(500).json({ error: "Internal server error", code: "INTERNAL_ERROR" });
  }
});

// GET /api/admin/users - List all users (admin only)
router.get("/admin/users", async (req, res) => {
  try {
    const user = await getUserFromToken(req);
    if (!user || user.email !== process.env.ADMIN_EMAIL) {
      return res.status(403).json({ error: "Admin access required", code: "ADMIN_REQUIRED" });
    }

    const users = await all(
      `SELECT id, name, email, plan, subscription_status, messages_this_period, total_messages_all_time, created_at FROM users ORDER BY created_at DESC`
    );

    const stats = await one(
      `SELECT 
        COUNT(*) as total_users,
        COUNT(CASE WHEN subscription_status = 'active' THEN 1 END) as active_subscriptions,
        SUM(total_messages_all_time) as total_messages
       FROM users`
    );

    res.json({ users, stats });
  } catch (error) {
    res.status(500).json({ error: "Internal server error", code: "INTERNAL_ERROR" });
  }
});

module.exports = router;
