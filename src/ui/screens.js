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
      
      // Handle container visibility - if we've categorized data before
      if (window.hasCategorizedData === true) {
        // Check if the container already exists
        const existingContainer = document.getElementById('conversationsContainer');
        
        // If not, create it dynamically (same as in categorization.js)
        if (!existingContainer) {
          const placeholder = document.getElementById('conversationsContainerPlaceholder');
          if (placeholder) {
            // Create the container
            const conversationsContainer = document.createElement('div');
            conversationsContainer.className = 'conversations-container';
            conversationsContainer.id = 'conversationsContainer';
            
            // Create the conversation list
            const conversationsList = document.createElement('ul');
            conversationsList.className = 'conversation-list';
            conversationsList.id = 'conversationsList';
            conversationsContainer.appendChild(conversationsList);
            
            // Create pagination container
            const paginationDiv = document.createElement('div');
            paginationDiv.className = 'pagination';
            paginationDiv.innerHTML = `
              <div class="pagination-controls">
                <div class="pagination-left">
                  <button id="prevButton" class="back-button">&larr; Previous</button>
                </div>
                <div class="pagination-center">
                  <span id="paginationInfo" style="display: inline-block; padding: 6px 12px; background-color: #f8f9fa; border-radius: 4px; border: 1px solid #dee2e6;">Showing 1-20 of 0</span>
                </div>
                <div class="pagination-right">
                  <button id="nextPageButton" class="next-button">Next &rarr;</button>
                </div>
              </div>
            `;
            conversationsContainer.appendChild(paginationDiv);
            
            // Replace the placeholder with the actual container
            placeholder.parentNode.replaceChild(conversationsContainer, placeholder);
            
            // Register pagination event handlers
            if (window.initPagination) {
              setTimeout(() => window.initPagination(), 0);
            }
          }
        }
      }
      // No else needed - if not categorized, placeholder remains empty
      
      // Update user info when switching to conversations screen
      updateUserInfoDisplay();
    }
  };
}

module.exports = {
  initScreens
};