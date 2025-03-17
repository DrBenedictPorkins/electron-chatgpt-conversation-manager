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
  
  // We'll later set the icon styles based on these markers when we create the buttons
  
  // Determine which date to use based on the global sort type
  const dateField = state.sortType === 'create_time' ? 'create_time' : 'update_time';
  const dateLabel = state.sortType === 'create_time' ? 'Created:' : 'Updated:';
  
  // Format the date
  const formattedDate = formatDateAsDaysAgo(conversation[dateField]);
  
  // Create conversation info
  const info = document.createElement('div');
  info.classList.add('conversation-info');
  
  // Create title container without category label
  const titleContainer = document.createElement('div');
  titleContainer.style.display = 'flex';
  titleContainer.style.alignItems = 'center';
  
  // Create title element as a clickable link
  const title = document.createElement('div');
  title.classList.add('conversation-title');
  title.textContent = conversation.title || 'Untitled conversation';
  title.title = 'Click to open conversation in browser';
  
  // Add click handler to open in browser
  title.addEventListener('click', (event) => {
    event.stopPropagation();
    
    // Create the ChatGPT URL for this conversation
    const chatGptUrl = `https://chatgpt.com/c/${conversation.id}`;
    
    // Show notification
    if (window.createNotification) {
      window.createNotification(
        `Opening conversation in your browser...`,
        'Opening Conversation',
        'info',
        3000
      );
    }
    
    // Use Electron's shell.openExternal
    const { shell } = require('electron');
    shell.openExternal(chatGptUrl)
      .then(() => {
        console.log(`Successfully opened conversation in browser: ${chatGptUrl}`);
      })
      .catch(error => {
        console.error(`Error opening URL in browser: ${error.message}`);
        
        // Show error notification if it failed
        if (window.createNotification) {
          window.createNotification(
            `Failed to open browser: ${error.message}`,
            'Error',
            'error',
            5000
          );
        }
      });
    
    // Log the action
    console.log(`Opening conversation in browser: ${chatGptUrl}`);
  });
  
  titleContainer.appendChild(title);
  
  info.appendChild(titleContainer);
  
  // Add date with label
  const date = document.createElement('div');
  date.classList.add('conversation-date');
  date.innerHTML = `<span style="color: #6c757d;">${dateLabel}</span> ${formattedDate}`;
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
  
  /* CURL COMMAND FUNCTIONALITY - COMMENTED OUT BUT PRESERVED FOR FUTURE USE
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
        
        // Determine if this is a delete or archive action based on the parent button element
        const isDelete = debugButton.closest('.conversation-buttons')?.querySelector('.delete-icon') !== null;
        const payload = isDelete ? '{"is_visible":false}' : '{"is_archived":true}';
        const actionName = isDelete ? 'Deleting' : 'Archiving';
        
        const curlCommand = `curl 'https://chatgpt.com/backend-api/conversation/${conversationId}' -X PATCH ${headerStrings} --data-raw '${payload}'`;
        
        try {
          // Copy to clipboard
          navigator.clipboard.writeText(curlCommand)
            .then(() => {
              window.showNotification('cURL Command Copied to Clipboard', 
                `<p>✓ Command copied to clipboard!</p>
                 <p>Paste and run this command in your terminal to ${isDelete ? 'delete' : 'archive'} the conversation.</p>`,
                3000);
            })
            .catch(err => {
              console.error('Could not copy text to clipboard:', err);
              // Fallback to showing the command in the notification
              window.showNotification(`cURL Command for ${isDelete ? 'Deleting' : 'Archiving'}`, 
                `<p>Could not copy to clipboard. Manual copy required:</p>
                 <input type="text" value="${curlCommand}" readonly style="width: 100%; padding: 6px; border: 1px solid #ccc; border-radius: 4px; font-family: monospace; margin: 8px 0;" onclick="this.select();" />
                 <p>Copy and run this command in your terminal to ${isDelete ? 'delete' : 'archive'} the conversation.</p>`, 
                10000);
            });
        } catch (clipboardError) {
          console.error('Clipboard API error:', clipboardError);
          // Fallback for browsers that don't support clipboard API
          window.showNotification(`cURL Command for ${isDelete ? 'Deleting' : 'Archiving'}`, 
            `<p>This command includes all your original headers from your ChatGPT connection:</p>
             <input type="text" value="${curlCommand}" readonly style="width: 100%; padding: 6px; border: 1px solid #ccc; border-radius: 4px; font-family: monospace; margin: 8px 0;" onclick="this.select();" />
             <p>Copy and run this command in your terminal to ${isDelete ? 'delete' : 'archive'} the conversation.</p>`, 
            10000);
        }
      } catch (error) {
        console.error('Error generating cURL command:', error);
        window.showNotification('Error', `Failed to generate cURL command: ${error.message}`, 5000);
      }
    }
  });
  
  // Commented out to remove from UI
  // actionButtons.appendChild(debugButton);
  */

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
    category.style.position = 'relative'; // For dropdown positioning
    
    // Add dropdown icon that appears on hover
    const dropdownIcon = document.createElement('span');
    dropdownIcon.classList.add('category-dropdown-icon');
    dropdownIcon.innerHTML = '▼';
    dropdownIcon.style.marginLeft = '6px';
    dropdownIcon.style.opacity = '0';
    dropdownIcon.style.transition = 'opacity 0.2s ease, transform 0.2s ease';
    dropdownIcon.style.backgroundColor = 'rgba(255, 255, 255, 0.3)'; // Semi-transparent background
    dropdownIcon.style.borderRadius = '3px';
    dropdownIcon.style.padding = '0 3px';
    dropdownIcon.style.fontSize = '10px';
    dropdownIcon.style.fontWeight = 'bold';
    category.appendChild(dropdownIcon);
    
    // Show dropdown icon on hover with enhanced effect
    let dropdownMenuVisible = false;
    category.addEventListener('mouseenter', () => {
      dropdownIcon.style.opacity = '1';
      dropdownIcon.style.transform = 'scale(1.2)'; // Slightly enlarge
      dropdownIcon.style.backgroundColor = 'rgba(255, 255, 255, 0.5)'; // More visible background
    });
    
    category.addEventListener('mouseleave', () => {
      if (!dropdownMenuVisible) {
        dropdownIcon.style.opacity = '0';
        dropdownIcon.style.transform = 'scale(1)';
        dropdownIcon.style.backgroundColor = 'rgba(255, 255, 255, 0.3)';
      }
    });
    
    // Create dropdown menu (initially hidden)
    const dropdownMenu = document.createElement('div');
    dropdownMenu.classList.add('category-dropdown-menu');
    dropdownMenu.style.position = 'absolute';
    dropdownMenu.style.zIndex = '1000';
    dropdownMenu.style.backgroundColor = 'white';
    dropdownMenu.style.boxShadow = '0 4px 15px rgba(0, 0, 0, 0.3)'; // Stronger shadow
    dropdownMenu.style.border = '1px solid #d1d5db'; // Add border
    dropdownMenu.style.borderRadius = '4px';
    dropdownMenu.style.padding = '8px 0'; // More padding
    dropdownMenu.style.minWidth = '220px'; // Wider
    dropdownMenu.style.maxHeight = '400px'; // Limit height
    dropdownMenu.style.overflowY = 'auto'; // Add scrolling if needed
    dropdownMenu.style.transition = 'opacity 0.2s ease, transform 0.2s ease';
    dropdownMenu.style.display = 'none';
    dropdownMenu.style.right = '0';
    dropdownMenu.style.top = '30px';
    
    // Function to toggle dropdown visibility
    const toggleDropdown = (e) => {
      e.stopPropagation(); // Prevent event bubbling
      
      if (dropdownMenuVisible) {
        dropdownMenu.style.display = 'none';
        dropdownMenuVisible = false;
      } else {
        // Populate dropdown with all available categories
        dropdownMenu.innerHTML = '';
        
        // Get all unique categories from categorized results
        if (!window.allCategorizedResults) {
          const noCategoriesItem = document.createElement('div');
          noCategoriesItem.style.padding = '6px 12px';
          noCategoriesItem.style.color = '#6c757d';
          noCategoriesItem.textContent = 'No categories available';
          dropdownMenu.appendChild(noCategoriesItem);
        } else {
          // Get all unique categories
          const allCategories = [...new Set(
            window.allCategorizedResults
              .map(item => item.category)
          )];
          
          // Filter out current category
          const otherCategories = allCategories.filter(cat => cat !== conversation.category);
          
          // Create items for each other category
          otherCategories.forEach(otherCategory => {
            const categoryItem = document.createElement('div');
            categoryItem.classList.add('category-dropdown-item');
            categoryItem.textContent = otherCategory;
            categoryItem.style.padding = '10px 15px'; // More padding
            categoryItem.style.cursor = 'pointer';
            categoryItem.style.transition = 'all 0.2s';
            categoryItem.style.fontSize = '14px'; // Larger font size
            categoryItem.style.color = '#111827'; // Darker text
            categoryItem.style.borderBottom = '1px solid #f0f0f0'; // Separator line
            categoryItem.style.margin = '0 5px'; // Margin on sides
            
            // Hover effect
            categoryItem.addEventListener('mouseenter', () => {
              categoryItem.style.backgroundColor = '#f0f9ff';
              categoryItem.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.1)';
              categoryItem.style.transform = 'translateX(3px)'; // Slight movement on hover
            });
            
            categoryItem.addEventListener('mouseleave', () => {
              categoryItem.style.backgroundColor = 'transparent';
              categoryItem.style.boxShadow = 'none';
              categoryItem.style.transform = 'translateX(0)';
            });
            
            // Click handler for category change
            categoryItem.addEventListener('click', (e) => {
              e.stopPropagation();
              
              // Find the categorized item to update
              if (window.allCategorizedResults) {
                const categorizedItem = window.allCategorizedResults.find(
                  item => item.title === conversation.title
                );
                if (categorizedItem) {
                  categorizedItem.category = otherCategory;
                }
              }
              
              // Update the conversation's category
              conversation.category = otherCategory;
              
              // Update UI
              category.textContent = otherCategory;
              category.appendChild(dropdownIcon);
              
              // Update CSS class for color
              category.className = 'conversation-category';
              
              // Map the new category (similar mapping logic as before)
              const newSimplifiedCategory = otherCategory.split('&')[0].trim().toLowerCase();
              let newMappedCategory = 'other';
              
              if (newSimplifiedCategory.includes('technology') || newSimplifiedCategory.includes('software')) {
                newMappedCategory = 'technology';
              } else if (newSimplifiedCategory.includes('finance')) {
                newMappedCategory = 'finance';
              } else if (newSimplifiedCategory.includes('gaming')) {
                newMappedCategory = 'gaming';
              } else if (newSimplifiedCategory.includes('food')) {
                newMappedCategory = 'food';
              } else if (newSimplifiedCategory.includes('lifestyle')) {
                newMappedCategory = 'lifestyle';
              } else if (newSimplifiedCategory.includes('home')) {
                newMappedCategory = 'home';
              } else if (newSimplifiedCategory.includes('automotive')) {
                newMappedCategory = 'automotive';
              } else if (newSimplifiedCategory.includes('legal')) {
                newMappedCategory = 'legal';
              } else if (newSimplifiedCategory.includes('meeting')) {
                newMappedCategory = 'meeting';
              } else if (newSimplifiedCategory.includes('education')) {
                newMappedCategory = 'education';
              } else if (newSimplifiedCategory.includes('health')) {
                newMappedCategory = 'health';
              } else if (newSimplifiedCategory.includes('travel')) {
                newMappedCategory = 'travel';
              } else if (newSimplifiedCategory.includes('business')) {
                newMappedCategory = 'business';
              } else if (newSimplifiedCategory.includes('arts') || newSimplifiedCategory.includes('culture')) {
                newMappedCategory = 'arts';
              } else if (newSimplifiedCategory.includes('sports')) {
                newMappedCategory = 'sports';
              } else if (newSimplifiedCategory.includes('news')) {
                newMappedCategory = 'news';
              }
              
              category.classList.add(`category-${newMappedCategory}`);
              
              // Hide dropdown
              dropdownMenu.style.display = 'none';
              dropdownMenuVisible = false;
              
              // Check if we're in a filtered view
              if (state.currentCategoryFilter) {
                // If we changed to a different category than the current filter
                if (otherCategory !== state.currentCategoryFilter) {
                  // Animate fade out for this item only
                  const conversationItem = item.closest('.conversation-item');
                  if (conversationItem) {
                    conversationItem.style.animation = 'fadeOut 0.5s ease-out forwards';
                    setTimeout(() => {
                      // Remove just this item from the view
                      conversationItem.remove();
                      
                      // Update the count in the filter notice if present
                      const filterCountElement = document.querySelector('.filter-count');
                      if (filterCountElement) {
                        const currentText = filterCountElement.textContent;
                        const match = currentText.match(/(\d+)/);
                        if (match && match[1]) {
                          const newCount = parseInt(match[1]) - 1;
                          const pluralSuffix = newCount === 1 ? 'conversation' : 'conversations';
                          filterCountElement.textContent = `${newCount} ${pluralSuffix}`;
                        }
                      }
                    }, 500);
                  }
                }
              } 
              // If in grouped view but not filtered, refresh the entire view
              else if (state.groupByCategory) {
                window.displayCategorizedConversations(window.allCategorizedResults, 0, state.pageSize);
              }
            });
            
            dropdownMenu.appendChild(categoryItem);
          });
          
          if (otherCategories.length === 0) {
            const noCategories = document.createElement('div');
            noCategories.style.padding = '6px 12px';
            noCategories.style.color = '#6c757d';
            noCategories.textContent = 'No other categories available';
            dropdownMenu.appendChild(noCategories);
          }
        }
        
        // Show dropdown with animation
        dropdownMenu.style.display = 'block';
        dropdownMenu.style.opacity = '0';
        dropdownMenu.style.transform = 'translateY(-10px)';
        
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
        
        dropdownMenuVisible = true;
      }
    };
    
    // Add click event for filtering (clicking on the category text)
    category.addEventListener('click', (event) => {
      // Check if click is not on the dropdown icon
      if (event.target !== dropdownIcon) {
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
      }
    });
    
    // Add click event listeners for dropdown functionality
    dropdownIcon.addEventListener('click', toggleDropdown);
    
    // Close dropdown when clicking outside
    document.addEventListener('click', (event) => {
      if (dropdownMenuVisible && 
          !dropdownMenu.contains(event.target) && 
          !category.contains(event.target)) {
        dropdownMenu.style.display = 'none';
        dropdownMenuVisible = false;
        dropdownIcon.style.opacity = '0';
      }
    });
    
    // Attach dropdown menu to category
    category.appendChild(dropdownMenu);
    
    // Add category as the first element in the button container
    buttonsContainer.appendChild(category);
  }
  
  // Add archive button
  const archiveButton = document.createElement('button');
  archiveButton.classList.add('archive-icon'); // Add class for querying
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
  
  // Set initial opacity and color based on selection state
  if (state.selectedForArchive && state.selectedForArchive.includes(conversation.id)) {
    // Highlighted if selected
    archiveButton.style.opacity = '1';
  } else {
    // Dimmed if not selected
    archiveButton.style.opacity = '0.7';
  }
  
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
      
      // Reset delete icons in this item
      const deleteIcons = item.querySelectorAll('.delete-icon');
      deleteIcons.forEach(icon => {
        if (icon) {
          icon.style.opacity = '0.7';
          icon.style.color = '#e53e3e';
        }
      });
    }
    
    // Toggle archive marking
    if (state.selectedForArchive && state.selectedForArchive.includes(conversationId)) {
      state.selectedForArchive = state.selectedForArchive.filter(id => id !== conversationId);
      item.classList.remove('marked-for-archive');
      
      // Reset this archive icon
      archiveButton.style.opacity = '0.7';
      archiveButton.style.color = '#3182ce';
    } else {
      if (!state.selectedForArchive) state.selectedForArchive = [];
      state.selectedForArchive.push(conversationId);
      item.classList.add('marked-for-archive');
      
      // Highlight this archive icon
      archiveButton.style.opacity = '1';
      archiveButton.style.color = '#3182ce';
    }
    
    // Update button visibility
    window.updateButtonsVisibility();
  });
  
  // Add buttons to the action buttons container instead
  actionButtons.appendChild(archiveButton);
  
  // Add delete button
  const deleteButton = document.createElement('button');
  deleteButton.classList.add('delete-icon'); // Add class for querying
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
  
  // Set initial opacity and color based on selection state
  if (state.selectedForDeletion && state.selectedForDeletion.includes(conversation.id)) {
    // Highlighted if selected
    deleteButton.style.opacity = '1';
  } else {
    // Dimmed if not selected
    deleteButton.style.opacity = '0.7';
  }
  
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
      
      // Reset archive icons in this item
      const archiveIcons = item.querySelectorAll('.archive-icon');
      archiveIcons.forEach(icon => {
        if (icon) {
          icon.style.opacity = '0.7';
          icon.style.color = '#3182ce';
        }
      });
    }
    
    // Toggle deletion marking
    if (state.selectedForDeletion && state.selectedForDeletion.includes(conversationId)) {
      state.selectedForDeletion = state.selectedForDeletion.filter(id => id !== conversationId);
      item.classList.remove('marked-for-deletion');
      
      // Reset this delete icon
      deleteButton.style.opacity = '0.7';
      deleteButton.style.color = '#e53e3e';
    } else {
      if (!state.selectedForDeletion) state.selectedForDeletion = [];
      state.selectedForDeletion.push(conversationId);
      item.classList.add('marked-for-deletion');
      
      // Highlight this delete icon
      deleteButton.style.opacity = '1';
      deleteButton.style.color = '#e53e3e';
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
    // Calculate the count of conversations in this category - total across all pages
    const filteredCount = state.cachedConversations.filter(conv => 
      conv.category && conv.category.includes(state.currentCategoryFilter)
    ).length;
    
    const filterNotice = document.createElement('div');
    filterNotice.classList.add('filter-notice');
    filterNotice.innerHTML = `
      <div style="background-color: #f0f9ff; margin-bottom: 15px; 
                  border-radius: 4px; border-left: 4px solid #3b82f6; padding: 10px;">
        <!-- Main row with 3 sections -->
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <!-- Left section: Filter info -->
          <div style="width: 30%;">
            <div>Filtering by: <strong>${state.currentCategoryFilter}</strong></div>
            <div class="filter-count" style="background-color: rgba(59, 130, 246, 0.2); border-radius: 10px; padding: 2px 8px; font-size: 14px; margin-top: 4px; display: inline-block;">
              ${filteredCount} ${filteredCount === 1 ? 'conversation' : 'conversations'}
            </div>
          </div>
          
          <!-- Center section: Mark All buttons -->
          <div style="display: flex; gap: 8px; justify-content: center; flex: 1;">
            <span id="bulkArchiveButton" title="Mark all conversations in this category for archive" 
                 style="cursor: pointer; font-size: 16px; color: #3182ce; background-color: rgba(49, 130, 206, 0.1); 
                        padding: 3px 6px; border-radius: 4px; display: flex; align-items: center;">
              <span style="margin-right: 3px;">📦</span> Mark All for Archive
            </span>
            <span id="bulkDeleteButton" title="Mark all conversations in this category for deletion" 
                 style="cursor: pointer; font-size: 16px; color: #e53e3e; background-color: rgba(229, 62, 62, 0.1); 
                        padding: 3px 6px; border-radius: 4px; display: flex; align-items: center;">
              <span style="margin-right: 3px;">🗑️</span> Mark All for Deletion
            </span>
          </div>
          
          <!-- Right section: Clear filter button -->
          <div style="width: 30%; display: flex; justify-content: flex-end;">
            <button id="clearFilterButton" class="action-button" 
                   style="font-size: 14px; padding: 5px 10px; background-color: #6c757d;">
              Clear Filter
            </button>
          </div>
        </div>
      </div>
    `;
    conversationsList.appendChild(filterNotice);
    
    // Add event handler for clear filter button
    const clearFilterButton = document.getElementById('clearFilterButton');
    if (clearFilterButton) {
      clearFilterButton.addEventListener('click', () => {
        // Clear the filter
        state.currentCategoryFilter = null;
        
        // Remove the filter notice immediately
        const filterNotice = document.querySelector('.filter-notice');
        if (filterNotice) {
          filterNotice.remove();
        }
        
        // Load all conversations (no filter)
        window.loadConversations();
      });
    }
    
    // Add event handlers for bulk buttons
    const bulkArchiveButton = document.getElementById('bulkArchiveButton');
    const bulkDeleteButton = document.getElementById('bulkDeleteButton');
    
    if (bulkArchiveButton) {
      bulkArchiveButton.addEventListener('click', async () => {
        // Get ALL IDs of conversations in this category from the entire cache, not just the current page
        const allCategoryIds = state.cachedConversations
          .filter(conv => conv.category && conv.category.includes(state.currentCategoryFilter))
          .map(conv => conv.id);
          
        // Check if all conversations in this category are already marked
        const allMarked = allCategoryIds.every(id => state.selectedForArchive.includes(id));
        
        if (allMarked) {
          // If all are marked, unmark them all (toggle off)
          state.selectedForArchive = state.selectedForArchive.filter(id => !allCategoryIds.includes(id));
          bulkArchiveButton.textContent = '📦 Mark All for Archive';
          bulkArchiveButton.title = 'Mark all conversations in this category for archive';
        } else {
          // Store the previous selection
          const previousSelection = [...state.selectedForArchive];
          
          // Remove these IDs from deletion selection (mutual exclusivity)
          state.selectedForDeletion = state.selectedForDeletion.filter(id => !allCategoryIds.includes(id));
          
          // Mark all category conversations for archiving
          state.selectedForArchive = [...new Set([...previousSelection, ...allCategoryIds])];
          
          // Update button text to indicate unmark action is available
          bulkArchiveButton.textContent = '📦 Unmark All from Archive';
          bulkArchiveButton.title = 'Remove all conversations in this category from archive selection';
        }
        
        // Apply visual styling to each conversation item without reloading
        // This avoids the flicker of reloading the entire list
        conversations.forEach(conv => {
          // Query using the correct data attribute
          const items = document.querySelectorAll(`.conversation-item[data-id="${conv.id}"],.conversation-item[data-conversation-id="${conv.id}"]`);
          
          items.forEach(item => {
            const archiveIcons = item.querySelectorAll('.archive-icon');
            const deleteIcons = item.querySelectorAll('.delete-icon');
            
            if (state.selectedForArchive.includes(conv.id)) {
              // Remove deletion marker if present
              item.classList.remove('marked-for-deletion');
              // Add archive marker
              item.classList.add('marked-for-archive');
              
              // Update archive icons to show selected state
              archiveIcons.forEach(icon => {
                if (icon) {
                  icon.style.opacity = '1';
                  icon.style.color = '#3182ce'; // Blue color for archive
                }
              });
              
              // Reset delete icons
              deleteIcons.forEach(icon => {
                if (icon) {
                  icon.style.opacity = '0.7';
                }
              });
            } else if (!state.selectedForDeletion.includes(conv.id)) {
              // If not marked for archive or deletion, remove both classes
              item.classList.remove('marked-for-archive');
              item.classList.remove('marked-for-deletion');
              
              // Reset both icon types
              archiveIcons.forEach(icon => {
                if (icon) {
                  icon.style.opacity = '0.7';
                  icon.style.color = '#3182ce';
                }
              });
              
              deleteIcons.forEach(icon => {
                if (icon) {
                  icon.style.opacity = '0.7';
                  icon.style.color = '#e53e3e';
                }
              });
            }
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
          if (state.selectedForArchive.length > 0) {
            archiveCounter.style.display = 'block';
            archiveCounter.style.animation = 'fadeIn 0.3s ease-in';
          } else {
            archiveCounter.style.display = 'none';
          }
        }
        
        // No need to reload conversations - we've already updated the UI
      });
    }
    
    if (bulkDeleteButton) {
      bulkDeleteButton.addEventListener('click', async () => {
        // Get ALL IDs of conversations in this category from the entire cache, not just the current page
        const allCategoryIds = state.cachedConversations
          .filter(conv => conv.category && conv.category.includes(state.currentCategoryFilter))
          .map(conv => conv.id);
          
        // Check if all conversations in this category are already marked
        const allMarked = allCategoryIds.every(id => state.selectedForDeletion.includes(id));
        
        if (allMarked) {
          // If all are marked, unmark them all (toggle off)
          state.selectedForDeletion = state.selectedForDeletion.filter(id => !allCategoryIds.includes(id));
          bulkDeleteButton.textContent = '🗑️ Mark All for Deletion';
          bulkDeleteButton.title = 'Mark all conversations in this category for deletion';
        } else {
          // Store the previous selection
          const previousSelection = [...state.selectedForDeletion];
          
          // Remove these IDs from archive selection (mutual exclusivity)
          state.selectedForArchive = state.selectedForArchive.filter(id => !allCategoryIds.includes(id));
          
          // Mark all category conversations for deletion
          state.selectedForDeletion = [...new Set([...previousSelection, ...allCategoryIds])];
          
          // Update button text to indicate unmark action is available
          bulkDeleteButton.textContent = '🗑️ Unmark All from Deletion';
          bulkDeleteButton.title = 'Remove all conversations in this category from deletion selection';
        }
        
        // Apply visual styling to each conversation item without reloading
        // This avoids the flicker of reloading the entire list
        conversations.forEach(conv => {
          // Query using the correct data attribute
          const items = document.querySelectorAll(`.conversation-item[data-id="${conv.id}"],.conversation-item[data-conversation-id="${conv.id}"]`);
          
          items.forEach(item => {
            const archiveIcons = item.querySelectorAll('.archive-icon');
            const deleteIcons = item.querySelectorAll('.delete-icon');
            
            if (state.selectedForDeletion.includes(conv.id)) {
              // Remove archive marker if present
              item.classList.remove('marked-for-archive');
              // Add deletion marker
              item.classList.add('marked-for-deletion');
              
              // Update delete icons to show selected state
              deleteIcons.forEach(icon => {
                if (icon) {
                  icon.style.opacity = '1';
                  icon.style.color = '#e53e3e'; // Red color for deletion
                }
              });
              
              // Reset archive icons
              archiveIcons.forEach(icon => {
                if (icon) {
                  icon.style.opacity = '0.7';
                }
              });
            } else if (!state.selectedForArchive.includes(conv.id)) {
              // If not marked for deletion or archive, remove both classes
              item.classList.remove('marked-for-deletion');
              item.classList.remove('marked-for-archive');
              
              // Reset both icon types
              archiveIcons.forEach(icon => {
                if (icon) {
                  icon.style.opacity = '0.7';
                  icon.style.color = '#3182ce';
                }
              });
              
              deleteIcons.forEach(icon => {
                if (icon) {
                  icon.style.opacity = '0.7';
                  icon.style.color = '#e53e3e';
                }
              });
            }
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
          if (state.selectedForDeletion.length > 0) {
            deleteCounter.style.display = 'block';
            deleteCounter.style.animation = 'fadeIn 0.3s ease-in';
          } else {
            deleteCounter.style.display = 'none';
          }
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
  window.renderConversations = (conversations) => {
    // If we're in a filtered view, ensure we only show conversations that match the filter
    if (state.currentCategoryFilter && Array.isArray(conversations)) {
      const filteredConversations = conversations.filter(conv => 
        conv.category === state.currentCategoryFilter || 
        (conv.category && conv.category.includes(state.currentCategoryFilter))
      );
      
      // Update the filter notice count if needed
      const filterCountElement = document.querySelector('.filter-count');
      if (filterCountElement) {
        const count = filteredConversations.length;
        filterCountElement.textContent = `${count} ${count === 1 ? 'conversation' : 'conversations'}`;
      }
      
      return renderConversations(filteredConversations, state);
    }
    
    // If not in a filtered view but there's a filter notice, remove it
    if (!state.currentCategoryFilter) {
      const filterNotice = document.querySelector('.filter-notice');
      if (filterNotice) {
        filterNotice.remove();
      }
    }
    
    // Otherwise render all conversations
    return renderConversations(conversations, state);
  };
  
  window.updateButtonsVisibility = () => updateButtonsVisibility(state);
}

module.exports = {
  initRendering,
  renderConversations,
  updateButtonsVisibility,
  createConversationItem
};