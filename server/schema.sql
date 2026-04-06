-- ============================================
-- ORION SAAS - PostgreSQL Schema
-- Run this on first deployment to create tables
-- ============================================

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  business_type VARCHAR(50) DEFAULT 'other',
  phone VARCHAR(50) DEFAULT '',
  plan VARCHAR(50) DEFAULT 'free',
  subscription_status VARCHAR(50) DEFAULT 'trial',
  trial_ends_at TIMESTAMP,
  plan_resets_at TIMESTAMP,
  message_count INTEGER DEFAULT 0,
  messages_this_period INTEGER DEFAULT 0,
  total_messages_all_time INTEGER DEFAULT 0,
  last_active_at TIMESTAMP DEFAULT NOW(),
  ai_context TEXT DEFAULT '',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Chats table
CREATE TABLE IF NOT EXISTS chats (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  session VARCHAR(100) DEFAULT 'default',
  messages JSONB DEFAULT '[]',
  lead_captured JSONB DEFAULT '{"name":"","email":"","phone":""}',
  total_exchanges INTEGER DEFAULT 0,
  last_active_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Subscriptions table
CREATE TABLE IF NOT EXISTS subscriptions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  plan VARCHAR(50) NOT NULL,
  provider VARCHAR(50) NOT NULL,
  provider_reference VARCHAR(255) NOT NULL,
  amount INTEGER NOT NULL,
  currency VARCHAR(10) DEFAULT 'NGN',
  status VARCHAR(50) DEFAULT 'active',
  current_period_start TIMESTAMP NOT NULL,
  current_period_end TIMESTAMP NOT NULL,
  cancel_at_period_end BOOLEAN DEFAULT FALSE,
  canceled_at TIMESTAMP,
  last_payment_date TIMESTAMP,
  next_billing_date TIMESTAMP,
  payment_history JSONB DEFAULT '[]',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_chats_user_id ON chats(user_id);
CREATE INDEX IF NOT EXISTS idx_chats_last_active ON chats(user_id, last_active_at DESC);
CREATE INDEX IF NOT EXISTS idx_subs_user_id ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subs_status ON subscriptions(status);
