-- Migration: Add deployment_profile column to deployments table
-- Date: 2026-01-01
-- Reason: Support modular deployments (CORE vs FULL profiles)
--
-- CORE profile: Uses centralized portal.flaggerlink.com (worker servers)
-- FULL profile: Deploys dedicated Portal API + UserPortal (standalone systems)

-- Add deployment_profile column
ALTER TABLE deployments
ADD COLUMN deployment_profile TEXT DEFAULT 'core';

-- Create index for filtering deployments by profile
CREATE INDEX IF NOT EXISTS idx_deployments_profile
ON deployments(deployment_profile);
