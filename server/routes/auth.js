const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const { body, validationResult } = require("express-validator");
const UserModel = require("../models/User");
const { authLimiter } = require("../middleware/rateLimiter");

// Generate JWT
const generateToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: "30d" });
};

// ==================== REGISTER ====================
router.post("/register", authLimiter, [
  body("name").trim().isLength({ min: 2 }).withMessage("Name must be at least 2 characters"),
  body("email").isEmail().normalizeEmail().withMessage("Valid email is required"),
  body("password").isLength({ min: 6 }).withMessage("Password must be at least 6 characters"),
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: errors.array()[0].msg, code: "VALIDATION_ERROR" });
    }

    const { name, email, password, businessType, phone } = req.body;

    // Check if user exists
    const existing = await UserModel.findByEmail(email);
    if (existing) {
      return res.status(409).json({ error: "Email already registered", code: "EMAIL_EXISTS" });
    }

    // Create user with 14-day trial
    const user = await UserModel.create({
      name,
      email,
      password,
      businessType: businessType || "other",
      phone: phone || ""
    });

    const token = generateToken(user.id);

    res.status(201).json({
      message: "Account created successfully. Your 14-day free trial has started.",
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        plan: user.plan,
        trialEndsAt: user.trialEndsAt
      },
      token
    });
  } catch (error) {
    next(error);
  }
});

// ==================== LOGIN ====================
router.post("/login", authLimiter, [
  body("email").isEmail().normalizeEmail().withMessage("Valid email is required"),
  body("password").notEmpty().withMessage("Password is required"),
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: errors.array()[0].msg, code: "VALIDATION_ERROR" });
    }

    const { email, password } = req.body;

    const user = await UserModel.findByEmail(email);
    if (!user) {
      return res.status(401).json({ error: "No account found with this email", code: "USER_NOT_FOUND" });
    }

    const isValid = await UserModel.comparePassword(user, password);
    if (!isValid) {
      return res.status(401).json({ error: "Incorrect password", code: "INVALID_PASSWORD" });
    }

    // Update last active
    await UserModel.update(user.id, {});

    const token = generateToken(user.id);

    res.json({
      message: "Welcome back!",
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        plan: user.plan,
        subscriptionStatus: user.subscriptionStatus,
        trialEndsAt: user.trialEndsAt,
        businessType: user.businessType
      },
      token
    });
  } catch (error) {
    next(error);
  }
});

// ==================== GET PROFILE ====================
router.get("/profile", async (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace("Bearer ", "");
    if (!token) {
      return res.status(401).json({ error: "Not authenticated", code: "NO_TOKEN" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await UserModel.findById(decoded.id);

    if (!user) {
      return res.status(404).json({ error: "User not found", code: "USER_NOT_FOUND" });
    }

    // Check if trial expired
    if (user.subscriptionStatus === "trial" && user.trialEndsAt && new Date() > new Date(user.trialEndsAt)) {
      await UserModel.update(user.id, {});
      user.subscriptionStatus = "expired";
    }

    const limits = UserModel.getPlanLimits(user.plan);

    res.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        plan: user.plan,
        subscriptionStatus: user.subscriptionStatus,
        trialEndsAt: user.trialEndsAt,
        businessType: user.businessType,
        phone: user.phone,
        aiContext: user.aiContext,
        messagesThisPeriod: user.messagesThisPeriod,
        totalMessagesAllTime: user.totalMessagesAllTime,
        limits
      }
    });
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({ error: "Token expired", code: "TOKEN_EXPIRED" });
    }
    next(error);
  }
});

// ==================== UPDATE PROFILE ====================
router.put("/profile", async (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace("Bearer ", "");
    if (!token) {
      return res.status(401).json({ error: "Not authenticated", code: "NO_TOKEN" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await UserModel.findById(decoded.id);

    if (!user) {
      return res.status(404).json({ error: "User not found", code: "USER_NOT_FOUND" });
    }

    // Update allowed fields
    const updates = {};
    if (req.body.name !== undefined) updates.name = req.body.name;
    if (req.body.phone !== undefined) updates.phone = req.body.phone;
    if (req.body.businessType !== undefined) updates.business_type = req.body.businessType;
    if (req.body.aiContext !== undefined) updates.ai_context = req.body.aiContext;
    if (req.body.password && req.body.password.length >= 6) {
      const bcrypt = require("bcryptjs");
      updates.password = await bcrypt.hash(req.body.password, 12);
    }

    const updated = await UserModel.update(user.id, updates);

    res.json({
      message: "Profile updated",
      user: {
        id: updated.id,
        name: updated.name,
        email: updated.email,
        plan: updated.plan,
        businessType: updated.businessType,
        phone: updated.phone,
        aiContext: updated.aiContext
      }
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
