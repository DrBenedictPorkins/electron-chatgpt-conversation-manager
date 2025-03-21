// src/conversations/categorization.js - Conversation categorization functionality
const { ipcRenderer } = require('electron');
const { formatDateAsDaysAgo } = require('../utils/date-formatter');

/**
 * Initialize categorization functionality
 * @param {Object} state - Global application state
 */
function initCategorization(state) {
  // Initialize deletion tracking if not exists
  if (!state.selectedForDeletion) {
    state.selectedForDeletion = [];
  }
  
  // Set up event handler for categorize button
  const categorizeButton = document.getElementById('categorizeButton');
  if (categorizeButton) {
    categorizeButton.addEventListener('click', function() {
      // First show the API key modal
      if (window.showApiKeyModal) {
        window.showApiKeyModal();
      } else {
        console.error('API key modal function not available');
        alert('Error: API key modal not available. Please restart the application.');
      }
    });
  }
  
  // Create a function to update button visibility based on categorization state
  window.updateCategorizeButtonsVisibility = function() {
    const categorizeContainer = document.getElementById('categorizeContainer');
    
    if (window.hasCategorizedData === true) {
      // Hide main categorize button
      if (categorizeContainer) categorizeContainer.style.display = 'none';
    } else {
      // Show main categorize button
      if (categorizeContainer) categorizeContainer.style.display = 'block';
    }
  };
  
  // Run once at initialization to set initial state
  window.updateCategorizeButtonsVisibility();

  // Function to start the categorization process
  window.startCategorizingConversations = async function() {
    try {
      
      // Set a flag that we're in the categorization process
      window.isCategorizing = true;
      
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
        
        console.log(`Making API call to ChatGPT for categorization (batch ${i+1}/${batches.length}) with ${batches[i].length} titles`);
        const result = await ipcRenderer.invoke('categorize-conversations', { titles: batches[i] });
        console.log(`Received ChatGPT API response for batch ${i+1}/${batches.length}:`, result.success ? 'Success!' : `Error: ${result.error}`);
        
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
        
        // Track if any conversations were successfully categorized
        let categorizedCount = 0;
        result.categories.forEach(item => {
          // Find and update the corresponding conversation
          const conversation = state.cachedConversations.find(conv => 
            (conv.title || 'Untitled conversation') === item.title
          );
          if (conversation) {
            conversation.category = item.category;
            categorizedCount++;
          }
        });
        
        // After categorization, show only the header recategorize button
        const recategorizeHeaderButton = document.getElementById('recategorizeHeaderButton');
        
        // Show only the header re-categorize button
        if (recategorizeHeaderButton) {
          recategorizeHeaderButton.style.display = 'inline-flex';
        }
        
        // Show container and display the categorized results
        const container = document.getElementById('conversationsContainer');
        if (container) {
          container.classList.remove('hidden');
        }
        window.displayCategorizedConversations(result.categories, 0, state.pageSize);
        
        // Show a message about the categorization results
        let successMessage = `Successfully categorized ${categorizedCount} conversations into ${new Set(result.categories.map(item => item.category)).size} categories.`;
        if (categorizedCount > 0) {
          successMessage += ' You can now use the "Group by Category" button to organize your conversations.';
          
          // Set the global categorization flag to indicate we have categorized data
          window.hasCategorizedData = true;
          
          // Persist categorization status in localStorage
          try {
            localStorage.setItem('hasCategorizedData', 'true');
          } catch (e) {
            console.error('Error saving categorization status to localStorage:', e);
          }
          
          // Create and show the conversations container dynamically
          const placeholder = document.getElementById('conversationsContainerPlaceholder');
          if (placeholder) {
            // Create the container (hidden by default)
            const conversationsContainer = document.createElement('div');
            conversationsContainer.className = 'conversations-container hidden';
            conversationsContainer.id = 'conversationsContainer';
            
            // Create the conversation list
            const conversationsList = document.createElement('ul');
            conversationsList.className = 'conversation-list';
            conversationsList.id = 'conversationsList';
            conversationsContainer.appendChild(conversationsList);
            
            // Create pagination container
            const paginationDiv = document.createElement('div');
            paginationDiv.className = 'pagination';
            paginationDiv.innerHTML = `
              <div class="pagination-controls">
                <div class="pagination-left">
                  <button id="prevButton" class="back-button" onclick="(function(){
                      console.log('Inline Previous button clicked');
                      const newOffset = Math.max(0, window.paginationState.currentOffset - window.paginationState.pageSize);
                      console.log('Moving to offset:', newOffset);
                      window.displayCategorizedConversations(window.allCategorizedResults, newOffset, window.paginationState.pageSize);
                    })()">&larr; Previous</button>
                </div>
                <div class="pagination-center">
                  <span id="paginationInfo" style="display: inline-block; padding: 6px 12px; background-color: #f8f9fa; border-radius: 4px; border: 1px solid #dee2e6;">Showing 1-20 of 0</span>
                </div>
                <div class="pagination-right">
                  <button id="nextPageButton" class="next-button" onclick="(function(){
                      console.log('Inline Next button clicked');
                      const newOffset = window.paginationState.currentOffset + window.paginationState.pageSize;
                      console.log('Moving to offset:', newOffset);
                      window.displayCategorizedConversations(window.allCategorizedResults, newOffset, window.paginationState.pageSize);
                    })()">Next &rarr;</button>
                </div>
              </div>
            `;
            conversationsContainer.appendChild(paginationDiv);
            
            // Replace the placeholder with the actual container
            placeholder.parentNode.replaceChild(conversationsContainer, placeholder);
            
            // Make sure the conversationsContainer is visible
            conversationsContainer.classList.remove('hidden');
            
            // Register pagination event listeners
            console.log('Attaching pagination event listeners after categorization');
            
            // Try multiple times with increasing delays to ensure listeners are attached
            const tryAttachListeners = (attempt = 1) => {
              console.log(`Attempt ${attempt} to attach pagination listeners after categorization`);
              if (window.attachPaginationListeners) {
                window.attachPaginationListeners();
                console.log('Pagination event listeners attached after categorization');
                
                // Additionally add a direct onclick handler as a fallback
                const nextButton = document.getElementById('nextPageButton');
                if (nextButton) {
                  console.log('Adding backup onclick handler to Next button');
                  nextButton.onclick = function() {
                    console.log('Direct Next button click handler called');
                    const newOffset = window.paginationState.currentOffset + window.paginationState.pageSize;
                    window.displayCategorizedConversations(window.allCategorizedResults, newOffset, window.paginationState.pageSize);
                  };
                } else {
                  console.error('Next button not found when trying to add onclick handler');
                }
                
                // After a short delay, debug the listener status
                setTimeout(() => {
                  if (window.debugPaginationListeners) {
                    window.debugPaginationListeners();
                  }
                }, 500);
              } else {
                console.error('attachPaginationListeners function not available');
                if (attempt < 5) {
                  setTimeout(() => tryAttachListeners(attempt + 1), attempt * 200);
                }
              }
            };
            
            // Initial attempt with delay to ensure DOM is updated
            setTimeout(tryAttachListeners, 100);
          }
          
          // Enable the categorization feature
          if (window.forceCategoryButtonVisibility) {
            window.forceCategoryButtonVisibility(true);
          }
          
          // Update button visibility based on categorization state
          if (window.updateCategorizeButtonsVisibility) {
            window.updateCategorizeButtonsVisibility();
          }
          
          // No header button anymore
          
          // Then show view controls since we have successfully categorized conversations
          const { updateViewControlButtons, updateCategoryDropdown } = require('../utils/api-client');
          updateViewControlButtons(state);
          
          // Make sure dropdown has the latest categories
          updateCategoryDropdown(state);
          
          // Show the sort toggle button
          const sortToggleButton = document.getElementById('sortToggleButton');
          if (sortToggleButton) {
            sortToggleButton.classList.remove('hidden');
          }
          
          // Update the Total Conversations stat with category count
          const totalCategories = new Set(result.categories.map(item => item.category)).size;
          const statsCountElement = document.getElementById('statsTotalCount');
          if (statsCountElement) {
            const currentCount = statsCountElement.textContent;
            statsCountElement.innerHTML = `${currentCount} <span style="font-size: 0.85em; color: #4a6cf7;">(${totalCategories} Categories)</span>`;
          }
        } else {
          window.showConversationError('No conversations were successfully categorized. Please try again or adjust your categorization prompt.');
        }
        
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
    } finally {
      // Reset categorization flag
      window.isCategorizing = false;
      
      // Update button visibility based on categorization state
      if (window.updateCategorizeButtonsVisibility) {
        window.updateCategorizeButtonsVisibility();
      }
    }
  };
  
  // Function to display categorized conversations with pagination
  window.displayCategorizedConversations = function(categorizedItems, offset = 0, limit = state.pageSize) {
    console.log("displayCategorizedConversations called with:", {
      items: categorizedItems ? categorizedItems.length : 0,
      offset: offset,
      limit: limit,
      state: {
        pageSize: state.pageSize,
        currentOffset: window.paginationState ? window.paginationState.currentOffset : 'undefined',
        groupByCategory: window.paginationState ? window.paginationState.groupByCategory : 'undefined'
      }
    });
    
    if (!categorizedItems || categorizedItems.length === 0) {
      console.error("No categorized items to display!");
      return;
    }
    
    const conversationsList = document.getElementById('conversationsList');
    if (!conversationsList) {
      console.error("conversationsList element not found!");
      return;
    }
    
    // Update pagination state
    if (window.paginationState) {
      window.paginationState.currentOffset = offset;
    }
    
    // Pagination will be controlled by updatePagination function based on categorization status
    
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
    
    console.log(`displayCategorizedConversations: offset=${offset}, limit=${limit}, totalItems=${totalItems}, categorized data length=${categorizedItems.length}`);
    
    // Debug categories information
    console.log("Categories data:", Object.keys(categoriesMap).map(category => ({
      category,
      count: categoriesMap[category].length
    })));
    
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
        
        // Store conversation ID as data attribute for deletion tracking
        if (originalConversation) {
          item.dataset.conversationId = originalConversation.id;
        }
        
        // Create category container
        const categoryContainer = document.createElement('div');
        categoryContainer.classList.add('category-container');
        categoryContainer.style.position = 'relative';
        categoryContainer.style.display = 'inline-block';
        
        // Create and add category label
        const categoryElement = document.createElement('div');
        categoryElement.classList.add('conversation-category');
        categoryElement.style.cursor = 'pointer'; // Indicate it's clickable
        
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
        
        // Add dropdown icon that appears on hover
        const dropdownIcon = document.createElement('span');
        dropdownIcon.classList.add('category-dropdown-icon');
        dropdownIcon.innerHTML = '▼';
        dropdownIcon.style.marginLeft = '5px';
        dropdownIcon.style.opacity = '0';
        dropdownIcon.style.transition = 'opacity 0.2s ease';
        categoryElement.appendChild(dropdownIcon);
        
        // Special handling for Meeting Summaries - ensure visibility
        if (category.includes('Meeting')) {
          console.log('Special handling for Meeting category in categorization view:', title);
          // Force style properties to ensure visibility
          categoryElement.style.display = 'inline-block';
          categoryElement.style.backgroundColor = '#0ea5e9'; // Meeting color
          categoryElement.style.visibility = 'visible';
          categoryElement.style.opacity = '1';
        }
        
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
        dropdownMenu.style.zIndex = '1000'; // Increased z-index to ensure it appears on top
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
            
            // Find the original conversation in cachedConversations to update
            const originalConversation = window.allConversationsData ? 
              window.allConversationsData.find(conv => (conv.title || 'Untitled conversation') === title) : null;
            
            if (!originalConversation) {
              console.error('Could not find conversation to update category for:', title);
              return;
            }
            
            // Get all unique categories from categorizedItems
            const allCategories = [...new Set(
              window.allCategorizedResults
                .map(item => item.category)
            )];
            
            // Filter out current category
            const otherCategories = allCategories.filter(cat => cat !== category);
            
            // Create items for each other category
            otherCategories.forEach(otherCategory => {
              const categoryItem = document.createElement('div');
              categoryItem.classList.add('category-dropdown-item');
              categoryItem.textContent = otherCategory;
              categoryItem.style.padding = '6px 12px';
              categoryItem.style.cursor = 'pointer';
              categoryItem.style.transition = 'background-color 0.2s';
              categoryItem.style.fontSize = '11px';
              categoryItem.style.overflow = 'hidden';
              categoryItem.style.textOverflow = 'ellipsis';
              categoryItem.style.position = 'relative';
              categoryItem.style.zIndex = '10000'; // Extremely high z-index
              categoryItem.style.backgroundColor = 'white'; // Ensure background is solid
              
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
                
                // Find the categorized item in allCategorizedResults to update
                const categorizedItem = window.allCategorizedResults.find(item => item.title === title);
                if (categorizedItem) {
                  categorizedItem.category = otherCategory;
                }
                
                // Update the original conversation in cachedConversations
                if (originalConversation) {
                  originalConversation.category = otherCategory;
                }
                
                // Update UI
                categoryElement.textContent = otherCategory;
                categoryElement.appendChild(dropdownIcon);
                
                // Update CSS class for color
                categoryElement.className = 'conversation-category';
                const newSimplifiedCategory = otherCategory.split('&')[0].trim().toLowerCase();
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
                
                // Check if we're in a filtered view
                if (state.currentCategoryFilter) {
                  // If we changed to a different category than the current filter
                  if (otherCategory !== state.currentCategoryFilter) {
                    // Animate fade out for this item only
                    item.style.animation = 'fadeOut 0.5s ease-out forwards';
                    setTimeout(() => {
                      // Remove just this item from the view
                      item.remove();
                      
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
                // If in grouped view but not filtered, refresh the entire view
                else if (state.groupByCategory) {
                  // Animate fade out
                  item.style.animation = 'fadeOut 0.5s ease-out forwards';
                  setTimeout(() => {
                    // After animation completes, refresh the categorized view
                    window.displayCategorizedConversations(window.allCategorizedResults, 0, state.pageSize);
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
            
            // Force the dropdown to be visible and on top
            dropdownMenu.style.display = 'block';
            dropdownMenu.style.zIndex = '1000';
            dropdownMenuVisible = true;
            
            // Force high z-index to ensure visibility
            dropdownMenu.style.zIndex = '9999';
            
            // Make sure the dropdown is positioned prominently
            dropdownMenu.style.position = 'absolute';
            dropdownMenu.style.right = '0';
            dropdownMenu.style.top = '30px';
            
            // Add a bright border temporarily to make it more visible
            const originalBorder = dropdownMenu.style.border;
            dropdownMenu.style.border = '2px solid #3b82f6';
            
            // Restore original border after a short delay
            setTimeout(() => {
                dropdownMenu.style.border = originalBorder;
            }, 1000);
          }
        };
        
        // Add click event listeners
        categoryElement.addEventListener('click', (e) => {
          // Check if the click was on the dropdown icon
          if (e.target === dropdownIcon) {
            toggleDropdown(e);
          } else {
            // Filter by this category when clicking anywhere else on the category element
            e.stopPropagation();
            
            // Set the filter and reset to first page
            state.currentCategoryFilter = category;
            state.currentOffset = 0;
            
            // Update view controls visibility
            const { updateViewControlButtons } = require('../utils/api-client');
            updateViewControlButtons(state);
            
            // Load conversations with the filter
            window.loadConversations(0, state.pageSize);
          }
        });
        
        // Add event listener for dropdown icon
        dropdownIcon.addEventListener('click', toggleDropdown);
        
        // Close dropdown when clicking outside
        document.addEventListener('click', (event) => {
          // Only close if click is outside the dropdown and its trigger
          if (dropdownMenuVisible && 
              !dropdownMenu.contains(event.target) && 
              !categoryElement.contains(event.target)) {
            dropdownMenu.style.display = 'none';
            dropdownMenuVisible = false;
            dropdownIcon.style.opacity = '0';
          }
        });
        
        // Prevent event propagation from dropdown menu to avoid closing
        dropdownMenu.addEventListener('click', (event) => {
          event.stopPropagation();
        });
        
        // Add elements to container
        categoryContainer.appendChild(categoryElement);
        categoryContainer.appendChild(dropdownMenu);
        
        // Add category container to item
        item.appendChild(categoryContainer);
        
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
        
        // Add delete icon
        if (originalConversation) {
          const deleteIcon = document.createElement('span');
          deleteIcon.classList.add('delete-icon');
          deleteIcon.innerHTML = '🗑️';
          deleteIcon.title = 'Mark for deletion';
          deleteIcon.style.marginLeft = '10px';
          deleteIcon.style.cursor = 'pointer';
          deleteIcon.style.opacity = '0.5';
          deleteIcon.style.transition = 'opacity 0.2s';
          deleteIcon.style.fontSize = '14px';
          
          // Hover effects
          deleteIcon.addEventListener('mouseenter', () => {
            deleteIcon.style.opacity = '1';
          });
          
          deleteIcon.addEventListener('mouseleave', () => {
            if (!state.selectedForDeletion.includes(originalConversation.id)) {
              deleteIcon.style.opacity = '0.5';
            }
          });
          
          // Click handler for deletion mark
          deleteIcon.addEventListener('click', (e) => {
            e.stopPropagation(); // Prevent triggering the conversation click event
            
            // Toggle selection for deletion
            if (state.selectedForDeletion.includes(originalConversation.id)) {
              // Remove from selected
              state.selectedForDeletion = state.selectedForDeletion.filter(id => id !== originalConversation.id);
              deleteIcon.style.opacity = '0.5';
              deleteIcon.style.color = 'inherit';
              
              // Remove the class to un-mark it
              item.classList.remove('marked-for-deletion');
              
              // Add a subtle transition back to normal
              item.style.transition = 'background-color 0.3s ease, border-left-width 0.3s ease';
              item.style.backgroundColor = '';
              item.style.borderLeft = '';
              
              // Reset after transition completes
              setTimeout(() => {
                item.style.transition = '';
              }, 300);
            } else {
              // Add to selected
              state.selectedForDeletion.push(originalConversation.id);
              deleteIcon.style.opacity = '1';
              deleteIcon.style.color = 'red';
              
              // Reset any inline styles to ensure animation plays
              item.style.transition = '';
              item.style.backgroundColor = '';
              item.style.borderLeft = '';
              
              // Apply the class which has the animation
              item.classList.add('marked-for-deletion');
            }
            
            // Update delete button visibility
            window.updateDeleteButtonVisibility();
          });
          
          // If this conversation is already marked for deletion, update the icon appearance
          if (state.selectedForDeletion.includes(originalConversation.id)) {
            deleteIcon.style.opacity = '1';
            deleteIcon.style.color = 'red';
            item.classList.add('marked-for-deletion');
          }
          
          item.appendChild(deleteIcon);
        }
        
        // Add the item to the list
        conversationsList.appendChild(item);
      });
    });
    
    // Update pagination
    console.log("displayCategorizedConversations: updating pagination with", offset, limit, totalItems);
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