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

        // Make category clickable for filtering
        categoryElement.style.cursor = 'pointer';
        categoryElement.title = `Click to filter by ${conversation.category}`;

        // Add click event to filter by this category
        categoryElement.addEventListener('click', (e) => {
          e.stopPropagation(); // Prevent triggering the conversation click event
          state.currentCategoryFilter = conversation.category;
          state.currentOffset = 0; // Reset to first page when filtering
          
          // Update view controls visibility
          updateViewControlButtons(state);
          
          window.loadConversations(0, state.pageSize); // Load first page with filter
        });

        // Add category element to item
        item.appendChild(categoryElement);

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
