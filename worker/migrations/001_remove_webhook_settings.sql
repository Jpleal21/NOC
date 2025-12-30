-- Migration: Remove webhook_settings table
-- Date: 2025-12-30
-- Reason: Webhook notifications feature removed from NOC Platform

DROP TABLE IF EXISTS webhook_settings;
