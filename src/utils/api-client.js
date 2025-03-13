// src/utils/api-client.js - IPC wrapper for API calls
const { ipcRenderer } = require('electron');

/**
 * Load all conversations
 * @param {Object} state - Global application state
 * @returns {Promise<Array>} Array of conversations
 */
async function loadAllConversations(state) {
  try {
    if (state.cachedConversations.length > 0) {
      console.log("Using cached conversations");
      window.updateStatsPanel(state.cachedConversations);
      return state.cachedConversations;
    }
    
    // Show loading indicator and progress bar
    const conversationsLoading = document.getElementById('conversationsLoading');
    const progressContainer = document.getElementById('progressContainer');
    const loadingText = document.getElementById('loadingText');
    
    conversationsLoading.classList.remove('hidden');
    progressContainer.classList.remove('hidden');
    window.hideConversationError();
    
    // Reset progress bar
    window.updateProgressBar(0);
    loadingText.textContent = 'Loading all conversations...';
    
    // Get total number of conversations
    const allConversations = [];
    const batchSize = 100;
    let offset = 0;
    let total = state.totalConversations; // We already know the total
    
    // Check if there are no conversations
    if (total === 0) {
      console.log("No conversations found, showing empty state");
      // Hide loading indicator and progress bar
      conversationsLoading.classList.add('hidden');
      progressContainer.classList.add('hidden');
      
      // Show empty stats panel
      const statsPanel = document.getElementById('statsPanel');
      statsPanel.classList.remove('hidden');
      return [];
    }
    
    // Calculate the number of batches needed
    const totalBatches = Math.ceil(total / batchSize);
    let currentBatch = 1;
    
    // Fetch all conversations in batches
    while (offset < total) {
      loadingText.textContent = `Loading conversations... Batch ${currentBatch}/${totalBatches}`;
      window.updateProgressBar((currentBatch - 1) / totalBatches * 100);
      
      const result = await ipcRenderer.invoke('fetch-conversations', { 
        offset: offset, 
        limit: batchSize 
      });
      
      if (!result.success) {
        throw new Error(`Failed to fetch conversations: ${result.error}`);
      }
      
      // Add to our collection
      allConversations.push(...result.conversations);
      
      // Update progress
      offset += batchSize;
      currentBatch++;
      
      // Update progress bar
      window.updateProgressBar(Math.min((offset / total) * 100, 100));
    }
    
    // Hide loading indicator and progress bar
    conversationsLoading.classList.add('hidden');
    progressContainer.classList.add('hidden');
    
    // Sort conversations by update time (newest first)
    allConversations.sort((a, b) => new Date(b.update_time) - new Date(a.update_time));
    
    // Store in cache (even if empty)
    state.cachedConversations = allConversations;
    
    // Enable view controls after conversations are loaded
    const viewControls = document.getElementById('viewControls');
    if (viewControls) {
      viewControls.style.display = 'block';
    }
    
    // Update and show the stats panel
    window.updateStatsPanel(state.cachedConversations);
    
    return allConversations;
  } catch (error) {
    console.error('Error in loadAllConversations:', error);
    
    const conversationsLoading = document.getElementById('conversationsLoading');
    const progressContainer = document.getElementById('progressContainer');
    
    conversationsLoading.classList.add('hidden');
    progressContainer.classList.add('hidden');
    window.showConversationError(`Error loading conversations: ${error.message}`);
    return [];
  }
}

/**
 * Fetch conversations for display
 * @param {Object} state - Global application state
 * @param {number} offset - Pagination offset
 * @param {number} limit - Number of results per page
 * @returns {Promise<void>}
 */
async function fetchConversations(state, offset = 0, limit = state.pageSize) {
  try {
    // Show loading indicator
    const conversationsLoading = document.getElementById('conversationsLoading');
    conversationsLoading.classList.remove('hidden');
    window.hideConversationError();
    
    let conversationsToShow = [];
    let total = 0;
    
    // If we have cached conversations, use them
    if (state.cachedConversations.length > 0) {
      console.log("Using cached conversations for display");
      
      // Apply category filter if active
      let filteredConversations = state.cachedConversations;
      if (state.currentCategoryFilter) {
        filteredConversations = filterConversationsByCategory(state, state.currentCategoryFilter);
        console.log(`Filtered to ${filteredConversations.length} conversations in category "${state.currentCategoryFilter}"`);
      }
      
      total = filteredConversations.length;
      conversationsToShow = filteredConversations.slice(offset, offset + limit);
      conversationsLoading.classList.add('hidden');
      
      // Render conversations
      if (state.groupByCategory && !state.currentCategoryFilter) {
        // If grouping by category and not filtering, show categorized view
        window.displayCategorizedConversations(window.allCategorizedResults || []);
      } else {
        // Otherwise show regular list (time-ordered or filtered)
        window.renderConversations(conversationsToShow);
      }
      
      // Update pagination
      window.updatePagination(offset, limit, total);
      
      // Update view controls based on current state
      updateViewControlButtons(state);
    } else {
      // Otherwise fetch from API
      const result = await ipcRenderer.invoke('fetch-conversations', { offset, limit });
      conversationsLoading.classList.add('hidden');
      
      if (result.success) {
        // Render conversations
        window.renderConversations(result.conversations);
        
        // Update pagination
        window.updatePagination(result.offset, result.limit, result.total);
      } else {
        window.showConversationError(`Failed to fetch conversations: ${result.error}`);
      }
    }
  } catch (error) {
    const conversationsLoading = document.getElementById('conversationsLoading');
    conversationsLoading.classList.add('hidden');
    window.showConversationError(`Error: ${error.message}`);
  }
}

/**
 * Filter conversations by category
 * @param {Object} state - Global application state
 * @param {string} category - Category to filter by
 * @returns {Array} Filtered conversations
 */
function filterConversationsByCategory(state, category) {
  if (!state.cachedConversations || state.cachedConversations.length === 0) {
    return [];
  }
  
  if (!category) {
    return state.cachedConversations;
  }
  
  return state.cachedConversations.filter(conversation => 
    conversation.category && conversation.category.includes(category)
  );
}

/**
 * Update the visibility of view control buttons
 * @param {Object} state - Global application state
 */
function updateViewControlButtons(state) {
  const groupButton = document.getElementById('groupByCategoryButton');
  const clearGroupingButton = document.getElementById('clearGroupingButton');
  const viewControlsContainer = document.getElementById('viewControls');
  
  // If filtering by a specific category, hide both buttons
  if (state.currentCategoryFilter) {
    viewControlsContainer.style.display = 'none';
    return;
  }
  
  // Otherwise show the container
  viewControlsContainer.style.display = 'block';
  
  if (state.groupByCategory) {
    // If grouped by category, show Clear Grouping button
    groupButton.style.display = 'none';
    clearGroupingButton.style.display = 'inline-block';
  } else {
    // If not grouped, show Group by Category button
    groupButton.style.display = 'inline-block';
    clearGroupingButton.style.display = 'none';
  }
}

module.exports = {
  loadAllConversations,
  fetchConversations,
  filterConversationsByCategory,
  updateViewControlButtons
};