// src/ui/notifications.js - Status messages and error handling

/**
 * Initialize notification functionality
 */
function initNotifications() {
  const statusSuccess = document.getElementById('statusSuccess');
  const statusError = document.getElementById('statusError');
  const validationError = document.getElementById('validationError');
  const conversationsError = document.getElementById('conversationsError');
  
  // Check if required elements exist
  if (!statusError) {
    console.error("Error: statusError element not found!");
  }
  
  if (!statusSuccess) {
    console.error("Error: statusSuccess element not found!");
  }
  
  if (!validationError) {
    console.error("Error: validationError element not found!");
  }
  
  // Make notification functions available globally
  
  // Function to hide both status messages
  window.hideStatus = function() {
    statusSuccess.classList.add('hidden');
    statusError.classList.add('hidden');
    validationError.classList.add('hidden');
  };
  
  // Function to show validation error with auto-hide
  window.showValidationError = function(message) {
    console.log("Showing validation error:", message);
    validationError.textContent = message;
    validationError.classList.remove('hidden');
    
    // Auto-hide after 5 seconds
    setTimeout(() => {
      console.log("Starting validation error fade");
      validationError.style.opacity = '0';
      validationError.style.transition = 'opacity 0.5s';
      
      setTimeout(() => {
        console.log("Hiding validation error");
        validationError.classList.add('hidden');
        validationError.style.opacity = '1';
        validationError.style.transition = '';
      }, 500);
    }, 5000);
  };
  
  // Function to show success status with message
  window.showSuccess = function(message, autoHide = false) {
    statusSuccess.textContent = message;
    statusSuccess.classList.remove('hidden');
    statusError.classList.add('hidden');
    
    if (autoHide) {
      setTimeout(() => {
        statusSuccess.classList.add('fade-out');
        setTimeout(() => {
          statusSuccess.classList.add('hidden');
          statusSuccess.classList.remove('fade-out');
        }, 500); // Wait for fade animation to complete
      }, 5000); // 5 seconds before starting to fade
    }
  };
  
  // Function to show error status with message
  window.showError = function(message, autoHide = false) {
    console.log("Showing error:", message, "autoHide:", autoHide);
    statusError.textContent = message;
    statusError.classList.remove('hidden');
    statusSuccess.classList.add('hidden');
    
    if (autoHide) {
      console.log("Will auto-hide error after 5 seconds");
      setTimeout(() => {
        console.log("Starting fade-out animation");
        statusError.classList.add('fade-out');
        setTimeout(() => {
          console.log("Fade-out complete, hiding error message");
          statusError.classList.add('hidden');
          statusError.classList.remove('fade-out');
        }, 500); // Wait for fade animation to complete
      }, 5000); // 5 seconds before starting to fade
    }
  };
  
  // Function to show conversation error
  window.showConversationError = function(message) {
    conversationsError.textContent = message;
    conversationsError.classList.remove('hidden');
  };
  
  // Function to hide conversation error
  window.hideConversationError = function() {
    conversationsError.classList.add('hidden');
  };
  
  // Function to show success message in conversation list
  window.showConversationSuccess = function(message) {
    const conversationsList = document.getElementById('conversationsList');
    const successElement = document.createElement('div');
    successElement.classList.add('status', 'success');
    successElement.textContent = message;
    
    // Insert at the top of the list
    conversationsList.insertBefore(successElement, conversationsList.firstChild);
    
    // Fade out and remove after 5 seconds
    setTimeout(() => {
      successElement.classList.add('fade-out');
      setTimeout(() => {
        successElement.remove();
      }, 500); // Wait for fade animation to complete
    }, 5000);
  };
}

module.exports = {
  initNotifications
};