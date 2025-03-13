// src/conversations/categorization.js - Conversation categorization functionality
const { ipcRenderer } = require('electron');
const { formatDateAsDaysAgo } = require('../utils/date-formatter');

/**
 * Initialize categorization functionality
 * @param {Object} state - Global application state
 */
function initCategorization(state) {
  // Function to start the categorization process
  window.startCategorizingConversations = async function() {
    try {
      // Show loading indicator
      const conversationsLoading = document.getElementById('conversationsLoading');
      const progressContainer = document.getElementById('progressContainer');
      const loadingText = document.getElementById('loadingText');
      
      conversationsLoading.classList.remove('hidden');
      progressContainer.classList.remove('hidden');
      window.hideConversationError();
      
      // Load all conversations from cache or fetch them
      const allConversations = await window.loadAllConversations();
      
      if (allConversations.length === 0) {
        throw new Error('No conversations found to categorize.');
      }
      
      loadingText.textContent = 'Categorizing conversations...';
      window.updateProgressBar(50); // Set to 50% after loading conversations
      
      // Store the original conversations to access the dates later
      window.allConversationsData = allConversations;
      
      // Extract just the titles for categorization with OpenAI
      const titles = allConversations.map(conv => conv.title || 'Untitled conversation');
      
      // Update loading message
      loadingText.textContent = 'Categorizing conversations...';
      
      // If we have a lot of titles, we might need to split them into multiple requests
      // OpenAI has token limits, so we'll categorize in batches of 100 titles
      const categorizationBatchSize = 100;
      const batches = [];
      
      for (let i = 0; i < titles.length; i += categorizationBatchSize) {
        batches.push(titles.slice(i, i + categorizationBatchSize));
      }
      
      // Process each batch
      const categorizedResults = [];
      
      if (batches.length > 1) {
        loadingText.textContent = `Categorizing conversations (batch 1/${batches.length})...`;
      }
      
      for (let i = 0; i < batches.length; i++) {
        if (batches.length > 1) {
          loadingText.textContent = `Categorizing conversations (batch ${i+1}/${batches.length})...`;
          // Progress from 50% to 95% during the categorization phase
          window.updateProgressBar(50 + (i / batches.length) * 45);
        }
        
        const result = await ipcRenderer.invoke('categorize-conversations', { titles: batches[i] });
        
        if (result.success) {
          categorizedResults.push(...result.categories);
        } else {
          throw new Error(`Failed to categorize batch ${i+1}: ${result.error}`);
        }
      }
      
      // All batches processed successfully
      const result = {
        success: true,
        categories: categorizedResults
      };
      
      // Set progress to 100% when done
      window.updateProgressBar(100);
      
      // Hide loading indicator and progress bar after a short delay
      setTimeout(() => {
        conversationsLoading.classList.add('hidden');
        progressContainer.classList.add('hidden');
      }, 500);
      
      if (result.success) {
        // Debug: Log the categories received from the API
        console.log('Categorization results:', JSON.stringify(result.categories, null, 2));
        
        // Specifically log Meeting categories for debugging
        const meetingCategories = result.categories.filter(item => 
          item.category && item.category.toLowerCase().includes('meeting'));
        console.log('Meeting categories found:', JSON.stringify(meetingCategories, null, 2));
        
        // Count categories for debugging
        const categoryCount = {};
        result.categories.forEach(item => {
          categoryCount[item.category] = (categoryCount[item.category] || 0) + 1;
        });
        console.log('Category distribution:', categoryCount);
        
        // Store the categorization results for future use
        window.allCategorizedResults = result.categories;
        
        // Hide the categorize button and its container
        const categorizeButton = document.getElementById('categorizeButton');
        const categorizeContainer = document.querySelector('.categorize-container');
        if (categorizeContainer) {
          categorizeContainer.style.display = 'none';
        }
        
        // Display the categorized results
        window.displayCategorizedConversations(result.categories, 0, state.pageSize);
        
        // Load the first page of conversations to display with the updated cachedConversations
        // that now include category information
        await window.loadConversations();
      } else {
        window.showConversationError(`Categorization failed: ${result.error}`);
      }
    } catch (error) {
      const conversationsLoading = document.getElementById('conversationsLoading');
      const progressContainer = document.getElementById('progressContainer');
      
      conversationsLoading.classList.add('hidden');
      progressContainer.classList.add('hidden');
      window.showConversationError(`Error during categorization: ${error.message}`);
    }
  };
  
  // Function to display categorized conversations with pagination
  window.displayCategorizedConversations = function(categorizedItems, offset = 0, limit = state.pageSize) {
    const conversationsList = document.getElementById('conversationsList');
    
    // Show the conversation list
    conversationsList.classList.remove('hidden');
    document.querySelector('.pagination').classList.remove('hidden');
    
    // First, group by category
    const categoriesMap = {};
    
    categorizedItems.forEach(item => {
      if (!categoriesMap[item.category]) {
        categoriesMap[item.category] = [];
      }
      categoriesMap[item.category].push(item.title);
      
      // Find and update the corresponding conversation in cachedConversations
      const conversation = state.cachedConversations.find(conv => 
        (conv.title || 'Untitled conversation') === item.title
      );
      if (conversation) {
        conversation.category = item.category;
      }
    });
    
    // Clear current list
    conversationsList.innerHTML = '';
    
    // Hide the "Most Recent Conversations" section after categorizing
    const recentConversations = document.getElementById('recentConversations');
    if (recentConversations) {
      recentConversations.classList.add('hidden');
    }
    
    // Count the total number of conversations to paginate
    let totalItems = 0;
    for (const category in categoriesMap) {
      totalItems += categoriesMap[category].length;
    }
    
    // Get sorted category keys
    const sortedCategories = Object.keys(categoriesMap).sort();
    
    // Set up pagination tracking variables
    let currentPosition = 0;
    let itemsOnCurrentPage = 0;
    let categoriesOnCurrentPage = [];
    
    // Determine which categories and items will appear on the current page
    for (const category of sortedCategories) {
      const titles = categoriesMap[category];
      
      if (currentPosition + titles.length <= offset) {
        // This entire category is before our page, skip it
        currentPosition += titles.length;
        continue;
      }
      
      // How many items from this category to include
      const startIndex = Math.max(0, offset - currentPosition);
      const itemsToTake = Math.min(titles.length - startIndex, limit - itemsOnCurrentPage);
      
      if (itemsToTake <= 0) {
        // We've already filled the page
        break;
      }
      
      categoriesOnCurrentPage.push({
        category,
        titles: titles.slice(startIndex, startIndex + itemsToTake),
        startIndex,
        totalInCategory: titles.length
      });
      
      itemsOnCurrentPage += itemsToTake;
      currentPosition += titles.length;
      
      if (itemsOnCurrentPage >= limit) {
        break;
      }
    }
    
    // Create category sections for visible categories
    categoriesOnCurrentPage.forEach(({ category, titles, startIndex, totalInCategory }) => {
      // Create category header with filter capability
      const categoryHeader = document.createElement('li');
      categoryHeader.classList.add('category-header');
      
      // Create a flex container for the header content
      const headerContent = document.createElement('div');
      headerContent.style.display = 'flex';
      headerContent.style.justifyContent = 'space-between';
      headerContent.style.alignItems = 'center';
      
      // Add category name with count
      const categoryName = document.createElement('span');
      
      // Check if there are more items in this category
      const remainingItems = totalInCategory - (startIndex + titles.length);
      if (remainingItems > 0) {
        categoryName.textContent = `${category} (${titles.length} of ${totalInCategory}, ${remainingItems} more on next page)`;
      } else {
        categoryName.textContent = `${category} (${totalInCategory})`;
      }
      
      headerContent.appendChild(categoryName);
      
      // Add filter button
      const filterButton = document.createElement('button');
      filterButton.textContent = 'Filter';
      filterButton.classList.add('category-filter-button');
      
      // Add filter functionality
      filterButton.addEventListener('click', () => {
        state.currentCategoryFilter = category;
        state.currentOffset = 0; // Reset to first page
        
        // Update view controls visibility
        const { updateViewControlButtons } = require('../utils/api-client');
        updateViewControlButtons(state);
        
        window.loadConversations(0, state.pageSize); // Reset to first page with filter
      });
      
      headerContent.appendChild(filterButton);
      categoryHeader.appendChild(headerContent);
      conversationsList.appendChild(categoryHeader);
      
      // Add conversations in this category
      titles.forEach(title => {
        const item = document.createElement('li');
        item.classList.add('conversation-item');
        
        // Create info container for title and date
        const infoContainer = document.createElement('div');
        infoContainer.classList.add('conversation-info');
        
        const titleElement = document.createElement('div');
        titleElement.classList.add('conversation-title');
        titleElement.textContent = title;
        
        // Find the original conversation data to get dates
        const originalConversation = window.allConversationsData ? 
          window.allConversationsData.find(conv => (conv.title || 'Untitled conversation') === title) : null;
        
        // Add title element to info container
        infoContainer.appendChild(titleElement);
        
        // Add date element if we found the original conversation
        if (originalConversation) {
          const dateElement = document.createElement('div');
          dateElement.classList.add('conversation-date');
          dateElement.textContent = `Created: ${formatDateAsDaysAgo(originalConversation.create_time)} | Updated: ${formatDateAsDaysAgo(originalConversation.update_time)}`;
          infoContainer.appendChild(dateElement);
        }
        
        // Add info container to the item
        item.appendChild(infoContainer);
        
        // Create and add category label
        const categoryElement = document.createElement('div');
        categoryElement.classList.add('conversation-category');
        
        // Convert category name to a CSS class name
        // First extract the main part before the &, if present (e.g., "Technology & Software" -> "Technology")
        const simplifiedCategory = category.split('&')[0].trim().toLowerCase();
        
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
        } else if (simplifiedCategory.includes('meeting') || category.toLowerCase().includes('meeting')) {
          mappedCategory = 'meeting';
          console.log('Assigned meeting category for:', title);
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
        categoryElement.textContent = category;
        
        // Special handling for Meeting Summaries - ensure visibility
        if (category.includes('Meeting')) {
          console.log('Special handling for Meeting category in categorization view:', title);
          // Force style properties to ensure visibility
          categoryElement.style.display = 'inline-block';
          categoryElement.style.backgroundColor = '#0ea5e9'; // Meeting color
          categoryElement.style.visibility = 'visible';
          categoryElement.style.opacity = '1';
        }
        
        // Add category element to item
        item.appendChild(categoryElement);
        
        // For Meeting Summaries entries, force refresh the DOM
        if (category.includes('Meeting')) {
          // Force a DOM reflow to ensure the element is displayed
          setTimeout(() => {
            console.log('Meeting category element in categorization view:', categoryElement);
            console.log('- offsetWidth:', categoryElement.offsetWidth);
            console.log('- Display computed:', window.getComputedStyle(categoryElement).display);
            console.log('- Visibility computed:', window.getComputedStyle(categoryElement).visibility);
          }, 100);
        }
        
        // Add the item to the list
        conversationsList.appendChild(item);
      });
    });
    
    // Update pagination
    window.updatePagination(offset, limit, totalItems);
    
    // Show success message if this is the first time displaying categories
    if (offset === 0 && !state.categoriesDisplayed) {
      state.categoriesDisplayed = true;
      window.showConversationSuccess(`Successfully categorized ${categorizedItems.length} conversations into ${Object.keys(categoriesMap).length} categories.`);
    }
  };
}

module.exports = {
  initCategorization
};