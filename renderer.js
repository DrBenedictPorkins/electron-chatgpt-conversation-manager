// renderer.js
const { ipcRenderer } = require('electron');

document.addEventListener('DOMContentLoaded', () => {
  // Login screen elements
  const loginScreen = document.getElementById('loginScreen');
  const curlInput = document.getElementById('curlInput');
  const submitButton = document.getElementById('submitButton');
  const statusSuccess = document.getElementById('statusSuccess');
  const statusError = document.getElementById('statusError');
  const loadingIndicator = document.getElementById('loading');
  const nextButtonContainer = document.getElementById('nextButtonContainer');
  const nextButton = document.getElementById('nextButton');
  const validationError = document.getElementById('validationError');
  
  // Check if status elements exist
  if (!statusError) {
    console.error("Error: statusError element not found!");
  }
  
  if (!statusSuccess) {
    console.error("Error: statusSuccess element not found!");
  }
  
  if (!validationError) {
    console.error("Error: validationError element not found!");
  }
  
  // Conversations screen elements
  const conversationsScreen = document.getElementById('conversationsScreen');
  const backButton = document.getElementById('backButton');
  const categorizeButton = document.getElementById('categorizeButton');
  const conversationsLoading = document.getElementById('conversationsLoading');
  const loadingText = document.getElementById('loadingText');
  const progressContainer = document.getElementById('progressContainer');
  const progressBar = document.getElementById('progressBar');
  const progressText = document.getElementById('progressText');
  const conversationsError = document.getElementById('conversationsError');
  const conversationsList = document.getElementById('conversationsList');
  const prevButton = document.getElementById('prevButton');
  const nextPageButton = document.getElementById('nextPageButton');
  const paginationInfo = document.getElementById('paginationInfo');
  
  // Stats panel elements
  const statsPanel = document.getElementById('statsPanel');
  const statsTotalCount = document.getElementById('statsTotalCount');
  const statsFirstDate = document.getElementById('statsFirstDate');
  const statsLatestDate = document.getElementById('statsLatestDate');
  const recentConversationsList = document.getElementById('recentConversationsList');
  
  // API Key Modal elements
  const apiKeyModal = document.getElementById('apiKeyModal');
  const closeModalButton = document.querySelector('.close-button');
  const apiKeyInput = document.getElementById('apiKeyInput');
  
  // Add window resize listener to adapt the container size
  window.addEventListener('resize', function() {
    const container = document.querySelector('.container');
    const windowWidth = window.innerWidth;
    
    // Make container width proportional to window size, but with limits
    if (windowWidth > 1400) {
      container.style.width = '85%';
    } else if (windowWidth > 1000) {
      container.style.width = '90%';
    } else {
      container.style.width = '95%';
    }
  });
  const apiKeyError = document.getElementById('apiKeyError');
  const cancelApiKeyButton = document.getElementById('cancelApiKeyButton');
  const saveApiKeyButton = document.getElementById('saveApiKeyButton');
  
  // Pagination state
  let currentOffset = 0;
  const pageSize = 20;
  let totalConversations = 0;
  
  // Cache for all conversations
  let cachedConversations = [];
  
  // Toolbar view all categories button
  const viewAllCategoriesToolbarButton = document.getElementById('viewAllCategoriesToolbarButton');
  
  // Ensure loading indicator is hidden at startup
  loadingIndicator.classList.add('hidden');
  nextButtonContainer.classList.add('hidden');
  
  // Function to show conversation error
  function showConversationError(message) {
    conversationsError.textContent = message;
    conversationsError.classList.remove('hidden');
  }
  
  // Function to hide conversation error
  function hideConversationError() {
    conversationsError.classList.add('hidden');
  }
  
  // Function to switch screens
  function showScreen(screenId) {
    if (screenId === 'login') {
      loginScreen.style.display = 'block';
      conversationsScreen.style.display = 'none';
    } else if (screenId === 'conversations') {
      loginScreen.style.display = 'none';
      conversationsScreen.style.display = 'block';
    }
  }

  // Function to hide both status messages
  function hideStatus() {
    statusSuccess.classList.add('hidden');
    statusError.classList.add('hidden');
    validationError.classList.add('hidden');
  }
  
  // Function to show validation error with auto-hide
  function showValidationError(message) {
    console.log("Showing validation error:", message);
    validationError.textContent = message;
    validationError.classList.remove('hidden');
    
    // Auto-hide after 5 seconds
    setTimeout(() => {
      console.log("Starting validation error fade");
      validationError.style.opacity = '0';
      validationError.style.transition = 'opacity 0.5s';
      
      setTimeout(() => {
        console.log("Hiding validation error");
        validationError.classList.add('hidden');
        validationError.style.opacity = '1';
        validationError.style.transition = '';
      }, 500);
    }, 5000);
  }

  // Function to show success status with message
  function showSuccess(message, autoHide = false) {
    statusSuccess.textContent = message;
    statusSuccess.classList.remove('hidden');
    statusError.classList.add('hidden');
    
    if (autoHide) {
      setTimeout(() => {
        statusSuccess.classList.add('fade-out');
        setTimeout(() => {
          statusSuccess.classList.add('hidden');
          statusSuccess.classList.remove('fade-out');
        }, 500); // Wait for fade animation to complete
      }, 5000); // 5 seconds before starting to fade
    }
  }

  // Function to show error status with message
  function showError(message, autoHide = false) {
    console.log("Showing error:", message, "autoHide:", autoHide);
    statusError.textContent = message;
    statusError.classList.remove('hidden');
    statusSuccess.classList.add('hidden');
    
    if (autoHide) {
      console.log("Will auto-hide error after 5 seconds");
      setTimeout(() => {
        console.log("Starting fade-out animation");
        statusError.classList.add('fade-out');
        setTimeout(() => {
          console.log("Fade-out complete, hiding error message");
          statusError.classList.add('hidden');
          statusError.classList.remove('fade-out');
        }, 500); // Wait for fade animation to complete
      }, 5000); // 5 seconds before starting to fade
    }
  }

  submitButton.addEventListener('click', async () => {
    // Clear previous messages
    hideStatus();
    
    const curlCommand = curlInput.value.trim();
    
    if (!curlCommand) {
      showValidationError('Please paste a cURL command before connecting');
      return;
    }
    submitButton.disabled = true;
    loadingIndicator.classList.remove('hidden');

    try {
      // Send the cURL command to the main process for processing
      const result = await ipcRenderer.invoke('process-curl', curlCommand);
      if (result.success) {
        let successMessage = 'Successfully connected to ChatGPT!';
        
        // Add user information if available
        if (result.userData && result.userData.email) {
          successMessage += ` Logged in as: ${result.userData.name} (${result.userData.email})`;
        }
        
        // Add conversation count if available
        if (result.conversationsCount > 0) {
          successMessage += `\nFound ${result.conversationsCount} conversations.`;
        }
        
        showSuccess(successMessage);
        
        // Show the Next button
        nextButtonContainer.classList.remove('hidden');
      } else {
        // Show error message and auto-hide after 5 seconds
        showValidationError(`Connection failed: ${result.error}`);
        nextButtonContainer.classList.add('hidden');
      }
    } catch (error) {
      showValidationError(`Error: ${error.message}`);
    } finally {
      submitButton.disabled = false;
      loadingIndicator.classList.add('hidden');
    }
  });
  
  // Function to format date with detailed time information
  function formatDateAsDaysAgo(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    
    // Calculate the difference in milliseconds
    const diffMs = now - date;
    
    // Convert to various time units
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);
    
    // Show most appropriate time unit
    if (diffSecs < 60) {
      return diffSecs <= 1 ? 'Just now' : `${diffSecs} seconds ago`;
    } else if (diffMins < 60) {
      return diffMins === 1 ? '1 minute ago' : `${diffMins} minutes ago`;
    } else if (diffHours < 24) {
      return diffHours === 1 ? '1 hour ago' : `${diffHours} hours ago`;
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else {
      return `${diffDays} days ago`;
    }
  }
  
  // Variable to store current category filter
  let currentCategoryFilter = null;
  
  // Function to filter conversations by category
  function filterConversationsByCategory(category) {
    if (!cachedConversations || cachedConversations.length === 0) {
      return [];
    }
    
    if (!category) {
      return cachedConversations;
    }
    
    return cachedConversations.filter(conversation => 
      conversation.category && conversation.category.includes(category)
    );
  }
  
  // Function to render conversations
  function renderConversations(conversations) {
    // Clear the current list
    conversationsList.innerHTML = '';
    
    // If we have a category filter active, show it
    if (currentCategoryFilter) {
      const filterNotice = document.createElement('div');
      filterNotice.classList.add('filter-notice');
      filterNotice.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; 
                    padding: 10px; background-color: #f0f9ff; margin-bottom: 15px; 
                    border-radius: 4px; border-left: 4px solid #3b82f6;">
          <span>Filtering by: <strong>${currentCategoryFilter}</strong></span>
          <div>
            <button id="viewAllCategoriesButton" style="background-color: #3b82f6; color: white; 
                   border: none; padding: 5px 10px; border-radius: 4px; cursor: pointer; margin-right: 5px;">
              View All Categories
            </button>
            <button id="clearFilterButton" style="background-color: #6b7280; color: white; 
                   border: none; padding: 5px 10px; border-radius: 4px; cursor: pointer;">
              Clear Filter
            </button>
          </div>
        </div>
      `;
      conversationsList.appendChild(filterNotice);
      
      // Add event listener to the View All Categories button
      document.getElementById('viewAllCategoriesButton').addEventListener('click', () => {
        currentCategoryFilter = null;
        displayCategorizedConversations(window.allCategorizedResults || []); // Show all categories
      });
      
      // Add event listener to the Clear Filter button
      document.getElementById('clearFilterButton').addEventListener('click', () => {
        currentCategoryFilter = null;
        loadConversations(); // Reload all conversations without filter
      });
    }
    
    if (conversations.length === 0) {
      const emptyItem = document.createElement('li');
      emptyItem.classList.add('conversation-item');
      emptyItem.textContent = currentCategoryFilter ? 
        `No conversations found in category "${currentCategoryFilter}"` : 
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
          currentCategoryFilter = conversation.category;
          const filteredConversations = filterConversationsByCategory(currentCategoryFilter);
          renderConversations(filteredConversations);
        });
        
        // Add category element to item
        item.appendChild(categoryElement);
      }
      
      // Add click event to view conversation details (will implement later)
      item.addEventListener('click', () => {
        console.log('Clicked conversation:', conversation.id);
        // We'll implement conversation viewing in a future step
      });
      
      conversationsList.appendChild(item);
    });
  }
  
  // Function to update pagination
  function updatePagination(offset, limit, total) {
    // Update pagination info
    const start = total > 0 ? offset + 1 : 0;
    const end = Math.min(offset + limit, total);
    
    // Add category filter info to pagination text if filtering
    let paginationText = `Showing ${start}-${end} of ${total}`;
    if (currentCategoryFilter) {
      paginationText += ` (filtered by "${currentCategoryFilter}")`;
    }
    paginationInfo.textContent = paginationText;
    
    // Show/hide pagination controls based on whether we have results
    const paginationContainer = document.querySelector('.pagination');
    if (total > 0) {
      paginationContainer.classList.remove('hidden');
    } else {
      paginationContainer.classList.add('hidden');
    }
    
    // Update button states
    prevButton.disabled = offset <= 0;
    nextPageButton.disabled = offset + limit >= total;
    
    // Update current offset
    currentOffset = offset;
    
    // Only update total conversations if we're not filtering
    // This ensures we keep track of the total number even when filtering
    if (!currentCategoryFilter) {
      totalConversations = total;
    }
  }
  
  // Function to update stats panel with conversation data
  function updateStatsPanel(conversations) {
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
    statsTotalCount.textContent = conversations.length;
    statsFirstDate.textContent = formatDateAsDaysAgo(sortedByCreate[0].create_time);
    statsLatestDate.textContent = formatDateAsDaysAgo(sortedByUpdate[0].update_time);
    
    // Clear and update recent conversations list
    recentConversationsList.innerHTML = '';
    
    // Display up to 5 most recent conversations
    const recentConversations = sortedByUpdate.slice(0, 5);
    recentConversations.forEach(conv => {
      const li = document.createElement('li');
      li.classList.add('recent-conversation-item');
      
      // Create title element
      const title = document.createElement('div');
      title.classList.add('recent-conversation-title');
      title.textContent = conv.title || 'Untitled conversation';
      
      // Create date element
      const date = document.createElement('div');
      date.classList.add('recent-conversation-date');
      date.textContent = `Created: ${formatDateAsDaysAgo(conv.create_time)} | Updated: ${formatDateAsDaysAgo(conv.update_time)}`;
      
      // Append to list item
      li.appendChild(title);
      li.appendChild(date);
      recentConversationsList.appendChild(li);
    });
  }
  
  // Function to load all conversations into cache
  async function loadAllConversations() {
    try {
      if (cachedConversations.length > 0) {
        console.log("Using cached conversations");
        updateStatsPanel(cachedConversations);
        return cachedConversations;
      }
      
      // Show loading indicator and progress bar
      conversationsLoading.classList.remove('hidden');
      progressContainer.classList.remove('hidden');
      hideConversationError();
      
      // Reset progress bar
      updateProgressBar(0);
      loadingText.textContent = 'Loading all conversations...';
      
      // Get total number of conversations
      const allConversations = [];
      const batchSize = 100;
      let offset = 0;
      let total = totalConversations; // We already know the total
      
      // Check if there are no conversations
      if (total === 0) {
        console.log("No conversations found, showing empty state");
        // Hide loading indicator and progress bar
        conversationsLoading.classList.add('hidden');
        progressContainer.classList.add('hidden');
        
        // Show empty stats panel
        statsPanel.classList.remove('hidden');
        return [];
      }
      
      // Calculate the number of batches needed
      const totalBatches = Math.ceil(total / batchSize);
      let currentBatch = 1;
      
      // Fetch all conversations in batches
      while (offset < total) {
        loadingText.textContent = `Loading conversations... Batch ${currentBatch}/${totalBatches}`;
        updateProgressBar((currentBatch - 1) / totalBatches * 100);
        
        const result = await ipcRenderer.invoke('fetch-conversations', { 
          offset: offset, 
          limit: batchSize 
        });
        
        if (!result.success) {
          throw new Error(`Failed to fetch conversations: ${result.error}`);
        }
        
        // Add to our collection
        allConversations.push(...result.conversations);
        
        // Update progress
        offset += batchSize;
        currentBatch++;
        
        // Update progress bar
        updateProgressBar(Math.min((offset / total) * 100, 100));
      }
      
      // Hide loading indicator and progress bar
      conversationsLoading.classList.add('hidden');
      progressContainer.classList.add('hidden');
      
      // Store in cache (even if empty)
      cachedConversations = allConversations;
      
      // Update and show the stats panel
      updateStatsPanel(cachedConversations);
      
      return allConversations;
    } catch (error) {
      console.error('Error in loadAllConversations:', error);
      conversationsLoading.classList.add('hidden');
      progressContainer.classList.add('hidden');
      showConversationError(`Error loading conversations: ${error.message}`);
      return [];
    }
  }
  
  // Function to load conversations for display (uses cache if available)
  async function loadConversations(offset = 0, limit = pageSize) {
    try {
      // Show loading indicator
      conversationsLoading.classList.remove('hidden');
      hideConversationError();
      
      let conversationsToShow = [];
      let total = 0;
      
      // If we have cached conversations, use them
      if (cachedConversations.length > 0) {
        console.log("Using cached conversations for display");
        
        // Apply category filter if active
        let filteredConversations = cachedConversations;
        if (currentCategoryFilter) {
          filteredConversations = filterConversationsByCategory(currentCategoryFilter);
          console.log(`Filtered to ${filteredConversations.length} conversations in category "${currentCategoryFilter}"`);
        }
        
        total = filteredConversations.length;
        conversationsToShow = filteredConversations.slice(offset, offset + limit);
        conversationsLoading.classList.add('hidden');
        
        // Render conversations
        renderConversations(conversationsToShow);
        
        // Update pagination
        updatePagination(offset, limit, total);
      } else {
        // Otherwise fetch from API
        const result = await ipcRenderer.invoke('fetch-conversations', { offset, limit });
        conversationsLoading.classList.add('hidden');
        
        if (result.success) {
          // Render conversations
          renderConversations(result.conversations);
          
          // Update pagination
          updatePagination(result.offset, result.limit, result.total);
        } else {
          showConversationError(`Failed to fetch conversations: ${result.error}`);
        }
      }
    } catch (error) {
      conversationsLoading.classList.add('hidden');
      showConversationError(`Error: ${error.message}`);
    }
  }
  
  // Function to fetch just conversation totals and stats
  async function fetchConversationStats() {
    try {
      // Show loading indicator
      conversationsLoading.classList.remove('hidden');
      hideConversationError();
      
      // Fetch just one conversation to get the total count
      const result = await ipcRenderer.invoke('fetch-conversations', { offset: 0, limit: 1 });
      
      // Hide loading indicator
      conversationsLoading.classList.add('hidden');
      
      if (result.success) {
        // Update total conversations count
        totalConversations = result.total;
        
        // Update stats panel with just this initial data
        const initialStats = {
          total: result.total,
          recentConversation: result.conversations[0]
        };
        
        // Display a simplified stats panel
        showInitialStats(initialStats);
        
        return true;
      } else {
        showConversationError(`Failed to fetch conversations: ${result.error}`);
        return false;
      }
    } catch (error) {
      conversationsLoading.classList.add('hidden');
      showConversationError(`Error: ${error.message}`);
      return false;
    }
  }
  
  // Function to show initial stats with minimal data
  function showInitialStats(stats) {
    // Create a simplified stats display
    statsPanel.classList.remove('hidden');
    statsTotalCount.textContent = stats.total || 0;
    
    if (stats.recentConversation) {
      statsLatestDate.textContent = formatDateAsDaysAgo(stats.recentConversation.update_time);
      
      // Clear and update recent conversations list with just the one we have
      recentConversationsList.innerHTML = '';
      const li = document.createElement('li');
      li.textContent = stats.recentConversation.title || 'Untitled conversation';
      recentConversationsList.appendChild(li);
    } else {
      statsLatestDate.textContent = 'Unknown';
    }
    
    // Hide the conversations list since we're not showing it initially
    conversationsList.classList.add('hidden');
    
    // Hide the pagination controls
    document.querySelector('.pagination').classList.add('hidden');
    
    // The Show List button is always visible now
    
    // Update first date (we don't know it yet)
    statsFirstDate.textContent = 'Loading...';
    
    // No need for loadAllButton references as it's been removed
  }
  
  // Handle Next button click
  nextButton.addEventListener('click', async () => {
    // Switch to conversations screen
    showScreen('conversations');
    
    // Show loading indicator
    conversationsLoading.classList.remove('hidden');
    progressContainer.classList.remove('hidden');
    loadingText.textContent = 'Loading all conversations...';
    
    try {
      // First, fetch just one conversation to get the total
      const initialResult = await ipcRenderer.invoke('fetch-conversations', { offset: 0, limit: 1 });
      
      if (!initialResult.success) {
        throw new Error(`Failed to fetch conversations: ${initialResult.error}`);
      }
      
      // Set the total conversations count
      totalConversations = initialResult.total;
      
      if (totalConversations === 0) {
        // No conversations found, show stats panel with empty state
        statsPanel.classList.remove('hidden');
        statsTotalCount.textContent = '0';
        statsFirstDate.textContent = 'N/A';
        statsLatestDate.textContent = 'N/A';
        recentConversationsList.innerHTML = '<li>No conversations found</li>';
        
        // Hide loading indicators
        conversationsLoading.classList.add('hidden');
        progressContainer.classList.add('hidden');
        
        return;
      }
      
      // If we have conversations, load them all
      await loadAllConversations();
    } catch (error) {
      console.error('Error during conversation loading:', error);
      showConversationError(`Error: ${error.message}`);
    } finally {
      // Hide loading indicators
      conversationsLoading.classList.add('hidden');
      progressContainer.classList.add('hidden');
    }
  });
  
  // Handle Back button click
  backButton.addEventListener('click', () => {
    showScreen('login');
  });
  
  // Handle Previous page button click
  prevButton.addEventListener('click', async () => {
    const newOffset = Math.max(0, currentOffset - pageSize);
    await loadConversations(newOffset);
  });
  
  // Handle Next page button click
  nextPageButton.addEventListener('click', async () => {
    const newOffset = currentOffset + pageSize;
    
    // When filtering by category, we need to use the filtered total
    let totalToUse = totalConversations;
    if (currentCategoryFilter && cachedConversations.length > 0) {
      totalToUse = filterConversationsByCategory(currentCategoryFilter).length;
    }
    
    if (newOffset < totalToUse) {
      await loadConversations(newOffset);
    }
  });
  
  // Handle Categorize button click
  categorizeButton.addEventListener('click', async () => {
    // Show API key modal
    showApiKeyModal();
  });
  
  // Function to show API key modal
  function showApiKeyModal() {
    apiKeyModal.classList.remove('hidden');
    apiKeyError.classList.add('hidden');
    
    // Check if we already have an API key
    (async () => {
      try {
        const result = await ipcRenderer.invoke('get-openai-key');
        if (result.key) {
          apiKeyInput.value = result.key;
        }
      } catch (error) {
        console.error('Error getting API key:', error);
      }
    })();
  }
  
  // Function to hide API key modal
  function hideApiKeyModal() {
    apiKeyModal.classList.add('hidden');
  }
  
  // Close modal when clicking outside the content
  apiKeyModal.addEventListener('click', (event) => {
    if (event.target === apiKeyModal) {
      hideApiKeyModal();
    }
  });
  
  // Handle Enter key in API key input
  apiKeyInput.addEventListener('keyup', (event) => {
    if (event.key === 'Enter') {
      saveApiKeyButton.click();
    }
  });
  
  // Handle Categorize button click
  categorizeButton.addEventListener('click', async () => {
    // First, load all conversations if they aren't already cached
    if (cachedConversations.length === 0) {
      const conversations = await loadAllConversations();
      if (conversations.length === 0) {
        showConversationError('Failed to load conversations for categorization');
        return;
      }
    }
    
    // Now show the API key modal to proceed with categorization
    showApiKeyModal();
  });
  
  // Handle close modal button click
  closeModalButton.addEventListener('click', () => {
    hideApiKeyModal();
  });
  
  // Handle cancel button click
  cancelApiKeyButton.addEventListener('click', () => {
    hideApiKeyModal();
  });
  
  // Handle save API key button click
  saveApiKeyButton.addEventListener('click', async () => {
    const apiKey = apiKeyInput.value.trim();
    
    // Clear previous error
    apiKeyError.classList.add('hidden');
    
    try {
      const result = await ipcRenderer.invoke('save-openai-key', { apiKey });
      
      if (result.success) {
        hideApiKeyModal();
        
        // Show loading indicator
        conversationsLoading.classList.remove('hidden');
        progressContainer.classList.remove('hidden');
        loadingText.textContent = 'Categorizing conversations...';
        
        // Start categorization process
        startCategorizingConversations();
        
        // Show conversation list and pagination after categorization
        conversationsList.classList.remove('hidden');
        document.querySelector('.pagination').classList.remove('hidden');
        
        // Disable the categorize button
        categorizeButton.textContent = "Conversations Categorized";
        categorizeButton.disabled = true;
        
        // Show the View All Categories toolbar button
        viewAllCategoriesToolbarButton.style.display = 'block';
        
        // Add click handler for the toolbar button
        viewAllCategoriesToolbarButton.addEventListener('click', () => {
          currentCategoryFilter = null;
          if (window.allCategorizedResults && window.allCategorizedResults.length > 0) {
            // If we have categorization results, show the categorized view
            displayCategorizedConversations(window.allCategorizedResults);
          } else {
            // Otherwise show all conversations
            loadConversations();
          }
        });
      } else {
        apiKeyError.textContent = result.error;
        apiKeyError.classList.remove('hidden');
      }
    } catch (error) {
      apiKeyError.textContent = `Error: ${error.message}`;
      apiKeyError.classList.remove('hidden');
    }
  });
  
  // Function to start the categorization process
  async function startCategorizingConversations() {
    try {
      // Show loading indicator
      conversationsLoading.classList.remove('hidden');
      progressContainer.classList.remove('hidden');
      hideConversationError();
      
      // Load all conversations from cache or fetch them
      const allConversations = await loadAllConversations();
      
      if (allConversations.length === 0) {
        throw new Error('No conversations found to categorize.');
      }
      
      loadingText.textContent = 'Categorizing conversations...';
      updateProgressBar(95);
      
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
          updateProgressBar(95 + (i / batches.length) * 5); // Last 5% of progress bar
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
      
      // Hide loading indicator and progress bar
      conversationsLoading.classList.add('hidden');
      progressContainer.classList.add('hidden');
      
      if (result.success) {
        // Debug: Log the categories received from the API
        console.log('Categorization results:', JSON.stringify(result.categories, null, 2));
        
        // Count categories for debugging
        const categoryCount = {};
        result.categories.forEach(item => {
          categoryCount[item.category] = (categoryCount[item.category] || 0) + 1;
        });
        console.log('Category distribution:', categoryCount);
        
        // Display debug information to user
        const debugInfo = document.createElement('div');
        debugInfo.style.padding = '10px';
        debugInfo.style.margin = '10px 0';
        debugInfo.style.backgroundColor = '#f8f9fa';
        debugInfo.style.border = '1px solid #ddd';
        debugInfo.style.borderRadius = '4px';
        debugInfo.style.fontFamily = 'monospace';
        debugInfo.style.whiteSpace = 'pre-wrap';
        debugInfo.innerHTML = '<strong>Categories from API:</strong><br>' + 
                             JSON.stringify(categoryCount, null, 2) + 
                             '<br><br><strong>Sample categorized items:</strong><br>' +
                             JSON.stringify(result.categories.slice(0, 5), null, 2);
        
        conversationsList.appendChild(debugInfo);
        
        // Store the categorization results for future use
        window.allCategorizedResults = result.categories;
        
        // Display the categorized results
        displayCategorizedConversations(result.categories);
        
        // Load the first page of conversations to display with the updated cachedConversations
        // that now include category information
        await loadConversations();
      } else {
        showConversationError(`Categorization failed: ${result.error}`);
      }
    } catch (error) {
      conversationsLoading.classList.add('hidden');
      progressContainer.classList.add('hidden');
      showConversationError(`Error during categorization: ${error.message}`);
    }
  }
  
  // Function to update progress bar
  function updateProgressBar(percentage) {
    progressBar.style.width = `${percentage}%`;
    progressText.textContent = `${Math.round(percentage)}%`;
  }
  
  // Function to display categorized conversations
  function displayCategorizedConversations(categorizedItems) {
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
      const conversation = cachedConversations.find(conv => 
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
    
    // Create category sections
    Object.keys(categoriesMap).sort().forEach(category => {
      // Create category header with filter capability
      const categoryHeader = document.createElement('li');
      categoryHeader.classList.add('category-header');
      
      // Create a flex container for the header content
      const headerContent = document.createElement('div');
      headerContent.style.display = 'flex';
      headerContent.style.justifyContent = 'space-between';
      headerContent.style.alignItems = 'center';
      
      // Add category name
      const categoryName = document.createElement('span');
      categoryName.textContent = category;
      headerContent.appendChild(categoryName);
      
      // Add filter button
      const filterButton = document.createElement('button');
      filterButton.textContent = 'Filter';
      filterButton.classList.add('category-filter-button');
      
      // Add filter functionality
      filterButton.addEventListener('click', () => {
        currentCategoryFilter = category;
        const filteredConversations = filterConversationsByCategory(category);
        loadConversations(0, pageSize); // Reset to first page with filter
      });
      
      headerContent.appendChild(filterButton);
      categoryHeader.appendChild(headerContent);
      conversationsList.appendChild(categoryHeader);
      
      // Add conversations in this category
      categoriesMap[category].forEach(title => {
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
        
        // For debugging
        console.log('Original category:', category);
        console.log('Simplified category:', simplifiedCategory);
        
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
        
        console.log('Mapped to CSS class:', mappedCategory);
        const categoryClass = 'category-' + mappedCategory;
        
        // Add background color based on category
        categoryElement.classList.add(categoryClass);
        
        // Set category text
        categoryElement.textContent = category;
        
        // Add category element to item
        item.appendChild(categoryElement);
        
        // Add the item to the list
        conversationsList.appendChild(item);
      });
    });
    
    // Show success message
    showConversationSuccess(`Successfully categorized ${categorizedItems.length} conversations into ${Object.keys(categoriesMap).length} categories.`);
  }
  
  // Function to show success message
  function showConversationSuccess(message) {
    const successElement = document.createElement('div');
    successElement.classList.add('status', 'success');
    successElement.textContent = message;
    
    // Insert at the top of the list
    conversationsList.insertBefore(successElement, conversationsList.firstChild);
    
    // Fade out and remove after 5 seconds
    setTimeout(() => {
      successElement.classList.add('fade-out');
      setTimeout(() => {
        successElement.remove();
      }, 500); // Wait for fade animation to complete
    }, 5000);
  }
});