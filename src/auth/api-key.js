// src/auth/api-key.js - API key management
const { ipcRenderer } = require('electron');

/**
 * Restore UI state after canceling categorization
 */
function restoreUIAfterCancel() {
  console.log('Canceling categorization');
  // Just close the modal without changing anything
}

/**
 * Initialize API key management functionality
 * @param {Object} state - Global application state
 */
function initApiKey(state) {
  const apiKeyModal = document.getElementById('apiKeyModal');
  const promptModal = document.getElementById('promptModal');
  const closeModalButton = document.querySelector('#apiKeyModal .close-button');
  const closePromptButton = document.getElementById('closePromptButton');
  const apiKeyInput = document.getElementById('apiKeyInput');
  const promptInput = document.getElementById('promptInput');
  const apiKeyError = document.getElementById('apiKeyError');
  const promptError = document.getElementById('promptError');
  const cancelApiKeyButton = document.getElementById('cancelApiKeyButton');
  const cancelPromptButton = document.getElementById('cancelPromptButton');
  const saveApiKeyButton = document.getElementById('saveApiKeyButton');
  const savePromptButton = document.getElementById('savePromptButton');
  const resetPromptButton = document.getElementById('resetPromptButton');
  const savePromptCheckbox = document.getElementById('savePromptCheckbox');
  
  let defaultPrompt = '';
  
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
  
  // Function to show prompt customization modal
  window.showPromptModal = async function() {
    promptModal.classList.remove('hidden');
    promptError.classList.add('hidden');
    
    // Load default prompt if we haven't already
    if (!defaultPrompt) {
      try {
        const result = await ipcRenderer.invoke('get-default-prompt');
        defaultPrompt = result.defaultPrompt;
      } catch (error) {
        console.error('Error getting default prompt:', error);
      }
    }
    
    // Check if we already have a custom prompt
    try {
      const result = await ipcRenderer.invoke('get-custom-prompt');
      if (result.customPrompt) {
        promptInput.value = result.customPrompt;
      } else {
        promptInput.value = defaultPrompt;
      }
    } catch (error) {
      console.error('Error getting custom prompt:', error);
      promptInput.value = defaultPrompt;
    }
  };
  
  // Function to hide prompt customization modal
  window.hidePromptModal = function() {
    promptModal.classList.add('hidden');
  };
  
  // Close modal when clicking outside the content
  apiKeyModal.addEventListener('click', (event) => {
    if (event.target === apiKeyModal) {
      window.hideApiKeyModal();
      // Restore UI elements
      restoreUIAfterCancel();
    }
  });
  
  promptModal.addEventListener('click', (event) => {
    if (event.target === promptModal) {
      window.hidePromptModal();
      // Restore UI elements
      restoreUIAfterCancel();
    }
  });
  
  // Handle Enter key in API key input
  apiKeyInput.addEventListener('keyup', (event) => {
    if (event.key === 'Enter') {
      saveApiKeyButton.click();
    }
  });
  
  // Handle close modal button clicks
  closeModalButton.addEventListener('click', () => {
    window.hideApiKeyModal();
    // Restore UI elements
    restoreUIAfterCancel();
  });
  
  closePromptButton.addEventListener('click', () => {
    window.hidePromptModal();
    // Restore UI elements
    restoreUIAfterCancel();
  });
  
  // Handle cancel button clicks
  cancelApiKeyButton.addEventListener('click', () => {
    window.hideApiKeyModal();
    // Restore UI elements
    restoreUIAfterCancel();
  });
  
  cancelPromptButton.addEventListener('click', () => {
    window.hidePromptModal();
    // Restore UI elements
    restoreUIAfterCancel();
  });
  
  // Handle reset prompt button click
  resetPromptButton.addEventListener('click', async () => {
    try {
      const result = await ipcRenderer.invoke('get-default-prompt');
      promptInput.value = result.defaultPrompt;
    } catch (error) {
      console.error('Error getting default prompt:', error);
    }
  });
  
  // Handle save API key button click
  saveApiKeyButton.addEventListener('click', async () => {
    const apiKey = apiKeyInput.value.trim();
    
    // Clear previous error
    apiKeyError.classList.add('hidden');
    
    try {
      console.log('Validating OpenAI API key...');
      const result = await ipcRenderer.invoke('save-openai-key', { apiKey });
      console.log('OpenAI API key validation result:', result.success ? 'Success!' : `Error: ${result.error}`);
      
      if (result.success) {
        window.hideApiKeyModal();
        
        // Show prompt customization modal
        window.showPromptModal();
      } else {
        apiKeyError.textContent = result.error;
        apiKeyError.classList.remove('hidden');
      }
    } catch (error) {
      apiKeyError.textContent = `Error: ${error.message}`;
      apiKeyError.classList.remove('hidden');
    }
  });
  
  // Handle save prompt button click
  savePromptButton.addEventListener('click', async () => {
    const customPrompt = promptInput.value.trim();
    const savePrompt = savePromptCheckbox.checked;
    
    // Clear previous error
    promptError.classList.add('hidden');
    
    // Validate that the prompt contains the titles placeholder
    if (!customPrompt.includes('{{TITLES}}')) {
      promptError.textContent = 'The prompt must include {{TITLES}} placeholder where conversation titles will be inserted.';
      promptError.classList.remove('hidden');
      return;
    }
    
    try {
      console.log('Saving custom prompt for ChatGPT categorization...');
      const result = await ipcRenderer.invoke('save-custom-prompt', { 
        customPrompt, 
        save: savePrompt 
      });
      console.log('Custom prompt save result:', result.success ? 'Success!' : `Error: ${result.error}`);
      
      if (result.success) {
        window.hidePromptModal();
        
        // Now that we've confirmed via API key and prompt dialogs, we can start the categorization process
        // Show loading indicator
        const conversationsLoading = document.getElementById('conversationsLoading');
        const progressContainer = document.getElementById('progressContainer');
        const loadingText = document.getElementById('loadingText');
        
        conversationsLoading.classList.remove('hidden');
        progressContainer.classList.remove('hidden');
        loadingText.textContent = 'Categorizing conversations...';
        
        // Start categorization process (will clear previous categorization data if hasCategorizedData is true)
        window.startCategorizingConversations();
        
        // Show conversation list and pagination after categorization
        const conversationsList = document.getElementById('conversationsList');
        conversationsList.classList.remove('hidden');
        
        // Hide the categorize button and its container
        const categorizeButton = document.getElementById('categorizeButton');
        const categorizeContainer = document.querySelector('.categorize-container');
        if (categorizeContainer) {
          categorizeContainer.style.display = 'none';
        }
      } else {
        promptError.textContent = result.error;
        promptError.classList.remove('hidden');
      }
    } catch (error) {
      promptError.textContent = `Error: ${error.message}`;
      promptError.classList.remove('hidden');
    }
  });
}

module.exports = {
  initApiKey
};