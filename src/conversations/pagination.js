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
      const shouldHideNext = offset + limit >= total;
      console.log(`Pagination: Next button visibility check - offset (${offset}) + limit (${limit}) ${offset + limit} >= total (${total}) = ${shouldHideNext ? 'hide' : 'show'}`);
      nextPageButton.style.display = shouldHideNext ? 'none' : 'inline-block';
    }
    
    // Update current offset
    if (window.paginationState) {
      window.paginationState.currentOffset = offset;
      
      // Only update total conversations if we're not filtering
      // This ensures we keep track of the total number even when filtering
      if (!window.paginationState.currentCategoryFilter) {
        window.paginationState.totalConversations = total;
      }
      
      // Debug current pagination state after update
      console.log('Updated pagination state:', {
        offset: offset,
        limit: limit,
        total: total,
        currentOffset: window.paginationState.currentOffset,
        pageSize: window.paginationState.pageSize,
        totalConversations: window.paginationState.totalConversations,
        nextButtonVisible: document.getElementById('nextPageButton') ? document.getElementById('nextPageButton').style.display : 'element not found'
      });
    }
  };
  
  // Update pagination info function to global scope
  window.debugPaginationState = function() {
    console.log("Current Pagination State:", {
      currentOffset: window.paginationState ? window.paginationState.currentOffset : "undefined",
      pageSize: window.paginationState ? window.paginationState.pageSize : "undefined",
      totalConversations: window.paginationState ? window.paginationState.totalConversations : "undefined",
      groupByCategory: window.paginationState ? window.paginationState.groupByCategory : "undefined",
      currentCategoryFilter: window.paginationState ? window.paginationState.currentCategoryFilter : "undefined",
      allCategorizedResults: window.allCategorizedResults ? window.allCategorizedResults.length : "undefined"
    });
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
        console.log("Next button: using categorized results total:", window.allCategorizedResults.length);
        totalToUse = window.allCategorizedResults.length;
      }
      
      console.log("Next button clicked: newOffset =", newOffset, "totalToUse =", totalToUse);
      
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
  
  // Debug function to help check event listener status
  window.debugPaginationListeners = function() {
    const nextButton = document.getElementById('nextPageButton');
    const prevButton = document.getElementById('prevButton');
    console.log('Pagination buttons found:', {
      nextButton: !!nextButton,
      prevButton: !!prevButton
    });
    if (nextButton) {
      console.log('Next button has listeners:', !!nextButton._hasEventListeners);
      // Force attach listeners
      if (!nextButton._hasEventListeners) {
        console.log('Forcibly attaching listeners to pagination buttons');
        addPaginationEventListeners();
      }
      
      // Add direct click handler for testing
      nextButton.onclick = function() {
        console.log('Direct onclick handler fired for Next button');
        const newOffset = window.paginationState.currentOffset + window.paginationState.pageSize;
        if (window.paginationState.groupByCategory && !window.paginationState.currentCategoryFilter && window.allCategorizedResults) {
          console.log('Using displayCategorizedConversations with offset:', newOffset);
          window.displayCategorizedConversations(window.allCategorizedResults, newOffset, window.paginationState.pageSize);
        } else {
          console.log('Using loadConversations with offset:', newOffset);
          window.loadConversations(newOffset);
        }
      };
    }
  };
  
  // As a safety measure, periodically check for pagination buttons and attach listeners if needed
  const ensurePaginationListenersAttached = () => {
    const nextPageButton = document.getElementById('nextPageButton');
    // If the button exists but doesn't have listeners (no onclick property), attach them
    if (nextPageButton && !nextPageButton._hasEventListeners) {
      console.log('Found nextPageButton without listeners, attaching them now');
      addPaginationEventListeners();
      
      // Add a direct onclick handler as a fallback
      nextPageButton.onclick = function() {
        console.log('Fallback onclick handler fired for Next button');
        const newOffset = window.paginationState.currentOffset + window.paginationState.pageSize;
        console.log('Current state:', {
          offset: window.paginationState.currentOffset,
          newOffset: newOffset,
          pageSize: window.paginationState.pageSize,
          groupByCategory: window.paginationState.groupByCategory,
          filter: window.paginationState.currentCategoryFilter,
          hasCategorizedResults: !!window.allCategorizedResults
        });
        
        if (window.paginationState.groupByCategory && !window.paginationState.currentCategoryFilter && window.allCategorizedResults) {
          console.log('Using displayCategorizedConversations with offset:', newOffset);
          window.displayCategorizedConversations(window.allCategorizedResults, newOffset, window.paginationState.pageSize);
        } else {
          console.log('Using loadConversations with offset:', newOffset);
          window.loadConversations(newOffset);
        }
      };
    }
  };
  
  // Check every second for the first 10 seconds after initialization
  for (let i = 1; i <= 10; i++) {
    setTimeout(ensurePaginationListenersAttached, i * 1000);
  }
  
  // Also run on document ready
  document.addEventListener('DOMContentLoaded', function() {
    setTimeout(ensurePaginationListenersAttached, 500);
    setTimeout(ensurePaginationListenersAttached, 1000);
    setTimeout(ensurePaginationListenersAttached, 2000);
  });
}

module.exports = {
  initPagination
};