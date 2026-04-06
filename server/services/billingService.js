const axios = require("axios");
const UserModel = require("../models/User");
const SubscriptionModel = require("../models/Subscription");

// ==================== PAYSTACK ====================

exports.createPaystackPayment = async (user, plan) => {
  const planPrices = {
    starter: 29900,
    professional: 59900,
    enterprise: 199900
  };

  const amount = planPrices[plan] || planPrices.starter;

  const response = await axios.post(
    "https://api.paystack.co/transaction/initialize",
    {
      email: user.email,
      amount: amount,
      currency: "NGN",
      callback_url: `${process.env.FRONTEND_URL}/billing/callback`,
      metadata: {
        user_id: user.id.toString(),
        plan: plan,
        custom_fields: [
          { display_name: "User Name", variable_name: "user_name", value: user.name }
        ]
      }
    },
    {
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        "Content-Type": "application/json"
      }
    }
  );

  return response.data.data;
};

exports.verifyPaystackPayment = async (reference) => {
  const response = await axios.get(
    `https://api.paystack.co/transaction/verify/${reference}`,
    {
      headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` }
    }
  );

  const data = response.data.data;

  if (data.status !== "success") {
    return { success: false, message: "Payment was not successful" };
  }

  return { success: true, data };
};

// ==================== STRIPE ====================

exports.createStripeCheckout = async (user, plan) => {
  const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

  const priceIds = {
    starter: "price_starter_id_here",
    professional: "price_professional_id_here",
    enterprise: "price_enterprise_id_here"
  };

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ["card"],
    customer_email: user.email,
    line_items: [{
      price: priceIds[plan] || priceIds.starter,
      quantity: 1
    }],
    mode: "subscription",
    success_url: `${process.env.FRONTEND_URL}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.FRONTEND_URL}/pricing?canceled=true`,
    metadata: {
      userId: user.id.toString(),
      plan: plan
    }
  });

  return { url: session.url, sessionId: session.id };
};

// ==================== SUBSCRIPTION MANAGEMENT ====================

exports.activateSubscription = async (userId, plan, provider, providerReference, amount) => {
  const now = new Date();
  const periodEnd = new Date(now);
  periodEnd.setMonth(periodEnd.getMonth() + 1);

  const subscription = await SubscriptionModel.create({
    userId,
    plan,
    provider,
    providerReference,
    amount,
    currency: provider === "paystack" ? "NGN" : "USD",
    status: "active",
    currentPeriodStart: now,
    currentPeriodEnd: periodEnd,
    nextBillingDate: periodEnd,
    lastPaymentDate: now,
    paymentHistory: [{
      amount,
      date: now,
      reference: providerReference,
      status: "success"
    }]
  });

  const user = await UserModel.updatePlan(userId, plan, "active");

  return { subscription, user };
};

exports.cancelSubscription = async (userId) => {
  const subscription = await SubscriptionModel.getActive(userId);

  if (!subscription) {
    return { success: false, message: "No active subscription found" };
  }

  await SubscriptionModel.cancel(subscription.id);

  return { success: true, message: "Subscription will end at current period end" };
};

exports.getSubscription = async (userId) => {
  const subscription = await SubscriptionModel.getActive(userId);
  if (!subscription) return null;

  return {
    plan: subscription.plan,
    status: subscription.status,
    currentPeriodEnd: subscription.currentPeriodEnd,
    nextBillingDate: subscription.nextBillingDate,
    cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
    paymentHistory: subscription.paymentHistory
  };
};
