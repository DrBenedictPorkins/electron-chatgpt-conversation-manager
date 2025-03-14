// src/conversations/list.js - Conversations list rendering
const {formatDateAsDaysAgo} = require('../utils/date-formatter');
const {
  loadAllConversations,
  fetchConversations,
  filterConversationsByCategory,
  updateViewControlButtons
} = require('../utils/api-client');

/**
 * Initialize conversation list functionality
 * @param {Object} state - Global application state
 */
function initList(state) {
  // Initialize view control buttons
  const groupByCategoryButton = document.getElementById('groupByCategoryButton');
  const clearGroupingButton = document.getElementById('clearGroupingButton');

  // Add event listener for Group by Category button
  groupByCategoryButton.addEventListener('click', () => {
    state.groupByCategory = true;
    state.currentOffset = 0; // Reset to first page when changing view mode
    updateViewControlButtons(state);

    // If we have categorized results, show them
    if (window.allCategorizedResults && window.allCategorizedResults.length > 0) {
      window.displayCategorizedConversations(window.allCategorizedResults, 0, state.pageSize);
    } else {
      // If no categorization yet, prompt the user to categorize
      const conversationsList = document.getElementById('conversationsList');
      conversationsList.innerHTML = `
        <div style="text-align: center; padding: 20px; margin: 20px 0; background-color: #f8f9fa; border-radius: 4px;">
          <p>To group conversations by category, you need to categorize them first.</p>
          <button id="promptCategorizeButton" class="action-button" style="margin-top: 10px;">
            Categorize Conversations
          </button>
        </div>
      `;

      document.getElementById('promptCategorizeButton').addEventListener('click', () => {
        // Hide the prompt immediately
        const conversationsList = document.getElementById('conversationsList');
        conversationsList.innerHTML = '<div style="text-align: center; padding: 20px;">Preparing to categorize...</div>';
        
        // Click the categorize button
        const categorizeButton = document.getElementById('categorizeButton');
        if (categorizeButton) {
          categorizeButton.click();
        }
        
        // Hide the categorize button and its container
        const categorizeContainer = document.querySelector('.categorize-container');
        if (categorizeContainer) {
          categorizeContainer.style.display = 'none';
        }
      });
    }
  });

  // Add event listener for Clear Grouping button
  clearGroupingButton.addEventListener('click', () => {
    state.groupByCategory = false;
    state.currentOffset = 0; // Reset to first page when changing view mode
    updateViewControlButtons(state);

    // Display conversations in their original time-sorted order
    window.loadConversations(0, state.pageSize);
  });

  // Make loadConversations and renderConversations available globally
  window.loadConversations = async function (offset = 0, limit = state.pageSize) {
    await fetchConversations(state, offset, limit);
  };

  window.loadAllConversations = async function () {
    return await loadAllConversations(state);
  };

  // Function to render conversations
  window.renderConversations = function (conversations) {
    const conversationsList = document.getElementById('conversationsList');

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
          <span>Filtering by: <strong>${state.currentCategoryFilter}</strong></span>
          <div>
            <button id="clearFilterButton" style="background-color: #3b82f6; color: white; 
                   border: none; padding: 5px 10px; border-radius: 4px; cursor: pointer;">
              Show All Conversations
            </button>
          </div>
        </div>
      `;
      conversationsList.appendChild(filterNotice);

      // Add event listener to the Clear Filter button
      document.getElementById('clearFilterButton').addEventListener('click', () => {
        state.currentCategoryFilter = null;
        state.currentOffset = 0; // Reset to first page when clearing filter
        
        // Update view controls visibility
        updateViewControlButtons(state);
        
        // Return to the appropriate view based on grouping state
        if (state.groupByCategory && window.allCategorizedResults) {
          window.displayCategorizedConversations(window.allCategorizedResults, 0, state.pageSize);
        } else {
          window.loadConversations(0, state.pageSize);
        }
      });
    }

    if (conversations.length === 0) {
      const emptyItem = document.createElement('li');
      emptyItem.classList.add('conversation-item');
      emptyItem.textContent = state.currentCategoryFilter ?
        `No conversations found in category "${state.currentCategoryFilter}"` :
        'No conversations found';
      conversationsList.appendChild(emptyItem);
      return;
    }

    // Create a list item for each conversation
    conversations.forEach(conversation => {
      const item = document.createElement('li');
      item.classList.add('conversation-item');

      // Create info container for title and date
      const infoContainer = document.createElement('div');
      infoContainer.classList.add('conversation-info');

      const title = document.createElement('div');
      title.classList.add('conversation-title');
      title.textContent = conversation.title || 'Untitled conversation';

      const date = document.createElement('div');
      date.classList.add('conversation-date');
      date.textContent = `Created: ${formatDateAsDaysAgo(conversation.create_time)} | Updated: ${formatDateAsDaysAgo(conversation.update_time)}`;

      infoContainer.appendChild(title);
      infoContainer.appendChild(date);

      // Add info container to the item
      item.appendChild(infoContainer);

      // If conversation has a category, add it (this will be present after categorization)
      if (conversation.category) {
        const categoryContainer = document.createElement('div');
        categoryContainer.classList.add('category-container');
        categoryContainer.style.position = 'relative';
        categoryContainer.style.display = 'inline-block';
        
        const categoryElement = document.createElement('div');
        categoryElement.classList.add('conversation-category');

        // Convert category name to a CSS class name
        // First extract the main part before the &, if present (e.g., "Technology & Software" -> "Technology")
        const simplifiedCategory = conversation.category.split('&')[0].trim().toLowerCase();
        console.log('Processing category:', conversation.category, 'Simplified to:', simplifiedCategory);

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
        } else if (simplifiedCategory.includes('meeting')) {
          mappedCategory = 'meeting';
          console.log('Assigned meeting category for:', conversation.title);
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

        const categoryClass = 'category-' + mappedCategory;

        // Add background color based on category
        categoryElement.classList.add(categoryClass);

        // Set category text
        categoryElement.textContent = conversation.category;

        // Add dropdown icon that appears on hover
        const dropdownIcon = document.createElement('span');
        dropdownIcon.classList.add('category-dropdown-icon');
        dropdownIcon.innerHTML = '▼';
        dropdownIcon.style.marginLeft = '5px';
        dropdownIcon.style.opacity = '0';
        dropdownIcon.style.transition = 'opacity 0.2s ease';
        categoryElement.appendChild(dropdownIcon);

        // Make category clickable for filtering
        categoryElement.style.cursor = 'pointer';
        categoryElement.title = `Click to filter by ${conversation.category} or use dropdown to change category`;

        // Show dropdown icon on hover
        categoryElement.addEventListener('mouseenter', () => {
          dropdownIcon.style.opacity = '1';
        });

        categoryElement.addEventListener('mouseleave', () => {
          if (!dropdownMenuVisible) {
            dropdownIcon.style.opacity = '0';
          }
        });

        // Create dropdown menu (initially hidden)
        const dropdownMenu = document.createElement('div');
        dropdownMenu.classList.add('category-dropdown-menu');
        dropdownMenu.style.position = 'absolute';
        dropdownMenu.style.zIndex = '100';
        dropdownMenu.style.backgroundColor = 'white';
        dropdownMenu.style.boxShadow = '0 2px 10px rgba(0, 0, 0, 0.2)';
        dropdownMenu.style.borderRadius = '4px';
        dropdownMenu.style.padding = '5px 0';
        dropdownMenu.style.minWidth = '200px';
        dropdownMenu.style.display = 'none';
        dropdownMenu.style.right = '0';
        dropdownMenu.style.top = '30px';
        
        let dropdownMenuVisible = false;

        // Function to toggle dropdown visibility
        const toggleDropdown = (e) => {
          e.stopPropagation(); // Prevent event bubbling
          
          if (dropdownMenuVisible) {
            dropdownMenu.style.display = 'none';
            dropdownMenuVisible = false;
          } else {
            // Populate dropdown with all available categories
            dropdownMenu.innerHTML = '';
            
            // Get all unique categories from cachedConversations
            const allCategories = [...new Set(
              state.cachedConversations
                .filter(conv => conv.category)
                .map(conv => conv.category)
            )];
            
            // Filter out current category
            const otherCategories = allCategories.filter(cat => cat !== conversation.category);
            
            // Create items for each other category
            otherCategories.forEach(category => {
              const categoryItem = document.createElement('div');
              categoryItem.classList.add('category-dropdown-item');
              categoryItem.textContent = category;
              categoryItem.style.padding = '6px 12px';
              categoryItem.style.cursor = 'pointer';
              categoryItem.style.transition = 'background-color 0.2s';
              categoryItem.style.fontSize = '11px';
              categoryItem.style.overflow = 'hidden';
              categoryItem.style.textOverflow = 'ellipsis';
              
              // Hover effect
              categoryItem.addEventListener('mouseenter', () => {
                categoryItem.style.backgroundColor = '#f0f9ff';
              });
              
              categoryItem.addEventListener('mouseleave', () => {
                categoryItem.style.backgroundColor = 'transparent';
              });
              
              // Click handler for category change
              categoryItem.addEventListener('click', (e) => {
                e.stopPropagation();
                
                // Change the conversation's category
                conversation.category = category;
                
                // Update UI
                categoryElement.textContent = category;
                categoryElement.appendChild(dropdownIcon);
                
                // Update CSS class for color
                categoryElement.className = 'conversation-category';
                const newSimplifiedCategory = category.split('&')[0].trim().toLowerCase();
                let newMappedCategory;
                
                // Map the category (same mapping logic as before)
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
                } else {
                  newMappedCategory = 'other';
                }
                
                const newCategoryClass = 'category-' + newMappedCategory;
                categoryElement.classList.add(newCategoryClass);
                
                // Hide dropdown
                dropdownMenu.style.display = 'none';
                dropdownMenuVisible = false;
                
                // If in filtered view and category changed, remove from list
                if (state.currentCategoryFilter && state.currentCategoryFilter !== category) {
                  item.style.animation = 'fadeOut 0.5s ease-out forwards';
                  setTimeout(() => {
                    item.remove();
                    
                    // If no conversations left, show empty message
                    const remainingItems = document.querySelectorAll('.conversation-item');
                    if (remainingItems.length === 0) {
                      const emptyItem = document.createElement('li');
                      emptyItem.classList.add('conversation-item');
                      emptyItem.textContent = `No conversations found in category "${state.currentCategoryFilter}"`;
                      document.getElementById('conversationsList').appendChild(emptyItem);
                    }
                  }, 500);
                }
              });
              
              dropdownMenu.appendChild(categoryItem);
            });
            
            if (otherCategories.length === 0) {
              const noCategories = document.createElement('div');
              noCategories.style.padding = '6px 12px';
              noCategories.style.color = '#6c757d';
              noCategories.style.fontSize = '11px';
              noCategories.textContent = 'No other categories available';
              dropdownMenu.appendChild(noCategories);
            }
            
            dropdownMenu.style.display = 'block';
            dropdownMenuVisible = true;
          }
        };

        // Add click event for category filtering (when clicking on the category itself)
        categoryElement.addEventListener('click', (e) => {
          // Check if the click was on the dropdown icon
          if (e.target === dropdownIcon) {
            toggleDropdown(e);
          } else {
            e.stopPropagation(); // Prevent triggering the conversation click event
            state.currentCategoryFilter = conversation.category;
            state.currentOffset = 0; // Reset to first page when filtering
            
            // Update view controls visibility
            updateViewControlButtons(state);
            
            window.loadConversations(0, state.pageSize); // Load first page with filter
          }
        });

        // Add event listener for dropdown icon
        dropdownIcon.addEventListener('click', toggleDropdown);

        // Close dropdown when clicking outside
        document.addEventListener('click', () => {
          if (dropdownMenuVisible) {
            dropdownMenu.style.display = 'none';
            dropdownMenuVisible = false;
            dropdownIcon.style.opacity = '0';
          }
        });

        // Add elements to container
        categoryContainer.appendChild(categoryElement);
        categoryContainer.appendChild(dropdownMenu);
        
        // Add category container to item
        item.appendChild(categoryContainer);

        // Add click event to view conversation details (will implement later)
        item.addEventListener('click', () => {
          console.log('Clicked conversation:', conversation.id);
          // We'll implement conversation viewing in a future step
        });

        conversationsList.appendChild(item);
      };
    });
  }
}

module.exports = {
  initList
};
