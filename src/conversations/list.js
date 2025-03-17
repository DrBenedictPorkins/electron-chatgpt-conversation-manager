// src/conversations/list.js - Main entry point for conversations list
const { ipcRenderer } = require('electron');
const { initRendering } = require('./rendering');
const { initOperations } = require('./operations');
const { fetchConversations } = require('../utils/api-client');

/**
 * Initialize conversation list functionality
 * @param {Object} state - Global application state
 */
function initList(state) {
  console.log('Initializing conversations list module');
  
  // Initialize the rendering module
  initRendering(state);
  
  // Initialize the operations module
  initOperations(state);
  
  // Set up conversation functions
  registerConversationFunctions(state);
  
  // Set up event handlers
  setupEventHandlers(state);
  
  // Check if we've already categorized data in this session
  if (window.hasCategorizedData === true) {
    console.log('Already categorized data detected, hiding categorize container');
    const categorizeContainer = document.querySelector('.categorize-container');
    if (categorizeContainer) {
      categorizeContainer.style.display = 'none';
    }
    
    // Show the header categorize button
    const categorizeHeaderButton = document.getElementById('categorizeHeaderButton');
    if (categorizeHeaderButton) {
      categorizeHeaderButton.style.display = 'inline-block';
    }
  }
  
  return true;
}

/**
 * Register global conversation functions
 * @param {Object} state - Global application state
 */
function registerConversationFunctions(state) {
  // Load conversations function
  window.loadConversations = async function (offset = 0, limit = state.pageSize) {
    await fetchConversations(state, offset, limit);
    
    // Update UI state after loading conversations
    window.updateButtonsVisibility();
    
    // Always make sure the button visibility is updated based on categorization status
    if (window.updateCategorizeButtonsVisibility) {
      window.updateCategorizeButtonsVisibility();
    }
  };
  
  // Load all conversations function
  window.loadAllConversations = async function () {
    return await require('../utils/api-client').loadAllConversations(state);
  };
}

/**
 * Set up event handlers for the conversation list
 * @param {Object} state - Global application state
 */
function setupEventHandlers(state) {
  console.log('Setting up conversation list event handlers');
  
  // Add click event to delete counter
  const deleteCounter = document.getElementById('deleteCounter');
  if (deleteCounter) {
    deleteCounter.addEventListener('click', async () => {
      console.log('Delete counter clicked');
      if (window.deleteSelectedConversations) {
        await window.deleteSelectedConversations();
      } else {
        console.error('deleteSelectedConversations function not defined');
      }
    });
  }
  
  // Add click event to archive counter
  const archiveCounter = document.getElementById('archiveCounter');
  if (archiveCounter) {
    archiveCounter.addEventListener('click', async () => {
      console.log('Archive counter clicked');
      if (window.archiveSelectedConversations) {
        await window.archiveSelectedConversations();
      } else {
        console.error('archiveSelectedConversations function not defined');
      }
    });
  }
}

module.exports = {
  initList,
  loadConversations: fetchConversations
};