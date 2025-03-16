// src/ui/notifications.js - Notification handling

/**
 * Creates a notification element to be displayed centered in the screen
 * @param {string} message - HTML message to display
 * @param {string} title - Notification title text
 * @param {string} type - Notification type: 'success', 'error', 'delete'
 * @param {number} duration - Time in ms before auto-hide (0 to disable)
 * @returns {HTMLElement} - The created notification element
 */
function createNotification(message, title, type = 'success', duration = 8000) {
  const container = document.querySelector('.container');
  if (!container) {
    console.error('Container not found, cannot create notification');
    return null;
  }
  
  // Create notification element
  const notification = document.createElement('div');
  notification.classList.add('persistent-notification');
  
  // Set colors based on type
  let bgColor, textColor, icon;
  switch(type) {
    case 'error':
      bgColor = '#f8d7da';
      textColor = '#721c24';
      icon = '⚠️';
      break;
    case 'delete':
      bgColor = '#fad7dd';
      textColor = '#721c24';
      icon = '🗑️';
      break;
    case 'success':
    default:
      bgColor = '#d4edda';
      textColor = '#155724';
      icon = '✅';
  }
  
  // Style the notification to make it float in the middle of the screen
  notification.style.position = 'fixed';
  notification.style.left = '50%';
  notification.style.top = '30%';
  notification.style.transform = 'translate(-50%, -50%) scale(0.95)';
  notification.style.backgroundColor = bgColor;
  notification.style.color = textColor;
  notification.style.padding = '15px 20px';
  notification.style.borderRadius = '8px';
  notification.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.25)';
  notification.style.zIndex = '10000';
  notification.style.width = '85%';
  notification.style.maxWidth = '600px';
  notification.style.transition = 'all 0.3s ease-in-out';
  notification.style.opacity = '0';
  
  // Create title with icon
  const titleElement = document.createElement('div');
  titleElement.textContent = `${icon} ${title}`;
  titleElement.style.fontWeight = 'bold';
  titleElement.style.marginBottom = '10px';
  titleElement.style.fontSize = '18px';
  notification.appendChild(titleElement);
  
  // Add message content
  const content = document.createElement('div');
  content.innerHTML = message;
  content.style.fontSize = '14px';
  content.style.lineHeight = '1.5';
  notification.appendChild(content);
  
  // Add close button
  const closeButton = document.createElement('button');
  closeButton.textContent = '×';
  closeButton.style.position = 'absolute';
  closeButton.style.top = '10px';
  closeButton.style.right = '10px';
  closeButton.style.background = 'none';
  closeButton.style.border = 'none';
  closeButton.style.color = textColor;
  closeButton.style.fontSize = '24px';
  closeButton.style.cursor = 'pointer';
  closeButton.style.fontWeight = 'bold';
  closeButton.title = 'Close notification';
  closeButton.onclick = () => {
    notification.style.opacity = '0';
    notification.style.transform = 'translate(-50%, -50%) scale(0.9)';
    setTimeout(() => notification.remove(), 300);
  };
  notification.appendChild(closeButton);
  
  // Add to document body
  document.body.appendChild(notification);
  
  // Animate entry
  setTimeout(() => {
    notification.style.opacity = '1';
    notification.style.transform = 'translate(-50%, -50%) scale(1)';
  }, 10);
  
  // Auto fade out after specified duration
  if (duration > 0) {
    setTimeout(() => {
      notification.style.opacity = '0';
      notification.style.transform = 'translate(-50%, -50%) scale(0.9)';
      setTimeout(() => notification.remove(), 300);
    }, duration);
  }
  
  return notification;
}

/**
 * Shows a success message
 * @param {string} message - Message to display
 */
function showSuccess(message) {
  const statusSuccess = document.getElementById('statusSuccess');
  if (statusSuccess) {
    statusSuccess.innerHTML = message;
    statusSuccess.classList.remove('hidden');
    
    // Set the message to auto-hide after 5 seconds
    setTimeout(() => {
      statusSuccess.classList.add('hidden');
    }, 5000);
  }
}

/**
 * Shows an error message
 * @param {string} message - Error message to display
 */
function showValidationError(message) {
  const validationError = document.getElementById('validationError');
  if (validationError) {
    validationError.textContent = message;
    validationError.classList.remove('hidden');
  }
}

/**
 * Hides all status messages
 */
function hideStatus() {
  const statusSuccess = document.getElementById('statusSuccess');
  const statusError = document.getElementById('statusError');
  const validationError = document.getElementById('validationError');
  
  if (statusSuccess) statusSuccess.classList.add('hidden');
  if (statusError) statusError.classList.add('hidden');
  if (validationError) statusError.classList.add('hidden');
}

/**
 * Shows a conversation success message
 * @param {string} message - Message to display
 */
function showConversationSuccess(message) {
  const conversationsError = document.getElementById('conversationsError');
  if (conversationsError) {
    conversationsError.textContent = message;
    conversationsError.classList.remove('error');
    conversationsError.classList.add('success');
    conversationsError.classList.remove('hidden');
    
    // Set the message to auto-hide after 5 seconds
    setTimeout(() => {
      conversationsError.classList.add('hidden');
    }, 5000);
  }
}

/**
 * Shows a conversation error message
 * @param {string} message - Error message to display
 */
function showConversationError(message) {
  const conversationsError = document.getElementById('conversationsError');
  if (conversationsError) {
    conversationsError.textContent = message;
    conversationsError.classList.add('error');
    conversationsError.classList.remove('success');
    conversationsError.classList.remove('hidden');
  }
}

/**
 * Hides the conversation error message
 */
function hideConversationError() {
  const conversationsError = document.getElementById('conversationsError');
  if (conversationsError) {
    conversationsError.classList.add('hidden');
  }
}

/**
 * Shows a notification with custom message and title
 * @param {string} title - Notification title
 * @param {string} message - HTML message to display
 * @param {number} duration - Time in ms before auto-hide (0 to disable)
 */
function showNotification(title, message, duration = 8000) {
  createNotification(message, title, 'success', duration);
}

/**
 * Initialize notifications functionality
 */
function initNotifications() {
  // Register the global notification functions for use in other modules
  window.createNotification = createNotification;
  window.showNotification = showNotification;
  window.showSuccess = showSuccess;
  window.showValidationError = showValidationError;
  window.hideStatus = hideStatus;
  window.showConversationSuccess = showConversationSuccess;
  window.showConversationError = showConversationError;
  window.hideConversationError = hideConversationError;
}

module.exports = {
  initNotifications,
  createNotification,
  showNotification,
  showSuccess,
  showValidationError,
  hideStatus,
  showConversationSuccess,
  showConversationError,
  hideConversationError
};