const { query, one, all } = require("../db");

class ChatModel {
  static async create(userId) {
    const res = await query(
      `INSERT INTO chats (user_id) VALUES ($1) RETURNING *`,
      [userId]
    );
    return this._format(res.rows[0]);
  }

  static async findByUser(userId, limit = 10) {
    const res = await query(
      `SELECT * FROM chats WHERE user_id = $1 ORDER BY last_active_at DESC LIMIT $2`,
      [userId, limit]
    );
    return res.rows.map(row => this._format(row));
  }

  static async findLatest(userId) {
    const res = await query(
      `SELECT * FROM chats WHERE user_id = $1 ORDER BY last_active_at DESC LIMIT 1`,
      [userId]
    );
    return res.rows[0] ? this._format(res.rows[0]) : null;
  }

  static async addMessages(chatId, userMessage, assistantMessage) {
    // Fetch current messages
    const current = await query(
      `SELECT messages FROM chats WHERE id = $1`,
      [chatId]
    );

    const messages = current.rows[0].messages || [];
    messages.push(userMessage);
    messages.push(assistantMessage);

    await query(
      `UPDATE chats SET messages = $1, total_exchanges = total_exchanges + 1, last_active_at = NOW(), updated_at = NOW() WHERE id = $2`,
      [JSON.stringify(messages), chatId]
    );
  }

  static async updateLeadCaptured(chatId, leadData) {
    await query(
      `UPDATE chats SET lead_captured = $1, updated_at = NOW() WHERE id = $2`,
      [JSON.stringify(leadData), chatId]
    );
  }

  static async deleteByUser(userId) {
    await query(`DELETE FROM chats WHERE user_id = $1`, [userId]);
  }

  static _format(row) {
    return {
      id: row.id,
      userId: row.user_id,
      session: row.session,
      messages: row.messages || [],
      leadCaptured: row.lead_captured || { name: "", email: "", phone: "" },
      totalExchanges: row.total_exchanges,
      lastActiveAt: row.last_active_at,
      createdAt: row.created_at
    };
  }
}

module.exports = ChatModel;
