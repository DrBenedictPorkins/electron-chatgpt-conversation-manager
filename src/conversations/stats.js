// src/conversations/stats.js - Stats panel functionality
const { formatDateAsDaysAgo } = require('../utils/date-formatter');

/**
 * Initialize stats panel functionality
 * @param {Object} state - Global application state
 */
function initStats(state) {
  // Initialize sort type in the state if not already present
  if (!state.sortType) {
    state.sortType = 'update_time'; // Default sort by update time
  }
  
  // Make updateStatsPanel function available globally
  window.updateStatsPanel = function(conversations) {
    const statsPanel = document.getElementById('statsPanel');
    const statsTotalCount = document.getElementById('statsTotalCount');
    const statsFirstDate = document.getElementById('statsFirstDate');
    const statsLatestDate = document.getElementById('statsLatestDate');
    const recentConversationsList = document.getElementById('recentConversationsList');
    
    // Always show the stats panel, even if empty
    statsPanel.classList.remove('hidden');
    
    if (!conversations || conversations.length === 0) {
      // Handle empty state
      statsTotalCount.textContent = '0';
      statsFirstDate.textContent = 'N/A';
      statsLatestDate.textContent = 'N/A';
      
      // Create empty state list item
      const emptyItem = document.createElement('li');
      emptyItem.classList.add('recent-conversation-item');
      emptyItem.style.textAlign = 'center';
      emptyItem.style.padding = '15px';
      emptyItem.textContent = 'No conversations found';
      
      // Clear list and add empty state item
      recentConversationsList.innerHTML = '';
      recentConversationsList.appendChild(emptyItem);
      return;
    }
    
    // Sort conversations by date (newest first for recent list)
    const sortedByUpdate = [...conversations].sort((a, b) => 
      new Date(b.update_time) - new Date(a.update_time)
    );
    
    // Sort by creation date for finding oldest
    const sortedByCreate = [...conversations].sort((a, b) => 
      new Date(a.create_time) - new Date(b.create_time)
    );
    
    // Update stats
    // Check if we have categorized data to display the category count
    if (window.hasCategorizedData && window.allCategorizedResults) {
      const totalCategories = new Set(window.allCategorizedResults.map(item => item.category)).size;
      statsTotalCount.innerHTML = `${conversations.length} <span style="font-size: 0.85em; color: #4a6cf7;">(${totalCategories} Categories)</span>`;
    } else {
      statsTotalCount.textContent = conversations.length;
    }
    statsFirstDate.textContent = formatDateAsDaysAgo(sortedByCreate[0].create_time);
    statsLatestDate.textContent = formatDateAsDaysAgo(sortedByUpdate[0].update_time);
    
    // Clear and update recent conversations list
    recentConversationsList.innerHTML = '';
    
    // Display up to 5 most recent conversations
    const recentConversations = sortedByUpdate.slice(0, 5);
    recentConversations.forEach(conv => {
      const li = document.createElement('li');
      li.classList.add('recent-conversation-item');
      
      // Add hover effect to show this is clickable
      li.style.cursor = 'pointer';
      
      // Create a container for title and metadata
      const contentContainer = document.createElement('div');
      
      // Create title element
      const title = document.createElement('div');
      title.classList.add('recent-conversation-title');
      title.textContent = conv.title || 'Untitled conversation';
      
      // Create date element with icon
      const date = document.createElement('div');
      date.classList.add('recent-conversation-date');
      date.innerHTML = `
        <span style="display: inline-flex; align-items: center; margin-right: 10px;">
          <span style="margin-right: 3px;">🗓️</span> ${formatDateAsDaysAgo(conv.create_time)}
        </span>
        <span style="display: inline-flex; align-items: center;">
          <span style="margin-right: 3px;">🔄</span> ${formatDateAsDaysAgo(conv.update_time)}
        </span>
      `;
      
      // Add category badge if available
      if (conv.category) {
        const categoryBadge = document.createElement('div');
        categoryBadge.style.display = 'inline-block';
        categoryBadge.style.padding = '3px 8px';
        categoryBadge.style.borderRadius = '12px';
        categoryBadge.style.fontSize = '12px';
        categoryBadge.style.fontWeight = 'bold';
        categoryBadge.style.color = 'white';
        categoryBadge.style.marginTop = '8px';
        
        // Determine background color based on category
        const simplifiedCategory = conv.category.split('&')[0].trim().toLowerCase();
        let bgColor = '#6b7280'; // Default gray
        
        if (simplifiedCategory.includes('technology') || simplifiedCategory.includes('software')) {
          bgColor = '#3b82f6'; // blue
        } else if (simplifiedCategory.includes('finance')) {
          bgColor = '#10b981'; // green
        } else if (simplifiedCategory.includes('gaming')) {
          bgColor = '#8b5cf6'; // purple
        } else if (simplifiedCategory.includes('food')) {
          bgColor = '#f59e0b'; // amber
        } else if (simplifiedCategory.includes('meeting')) {
          bgColor = '#0ea5e9'; // blue
        }
        
        categoryBadge.style.backgroundColor = bgColor;
        categoryBadge.textContent = conv.category;
        
        // Add the badge to a separate container
        const badgeContainer = document.createElement('div');
        badgeContainer.appendChild(categoryBadge);
        contentContainer.appendChild(badgeContainer);
      }
      
      // Append to content container
      contentContainer.appendChild(title);
      contentContainer.appendChild(date);
      
      // Append content container to list item
      li.appendChild(contentContainer);
      
      // Add click event for viewing the conversation (placeholder for now)
      li.addEventListener('click', () => {
        console.log('Clicked on recent conversation:', conv.id);
        // Future implementation: view conversation details
      });
      
      recentConversationsList.appendChild(li);
    });
  };
  
  // Function to show initial stats with minimal data
  window.showInitialStats = function(stats) {
    const statsPanel = document.getElementById('statsPanel');
    const statsTotalCount = document.getElementById('statsTotalCount');
    const statsFirstDate = document.getElementById('statsFirstDate');
    const statsLatestDate = document.getElementById('statsLatestDate');
    const recentConversationsList = document.getElementById('recentConversationsList');
    const conversationsList = document.getElementById('conversationsList');
    
    // Create a simplified stats display
    statsPanel.classList.remove('hidden');
    
    // Format count with thousands separator
    statsTotalCount.textContent = (stats.total || 0).toLocaleString();
    
    if (stats.recentConversation) {
      statsLatestDate.textContent = formatDateAsDaysAgo(stats.recentConversation.update_time);
      
      // Clear and update recent conversations list with just the one we have
      recentConversationsList.innerHTML = '';
      const li = document.createElement('li');
      li.classList.add('recent-conversation-item');
      
      // Add hover effect
      li.style.cursor = 'pointer';
      
      // Create a structured layout
      const contentContainer = document.createElement('div');
      
      // Create title element
      const title = document.createElement('div');
      title.classList.add('recent-conversation-title');
      title.textContent = stats.recentConversation.title || 'Untitled conversation';
      
      // Create date element with icon
      const date = document.createElement('div');
      date.classList.add('recent-conversation-date');
      date.innerHTML = `
        <span style="display: inline-flex; align-items: center;">
          <span style="margin-right: 3px;">🔄</span> ${formatDateAsDaysAgo(stats.recentConversation.update_time)}
        </span>
      `;
      
      // Append to content container
      contentContainer.appendChild(title);
      contentContainer.appendChild(date);
      
      // Append content container to list item
      li.appendChild(contentContainer);
      recentConversationsList.appendChild(li);
      
      // Add a "Loading more..." indicator
      const loadingItem = document.createElement('li');
      loadingItem.style.textAlign = 'center';
      loadingItem.style.padding = '10px';
      loadingItem.style.color = '#6c757d';
      loadingItem.style.fontStyle = 'italic';
      loadingItem.innerHTML = 'Loading more conversations...';
      recentConversationsList.appendChild(loadingItem);
    } else {
      statsLatestDate.textContent = 'Unknown';
    }
    
    // Hide the conversations list since we're not showing it initially
    conversationsList.classList.add('hidden');
    
    // Hide the pagination controls
    document.querySelector('.pagination').classList.add('hidden');
    
    // Update first date with a loading indicator
    statsFirstDate.innerHTML = '<span style="color: #6c757d; font-style: italic;">Loading...</span>';
  };
  
  // Function to start the categorization process
  const startCategorization = async () => {
    // Reset internal state to initial values when categorizing again
    if (window.hasCategorizedData) {
      console.log('Categorizing again - resetting internal state');
      
      // Reset selection state
      state.selectedForDeletion = [];
      state.selectedForArchive = [];
      
      // Reset the UI to pre-categorization state
      window.resetUIForRecategorization();
      
      // Clear the conversation list completely
      const conversationsList = document.getElementById('conversationsList');
      if (conversationsList) {
        conversationsList.innerHTML = '';
      }
      
      // Reset category grouping
      state.groupByCategory = false;
      state.currentCategoryFilter = null;
      
      // Reset the flag that tracks categorization
      window.hasCategorizedData = false;
      
      // Hide UI elements that should only appear after categorization
      const viewControls = document.getElementById('viewControls');
      if (viewControls) {
        viewControls.style.display = 'none';
      }
      
      // Hide the categorize button in the header
      const categorizeHeaderButton = document.getElementById('categorizeHeaderButton');
      if (categorizeHeaderButton) {
        categorizeHeaderButton.style.display = 'none';
      }
      
      // Do NOT show the original categorize button - keep the container hidden
      // Only display the header categorize button after we're done with categorization
      
      // Remove any filter notice elements
      const filterNotice = document.querySelector('.filter-notice');
      if (filterNotice) {
        filterNotice.remove();
      }
      
      // Show the recent conversations again
      const recentConversations = document.getElementById('recentConversations');
      if (recentConversations) {
        recentConversations.classList.remove('hidden');
      }
      
      // Reset any category headers that might be in the list
      const categoryHeaders = document.querySelectorAll('.category-header');
      categoryHeaders.forEach(header => header.remove());
    }
    
    // Define a global helper function to reset the UI
    window.resetUIForRecategorization = function() {
      // Reset visual markers on all conversation items
      document.querySelectorAll('.conversation-item').forEach(item => {
        item.classList.remove('marked-for-deletion', 'marked-for-archive');
        
        // Reset styles
        item.style.transition = 'background-color 0.3s ease, border-left-width 0.3s ease';
        item.style.backgroundColor = '';
        item.style.borderLeft = '';
        
        // Reset icons to visible and default state
        const deleteIcon = item.querySelector('.delete-icon');
        if (deleteIcon) {
          deleteIcon.style.display = 'inline';
          deleteIcon.style.opacity = '0.5';
          deleteIcon.style.color = 'inherit';
        }
        
        const archiveIcon = item.querySelector('.archive-icon');
        if (archiveIcon) {
          archiveIcon.style.display = 'inline';
          archiveIcon.style.opacity = '0.5';
          archiveIcon.style.color = 'inherit';
        }
      });
      
      // Clear counters in the UI
      const deleteCounter = document.getElementById('deleteCounter');
      const archiveCounter = document.getElementById('archiveCounter');
      if (deleteCounter) deleteCounter.style.display = 'none';
      if (archiveCounter) archiveCounter.style.display = 'none';
      
      // Reset bulk action buttons if they exist
      const bulkArchiveButton = document.getElementById('bulkArchiveButton');
      const bulkDeleteButton = document.getElementById('bulkDeleteButton');
      if (bulkArchiveButton) {
        bulkArchiveButton.innerHTML = '<span style="margin-right: 3px;">📦</span> Archive All';
        bulkArchiveButton.style.backgroundColor = 'rgba(49, 130, 206, 0.1)';
      }
      if (bulkDeleteButton) {
        bulkDeleteButton.innerHTML = '<span style="margin-right: 3px;">🗑️</span> Delete All';
        bulkDeleteButton.style.backgroundColor = 'rgba(229, 62, 62, 0.1)';
      }
    };
    
    // First, load all conversations if they aren't already cached
    if (state.cachedConversations.length === 0) {
      const conversations = await window.loadAllConversations();
      if (conversations.length === 0) {
        window.showConversationError('Failed to load conversations for categorization');
        return;
      }
    }
    
    // Now show the API key modal to proceed with categorization
    window.showApiKeyModal();
  };

  // Initialize event listener for categorize button
  const categorizeButton = document.getElementById('categorizeButton');
  if (categorizeButton) {
    categorizeButton.addEventListener('click', startCategorization);
  }
  
  // Initialize event listener for categorize button in the header
  const categorizeHeaderButton = document.getElementById('categorizeHeaderButton');
  if (categorizeHeaderButton) {
    categorizeHeaderButton.addEventListener('click', startCategorization);
  }
  
  // Initialize sort toggle button functionality
  const sortToggleButton = document.getElementById('sortToggleButton');
  const sortButtonText = document.getElementById('sortButtonText');
  
  if (sortToggleButton && sortButtonText) {
    // Set initial button text to show the action that will happen when clicked
    // If currently sorting by update_time, clicking will sort by create_time
    sortButtonText.textContent = state.sortType === 'update_time' ? 
      'Sort by Created Time' : 'Sort by Updated Time';
    
    // Add click event to toggle sort
    sortToggleButton.addEventListener('click', () => {
      // Toggle between sort types
      state.sortType = state.sortType === 'update_time' ? 'create_time' : 'update_time';
      
      // Update the button text to show what will happen on next click
      sortButtonText.textContent = state.sortType === 'update_time' ? 
        'Sort by Created Time' : 'Sort by Updated Time';
      
      // Provide visual feedback - brief color change
      const originalBackground = sortToggleButton.style.backgroundColor;
      sortToggleButton.style.backgroundColor = '#059669'; // Green to show change
      setTimeout(() => {
        sortToggleButton.style.backgroundColor = originalBackground;
      }, 300);
      
      // Sort the cached conversations
      if (state.cachedConversations.length > 0) {
        state.cachedConversations.sort((a, b) => {
          return new Date(b[state.sortType]) - new Date(a[state.sortType]);
        });
        
        // Re-render the current view
        if (state.currentCategoryFilter) {
          // If filtering by category, only re-render those
          const filtered = state.cachedConversations.filter(conv =>
            conv.category === state.currentCategoryFilter || 
            (conv.category && conv.category.includes(state.currentCategoryFilter))
          );
          window.renderConversations(filtered);
        } else if (state.groupByCategory) {
          // If grouped by category, re-render the categorized view
          window.displayCategorizedConversations(window.allCategorizedResults || []);
        } else {
          // Otherwise re-render the current page
          const start = state.currentOffset || 0;
          const pageSize = state.pageSize || 20;
          window.renderConversations(state.cachedConversations.slice(start, start + pageSize));
        }
        
        // Update the recent conversations list
        updateRecentConversations(state.cachedConversations);
      }
    });
  }
  
  // Function to update the recent conversations list
  function updateRecentConversations(conversations) {
    if (!conversations || conversations.length === 0) return;
    
    const recentConversationsList = document.getElementById('recentConversationsList');
    if (!recentConversationsList) return;
    
    // Clear the current list
    recentConversationsList.innerHTML = '';
    
    // Sort by the current sort type
    const sortedConversations = [...conversations].sort((a, b) => 
      new Date(b[state.sortType]) - new Date(a[state.sortType])
    );
    
    // Display up to 5 most recent conversations
    const recentConversations = sortedConversations.slice(0, 5);
    recentConversations.forEach(conv => {
      const li = document.createElement('li');
      li.classList.add('recent-conversation-item');
      
      // Add hover effect to show this is clickable
      li.style.cursor = 'pointer';
      
      // Create a container for title and metadata
      const contentContainer = document.createElement('div');
      
      // Create title element
      const title = document.createElement('div');
      title.classList.add('recent-conversation-title');
      title.textContent = conv.title || 'Untitled conversation';
      
      // Create date element with icon - highlight the sort field
      const date = document.createElement('div');
      date.classList.add('recent-conversation-date');
      
      const createTimeStyle = state.sortType === 'create_time' ? 
        'font-weight: bold; color: #4a6cf7;' : '';
      const updateTimeStyle = state.sortType === 'update_time' ? 
        'font-weight: bold; color: #4a6cf7;' : '';
      
      date.innerHTML = `
        <span style="display: inline-flex; align-items: center; margin-right: 10px; ${createTimeStyle}">
          <span style="margin-right: 3px;">🗓️</span> ${formatDateAsDaysAgo(conv.create_time)}
        </span>
        <span style="display: inline-flex; align-items: center; ${updateTimeStyle}">
          <span style="margin-right: 3px;">🔄</span> ${formatDateAsDaysAgo(conv.update_time)}
        </span>
      `;
      
      // Add category badge if available
      if (conv.category) {
        const categoryBadge = document.createElement('div');
        categoryBadge.style.display = 'inline-block';
        categoryBadge.style.padding = '3px 8px';
        categoryBadge.style.borderRadius = '12px';
        categoryBadge.style.fontSize = '12px';
        categoryBadge.style.fontWeight = 'bold';
        categoryBadge.style.color = 'white';
        categoryBadge.style.marginTop = '8px';
        
        // Determine background color based on category
        const simplifiedCategory = conv.category.split('&')[0].trim().toLowerCase();
        let bgColor = '#6b7280'; // Default gray
        
        if (simplifiedCategory.includes('technology') || simplifiedCategory.includes('software')) {
          bgColor = '#3b82f6'; // blue
        } else if (simplifiedCategory.includes('finance')) {
          bgColor = '#10b981'; // green
        } else if (simplifiedCategory.includes('gaming')) {
          bgColor = '#8b5cf6'; // purple
        } else if (simplifiedCategory.includes('food')) {
          bgColor = '#f59e0b'; // amber
        } else if (simplifiedCategory.includes('meeting')) {
          bgColor = '#0ea5e9'; // blue
        }
        
        categoryBadge.style.backgroundColor = bgColor;
        categoryBadge.textContent = conv.category;
        
        // Add the badge to a separate container
        const badgeContainer = document.createElement('div');
        badgeContainer.appendChild(categoryBadge);
        contentContainer.appendChild(badgeContainer);
      }
      
      // Append to content container
      contentContainer.appendChild(title);
      contentContainer.appendChild(date);
      
      // Append content container to list item
      li.appendChild(contentContainer);
      
      // Add click event for viewing the conversation
      li.addEventListener('click', () => {
        console.log('Clicked on recent conversation:', conv.id);
        // Open in browser
        const chatGptUrl = `https://chatgpt.com/c/${conv.id}`;
        const { shell } = require('electron');
        shell.openExternal(chatGptUrl)
          .then(() => {
            if (window.createNotification) {
              window.createNotification(
                `Opening conversation in your browser...`,
                'Opening Conversation',
                'info',
                3000
              );
            }
          })
          .catch(error => {
            console.error(`Error opening URL in browser: ${error.message}`);
            if (window.createNotification) {
              window.createNotification(
                `Failed to open browser: ${error.message}`,
                'Error',
                'error',
                5000
              );
            }
          });
      });
      
      recentConversationsList.appendChild(li);
    });
  }
}

module.exports = {
  initStats
};