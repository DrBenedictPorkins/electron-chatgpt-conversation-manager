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
const { initElementCache } = require('./utils/element-cache');
const { getOriginalHeaders } = require('./utils/api-client');

// Shared state that can be accessed by all modules
const state = {
  currentOffset: 0,
  pageSize: 20,
  totalConversations: 0,
  cachedConversations: [],
  currentCategoryFilter: null,
  groupByCategory: false, // Add groupByCategory state
  selectedForDeletion: [], // Track conversations marked for deletion
  selectedForArchive: [] // Track conversations marked for archive
};

// Expose state globally for cross-module access
window.state = state;

// Expose utility functions globally
window.getOriginalHeaders = getOriginalHeaders;

// Wait for DOM to be fully loaded
document.addEventListener('DOMContentLoaded', () => {
  // Initialize all modules
  try {
    console.log('Initializing core modules...');
    initElementCache(); // Initialize element cache first
    initScreens(state);
    initNotifications();
    
    console.log('Initializing auth module...');
    initAuth(state);
    
    console.log('Initializing API key module...');
    initApiKey(state);
    
    console.log('Initializing list, pagination, and categorization modules...');
    initList(state);
    initPagination(state);
    initCategorization(state);
    initStats(state);
    initProgress();
    
    console.log('All modules initialized successfully');
    
    // Add a direct event listener to the submit button as a backup
    const submitButton = document.getElementById('submitButton');
    if (submitButton) {
      console.log('Adding failsafe click handler to submit button');
      
      // Make sure we don't have multiple handlers
      const originalSubmitHandler = function() {
        console.log('Submit button clicked via main handler');
        if (window.processConnection) {
          console.log('Calling processConnection from main handler');
          window.processConnection();
        } else {
          console.error('processConnection not available in main handler');
          alert('Error: Connection function not available. Please restart the application.');
        }
      };
      
      // Set both onclick and addEventListener for maximum compatibility
      submitButton.onclick = originalSubmitHandler;
      submitButton.addEventListener('click', originalSubmitHandler);
    } else {
      console.error('Submit button not found for failsafe handler');
    }
  } catch (initError) {
    console.error('Error during module initialization:', initError);
    alert('Error initializing application. Please check the console for details and restart the application.');
  }
  
  // Ensure view controls are hidden on initial load
  const viewControls = document.getElementById('viewControls');
  if (viewControls) {
    viewControls.style.display = 'none';
    
    // Completely hide the Group by Category button until categorization is completed
    const groupByCategoryButton = document.getElementById('groupByCategoryButton');
    const clearGroupingButton = document.getElementById('clearGroupingButton');
    
    if (groupByCategoryButton) {
      // Hide the button initially
      groupByCategoryButton.style.display = 'none';
    }
    
    // Removed categorize header button
    
    // Add click handlers for grouping buttons
    
    // Define a global function for group by category functionality
    window.performGroupByCategory = function() {
      console.log('Group by Category function called');
      if (state) state.groupByCategory = true;
      
      // Update buttons visibility
      const { updateViewControlButtons } = require('./utils/api-client');
      updateViewControlButtons(state);
      
      // Reload conversations with grouping
      if (window.displayCategorizedConversations && window.allCategorizedResults) {
        window.displayCategorizedConversations(window.allCategorizedResults);
      } else {
        console.error('Categorized conversations data not available');
      }
    };
    
    // Add event listener directly to the button
    if (groupByCategoryButton) {
      groupByCategoryButton.addEventListener('click', function(event) {
        // Call the centralized function
        if (window.performGroupByCategory) {
          window.performGroupByCategory();
        }
      });
    }
    
    // Define a global function for clear grouping functionality
    window.performClearGrouping = function() {
      console.log('Clear Grouping function called');
      if (state) state.groupByCategory = false;
      
      // Update buttons visibility
      const { updateViewControlButtons } = require('./utils/api-client');
      updateViewControlButtons(state);
      
      // Reload conversations without grouping
      if (window.loadConversations) {
        window.loadConversations();
      }
    };
    
    // Add event listener directly to the button
    if (clearGroupingButton) {
      clearGroupingButton.addEventListener('click', function(event) {
        // Call the centralized function
        if (window.performClearGrouping) {
          window.performClearGrouping();
        }
      });
    }
    
    // Force hide the Group by Category button until categorization is completed
    window.forceCategoryButtonVisibility = function(show) {
      if (show) {
        console.log('Enabling Group by Category functionality');
        viewControls.dataset.needsCategorization = "false";
        
        // Show the appropriate button based on grouping state
        if (groupByCategoryButton && clearGroupingButton) {
          if (window.state && window.state.groupByCategory) {
            groupByCategoryButton.style.display = 'none';
            clearGroupingButton.style.display = 'inline-block';
          } else {
            groupByCategoryButton.style.display = 'inline-block';
            clearGroupingButton.style.display = 'none';
          }
        }
      } else {
        console.log('Disabling Group by Category functionality');
        viewControls.dataset.needsCategorization = "true";
        viewControls.style.display = 'none';
        
        // Hide both buttons
        if (groupByCategoryButton) groupByCategoryButton.style.display = 'none';
        if (clearGroupingButton) clearGroupingButton.style.display = 'none';
      }
    };
    
    // Initial state - needs categorization
    window.forceCategoryButtonVisibility(false);
    
    // Create a global flag to track categorization status
    // Always start with categorization being required (first-time user experience)
    window.hasCategorizedData = false;
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