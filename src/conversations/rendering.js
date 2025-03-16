// src/conversations/rendering.js - Conversation rendering functions
const { formatDateAsDaysAgo } = require('../utils/date-formatter');

/**
 * Update buttons visibility based on selection state
 * @param {Object} state - Global application state 
 */
function updateButtonsVisibility(state) {
  // Ensure the arrays are initialized
  if (!state.selectedForDeletion) {
    state.selectedForDeletion = [];
  }
  
  if (!state.selectedForArchive) {
    state.selectedForArchive = [];
  }
  
  // Update the delete counter in the stats panel
  const deleteCounter = document.getElementById('deleteCounter');
  const deleteCountValue = document.getElementById('deleteCountValue');
  if (deleteCounter && deleteCountValue) {
    if (state.selectedForDeletion && state.selectedForDeletion.length > 0) {
      deleteCounter.style.display = 'block';
      deleteCountValue.textContent = state.selectedForDeletion.length;
    } else {
      deleteCounter.style.display = 'none';
    }
  }
  
  // Update the archive counter in the stats panel
  const archiveCounter = document.getElementById('archiveCounter');
  const archiveCountValue = document.getElementById('archiveCountValue');
  if (archiveCounter && archiveCountValue) {
    if (state.selectedForArchive && state.selectedForArchive.length > 0) {
      archiveCounter.style.display = 'block';
      archiveCountValue.textContent = state.selectedForArchive.length;
    } else {
      archiveCounter.style.display = 'none';
    }
  }
  
  const hasSelectedItems = (state.selectedForDeletion && state.selectedForDeletion.length > 0) || 
                        (state.selectedForArchive && state.selectedForArchive.length > 0);
  
  // Update categorize button visibility using the dedicated function
  if (typeof window.updateCategorizeButtonsVisibility === 'function') {
    window.updateCategorizeButtonsVisibility();
  } else {
    // Fallback if the function is not defined
    // Get the categorize container and recategorize button
    const categorizeContainer = document.getElementById('categorizeContainer');
    const recategorizeHeaderButton = document.getElementById('recategorizeHeaderButton');
    
    // If we have categorized data, always hide the categorize container
    if (window.hasCategorizedData && categorizeContainer) {
      categorizeContainer.style.display = 'none';
    }
    // Otherwise, handle display based on selection state
    else if (categorizeContainer) {
      if (hasSelectedItems) {
        categorizeContainer.style.display = 'none';
      } else {
        categorizeContainer.style.display = 'flex';
      }
    }
    
    // Handle header categorize button
    const categorizeHeaderButton = document.getElementById('categorizeHeaderButton');
    if (categorizeHeaderButton) {
      if (hasSelectedItems) {
        categorizeHeaderButton.style.display = 'none';
      } else if (window.hasCategorizedData) {
        categorizeHeaderButton.style.display = 'inline-block';
      }
    }
  }
  
  // Update the view controls based on the current state
  if (typeof window.updateViewControlButtons === 'function') {
    window.updateViewControlButtons(state);
  }
}

/**
 * Creates a conversation item element
 * @param {Object} conversation - Conversation data
 * @param {Object} state - Global application state
 * @returns {HTMLElement} - The conversation item element
 */
function createConversationItem(conversation, state) {
  const item = document.createElement('li');
  item.classList.add('conversation-item');
  item.dataset.id = conversation.id;
  
  // Mark the item if it's already selected for deletion or archive
  if (state.selectedForDeletion && state.selectedForDeletion.includes(conversation.id)) {
    item.classList.add('marked-for-deletion');
  }
  if (state.selectedForArchive && state.selectedForArchive.includes(conversation.id)) {
    item.classList.add('marked-for-archive');
  }
  
  // Format the date
  const formattedDate = formatDateAsDaysAgo(conversation.update_time);
  
  // Create conversation info
  const info = document.createElement('div');
  info.classList.add('conversation-info');
  
  // Create title container without category label
  const titleContainer = document.createElement('div');
  titleContainer.style.display = 'flex';
  titleContainer.style.alignItems = 'center';
  
  // Create title element
  const title = document.createElement('div');
  title.classList.add('conversation-title');
  title.textContent = conversation.title || 'Untitled conversation';
  titleContainer.appendChild(title);
  
  info.appendChild(titleContainer);
  
  // Add date
  const date = document.createElement('div');
  date.classList.add('conversation-date');
  date.textContent = formattedDate;
  info.appendChild(date);
  
  // Create buttons container
  const buttonsContainer = document.createElement('div');
  buttonsContainer.classList.add('conversation-buttons');
  buttonsContainer.style.display = 'flex';
  buttonsContainer.style.gap = '10px';
  buttonsContainer.style.alignItems = 'center';
  
  // Create action buttons container for the main buttons
  const actionButtons = document.createElement('div');
  actionButtons.style.display = 'flex';
  actionButtons.style.gap = '6px';
  actionButtons.style.alignItems = 'center';
  
  // Add debug button to show cURL command
  const debugButton = document.createElement('button');
  debugButton.textContent = '📋';
  debugButton.title = 'Copy cURL command to archive this conversation';
  debugButton.style.background = 'none';
  debugButton.style.border = 'none';
  debugButton.style.color = '#666666';
  debugButton.style.fontSize = '14px';
  debugButton.style.cursor = 'pointer';
  debugButton.style.padding = '4px 6px';
  debugButton.style.borderRadius = '4px';
  debugButton.style.transition = 'background-color 0.2s';
  
  // Add hover effect
  debugButton.addEventListener('mouseover', () => {
    debugButton.style.backgroundColor = 'rgba(0, 0, 0, 0.05)';
  });
  debugButton.addEventListener('mouseout', () => {
    debugButton.style.backgroundColor = 'transparent';
  });
  
  // Add click handler to generate cURL command
  debugButton.addEventListener('click', async (event) => {
    event.stopPropagation();
    
    const conversationId = conversation.id;
    if (!conversationId) return;
    
    // Create a notification with the cURL command - get actual headers from main process
    if (window.showNotification) {
      // Show loading notification
      window.showNotification('Generating cURL Command', 'Getting headers from ChatGPT connection...', 2000);
      
      try {
        // Get headers from the main process
        const headers = await window.getOriginalHeaders();
        
        if (!headers) {
          window.showNotification('Error', 'Could not retrieve headers. Please make sure you are connected to ChatGPT.', 5000);
          return;
        }
        
        console.log('Retrieved original headers:', Object.keys(headers).join(', '));
        
        // Build header strings for cURL command
        // First make a copy of headers to ensure we don't modify the original
        const headersCopy = {...headers};
        
        // Ensure Content-Type header is present and is application/json
        headersCopy['Content-Type'] = 'application/json';
        
        // Add Origin if missing
        if (!headersCopy['Origin']) {
          headersCopy['Origin'] = 'https://chatgpt.com';
        }
        
        // Debug: check for essential headers
        const essentialHeaders = [
          'Content-Type',
          'Authorization',
          'Cookie',
          'Origin'
        ];
        
        console.log('Essential headers check:');
        essentialHeaders.forEach(header => {
          console.log(`${header}: ${headersCopy[header] ? 'Present' : 'MISSING'}`);
        });
        
        const headerStrings = Object.entries(headersCopy).map(([key, value]) => {
          // Make sure to escape single quotes in the value
          const escapedValue = value.replace(/'/g, "'\\''");
          return `-H '${key}: ${escapedValue}'`;
        }).join(' ');
        
        const curlCommand = `curl 'https://chatgpt.com/backend-api/conversation/${conversationId}' -X PATCH ${headerStrings} --data-raw '{"is_archived":true}'`;
        
        try {
          // Copy to clipboard
          navigator.clipboard.writeText(curlCommand)
            .then(() => {
              window.showNotification('cURL Command Copied to Clipboard', 
                `<p>✓ Command copied to clipboard!</p>
                 <p>Paste and run this command in your terminal to archive the conversation.</p>`,
                3000);
            })
            .catch(err => {
              console.error('Could not copy text to clipboard:', err);
              // Fallback to showing the command in the notification
              window.showNotification('cURL Command for Archiving', 
                `<p>Could not copy to clipboard. Manual copy required:</p>
                 <input type="text" value="${curlCommand}" readonly style="width: 100%; padding: 6px; border: 1px solid #ccc; border-radius: 4px; font-family: monospace; margin: 8px 0;" onclick="this.select();" />
                 <p>Copy and run this command in your terminal to archive the conversation.</p>`, 
                10000);
            });
        } catch (clipboardError) {
          console.error('Clipboard API error:', clipboardError);
          // Fallback for browsers that don't support clipboard API
          window.showNotification('cURL Command for Archiving', 
            `<p>This command includes all your original headers from your ChatGPT connection:</p>
             <input type="text" value="${curlCommand}" readonly style="width: 100%; padding: 6px; border: 1px solid #ccc; border-radius: 4px; font-family: monospace; margin: 8px 0;" onclick="this.select();" />
             <p>Copy and run this command in your terminal to archive the conversation.</p>`, 
            10000);
        }
      } catch (error) {
        console.error('Error generating cURL command:', error);
        window.showNotification('Error', `Failed to generate cURL command: ${error.message}`, 5000);
      }
    }
  });
  
  actionButtons.appendChild(debugButton);

  // Add category label to buttons container if available
  if (conversation.category) {
    const category = document.createElement('div');
    
    // Convert category name to a CSS class name
    // First extract the main part before the &, if present
    const simplifiedCategory = conversation.category.split('&')[0].trim().toLowerCase();
    
    // Map the category to one of our predefined CSS classes
    let mappedCategory;
    if (simplifiedCategory.includes('technology') || simplifiedCategory.includes('software')) {
      mappedCategory = 'technology';
    } else if (simplifiedCategory.includes('finance')) {
      mappedCategory = 'finance';
    } else if (simplifiedCategory.includes('gaming')) {
      mappedCategory = 'gaming';
    } else if (simplifiedCategory.includes('food')) {
      mappedCategory = 'food';
    } else if (simplifiedCategory.includes('lifestyle')) {
      mappedCategory = 'lifestyle';
    } else if (simplifiedCategory.includes('home')) {
      mappedCategory = 'home';
    } else if (simplifiedCategory.includes('automotive')) {
      mappedCategory = 'automotive';
    } else if (simplifiedCategory.includes('legal')) {
      mappedCategory = 'legal';
    } else if (simplifiedCategory.includes('meeting') || conversation.category.toLowerCase().includes('meeting')) {
      mappedCategory = 'meeting';
    } else if (simplifiedCategory.includes('education')) {
      mappedCategory = 'education';
    } else if (simplifiedCategory.includes('health')) {
      mappedCategory = 'health';
    } else if (simplifiedCategory.includes('travel')) {
      mappedCategory = 'travel';
    } else if (simplifiedCategory.includes('business')) {
      mappedCategory = 'business';
    } else if (simplifiedCategory.includes('arts') || simplifiedCategory.includes('culture')) {
      mappedCategory = 'arts';
    } else if (simplifiedCategory.includes('sports')) {
      mappedCategory = 'sports';
    } else if (simplifiedCategory.includes('news')) {
      mappedCategory = 'news';
    } else {
      mappedCategory = 'other';
    }
    
    // Use the mapped category for the CSS class
    category.classList.add('conversation-category', `category-${mappedCategory}`);
    category.textContent = conversation.category;
    category.style.marginRight = '10px';
    category.style.cursor = 'pointer';
    
    // Add click handler to filter by this category
    category.addEventListener('click', (event) => {
      event.stopPropagation();
      
      // Set the filter and reset to first page
      state.currentCategoryFilter = conversation.category;
      state.currentOffset = 0;
      
      // Update view controls visibility
      if (typeof window.updateViewControlButtons === 'function') {
        window.updateViewControlButtons(state);
      }
      
      // Reload conversations with the filter
      window.loadConversations(0, state.pageSize);
    });
    
    // Add category as the first element in the button container
    buttonsContainer.appendChild(category);
  }
  
  // Add archive button
  const archiveButton = document.createElement('button');
  archiveButton.textContent = '📦';
  archiveButton.title = 'Archive this conversation';
  archiveButton.style.background = 'none';
  archiveButton.style.border = 'none';
  archiveButton.style.color = '#3182ce';
  archiveButton.style.fontSize = '16px';
  archiveButton.style.cursor = 'pointer';
  archiveButton.style.padding = '4px 8px';
  archiveButton.style.borderRadius = '4px';
  archiveButton.style.transition = 'background-color 0.2s';
  
  // Add hover effect
  archiveButton.addEventListener('mouseover', () => {
    archiveButton.style.backgroundColor = 'rgba(49, 130, 206, 0.1)';
  });
  archiveButton.addEventListener('mouseout', () => {
    archiveButton.style.backgroundColor = 'transparent';
  });
  
  // Add click handler to mark conversation for archiving
  archiveButton.addEventListener('click', (event) => {
    event.stopPropagation();
    
    const conversationId = conversation.id;
    if (!conversationId) return;
    
    // Handle removing from delete list if it's there
    if (state.selectedForDeletion && state.selectedForDeletion.includes(conversationId)) {
      state.selectedForDeletion = state.selectedForDeletion.filter(id => id !== conversationId);
      item.classList.remove('marked-for-deletion');
    }
    
    // Toggle archive marking
    if (state.selectedForArchive && state.selectedForArchive.includes(conversationId)) {
      state.selectedForArchive = state.selectedForArchive.filter(id => id !== conversationId);
      item.classList.remove('marked-for-archive');
    } else {
      if (!state.selectedForArchive) state.selectedForArchive = [];
      state.selectedForArchive.push(conversationId);
      item.classList.add('marked-for-archive');
    }
    
    // Update button visibility
    window.updateButtonsVisibility();
  });
  
  // Add buttons to the action buttons container instead
  actionButtons.appendChild(archiveButton);
  
  // Add delete button
  const deleteButton = document.createElement('button');
  deleteButton.textContent = '🗑️';
  deleteButton.title = 'Delete this conversation';
  deleteButton.style.background = 'none';
  deleteButton.style.border = 'none';
  deleteButton.style.color = '#e53e3e';
  deleteButton.style.fontSize = '16px';
  deleteButton.style.cursor = 'pointer';
  deleteButton.style.padding = '4px 8px';
  deleteButton.style.borderRadius = '4px';
  deleteButton.style.transition = 'background-color 0.2s';
  
  // Add hover effect
  deleteButton.addEventListener('mouseover', () => {
    deleteButton.style.backgroundColor = 'rgba(229, 62, 62, 0.1)';
  });
  deleteButton.addEventListener('mouseout', () => {
    deleteButton.style.backgroundColor = 'transparent';
  });
  
  // Add click handler for marking conversation for deletion
  deleteButton.addEventListener('click', (event) => {
    event.stopPropagation();
    
    const conversationId = conversation.id;
    if (!conversationId) return;
    
    // Handle removing from archive list if it's there
    if (state.selectedForArchive && state.selectedForArchive.includes(conversationId)) {
      state.selectedForArchive = state.selectedForArchive.filter(id => id !== conversationId);
      item.classList.remove('marked-for-archive');
    }
    
    // Toggle deletion marking
    if (state.selectedForDeletion && state.selectedForDeletion.includes(conversationId)) {
      state.selectedForDeletion = state.selectedForDeletion.filter(id => id !== conversationId);
      item.classList.remove('marked-for-deletion');
    } else {
      if (!state.selectedForDeletion) state.selectedForDeletion = [];
      state.selectedForDeletion.push(conversationId);
      item.classList.add('marked-for-deletion');
    }
    
    // Update button visibility
    window.updateButtonsVisibility();
  });
  
  actionButtons.appendChild(deleteButton);
  
  // Add the action buttons container to the main buttons container
  buttonsContainer.appendChild(actionButtons);
  
  // Add the buttons to the item
  item.appendChild(info);
  item.appendChild(buttonsContainer);
  
  return item;
}

/**
 * Render the list of conversations
 * @param {Array} conversations - Array of conversation objects
 * @param {Object} state - Global application state
 */
function renderConversations(conversations, state) {
  const conversationsList = document.getElementById('conversationsList');
  if (!conversationsList) return;

  // Clear the current list
  conversationsList.innerHTML = '';

  // If we have a category filter active, show it
  if (state.currentCategoryFilter) {
    const filterNotice = document.createElement('div');
    filterNotice.classList.add('filter-notice');
    filterNotice.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; 
                  padding: 10px; background-color: #f0f9ff; margin-bottom: 15px; 
                  border-radius: 4px; border-left: 4px solid #3b82f6;">
        <div style="display: flex; align-items: center; gap: 15px;">
          <span>Filtering by: <strong>${state.currentCategoryFilter}</strong></span>
          <div style="display: flex; gap: 8px;">
            <span id="bulkArchiveButton" title="Mark all filtered conversations for archive" 
                 style="cursor: pointer; font-size: 16px; color: #3182ce; background-color: rgba(49, 130, 206, 0.1); 
                        padding: 3px 6px; border-radius: 4px; display: flex; align-items: center;">
              <span style="margin-right: 3px;">📦</span> Mark All for Archive
            </span>
            <span id="bulkDeleteButton" title="Mark all filtered conversations for deletion" 
                 style="cursor: pointer; font-size: 16px; color: #e53e3e; background-color: rgba(229, 62, 62, 0.1); 
                        padding: 3px 6px; border-radius: 4px; display: flex; align-items: center;">
              <span style="margin-right: 3px;">🗑️</span> Mark All for Deletion
            </span>
          </div>
        </div>
        <button id="clearFilterButton" class="action-button" 
               style="font-size: 14px; padding: 5px 10px; background-color: #6c757d;">
          Clear Filter
        </button>
      </div>
    `;
    conversationsList.appendChild(filterNotice);
    
    // Add event handler for clear filter button
    const clearFilterButton = document.getElementById('clearFilterButton');
    if (clearFilterButton) {
      clearFilterButton.addEventListener('click', () => {
        state.currentCategoryFilter = null;
        window.loadConversations();
      });
    }
    
    // Add event handlers for bulk buttons
    const bulkArchiveButton = document.getElementById('bulkArchiveButton');
    const bulkDeleteButton = document.getElementById('bulkDeleteButton');
    
    if (bulkArchiveButton) {
      bulkArchiveButton.addEventListener('click', async () => {
        // No confirmation needed, just mark items
        // Store the previous selection
        const previousSelection = [...state.selectedForArchive];
        
        // Get IDs of filtered conversations
        const filteredIds = conversations.map(conv => conv.id);
        
        // Remove these IDs from deletion selection (mutual exclusivity)
        state.selectedForDeletion = state.selectedForDeletion.filter(id => !filteredIds.includes(id));
        
        // Mark all filtered conversations for archiving
        state.selectedForArchive = filteredIds;
        
        // Combine with any existing selection that's not in this category
        state.selectedForArchive = [...new Set([...previousSelection, ...state.selectedForArchive])];
        
        // Apply visual styling to each conversation item without reloading
        // This avoids the flicker of reloading the entire list
        conversations.forEach(conv => {
          // Query using the correct data attribute
          const items = document.querySelectorAll(`.conversation-item[data-id="${conv.id}"],.conversation-item[data-conversation-id="${conv.id}"]`);
          
          items.forEach(item => {
            // Remove deletion marker if present
            item.classList.remove('marked-for-deletion');
            // Add archive marker
            item.classList.add('marked-for-archive');
            
            // Update any archive icons in this item to show selected state
            const archiveIcons = item.querySelectorAll('.archive-icon');
            archiveIcons.forEach(icon => {
              if (icon) {
                icon.style.opacity = '1';
                icon.style.color = '#3182ce'; // Blue color for archive
              }
            });
          });
        });
        
        // Update counters and button visibility
        window.updateButtonsVisibility();
        
        // Update counter text
        const countText = state.selectedForArchive.length;
        const archiveCountValue = document.getElementById('archiveCountValue');
        if (archiveCountValue) {
          archiveCountValue.textContent = countText;
        }
        
        // Make sure the counter badge is visible with proper styling
        const archiveCounter = document.getElementById('archiveCounter');
        if (archiveCounter) {
          archiveCounter.style.display = 'block';
          archiveCounter.style.animation = 'fadeIn 0.3s ease-in';
        }
        
        // No need to reload conversations - we've already updated the UI
      });
    }
    
    if (bulkDeleteButton) {
      bulkDeleteButton.addEventListener('click', async () => {
        // No confirmation needed, just mark items
        // Store the previous selection
        const previousSelection = [...state.selectedForDeletion];
        
        // Get IDs of filtered conversations
        const filteredIds = conversations.map(conv => conv.id);
        
        // Remove these IDs from archive selection (mutual exclusivity)
        state.selectedForArchive = state.selectedForArchive.filter(id => !filteredIds.includes(id));
        
        // Mark all filtered conversations for deletion
        state.selectedForDeletion = filteredIds;
        
        // Combine with any existing selection that's not in this category
        state.selectedForDeletion = [...new Set([...previousSelection, ...state.selectedForDeletion])];
        
        // Apply visual styling to each conversation item without reloading
        // This avoids the flicker of reloading the entire list
        conversations.forEach(conv => {
          // Query using the correct data attribute
          const items = document.querySelectorAll(`.conversation-item[data-id="${conv.id}"],.conversation-item[data-conversation-id="${conv.id}"]`);
          
          items.forEach(item => {
            // Remove archive marker if present
            item.classList.remove('marked-for-archive');
            // Add deletion marker
            item.classList.add('marked-for-deletion');
            
            // Update any delete icons in this item to show selected state
            const deleteIcons = item.querySelectorAll('.delete-icon');
            deleteIcons.forEach(icon => {
              if (icon) {
                icon.style.opacity = '1';
                icon.style.color = '#e53e3e'; // Red color for deletion
              }
            });
          });
        });
        
        // Update counters and button visibility
        window.updateButtonsVisibility();
        
        // Update counter text
        const countText = state.selectedForDeletion.length;
        const deleteCountValue = document.getElementById('deleteCountValue');
        if (deleteCountValue) {
          deleteCountValue.textContent = countText;
        }
        
        // Make sure the counter badge is visible with proper styling
        const deleteCounter = document.getElementById('deleteCounter');
        if (deleteCounter) {
          deleteCounter.style.display = 'block';
          deleteCounter.style.animation = 'fadeIn 0.3s ease-in';
        }
        
        // No need to reload conversations - we've already updated the UI
      });
    }
  }

  // Add each conversation to the list
  conversations.forEach(conversation => {
    const item = createConversationItem(conversation, state);
    conversationsList.appendChild(item);
  });
  
  // If no conversations found, show a message
  if (conversations.length === 0) {
    const emptyState = document.createElement('div');
    emptyState.style.padding = '20px';
    emptyState.style.textAlign = 'center';
    emptyState.style.color = '#6c757d';
    
    if (state.currentCategoryFilter) {
      emptyState.innerHTML = `
        <div style="font-size: 24px; margin-bottom: 10px;">🔍</div>
        <div style="font-weight: bold; margin-bottom: 5px;">No conversations found in category "${state.currentCategoryFilter}"</div>
        <div>Try selecting a different category or clearing the filter</div>
      `;
    } else {
      emptyState.innerHTML = `
        <div style="font-size: 24px; margin-bottom: 10px;">💬</div>
        <div style="font-weight: bold; margin-bottom: 5px;">No conversations found</div>
        <div>Start a new conversation on ChatGPT to see it here</div>
      `;
    }
    
    conversationsList.appendChild(emptyState);
  }
}

/**
 * Initialize the rendering functions
 * @param {Object} state - Global application state 
 */
function initRendering(state) {
  // Register global functions
  window.renderConversations = (conversations) => renderConversations(conversations, state);
  window.updateButtonsVisibility = () => updateButtonsVisibility(state);
}

module.exports = {
  initRendering,
  renderConversations,
  updateButtonsVisibility,
  createConversationItem
};