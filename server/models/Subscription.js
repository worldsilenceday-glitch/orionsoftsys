const { query, one, all } = require("../db");

class SubscriptionModel {
  static async create(data) {
    const res = await query(
      `INSERT INTO subscriptions (
        user_id, plan, provider, provider_reference, amount, currency,
        status, current_period_start, current_period_end,
        next_billing_date, last_payment_date, payment_history
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *`,
      [
        data.userId,
        data.plan,
        data.provider,
        data.providerReference,
        data.amount,
        data.currency || "NGN",
        data.status || "active",
        data.currentPeriodStart,
        data.currentPeriodEnd,
        data.nextBillingDate,
        data.lastPaymentDate,
        JSON.stringify(data.paymentHistory || [])
      ]
    );
    return this._format(res.rows[0]);
  }

  static async getActive(userId) {
    const res = await query(
      `SELECT * FROM subscriptions
       WHERE user_id = $1 AND status = 'active' AND current_period_end >= NOW()
       ORDER BY created_at DESC LIMIT 1`,
      [userId]
    );
    return res.rows[0] ? this._format(res.rows[0]) : null;
  }

  static async getAll(userId) {
    const res = await query(
      `SELECT * FROM subscriptions WHERE user_id = $1 ORDER BY created_at DESC`,
      [userId]
    );
    return res.rows.map(row => this._format(row));
  }

  static async cancel(id) {
    const res = await query(
      `UPDATE subscriptions SET cancel_at_period_end = TRUE, canceled_at = NOW(), updated_at = NOW()
       WHERE id = $1 RETURNING *`,
      [id]
    );
    return res.rows[0] ? this._format(res.rows[0]) : null;
  }

  static async addPayment(subscriptionId, payment) {
    const sub = await query(`SELECT payment_history FROM subscriptions WHERE id = $1`, [subscriptionId]);
    const history = sub.rows[0].payment_history || [];
    history.push(payment);

    await query(
      `UPDATE subscriptions SET payment_history = $1, updated_at = NOW() WHERE id = $2`,
      [JSON.stringify(history), subscriptionId]
    );
  }

  static _format(row) {
    return {
      id: row.id,
      userId: row.user_id,
      plan: row.plan,
      provider: row.provider,
      providerReference: row.provider_reference,
      amount: row.amount,
      currency: row.currency,
      status: row.status,
      currentPeriodStart: row.current_period_start,
      currentPeriodEnd: row.current_period_end,
      cancelAtPeriodEnd: row.cancel_at_period_end,
      canceledAt: row.canceled_at,
      lastPaymentDate: row.last_payment_date,
      nextBillingDate: row.next_billing_date,
      paymentHistory: row.payment_history || [],
      createdAt: row.created_at
    };
  }
}

module.exports = SubscriptionModel;
