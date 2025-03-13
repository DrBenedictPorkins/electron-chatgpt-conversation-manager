// src/utils/date-formatter.js - Date formatting utilities

/**
 * Format date as relative time (e.g., "2 days ago")
 * @param {string} dateString - ISO date string
 * @returns {string} Formatted relative date
 */
function formatDateAsDaysAgo(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  
  // Calculate the difference in milliseconds
  const diffMs = now - date;
  
  // Convert to various time units
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  
  // Show most appropriate time unit
  if (diffSecs < 60) {
    return diffSecs <= 1 ? 'Just now' : `${diffSecs} seconds ago`;
  } else if (diffMins < 60) {
    return diffMins === 1 ? '1 minute ago' : `${diffMins} minutes ago`;
  } else if (diffHours < 24) {
    return diffHours === 1 ? '1 hour ago' : `${diffHours} hours ago`;
  } else if (diffDays === 1) {
    return 'Yesterday';
  } else {
    return `${diffDays} days ago`;
  }
}

module.exports = {
  formatDateAsDaysAgo
};