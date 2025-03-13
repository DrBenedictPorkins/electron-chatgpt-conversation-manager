// src/conversations/stats.js - Stats panel functionality
const { formatDateAsDaysAgo } = require('../utils/date-formatter');

/**
 * Initialize stats panel functionality
 * @param {Object} state - Global application state
 */
function initStats(state) {
  // Make updateStatsPanel function available globally
  window.updateStatsPanel = function(conversations) {
    const statsPanel = document.getElementById('statsPanel');
    const statsTotalCount = document.getElementById('statsTotalCount');
    const statsFirstDate = document.getElementById('statsFirstDate');
    const statsLatestDate = document.getElementById('statsLatestDate');
    const recentConversationsList = document.getElementById('recentConversationsList');
    
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
      
      // Add hover effect to show this is clickable
      li.style.cursor = 'pointer';
      
      // Create a container for title and metadata
      const contentContainer = document.createElement('div');
      
      // Create title element
      const title = document.createElement('div');
      title.classList.add('recent-conversation-title');
      title.textContent = conv.title || 'Untitled conversation';
      
      // Create date element with icon
      const date = document.createElement('div');
      date.classList.add('recent-conversation-date');
      date.innerHTML = `
        <span style="display: inline-flex; align-items: center; margin-right: 10px;">
          <span style="margin-right: 3px;">🗓️</span> ${formatDateAsDaysAgo(conv.create_time)}
        </span>
        <span style="display: inline-flex; align-items: center;">
          <span style="margin-right: 3px;">🔄</span> ${formatDateAsDaysAgo(conv.update_time)}
        </span>
      `;
      
      // Add category badge if available
      if (conv.category) {
        const categoryBadge = document.createElement('div');
        categoryBadge.style.display = 'inline-block';
        categoryBadge.style.padding = '3px 8px';
        categoryBadge.style.borderRadius = '12px';
        categoryBadge.style.fontSize = '12px';
        categoryBadge.style.fontWeight = 'bold';
        categoryBadge.style.color = 'white';
        categoryBadge.style.marginTop = '8px';
        
        // Determine background color based on category
        const simplifiedCategory = conv.category.split('&')[0].trim().toLowerCase();
        let bgColor = '#6b7280'; // Default gray
        
        if (simplifiedCategory.includes('technology') || simplifiedCategory.includes('software')) {
          bgColor = '#3b82f6'; // blue
        } else if (simplifiedCategory.includes('finance')) {
          bgColor = '#10b981'; // green
        } else if (simplifiedCategory.includes('gaming')) {
          bgColor = '#8b5cf6'; // purple
        } else if (simplifiedCategory.includes('food')) {
          bgColor = '#f59e0b'; // amber
        } else if (simplifiedCategory.includes('meeting')) {
          bgColor = '#0ea5e9'; // blue
        }
        
        categoryBadge.style.backgroundColor = bgColor;
        categoryBadge.textContent = conv.category;
        
        // Add the badge to a separate container
        const badgeContainer = document.createElement('div');
        badgeContainer.appendChild(categoryBadge);
        contentContainer.appendChild(badgeContainer);
      }
      
      // Append to content container
      contentContainer.appendChild(title);
      contentContainer.appendChild(date);
      
      // Append content container to list item
      li.appendChild(contentContainer);
      
      // Add click event for viewing the conversation (placeholder for now)
      li.addEventListener('click', () => {
        console.log('Clicked on recent conversation:', conv.id);
        // Future implementation: view conversation details
      });
      
      recentConversationsList.appendChild(li);
    });
  };
  
  // Function to show initial stats with minimal data
  window.showInitialStats = function(stats) {
    const statsPanel = document.getElementById('statsPanel');
    const statsTotalCount = document.getElementById('statsTotalCount');
    const statsFirstDate = document.getElementById('statsFirstDate');
    const statsLatestDate = document.getElementById('statsLatestDate');
    const recentConversationsList = document.getElementById('recentConversationsList');
    const conversationsList = document.getElementById('conversationsList');
    
    // Create a simplified stats display
    statsPanel.classList.remove('hidden');
    
    // Format count with thousands separator
    statsTotalCount.textContent = (stats.total || 0).toLocaleString();
    
    if (stats.recentConversation) {
      statsLatestDate.textContent = formatDateAsDaysAgo(stats.recentConversation.update_time);
      
      // Clear and update recent conversations list with just the one we have
      recentConversationsList.innerHTML = '';
      const li = document.createElement('li');
      li.classList.add('recent-conversation-item');
      
      // Add hover effect
      li.style.cursor = 'pointer';
      
      // Create a structured layout
      const contentContainer = document.createElement('div');
      
      // Create title element
      const title = document.createElement('div');
      title.classList.add('recent-conversation-title');
      title.textContent = stats.recentConversation.title || 'Untitled conversation';
      
      // Create date element with icon
      const date = document.createElement('div');
      date.classList.add('recent-conversation-date');
      date.innerHTML = `
        <span style="display: inline-flex; align-items: center;">
          <span style="margin-right: 3px;">🔄</span> ${formatDateAsDaysAgo(stats.recentConversation.update_time)}
        </span>
      `;
      
      // Append to content container
      contentContainer.appendChild(title);
      contentContainer.appendChild(date);
      
      // Append content container to list item
      li.appendChild(contentContainer);
      recentConversationsList.appendChild(li);
      
      // Add a "Loading more..." indicator
      const loadingItem = document.createElement('li');
      loadingItem.style.textAlign = 'center';
      loadingItem.style.padding = '10px';
      loadingItem.style.color = '#6c757d';
      loadingItem.style.fontStyle = 'italic';
      loadingItem.innerHTML = 'Loading more conversations...';
      recentConversationsList.appendChild(loadingItem);
    } else {
      statsLatestDate.textContent = 'Unknown';
    }
    
    // Hide the conversations list since we're not showing it initially
    conversationsList.classList.add('hidden');
    
    // Hide the pagination controls
    document.querySelector('.pagination').classList.add('hidden');
    
    // Update first date with a loading indicator
    statsFirstDate.innerHTML = '<span style="color: #6c757d; font-style: italic;">Loading...</span>';
  };
  
  // Initialize event listener for categorize button
  const categorizeButton = document.getElementById('categorizeButton');
  categorizeButton.addEventListener('click', async () => {
    // First, load all conversations if they aren't already cached
    if (state.cachedConversations.length === 0) {
      const conversations = await window.loadAllConversations();
      if (conversations.length === 0) {
        window.showConversationError('Failed to load conversations for categorization');
        return;
      }
    }
    
    // Now show the API key modal to proceed with categorization
    window.showApiKeyModal();
  });
}

module.exports = {
  initStats
};