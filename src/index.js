// src/index.js - Main entry point for renderer process
const { ipcRenderer } = require('electron');

// Import modules
const { initAuth } = require('./auth/auth');
const { initApiKey } = require('./auth/api-key');
const { initScreens } = require('./ui/screens');
const { initNotifications } = require('./ui/notifications');
const { initList, loadConversations } = require('./conversations/list');
const { initPagination } = require('./conversations/pagination');
const { initCategorization } = require('./conversations/categorization');
const { initStats } = require('./conversations/stats');
const { initProgress } = require('./ui/progress');

// Shared state that can be accessed by all modules
const state = {
  currentOffset: 0,
  pageSize: 20,
  totalConversations: 0,
  cachedConversations: [],
  currentCategoryFilter: null,
  groupByCategory: false // Add groupByCategory state
};

// Wait for DOM to be fully loaded
document.addEventListener('DOMContentLoaded', () => {
  // Initialize all modules
  initScreens(state);
  initNotifications();
  initAuth(state);
  initApiKey(state);
  initList(state);
  initPagination(state);
  initCategorization(state);
  initStats(state);
  initProgress();
  
  // Ensure view controls are hidden on initial load
  const viewControls = document.getElementById('viewControls');
  if (viewControls) {
    viewControls.style.display = 'none';
  }
  
  // Add window resize listener for responsive container
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
});