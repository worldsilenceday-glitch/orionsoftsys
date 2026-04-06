/**
 * Orion AI Assistant - Chat Engine (SaaS Authenticated)
 * Integrates with backend API using JWT authentication
 * OpenAI primary + DeepSeek fallback handled server-side
 */

(function() {
  'use strict';

  // ========================================
  // CONFIGURATION
  // ========================================
  const CONFIG = {
    apiUrl: localStorage.getItem("apiUrl") || "http://localhost:5000/api",
    // Fallback responses when API is unavailable
    fallbackResponses: [
      "Thank you for your interest! Our AI consultant will be with you shortly. In the meantime, feel free to book a demo at our contact page.",
      "Great question! Let me connect you with our team who can provide a detailed answer. You can also reach us on WhatsApp at +2348139151102.",
      "I appreciate your patience. Our team is reviewing your message and will respond within 24 hours. For immediate help, try our WhatsApp chat!",
      "I'd love to give you a complete answer. Could you leave your email or sign up for a free account so our AI specialist can send you a detailed response?"
    ]
  };

  // ========================================
  // CHAT ENGINE
  // ========================================
  const ChatEngine = {
    conversationHistory: [],
    isTyping: false,

    init() {
      this.bindEvents();
      this.loadHistory();
      this.showWelcomeMessage();
    },

    getToken() {
      return localStorage.getItem("token");
    },

    showWelcomeMessage() {
      const messagesEl = document.getElementById("chatMessages");
      if (!messagesEl) return;

      // Always show a welcome message, regardless of auth state
      const token = this.getToken();
      if (token) {
        this.appendMessage("bot", "Hello! I'm your Orion AI Assistant. How can I help you today?");
      } else {
        this.appendMessage("bot", "Hi! I'm the Orion AI Assistant. How can I help you today? Sign in to save your conversations and unlock unlimited features.");
      }
    },

    bindEvents() {
      const chatToggle = document.getElementById("chatToggle");
      const chatWindow = document.getElementById("chatWindow");
      const chatClose = document.getElementById("chatClose");
      const chatInput = document.getElementById("chatInput");
      const chatSend = document.getElementById("chatSend");

      if (chatToggle) {
        chatToggle.addEventListener("click", () => {
          chatWindow.classList.toggle("open");
          if (chatWindow.classList.contains("open") && chatInput) {
            setTimeout(() => chatInput.focus(), 300);
          }
        });
      }

      if (chatClose) {
        chatClose.addEventListener("click", () => {
          chatWindow.classList.remove("open");
        });
      }

      if (chatSend && chatInput) {
        chatSend.addEventListener("click", () => this.sendMessage());
        chatInput.addEventListener("keypress", (e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            this.sendMessage();
          }
        });
      }
    },

    async sendMessage() {
      const chatInput = document.getElementById("chatInput");
      const messagesEl = document.getElementById("chatMessages");
      if (!chatInput || !messagesEl) return;

      const message = chatInput.value.trim();
      if (!message || this.isTyping) return;

      // Display user message
      this.appendMessage("user", message);
      chatInput.value = "";

      // Add to local history
      this.conversationHistory.push({ role: "user", content: message });

      // Check if user is authenticated
      const token = this.getToken();

      if (!token) {
        // Guest mode - show signup prompt
        this.showTyping();
        this.isTyping = true;

        setTimeout(() => {
          this.hideTyping();
          this.isTyping = false;

          const response = this.getFallbackResponse();
          this.appendMessage("bot", response + "\n\n💡 Create a free account to get your own personalized AI assistant with unlimited features.");
          this.conversationHistory.push({ role: "assistant", content: response });
          this.saveHistory();
        }, 1500);

        return;
      }

      // Authenticated mode - send to API
      this.showTyping();
      this.isTyping = true;

      try {
        const response = await fetch(`${CONFIG.apiUrl}/chat`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
          },
          body: JSON.stringify({ message })
        });

        const data = await response.json();

        this.hideTyping();
        this.isTyping = false;

        if (!response.ok) {
          // Handle specific errors
          if (data.code === "TOKEN_EXPIRED" || data.code === "INVALID_TOKEN") {
            localStorage.removeItem("token");
            this.appendMessage("bot", "Your session has expired. Please sign in again to continue chatting.");
            return;
          }

          if (data.code === "PLAN_REQUIRED") {
            this.appendMessage("bot", `You've reached your message limit. Please upgrade your plan to continue using the AI assistant.\n\n👉 Visit our pricing page to see available plans.`);
            return;
          }

          this.appendMessage("bot", data.error || "Sorry, something went wrong. Please try again.");
          return;
        }

        this.appendMessage("bot", data.reply);
        this.conversationHistory.push({ role: "assistant", content: data.reply });

        // Show usage info if available
        if (data.usage && data.usage.limit !== "unlimited") {
          const remaining = data.usage.remaining;
          if (remaining <= 10 && remaining > 0) {
            this.appendMessage("bot", `📊 Usage: ${data.usage.messagesThisPeriod}/${data.usage.limit} messages today. ${remaining} remaining.`);
          }
        }

      } catch (error) {
        this.hideTyping();
        this.isTyping = false;
        const fallback = this.getFallbackResponse();
        this.appendMessage("bot", fallback);
        console.error("Chat error:", error);
      }

      this.saveHistory();
    },

    appendMessage(type, text) {
      const messagesEl = document.getElementById("chatMessages");
      if (!messagesEl) return;

      const msgDiv = document.createElement("div");
      msgDiv.className = `chat-message ${type}`;
      msgDiv.textContent = text;
      messagesEl.appendChild(msgDiv);
      messagesEl.scrollTop = messagesEl.scrollHeight;
    },

    showTyping() {
      const messagesEl = document.getElementById("chatMessages");
      if (!messagesEl) return;

      // Remove existing typing indicator
      const existing = document.getElementById("typingIndicator");
      if (existing) existing.remove();

      const typingDiv = document.createElement("div");
      typingDiv.className = "chat-message typing";
      typingDiv.id = "typingIndicator";
      typingDiv.innerHTML = '<span class="typing-dot"></span><span class="typing-dot"></span><span class="typing-dot"></span>';
      messagesEl.appendChild(typingDiv);
      messagesEl.scrollTop = messagesEl.scrollHeight;
    },

    hideTyping() {
      const typingEl = document.getElementById("typingIndicator");
      if (typingEl) typingEl.remove();
    },

    getFallbackResponse() {
      const idx = Math.floor(Math.random() * CONFIG.fallbackResponses.length);
      return CONFIG.fallbackResponses[idx];
    },

    // ========================================
    // PERSISTENCE (local session only)
    // ========================================
    saveHistory() {
      try {
        localStorage.setItem("orion_chat_session", JSON.stringify(this.conversationHistory.slice(-20)));
      } catch (e) { /* Ignore */ }
    },

    loadHistory() {
      try {
        const saved = localStorage.getItem("orion_chat_session");
        if (saved) {
          this.conversationHistory = JSON.parse(saved);
        }
      } catch (e) { /* Ignore */ }
    }
  };

  // ========================================
  // INITIALIZE
  // ========================================
  document.addEventListener("DOMContentLoaded", () => {
    ChatEngine.init();
  });

})();
