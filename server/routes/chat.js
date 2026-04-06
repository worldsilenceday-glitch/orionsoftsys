const express = require("express");
const router = express.Router();
const { chatLimiter } = require("../middleware/rateLimiter");
const { processChat, getChatHistory } = require("../services/aiService");
const jwt = require("jsonwebtoken");

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

// ==================== SEND MESSAGE ====================
router.post("/", chatLimiter, async (req, res, next) => {
  try {
    const user = await getUserFromToken(req);
    if (!user) {
      return res.status(401).json({ error: "Authentication required", code: "NO_TOKEN" });
    }

    const { message } = req.body;
    if (!message || !message.trim()) {
      return res.status(400).json({ error: "Message is required", code: "EMPTY_MESSAGE" });
    }

    const result = await processChat(user, message.trim());

    res.json({
      reply: result.reply,
      leadCaptured: result.leadCaptured,
      usage: result.usage
    });
  } catch (error) {
    next(error);
  }
});

// ==================== GET CHAT HISTORY ====================
router.get("/history", async (req, res, next) => {
  try {
    const user = await getUserFromToken(req);
    if (!user) {
      return res.status(401).json({ error: "Authentication required", code: "NO_TOKEN" });
    }

    const limit = parseInt(req.query.limit) || 10;
    const history = await getChatHistory(user.id, limit);

    res.json({ conversations: history });
  } catch (error) {
    next(error);
  }
});

// ==================== CLEAR CHAT HISTORY ====================
router.delete("/history", async (req, res, next) => {
  try {
    const user = await getUserFromToken(req);
    if (!user) {
      return res.status(401).json({ error: "Authentication required", code: "NO_TOKEN" });
    }

    const ChatModel = require("../models/Chat");
    await ChatModel.deleteByUser(user.id);

    res.json({ message: "Chat history cleared" });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
