// Shared date formatting utilities for NOC Platform

/**
 * Format date with relative time (e.g., "5m ago", "2h ago", "3d ago")
 * Falls back to absolute date for dates older than 7 days
 * @param {string|Date} dateString - ISO date string or Date object
 * @returns {string} Formatted date string
 */
export function formatRelativeDate(dateString) {
  if (!dateString) return 'N/A'

  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now - date
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
  })
}

/**
 * Format date with absolute date and time (e.g., "Jan 15, 2:30 PM")
 * @param {string|Date} dateString - ISO date string or Date object
 * @returns {string} Formatted date string
 */
export function formatDateTime(dateString) {
  if (!dateString) return '-'

  const date = new Date(dateString)
  const now = new Date()

  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
  })
}

/**
 * Format date only without time (e.g., "Jan 15" or "Jan 15, 2024")
 * @param {string|Date} dateString - ISO date string or Date object
 * @returns {string} Formatted date string
 */
export function formatDate(dateString) {
  if (!dateString) return '-'

  const date = new Date(dateString)
  const now = new Date()

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
  })
}

/**
 * Format full timestamp with date and time (e.g., "Jan 15, 2024 2:30:45 PM")
 * @param {string|Date} dateString - ISO date string or Date object
 * @returns {string} Formatted timestamp string
 */
export function formatFullTimestamp(dateString) {
  if (!dateString) return '-'

  const date = new Date(dateString)

  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
}
