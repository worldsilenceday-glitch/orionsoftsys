const axios = require("axios");
const UserModel = require("../models/User");
const ChatModel = require("../models/Chat");

// System prompt builder based on user's business
function buildSystemPrompt(user) {
  const businessContexts = {
    "small-business": "a small business",
    "education": "an educational institution",
    "healthcare": "a healthcare facility",
    "real-estate": "a real estate business",
    "ecommerce": "an e-commerce store",
    "startup": "a startup company",
    "enterprise": "an enterprise organization",
    "other": "a business"
  };

  const context = businessContexts[user.businessType] || "a business";
  const customContext = user.aiContext ? `\n\nAdditional business context: ${user.aiContext}` : "";

  return `You are the Orion AI Assistant, an intelligent customer service agent for ${context}.

CORE BEHAVIOR:
- Be professional, friendly, and helpful
- Answer questions about the business concisely
- Always try to help the customer take the next step (book a demo, contact the team, make a purchase)
- Keep responses concise (2-4 sentences unless more detail is needed)

LEAD CAPTURE:
When a user shows interest (asks about pricing, services, or says they want to proceed):
1. First, answer their question helpfully
2. Then naturally ask: "I'd love to help you get started. Could you share your name and email so our team can send you a personalized proposal?"
3. If they provide contact info, acknowledge warmly and confirm next steps

COMPANY INFO:
- Company: Orion Soft Systems
- Services: Web Development, AI Solutions, Automation Systems, Custom Software
- Products: Orion AI Assistant, MIC Enterprise
- Contact: +234 813 915 1102, hello@orionsoftsystems.com

RESPONSE GUIDELINES:
- Use bullet points for lists
- Never make up pricing - direct to the pricing page
- If you don't know something, offer to connect them with the team
- Always end with a helpful suggestion or question${customContext}`;
}

// Extract lead info from user messages
function extractLeadInfo(message) {
  const lead = {};

  const nameMatch = message.match(/(?:my name is|i'm|call me)\s+(\w+)/i);
  if (nameMatch) lead.name = nameMatch[1];

  const emailMatch = message.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i);
  if (emailMatch) lead.email = emailMatch[1];

  const phoneMatch = message.match(/(\+?\d[\d\s\-\(\)]{7,}\d)/);
  if (phoneMatch) lead.phone = phoneMatch[1];

  return lead;
}

// Send to OpenAI API
async function callOpenAI(messages, apiKey) {
  const response = await axios.post(
    "https://api.openai.com/v1/chat/completions",
    {
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      messages: messages,
      max_tokens: 500,
      temperature: 0.7
    },
    {
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      }
    }
  );
  return response.data.choices[0].message.content.trim();
}

// Send to DeepSeek API (fallback)
async function callDeepSeek(messages, apiKey) {
  const response = await axios.post(
    "https://api.deepseek.com/v1/chat/completions",
    {
      model: process.env.DEEPSEEK_MODEL || "deepseek-chat",
      messages: messages,
      max_tokens: 500,
      temperature: 0.7
    },
    {
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      }
    }
  );
  return response.data.choices[0].message.content.trim();
}

// Main chat service
exports.processChat = async (user, message) => {
  // Check usage limits
  await UserModel.resetDailyCounter(user);

  if (!UserModel.canSendMessage(user)) {
    const limits = UserModel.getPlanLimits(user.plan);
    return {
      reply: `You've reached your daily message limit (${limits.messagesPerDay} messages/day on the ${user.plan} plan). Please upgrade your plan or try again tomorrow.`,
      leadCaptured: null,
      usage: { messagesThisPeriod: user.messagesThisPeriod, limit: limits.messagesPerDay }
    };
  }

  // Get or create chat session
  let chatSession = await ChatModel.findLatest(user.id);

  if (!chatSession) {
    chatSession = await ChatModel.create(user.id);
  }

  // Build message history for AI
  const systemMessage = { role: "system", content: buildSystemPrompt(user) };

  // Get last 10 messages for context
  const recentMessages = chatSession.messages.slice(-10);

  const apiMessages = [systemMessage, ...recentMessages, { role: "user", content: message }];

  // Try OpenAI first, fall back to DeepSeek
  let reply;
  try {
    reply = await callOpenAI(apiMessages, process.env.OPENAI_API_KEY);
  } catch (openaiError) {
    console.warn("OpenAI failed, trying DeepSeek:", openaiError.message);
    try {
      reply = await callDeepSeek(apiMessages, process.env.DEEPSEEK_API_KEY);
    } catch (deepseekError) {
      console.error("Both AI APIs failed:", deepseekError.message);
      reply = "I apologize, our AI assistant is temporarily unavailable. Please contact us directly at +234 813 915 1102 or hello@orionsoftsystems.com and we'll help you right away.";
    }
  }

  // Extract lead info
  const leadInfo = extractLeadInfo(message);
  if (leadInfo.name || leadInfo.email) {
    const updatedLead = { ...chatSession.leadCaptured, ...leadInfo };
    await ChatModel.updateLeadCaptured(chatSession.id, updatedLead);
    chatSession.leadCaptured = updatedLead;
  }

  // Save messages
  const userMsg = { role: "user", content: message, timestamp: new Date().toISOString() };
  const assistantMsg = { role: "assistant", content: reply, timestamp: new Date().toISOString() };
  await ChatModel.addMessages(chatSession.id, userMsg, assistantMsg);

  // Update user counters
  await UserModel.incrementMessageCount(user.id);

  const limits = UserModel.getPlanLimits(user.plan);
  // Re-fetch user to get updated count
  const updatedUser = await UserModel.findById(user.id);

  return {
    reply,
    leadCaptured: chatSession.leadCaptured,
    usage: {
      messagesThisPeriod: updatedUser.messagesThisPeriod,
      limit: limits.messagesPerDay,
      remaining: limits.messagesPerDay === -1 ? "unlimited" : limits.messagesPerDay - updatedUser.messagesThisPeriod
    }
  };
};

// Get chat history for user
exports.getChatHistory = async (userId, limit = 10) => {
  return ChatModel.findByUser(userId, limit);
};
