// src/ui/screens.js - Screen switching functionality

/**
 * Initialize screen switching functionality
 * @param {Object} state - Global application state
 */
function initScreens(state) {
  const loginScreen = document.getElementById('loginScreen');
  const conversationsScreen = document.getElementById('conversationsScreen');
  const userInfoDisplay = document.getElementById('userInfoDisplay');
  const userNameDisplay = document.getElementById('userNameDisplay');
  
  // Function to update user info display
  function updateUserInfoDisplay() {
    if (state.userData && state.userData.name) {
      userNameDisplay.textContent = state.userData.name;
      userInfoDisplay.title = state.userData.email || '';
      userInfoDisplay.style.display = 'block';
    } else {
      userInfoDisplay.style.display = 'none';
    }
  }
  
  // Make the showScreen function available globally
  window.showScreen = function(screenId) {
    if (screenId === 'login') {
      loginScreen.style.display = 'block';
      conversationsScreen.style.display = 'none';
    } else if (screenId === 'conversations') {
      loginScreen.style.display = 'none';
      conversationsScreen.style.display = 'block';
      
      // Update user info when switching to conversations screen
      updateUserInfoDisplay();
    }
  };
}

module.exports = {
  initScreens
};