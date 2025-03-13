// src/auth/api-key.js - API key management
const { ipcRenderer } = require('electron');

/**
 * Initialize API key management functionality
 * @param {Object} state - Global application state
 */
function initApiKey(state) {
  const apiKeyModal = document.getElementById('apiKeyModal');
  const closeModalButton = document.querySelector('.close-button');
  const apiKeyInput = document.getElementById('apiKeyInput');
  const apiKeyError = document.getElementById('apiKeyError');
  const cancelApiKeyButton = document.getElementById('cancelApiKeyButton');
  const saveApiKeyButton = document.getElementById('saveApiKeyButton');
  
  // Function to show API key modal
  window.showApiKeyModal = function() {
    apiKeyModal.classList.remove('hidden');
    apiKeyError.classList.add('hidden');
    
    // Check if we already have an API key
    (async () => {
      try {
        const result = await ipcRenderer.invoke('get-openai-key');
        if (result.key) {
          apiKeyInput.value = result.key;
        }
      } catch (error) {
        console.error('Error getting API key:', error);
      }
    })();
  };
  
  // Function to hide API key modal
  window.hideApiKeyModal = function() {
    apiKeyModal.classList.add('hidden');
  };
  
  // Close modal when clicking outside the content
  apiKeyModal.addEventListener('click', (event) => {
    if (event.target === apiKeyModal) {
      window.hideApiKeyModal();
    }
  });
  
  // Handle Enter key in API key input
  apiKeyInput.addEventListener('keyup', (event) => {
    if (event.key === 'Enter') {
      saveApiKeyButton.click();
    }
  });
  
  // Handle close modal button click
  closeModalButton.addEventListener('click', () => {
    window.hideApiKeyModal();
  });
  
  // Handle cancel button click
  cancelApiKeyButton.addEventListener('click', () => {
    window.hideApiKeyModal();
  });
  
  // Handle save API key button click
  saveApiKeyButton.addEventListener('click', async () => {
    const apiKey = apiKeyInput.value.trim();
    
    // Clear previous error
    apiKeyError.classList.add('hidden');
    
    try {
      const result = await ipcRenderer.invoke('save-openai-key', { apiKey });
      
      if (result.success) {
        window.hideApiKeyModal();
        
        // Show loading indicator
        const conversationsLoading = document.getElementById('conversationsLoading');
        const progressContainer = document.getElementById('progressContainer');
        const loadingText = document.getElementById('loadingText');
        
        conversationsLoading.classList.remove('hidden');
        progressContainer.classList.remove('hidden');
        loadingText.textContent = 'Categorizing conversations...';
        
        // Start categorization process
        window.startCategorizingConversations();
        
        // Show conversation list and pagination after categorization
        const conversationsList = document.getElementById('conversationsList');
        conversationsList.classList.remove('hidden');
        document.querySelector('.pagination').classList.remove('hidden');
        
        // Hide the categorize button and its container
        const categorizeButton = document.getElementById('categorizeButton');
        const categorizeContainer = document.querySelector('.categorize-container');
        if (categorizeContainer) {
          categorizeContainer.style.display = 'none';
        }
      } else {
        apiKeyError.textContent = result.error;
        apiKeyError.classList.remove('hidden');
      }
    } catch (error) {
      apiKeyError.textContent = `Error: ${error.message}`;
      apiKeyError.classList.remove('hidden');
    }
  });
}

module.exports = {
  initApiKey
};