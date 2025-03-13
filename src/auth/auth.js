// src/auth/auth.js - Authentication functionality
const { ipcRenderer } = require('electron');

/**
 * Initialize authentication functionality
 * @param {Object} state - Global application state
 */
function initAuth(state) {
  const submitButton = document.getElementById('submitButton');
  const curlInput = document.getElementById('curlInput');
  const loadingIndicator = document.getElementById('loading');
  const nextButtonContainer = document.getElementById('nextButtonContainer');
  const nextButton = document.getElementById('nextButton');

  // Ensure elements are hidden at startup
  loadingIndicator.classList.add('hidden');
  nextButtonContainer.classList.add('hidden');
  nextButton.style.display = 'none'; // Hide the button itself initially
  
  // Add event listener for submit button
  submitButton.addEventListener('click', async () => {
    // Clear previous messages
    window.hideStatus();
    
    const curlCommand = curlInput.value.trim();
    
    if (!curlCommand) {
      window.showValidationError('Please paste a cURL command before connecting');
      return;
    }
    // Disable submit button during processing
    submitButton.disabled = true;
    loadingIndicator.classList.remove('hidden');

    try {
      // Send the cURL command to the main process for processing
      const result = await ipcRenderer.invoke('process-curl', curlCommand);
      if (result.success) {
        // Store user information in state for display in other screens
        if (result.userData) {
          state.userData = result.userData;
        }
        
        // Create a more user-friendly success message
        let successMessage = '✅ Connection successful!';
        
        // Add conversation count if available
        if (result.conversationsCount > 0) {
          const count = result.conversationsCount.toLocaleString();
          successMessage += `\n📁 ${count} conversations found.`;
        }
        
        // Add user information if available
        if (result.userData && result.userData.email) {
          const { name, email } = result.userData;
          successMessage += `\n👤 Account: ${name} (${email})`;
        }
        
        window.showSuccess(successMessage);
        
        // Show the Next button
        nextButton.style.display = 'inline-block';
        nextButtonContainer.classList.remove('hidden');
      } else {
        // Show error message and auto-hide after 5 seconds
        window.showValidationError(`Connection failed: ${result.error}`);
        nextButtonContainer.classList.add('hidden');
      }
    } catch (error) {
      window.showValidationError(`Error: ${error.message}`);
    } finally {
      submitButton.disabled = false;
      // Only re-enable nextButton if connection was successful, otherwise it should stay disabled
      loadingIndicator.classList.add('hidden');
    }
  });
  
  // Handle Next button click
  nextButton.addEventListener('click', async () => {
    // Switch to conversations screen
    window.showScreen('conversations');
    
    // Show loading indicator
    const conversationsLoading = document.getElementById('conversationsLoading');
    const progressContainer = document.getElementById('progressContainer');
    const loadingText = document.getElementById('loadingText');
    
    conversationsLoading.classList.remove('hidden');
    progressContainer.classList.remove('hidden');
    loadingText.textContent = 'Loading all conversations...';
    
    try {
      // First, fetch just one conversation to get the total
      const initialResult = await ipcRenderer.invoke('fetch-conversations', { offset: 0, limit: 1 });
      
      if (!initialResult.success) {
        throw new Error(`Failed to fetch conversations: ${initialResult.error}`);
      }
      
      // Set the total conversations count
      state.totalConversations = initialResult.total;
      
      if (state.totalConversations === 0) {
        // No conversations found, show stats panel with empty state
        const statsPanel = document.getElementById('statsPanel');
        const statsTotalCount = document.getElementById('statsTotalCount');
        const statsFirstDate = document.getElementById('statsFirstDate');
        const statsLatestDate = document.getElementById('statsLatestDate');
        const recentConversationsList = document.getElementById('recentConversationsList');
        
        statsPanel.classList.remove('hidden');
        statsTotalCount.textContent = '0';
        statsFirstDate.textContent = 'N/A';
        statsLatestDate.textContent = 'N/A';
        recentConversationsList.innerHTML = '<li>No conversations found</li>';
        
        // Hide loading indicators
        conversationsLoading.classList.add('hidden');
        progressContainer.classList.add('hidden');
        
        return;
      }
      
      // If we have conversations, load them all
      await window.loadAllConversations();
    } catch (error) {
      console.error('Error during conversation loading:', error);
      window.showConversationError(`Error: ${error.message}`);
    } finally {
      // Hide loading indicators
      const conversationsLoading = document.getElementById('conversationsLoading');
      const progressContainer = document.getElementById('progressContainer');
      
      conversationsLoading.classList.add('hidden');
      progressContainer.classList.add('hidden');
    }
  });
  
  // Handle Back button click
  const backButton = document.getElementById('backButton');
  backButton.addEventListener('click', () => {
    window.showScreen('login');
  });
}

module.exports = {
  initAuth
};