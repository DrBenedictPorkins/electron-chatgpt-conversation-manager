// src/conversations/pagination.js - Pagination controls

/**
 * Initialize pagination functionality
 * @param {Object} state - Global application state
 */
function initPagination(state) {
  // Store state in global variable for access in updatePagination
  window.paginationState = state;
  
  // Make updatePagination function available globally
  window.updatePagination = function(offset, limit, total) {
    const paginationInfo = document.getElementById('paginationInfo');
    const prevButton = document.getElementById('prevButton');
    const nextPageButton = document.getElementById('nextPageButton');
    
    // If elements don't exist yet, simply return without error
    if (!paginationInfo || !prevButton || !nextPageButton) {
      console.log('Pagination elements not found yet - will be initialized later');
      return;
    }
    
    // Update pagination info
    const start = total > 0 ? offset + 1 : 0;
    const end = Math.min(offset + limit, total);
    
    // Add category filter info to pagination text if filtering
    let paginationText = `Showing ${start}-${end} of ${total}`;
    if (window.paginationState && window.paginationState.currentCategoryFilter) {
      paginationText += ` (filtered by "${window.paginationState.currentCategoryFilter}")`;
    }
    paginationInfo.textContent = paginationText;
    
    // Show/hide pagination controls based on whether we have results and if categorization has happened
    const paginationContainer = document.querySelector('.pagination');
    const hasCategorizedData = window.allCategorizedResults && window.allCategorizedResults.length > 0;
    
    // Show pagination only if we have results AND either categorization has happened or we're in the initial view
    if (paginationContainer) {
      if (total > 0 && (hasCategorizedData || !(window.paginationState && window.paginationState.groupByCategory))) {
        paginationContainer.classList.remove('hidden');
      } else {
        paginationContainer.classList.add('hidden');
      }
    }
    
    // Hide or show buttons based on pagination position
    if (prevButton) {
      prevButton.style.display = offset <= 0 ? 'none' : 'inline-block';
    }
    
    if (nextPageButton) {
      nextPageButton.style.display = offset + limit >= total ? 'none' : 'inline-block';
    }
    
    // Update current offset
    if (window.paginationState) {
      window.paginationState.currentOffset = offset;
      
      // Only update total conversations if we're not filtering
      // This ensures we keep track of the total number even when filtering
      if (!window.paginationState.currentCategoryFilter) {
        window.paginationState.totalConversations = total;
      }
    }
  };
  
  // We'll add event listeners, but we'll check if elements exist first
  const addPaginationEventListeners = function() {
    console.log('Attempting to attach pagination event listeners');
    const prevButton = document.getElementById('prevButton');
    const nextPageButton = document.getElementById('nextPageButton');
    
    // Skip if elements don't exist yet
    if (!prevButton || !nextPageButton) {
      console.error('Pagination buttons not found yet - will try to attach listeners later');
      console.log('Missing buttons:', {
        prevButton: !!prevButton,
        nextPageButton: !!nextPageButton
      });
      return;
    }
    
    console.log('Found pagination buttons, attaching event listeners');
    
    // Check if we already attached listeners to these specific elements
    if (prevButton._hasEventListeners && nextPageButton._hasEventListeners) {
      console.log('Pagination buttons already have event listeners, skipping');
      return;
    }
    
    // Clear any existing event listeners to avoid duplicates
    const newPrevButton = prevButton.cloneNode(true);
    const newNextButton = nextPageButton.cloneNode(true);
    
    // Mark these elements as having listeners
    newPrevButton._hasEventListeners = true;
    newNextButton._hasEventListeners = true;
    
    prevButton.parentNode.replaceChild(newPrevButton, prevButton);
    nextPageButton.parentNode.replaceChild(newNextButton, nextPageButton);
    
    // Handle Previous page button click
    newPrevButton.addEventListener('click', async () => {
      const newOffset = Math.max(0, window.paginationState.currentOffset - window.paginationState.pageSize);
      
      // Use the appropriate function based on the current view mode
      if (window.paginationState.groupByCategory && !window.paginationState.currentCategoryFilter && window.allCategorizedResults) {
        // If we're in grouped by category mode, use displayCategorizedConversations
        window.displayCategorizedConversations(window.allCategorizedResults, newOffset, window.paginationState.pageSize);
      } else {
        // Otherwise use regular conversation loading
        await window.loadConversations(newOffset);
      }
    });
    
    // Handle Next page button click
    newNextButton.addEventListener('click', async () => {
      const newOffset = window.paginationState.currentOffset + window.paginationState.pageSize;
      
      // Determine which total to use for pagination
      let totalToUse = window.paginationState.totalConversations;
      
      if (window.paginationState.currentCategoryFilter && window.paginationState.cachedConversations.length > 0) {
        // When filtering by category, use the filtered total
        const { filterConversationsByCategory } = require('../utils/api-client');
        totalToUse = filterConversationsByCategory(window.paginationState, window.paginationState.currentCategoryFilter).length;
      } else if (window.paginationState.groupByCategory && window.allCategorizedResults) {
        // When grouped by category, use the total from categorized results
        totalToUse = window.allCategorizedResults.length;
      }
      
      if (newOffset < totalToUse) {
        if (window.paginationState.groupByCategory && !window.paginationState.currentCategoryFilter && window.allCategorizedResults) {
          // If we're in grouped by category mode, use displayCategorizedConversations
          window.displayCategorizedConversations(window.allCategorizedResults, newOffset, window.paginationState.pageSize);
        } else {
          // Otherwise use regular conversation loading
          await window.loadConversations(newOffset);
        }
      }
    });
    
    console.log('Pagination event listeners attached successfully');
  };
  
  // Try to attach event listeners now, but this likely won't find the elements yet
  setTimeout(() => {
    console.log('Initial attempt to attach pagination listeners');
    addPaginationEventListeners();
  }, 100);
  
  // Also make this function available globally for later attachment
  window.attachPaginationListeners = addPaginationEventListeners;
  
  // As a safety measure, periodically check for pagination buttons and attach listeners if needed
  const ensurePaginationListenersAttached = () => {
    const nextPageButton = document.getElementById('nextPageButton');
    // If the button exists but doesn't have listeners (no onclick property), attach them
    if (nextPageButton && !nextPageButton._hasEventListeners) {
      console.log('Found nextPageButton without listeners, attaching them now');
      addPaginationEventListeners();
    }
  };
  
  // Check every second for the first 10 seconds after initialization
  for (let i = 1; i <= 10; i++) {
    setTimeout(ensurePaginationListenersAttached, i * 1000);
  }
}

module.exports = {
  initPagination
};