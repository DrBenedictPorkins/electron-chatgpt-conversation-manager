// src/auth/auth.js - Authentication functionality
const { ipcRenderer } = require('electron');

// Create a global function to handle the connection
// This can be called directly from the HTML button
window.processConnection = async function() {
  console.log('processConnection called!');
  const curlInput = document.getElementById('curlInput');
  const submitButton = document.getElementById('submitButton');
  const loadingIndicator = document.getElementById('loading');
  const nextButtonContainer = document.getElementById('nextButtonContainer');
  const nextButton = document.getElementById('nextButton');
  
  // Ensure we have all needed elements
  if (!curlInput || !submitButton || !loadingIndicator) {
    console.error('Required elements not found');
    alert('UI elements not found. Please restart the application.');
    return;
  }
  
  // Clear previous messages
  if (window.hideStatus) window.hideStatus();
  
  const curlCommand = curlInput.value.trim();
  
  if (!curlCommand) {
    if (window.showValidationError) {
      window.showValidationError('Please paste a cURL command before connecting');
    } else {
      alert('Please paste a cURL command before connecting');
    }
    submitButton.innerHTML = 'Connect to ChatGPT';
    return;
  }
  
  // Disable submit button during processing
  submitButton.disabled = true;
  submitButton.innerHTML = 'Connecting...';
  loadingIndicator.classList.remove('hidden');

  try {
    console.log('Attempting to invoke process-curl');
    
    // Send the cURL command to the main process for processing
    const result = await ipcRenderer.invoke('process-curl', curlCommand);
    
    console.log('Process-curl result:', result);
    
    if (result && result.success) {
      // Show success
      if (window.showSuccess) {
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
      } else {
        alert('Connection successful!');
      }
      
      // Show the Next button
      if (nextButton && nextButtonContainer) {
        nextButton.style.display = 'inline-block';
        nextButtonContainer.classList.remove('hidden');
      }
    } else {
      // Show error
      const errorMsg = result && result.error ? result.error : 'Unknown error occurred';
      if (window.showValidationError) {
        window.showValidationError(`Connection failed: ${errorMsg}`);
      } else {
        alert(`Connection failed: ${errorMsg}`);
      }
      
      if (nextButtonContainer) {
        nextButtonContainer.classList.add('hidden');
      }
    }
  } catch (error) {
    console.error('ERROR:', error);
    
    // Show error
    if (window.showValidationError) {
      window.showValidationError(`Error: ${error.message}`);
    } else {
      alert(`Error: ${error.message}`);
    }
  } finally {
    submitButton.disabled = false;
    submitButton.innerHTML = 'Connect to ChatGPT';
    loadingIndicator.classList.add('hidden');
  }
};

/**
 * Initialize authentication functionality
 * @param {Object} state - Global application state
 */
function initAuth(state) {
  console.log('Initializing auth module');
  
  // Find important elements
  const submitButton = document.getElementById('submitButton');
  const nextButton = document.getElementById('nextButton');
  const loadingIndicator = document.getElementById('loading');
  const nextButtonContainer = document.getElementById('nextButtonContainer');
  
  // Make sure all needed elements exist
  if (!submitButton || !nextButton || !loadingIndicator || !nextButtonContainer) {
    console.error('Some required auth elements not found');
  }
  
  // Ensure elements are hidden at startup
  if (loadingIndicator) loadingIndicator.classList.add('hidden');
  if (nextButtonContainer) nextButtonContainer.classList.add('hidden');
  if (nextButton) nextButton.style.display = 'none'; // Hide the button itself initially
  
  // Add click event to submit button (main handler)
  if (submitButton) {
    submitButton.addEventListener('click', () => {
      console.log('Submit button clicked via event listener');
      if (window.processConnection) {
        window.processConnection();
      } else {
        console.error('processConnection not available');
        alert('Error: Connection function not available. Please restart the application.');
      }
    });
  }
  
  // Add click event to next button if found
  if (nextButton) {
    nextButton.addEventListener('click', async () => {
      // Switch to conversations screen
      if (window.showScreen) {
        window.showScreen('conversations');
      }
      
      // Show loading indicator 
      const conversationsLoading = document.getElementById('conversationsLoading');
      const progressContainer = document.getElementById('progressContainer');
      const loadingText = document.getElementById('loadingText');
      
      if (conversationsLoading) conversationsLoading.classList.remove('hidden');
      if (progressContainer) progressContainer.classList.remove('hidden');
      if (loadingText) loadingText.textContent = 'Loading all conversations...';
      
      // Hide the conversation list and pagination initially
      const conversationsList = document.getElementById('conversationsList');
      const pagination = document.querySelector('.pagination');
      
      if (conversationsList) conversationsList.classList.add('hidden');
      if (pagination) pagination.classList.add('hidden');
      
      try {
        // First, fetch just one conversation to get the total
        console.log('Fetching initial conversation batch to get total count');
        const initialResult = await ipcRenderer.invoke('fetch-conversations', { offset: 0, limit: 1 });
        
        if (!initialResult.success) {
          throw new Error(`Failed to fetch conversations: ${initialResult.error}`);
        }
        
        // Set the total conversations count
        state.totalConversations = initialResult.total;
        console.log(`Total conversations found: ${state.totalConversations}`);
        
        if (state.totalConversations === 0) {
          // No conversations found, show stats panel with empty state
          const statsPanel = document.getElementById('statsPanel');
          const statsTotalCount = document.getElementById('statsTotalCount');
          const statsFirstDate = document.getElementById('statsFirstDate');
          const statsLatestDate = document.getElementById('statsLatestDate');
          const recentConversationsList = document.getElementById('recentConversationsList');
          const recentConversations = document.getElementById('recentConversations');
          
          if (statsPanel) statsPanel.classList.remove('hidden');
          if (statsTotalCount) statsTotalCount.textContent = '0';
          if (statsFirstDate) statsFirstDate.textContent = 'N/A';
          if (statsLatestDate) statsLatestDate.textContent = 'N/A';
          if (recentConversationsList) recentConversationsList.innerHTML = '<li class="recent-conversation-item" style="text-align: center; padding: 15px;">No conversations found</li>';
          if (recentConversations) recentConversations.classList.remove('hidden');
          
          // Hide loading indicators
          if (conversationsLoading) conversationsLoading.classList.add('hidden');
          if (progressContainer) progressContainer.classList.add('hidden');
          
          return;
        }
        
        // If we have conversations, load them all via the global function
        if (window.loadAllConversations) {
          console.log('Loading all conversations...');
          const allConversations = await window.loadAllConversations();
          
          // Make sure recent conversations section is displayed
          const recentConversations = document.getElementById('recentConversations');
          if (recentConversations) {
            recentConversations.classList.remove('hidden');
          }
          
          // Update stats panel with the new data
          if (window.updateStatsPanel) {
            window.updateStatsPanel(allConversations);
          }
        } else {
          console.error('loadAllConversations function not available');
          throw new Error('Error loading conversations: Function not available');
        }
      } catch (error) {
        console.error('Error during conversation loading:', error);
        if (window.showConversationError) {
          window.showConversationError(`Error: ${error.message}`);
        }
      } finally {
        // Hide loading indicators
        if (conversationsLoading) conversationsLoading.classList.add('hidden');
        if (progressContainer) progressContainer.classList.add('hidden');
      }
    });
  }
  
  // Handle Back button click
  const backButton = document.getElementById('backButton');
  if (backButton) {
    backButton.addEventListener('click', () => {
      // Reset all app state to initial values
      console.log('Back button clicked - resetting app to initial state');
      
      // Reset categorization state
      window.hasCategorizedData = false;
      window.allCategorizedResults = null;
      window.allConversationsData = null;
      window.isCategorizing = false;
      
      // Reset the stats display to remove any category count
      const statsCountElement = document.getElementById('statsTotalCount');
      if (statsCountElement) {
        statsCountElement.textContent = '0';
      }
      
      // Clear conversation cache
      if (state) {
        state.cachedConversations = [];
        state.totalConversations = 0;
        state.currentOffset = 0;
        state.currentCategoryFilter = null;
        state.groupByCategory = false;
        state.selectedForDeletion = [];
        state.selectedForArchive = [];
      }
      
      // Reset UI elements
      // Main categorize button should be visible
      const categorizeContainer = document.getElementById('categorizeContainer');
      if (categorizeContainer) categorizeContainer.style.display = 'block';
      
      // View controls should be hidden
      const viewControls = document.getElementById('viewControls');
      if (viewControls) {
        viewControls.style.display = 'none';
        viewControls.dataset.needsCategorization = "true";
      }
      
      // Hide the sort toggle button
      const sortToggleButton = document.getElementById('sortToggleButton');
      if (sortToggleButton) sortToggleButton.classList.add('hidden');
      
      // Category grouping buttons should be hidden
      const groupByCategoryButton = document.getElementById('groupByCategoryButton');
      if (groupByCategoryButton) groupByCategoryButton.style.display = 'none';
      
      const clearGroupingButton = document.getElementById('clearGroupingButton');
      if (clearGroupingButton) clearGroupingButton.style.display = 'none';
      
      // Reset conversation list
      const conversationsList = document.getElementById('conversationsList');
      if (conversationsList) {
        conversationsList.innerHTML = '';
        conversationsList.classList.add('hidden');
      }
      
      // Reset recent conversations
      const recentConversationsList = document.getElementById('recentConversationsList');
      if (recentConversationsList) {
        recentConversationsList.innerHTML = '';
      }
      
      // Reset stats panel
      const statsPanel = document.getElementById('statsPanel');
      if (statsPanel) statsPanel.classList.add('hidden');
      
      const statsTotalCount = document.getElementById('statsTotalCount');
      if (statsTotalCount) statsTotalCount.textContent = '0';
      
      const statsFirstDate = document.getElementById('statsFirstDate');
      if (statsFirstDate) statsFirstDate.textContent = '-';
      
      const statsLatestDate = document.getElementById('statsLatestDate');
      if (statsLatestDate) statsLatestDate.textContent = '-';
      
      // Hide pagination
      const pagination = document.querySelector('.pagination');
      if (pagination) pagination.classList.add('hidden');
      
      // Reset any counters
      const archiveCounter = document.getElementById('archiveCounter');
      if (archiveCounter) archiveCounter.style.display = 'none';
      
      const deleteCounter = document.getElementById('deleteCounter');
      if (deleteCounter) deleteCounter.style.display = 'none';
      
      // Hide loading indicators
      const conversationsLoading = document.getElementById('conversationsLoading');
      const progressContainer = document.getElementById('progressContainer');
      if (conversationsLoading) conversationsLoading.classList.add('hidden');
      if (progressContainer) progressContainer.classList.add('hidden');
      
      // Switch to login screen
      if (window.showScreen) {
        window.showScreen('login');
      }
    });
  }
  
  // Make sure we have window.processConnection available
  if (!window.processConnection) {
    console.error('processConnection function not defined properly');
  } else {
    console.log('processConnection function is available');
  }
  
  return true;
}

module.exports = {
  initAuth
};