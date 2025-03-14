// src/conversations/pagination.js - Pagination controls

/**
 * Initialize pagination functionality
 * @param {Object} state - Global application state
 */
function initPagination(state) {
  const prevButton = document.getElementById('prevButton');
  const nextPageButton = document.getElementById('nextPageButton');
  
  // Make updatePagination function available globally
  window.updatePagination = function(offset, limit, total) {
    const paginationInfo = document.getElementById('paginationInfo');
    
    // Update pagination info
    const start = total > 0 ? offset + 1 : 0;
    const end = Math.min(offset + limit, total);
    
    // Add category filter info to pagination text if filtering
    let paginationText = `Showing ${start}-${end} of ${total}`;
    if (state.currentCategoryFilter) {
      paginationText += ` (filtered by "${state.currentCategoryFilter}")`;
    }
    paginationInfo.textContent = paginationText;
    
    // Show/hide pagination controls based on whether we have results and if categorization has happened
    const paginationContainer = document.querySelector('.pagination');
    const hasCategorizedData = window.allCategorizedResults && window.allCategorizedResults.length > 0;
    
    // Show pagination only if we have results AND either categorization has happened or we're in the initial view
    if (total > 0 && (hasCategorizedData || !state.groupByCategory)) {
      paginationContainer.classList.remove('hidden');
    } else {
      paginationContainer.classList.add('hidden');
    }
    
    // Hide or show buttons based on pagination position
    prevButton.style.display = offset <= 0 ? 'none' : 'inline-block';
    nextPageButton.style.display = offset + limit >= total ? 'none' : 'inline-block';
    
    // Update current offset
    state.currentOffset = offset;
    
    // Only update total conversations if we're not filtering
    // This ensures we keep track of the total number even when filtering
    if (!state.currentCategoryFilter) {
      state.totalConversations = total;
    }
  };
  
  // Handle Previous page button click
  prevButton.addEventListener('click', async () => {
    const newOffset = Math.max(0, state.currentOffset - state.pageSize);
    
    // Use the appropriate function based on the current view mode
    if (state.groupByCategory && !state.currentCategoryFilter && window.allCategorizedResults) {
      // If we're in grouped by category mode, use displayCategorizedConversations
      window.displayCategorizedConversations(window.allCategorizedResults, newOffset, state.pageSize);
    } else {
      // Otherwise use regular conversation loading
      await window.loadConversations(newOffset);
    }
  });
  
  // Handle Next page button click
  nextPageButton.addEventListener('click', async () => {
    const newOffset = state.currentOffset + state.pageSize;
    
    // Determine which total to use for pagination
    let totalToUse = state.totalConversations;
    
    if (state.currentCategoryFilter && state.cachedConversations.length > 0) {
      // When filtering by category, use the filtered total
      const { filterConversationsByCategory } = require('../utils/api-client');
      totalToUse = filterConversationsByCategory(state, state.currentCategoryFilter).length;
    } else if (state.groupByCategory && window.allCategorizedResults) {
      // When grouped by category, use the total from categorized results
      totalToUse = window.allCategorizedResults.length;
    }
    
    if (newOffset < totalToUse) {
      if (state.groupByCategory && !state.currentCategoryFilter && window.allCategorizedResults) {
        // If we're in grouped by category mode, use displayCategorizedConversations
        window.displayCategorizedConversations(window.allCategorizedResults, newOffset, state.pageSize);
      } else {
        // Otherwise use regular conversation loading
        await window.loadConversations(newOffset);
      }
    }
  });
}

module.exports = {
  initPagination
};