const bcrypt = require("bcryptjs");
const { query, one, all } = require("../db");

// Plan limits configuration
const PLAN_LIMITS = {
  free:         { messagesPerDay: 10 },
  starter:      { messagesPerDay: 500 },
  professional: { messagesPerDay: -1 },
  enterprise:   { messagesPerDay: -1 }
};

class UserModel {
  static async create({ name, email, password, businessType = "other", phone = "" }) {
    const hashed = await bcrypt.hash(password, 12);
    const trialEndsAt = new Date();
    trialEndsAt.setDate(trialEndsAt.getDate() + 14);

    const res = await query(
      `INSERT INTO users (name, email, password, business_type, phone, trial_ends_at)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [name, email, hashed, businessType, phone, trialEndsAt]
    );

    return this._format(res.rows[0]);
  }

  static async findByEmail(email) {
    const res = await query(
      `SELECT *, password FROM users WHERE email = $1`,
      [email]
    );
    return res.rows[0] ? this._format(res.rows[0], true) : null;
  }

  static async findById(id) {
    const res = await query(
      `SELECT * FROM users WHERE id = $1`,
      [id]
    );
    return res.rows[0] ? this._format(res.rows[0]) : null;
  }

  static async findByIdWithPassword(id) {
    const res = await query(
      `SELECT *, password FROM users WHERE id = $1`,
      [id]
    );
    return res.rows[0] ? this._format(res.rows[0], true) : null;
  }

  static async update(id, updates) {
    const allowedFields = ["name", "phone", "business_type", "ai_context", "password"];
    const setClauses = [];
    const values = [];
    let idx = 1;

    for (const [key, val] of Object.entries(updates)) {
      if (allowedFields.includes(key) && val !== undefined) {
        setClauses.push(`${key} = $${idx++}`);
        values.push(val);
      }
    }

    if (setClauses.length === 0) return this.findById(id);

    setClauses.push("updated_at = NOW()");
    values.push(id);

    const res = await query(
      `UPDATE users SET ${setClauses.join(", ")} WHERE id = $${idx} RETURNING *`,
      values
    );

    return res.rows[0] ? this._format(res.rows[0]) : null;
  }

  static async updatePlan(userId, plan, subscriptionStatus) {
    const res = await query(
      `UPDATE users SET plan = $1, subscription_status = $2, plan_resets_at = NOW(), messages_this_period = 0, updated_at = NOW()
       WHERE id = $3 RETURNING *`,
      [plan, subscriptionStatus, userId]
    );
    return res.rows[0] ? this._format(res.rows[0]) : null;
  }

  static async incrementMessageCount(userId) {
    await query(
      `UPDATE users SET messages_this_period = messages_this_period + 1, total_messages_all_time = total_messages_all_time + 1, last_active_at = NOW() WHERE id = $1`,
      [userId]
    );
  }

  static async resetDailyCounter(user) {
    const now = new Date();
    const lastReset = user.planResetsAt ? new Date(user.planResetsAt) : new Date(0);

    if (now.toDateString() !== lastReset.toDateString()) {
      await query(
        `UPDATE users SET messages_this_period = 0, plan_resets_at = $1 WHERE id = $2`,
        [now, user.id]
      );
      user.messagesThisPeriod = 0;
    }
  }

  static getPlanLimits(plan) {
    return PLAN_LIMITS[plan] || PLAN_LIMITS.free;
  }

  static canSendMessage(user) {
    const limits = this.getPlanLimits(user.plan);
    if (limits.messagesPerDay === -1) return true;
    return user.messagesThisPeriod < limits.messagesPerDay;
  }

  static async comparePassword(user, candidatePassword) {
    return bcrypt.compare(candidatePassword, user.password);
  }

  // Format DB row to camelCase object
  static _format(row, includePassword = false) {
    const user = {
      id: row.id,
      name: row.name,
      email: row.email,
      businessType: row.business_type,
      phone: row.phone,
      plan: row.plan,
      subscriptionStatus: row.subscription_status,
      trialEndsAt: row.trial_ends_at,
      planResetsAt: row.plan_resets_at,
      messageCount: row.message_count,
      messagesThisPeriod: row.messages_this_period,
      totalMessagesAllTime: row.total_messages_all_time,
      lastActiveAt: row.last_active_at,
      aiContext: row.ai_context,
      metadata: row.metadata || {},
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };

    if (includePassword && row.password) {
      user.password = row.password;
    }

    return user;
  }
}

module.exports = UserModel;
