-- NOC Platform Database Schema
-- SQLite (D1) database for deployment history, server tags, and settings

-- Deployment History
-- Tracks all server deployments (infrastructure + application)
CREATE TABLE IF NOT EXISTS deployments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  server_name TEXT NOT NULL,
  droplet_id INTEGER,
  ip_address TEXT,
  region TEXT,
  branch TEXT NOT NULL,
  deployment_type TEXT NOT NULL, -- 'infrastructure' or 'application'
  status TEXT NOT NULL, -- 'in_progress', 'success', 'failed'
  duration INTEGER, -- seconds
  workflow_url TEXT,
  error_message TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  completed_at TEXT,
  created_by TEXT DEFAULT 'noc-platform'
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_deployments_server ON deployments(server_name);
CREATE INDEX IF NOT EXISTS idx_deployments_status ON deployments(status);
CREATE INDEX IF NOT EXISTS idx_deployments_created ON deployments(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_deployments_type ON deployments(deployment_type);

-- Server Tags
-- Many-to-many relationship between servers and tags
CREATE TABLE IF NOT EXISTS server_tags (
  server_name TEXT NOT NULL,
  tag TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (server_name, tag)
);

CREATE INDEX IF NOT EXISTS idx_server_tags_tag ON server_tags(tag);

-- Webhook Settings
-- Global settings for webhook notifications
CREATE TABLE IF NOT EXISTS webhook_settings (
  id INTEGER PRIMARY KEY CHECK (id = 1), -- Enforce single row
  url TEXT,
  notify_on_success INTEGER DEFAULT 0, -- Boolean: 0 = false, 1 = true
  notify_on_failure INTEGER DEFAULT 1,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Insert default settings
INSERT OR IGNORE INTO webhook_settings (id, url, notify_on_success, notify_on_failure)
VALUES (1, NULL, 0, 1);

-- Deployment Events (Optional - for detailed step tracking)
-- Stores individual steps within a deployment for debugging
CREATE TABLE IF NOT EXISTS deployment_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  deployment_id INTEGER NOT NULL,
  step TEXT NOT NULL, -- 'secrets', 'template', 'droplet', 'dns', etc.
  status TEXT NOT NULL, -- 'started', 'completed', 'failed'
  message TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (deployment_id) REFERENCES deployments(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_deployment_events_deployment ON deployment_events(deployment_id);
