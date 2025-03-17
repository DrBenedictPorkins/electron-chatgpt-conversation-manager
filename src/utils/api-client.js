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
    
    // Sort conversations based on the current sort type (defaults to update_time if not set)
    const sortType = state.sortType || 'update_time';
    allConversations.sort((a, b) => new Date(b[sortType]) - new Date(a[sortType]));
    
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
      
      // If showing all conversations (no category filter), ensure filter notice is removed
      if (!state.currentCategoryFilter) {
        const filterNotice = document.querySelector('.filter-notice');
        if (filterNotice) {
          console.log('Removing filter notice when showing all conversations');
          filterNotice.remove();
        }
      }
      
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
  const headerViewControls = document.getElementById('headerViewControls');
  
  // Get sort button
  const sortToggleButton = document.getElementById('sortToggleButton');
  
  // If filtering by a specific category, hide only the grouping buttons but keep sort button
  if (state.currentCategoryFilter) {
    // Show the viewControls container but hide specific group buttons
    if (viewControlsContainer) {
      viewControlsContainer.style.display = 'block';
    }
    
    // Hide category controls container
    const categoryControls = document.getElementById('categoryControls');
    if (categoryControls) categoryControls.style.display = 'none';
    
    // Make sure sort button is visible (but only if categorization has been done)
    if (sortToggleButton && window.hasCategorizedData) {
      sortToggleButton.classList.remove('hidden');
      sortToggleButton.style.display = 'flex';
    }
    
    return;
  }
  
  // Check if the categorization feature is enabled
  const categorizationEnabled = viewControlsContainer && 
                              viewControlsContainer.dataset && 
                              viewControlsContainer.dataset.needsCategorization === "false";
  
  // Check if conversations have been categorized (use both our flags and the actual data check)
  const hasCategorizedData = window.hasCategorizedData === true && 
                           window.allCategorizedResults && 
                           window.allCategorizedResults.length > 0 &&
                           state.cachedConversations.some(conv => !!conv.category);
  
  console.log('Checking categorization status:', {
    globalFlag: window.hasCategorizedData,
    categorizationEnabled: categorizationEnabled,
    hasResults: !!window.allCategorizedResults,
    resultsLength: window.allCategorizedResults ? window.allCategorizedResults.length : 0,
    hasCategories: state.cachedConversations && state.cachedConversations.some(conv => !!conv.category)
  });
  
  // Hide the group by category buttons if categorization is needed or no categorized data exists
  if (!categorizationEnabled || !hasCategorizedData) {
    console.log('Hiding view controls - categorization not enabled or no data');
    viewControlsContainer.style.display = 'none';
    return;
  }
  
  // Otherwise show the container and category controls
  console.log('Showing view controls - categorization enabled and data available');
  viewControlsContainer.style.display = 'block';
  
  // Show category controls
  const categoryControls = document.getElementById('categoryControls');
  if (categoryControls) categoryControls.style.display = 'flex';
  
  // Check if we're in delete/archive mode (disable grouping when selecting items)
  const hasSelectedItems = (state.selectedForDeletion && state.selectedForDeletion.length > 0) || 
                        (state.selectedForArchive && state.selectedForArchive.length > 0);
                        
  // Hide grouping buttons when selecting items
  if (hasSelectedItems) {
    viewControlsContainer.style.display = 'none';
    return;
  }
  
  if (state.groupByCategory) {
    // If grouped by category, show Clear Grouping button
    groupButton.style.display = 'none';
    clearGroupingButton.style.display = 'inline-block';
  } else {
    // If not grouped, show Group by Category button
    groupButton.style.display = 'inline-block';
    clearGroupingButton.style.display = 'none';
  }
  
  // Update the category dropdown list
  updateCategoryDropdown(state);
}

/**
 * Apply consistent styling to dropdown menu items
 * @param {HTMLElement} item - The dropdown item element
 */
function applyDropdownItemStyle(item) {
  item.style.padding = '10px 15px'; // More padding
  item.style.cursor = 'pointer';
  item.style.transition = 'all 0.2s';
  item.style.fontSize = '14px'; // Larger font size
  item.style.color = '#111827'; // Darker text
  item.style.borderBottom = '1px solid #f0f0f0'; // Separator line
  item.style.margin = '0 5px'; // Margin on sides
}

function updateCategoryDropdown(state) {
  const dropdownList = document.getElementById('categoryDropdownList');
  const dropdownMenu = document.getElementById('categoryDropdownMenu');
  
  if (!dropdownList || !window.allCategorizedResults) return;
  
  // Clear the dropdown
  dropdownList.innerHTML = '';
  
  // Get unique categories
  const categories = new Set();
  if (window.allCategorizedResults) {
    window.allCategorizedResults.forEach(item => {
      if (item.category) {
        categories.add(item.category);
      }
    });
  }
  
  if (categories.size === 0) {
    const noCategories = document.createElement('div');
    // Apply base styling
    applyDropdownItemStyle(noCategories);
    // Add special styling for empty state
    noCategories.style.color = '#6c757d';
    noCategories.style.fontStyle = 'italic';
    noCategories.style.textAlign = 'center';
    noCategories.style.cursor = 'default';
    noCategories.textContent = 'No categories available';
    dropdownList.appendChild(noCategories);
    return;
  }
  
  // Add each category to the dropdown with enhanced styling
  Array.from(categories).sort().forEach(category => {
    const item = document.createElement('div');
    item.classList.add('category-dropdown-item');
    item.textContent = category;
    
    // Apply consistent item styling
    applyDropdownItemStyle(item);
    
    // Add hover effect
    item.addEventListener('mouseenter', () => {
      item.style.backgroundColor = '#f0f9ff';
      item.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.1)';
      item.style.transform = 'translateX(3px)'; // Slight movement on hover
    });
    
    item.addEventListener('mouseleave', () => {
      item.style.backgroundColor = 'transparent';
      item.style.boxShadow = 'none';
      item.style.transform = 'translateX(0)';
    });
    
    // Add click handler to filter by this category
    item.addEventListener('click', () => {
      // Set the filter and reset to first page
      state.currentCategoryFilter = category;
      state.currentOffset = 0;
      
      // Update view controls visibility
      updateViewControlButtons(state);
      
      // Reload conversations with the filter
      if (window.loadConversations) {
        window.loadConversations(0, state.pageSize);
      }
      
      // Hide the dropdown
      if (dropdownMenu) {
        dropdownMenu.style.display = 'none';
      }
    });
    
    dropdownList.appendChild(item);
  });
  
  // Add dropdown menu functionality
  // Find the group button reference first
  const groupByCategoryButton = document.getElementById('groupByCategoryButton');
  
  // Create a separate button for the dropdown with improved styling
  const dropdownToggle = document.createElement('span');
  dropdownToggle.innerHTML = '▼';
  dropdownToggle.style.marginLeft = '8px';
  dropdownToggle.style.cursor = 'pointer';
  dropdownToggle.style.transition = 'transform 0.2s, opacity 0.2s';
  dropdownToggle.style.opacity = '0.8';
  dropdownToggle.style.fontSize = '10px';
  dropdownToggle.style.padding = '0 3px';
  dropdownToggle.style.backgroundColor = 'rgba(255, 255, 255, 0.3)';
  dropdownToggle.style.borderRadius = '3px';
  dropdownToggle.title = 'Show category options';
  dropdownToggle.className = 'dropdown-toggle';
  
  // Add hover effect to dropdown toggle if button is found
  if (groupByCategoryButton) {
    groupByCategoryButton.addEventListener('mouseenter', () => {
      const toggle = groupByCategoryButton.querySelector('.dropdown-toggle');
      if (toggle) {
        toggle.style.opacity = '1';
        toggle.style.transform = 'scale(1.2)';
      }
    });
    
    groupByCategoryButton.addEventListener('mouseleave', () => {
      const toggle = groupByCategoryButton.querySelector('.dropdown-toggle');
      if (toggle) {
        toggle.style.opacity = '0.8';
        toggle.style.transform = 'scale(1)';
      }
    });
  }
  
  if (groupByCategoryButton && dropdownMenu) {
    // Add the dropdown toggle to the button if not already there
    if (!groupByCategoryButton.querySelector('.dropdown-toggle')) {
      groupByCategoryButton.appendChild(dropdownToggle);
    }
    
    // Style the dropdown menu to match the individual category dropdowns
    if (dropdownMenu) {
      dropdownMenu.style.position = 'absolute';
      dropdownMenu.style.zIndex = '1000';
      dropdownMenu.style.backgroundColor = 'white';
      dropdownMenu.style.boxShadow = '0 4px 15px rgba(0, 0, 0, 0.3)';
      dropdownMenu.style.border = '1px solid #d1d5db';
      dropdownMenu.style.borderRadius = '4px';
      dropdownMenu.style.padding = '8px 0';
      dropdownMenu.style.minWidth = '220px';
      dropdownMenu.style.maxHeight = '400px';
      dropdownMenu.style.overflowY = 'auto';
      dropdownMenu.style.transition = 'opacity 0.2s ease, transform 0.2s ease';
      dropdownMenu.style.right = '0';
      dropdownMenu.style.top = '38px';
    }
    
    // Add dropdown toggle functionality
    dropdownToggle.addEventListener('click', (e) => {
      // Prevent the main button action
      e.stopPropagation();
      e.preventDefault();
      
      // Toggle the dropdown
      if (dropdownMenu.style.display === 'block') {
        // Hide dropdown with fade-out effect
        dropdownMenu.style.opacity = '0';
        dropdownMenu.style.transform = 'translateY(-10px)';
        setTimeout(() => {
          dropdownMenu.style.display = 'none';
        }, 200);
      } else {
        // Show dropdown with animation
        dropdownMenu.style.display = 'block';
        dropdownMenu.style.opacity = '0';
        dropdownMenu.style.transform = 'translateY(-10px)';
        dropdownMenu.style.zIndex = '9999';
        
        // Add highlight to make it more noticeable
        dropdownMenu.style.border = '2px solid #3b82f6';
        
        // Animate in
        setTimeout(() => {
          dropdownMenu.style.opacity = '1';
          dropdownMenu.style.transform = 'translateY(0)';
          
          // Restore normal border after a short delay
          setTimeout(() => {
            dropdownMenu.style.border = '1px solid #d1d5db';
          }, 800);
        }, 10);
      }
      
      return false;
    });
    
    // When group button is clicked, just perform the grouping action
    groupByCategoryButton.addEventListener('click', () => {
      // Call the global grouping function
      if (window.performGroupByCategory) {
        window.performGroupByCategory();
      }
    });
    
    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
      if (!dropdownMenu.contains(e.target) && e.target !== dropdownToggle) {
        dropdownMenu.style.display = 'none';
      }
    });
  }
}

/**
 * Get the original ChatGPT headers stored from the cURL command
 * @returns {Promise<Object>} The headers object
 */
async function getOriginalHeaders() {
  try {
    const result = await ipcRenderer.invoke('get-headers');
    
    if (!result.success) {
      console.error('Failed to get headers:', result.error);
      return null;
    }
    
    return result.headers;
  } catch (error) {
    console.error('Error getting headers:', error);
    return null;
  }
}

module.exports = {
  loadAllConversations,
  fetchConversations,
  filterConversationsByCategory,
  updateViewControlButtons,
  updateCategoryDropdown,
  getOriginalHeaders
};