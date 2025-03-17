// src/conversations/operations.js - Conversation operation handlers
const { ipcRenderer } = require('electron');

/**
 * Show confirmation dialog with a promise
 * @param {string} title - Dialog title
 * @param {string} message - Confirmation message
 * @returns {Promise<boolean>} - Resolves to true if confirmed, false if canceled
 */
function showConfirmationDialog(title, message) {
  return new Promise((resolve) => {
    // Get the modal elements
    const modal = document.getElementById('confirmationModal');
    const confirmTitle = document.getElementById('confirmationTitle');
    const confirmMessage = document.getElementById('confirmationMessage');
    const confirmButton = document.getElementById('confirmActionButton');
    const cancelButton = document.getElementById('cancelConfirmationButton');
    const closeButton = document.getElementById('closeConfirmationButton');
    
    if (!modal || !confirmTitle || !confirmMessage || !confirmButton || !cancelButton) {
      console.error('Confirmation modal elements not found');
      resolve(false);
      return;
    }
    
    // Set the title and message
    confirmTitle.textContent = title;
    confirmMessage.textContent = message;
    
    // Show the modal
    modal.classList.remove('hidden');
    
    // Handle confirm button click
    const handleConfirm = () => {
      modal.classList.add('hidden');
      confirmButton.removeEventListener('click', handleConfirm);
      cancelButton.removeEventListener('click', handleCancel);
      closeButton.removeEventListener('click', handleCancel);
      resolve(true);
    };
    
    // Handle cancel/close button click
    const handleCancel = () => {
      modal.classList.add('hidden');
      confirmButton.removeEventListener('click', handleConfirm);
      cancelButton.removeEventListener('click', handleCancel);
      closeButton.removeEventListener('click', handleCancel);
      resolve(false);
    };
    
    // Add event listeners
    confirmButton.addEventListener('click', handleConfirm);
    cancelButton.addEventListener('click', handleCancel);
    closeButton.addEventListener('click', handleCancel);
  });
}

/**
 * Archive the selected conversations
 * @param {Object} state - Global application state
 * @returns {Promise<void>}
 */
async function archiveSelectedConversations(state) {
  const conversationIds = [...state.selectedForArchive];
  
  if (!conversationIds || conversationIds.length === 0) {
    window.createNotification('No conversations selected for archiving.', 'Archive Operation', 'error');
    return;
  }
  
  // Show confirmation dialog
  const confirmed = await showConfirmationDialog(
    'Confirm Archive', 
    `Are you sure you want to archive ${conversationIds.length} conversation(s)?\n\nThis action CAN be undone by following these instructions:\n\n` +
    `You can view your archived chats at any time:\n` +
    `1. Click on your profile icon at the bottom left of the ChatGPT interface\n` +
    `2. Choose "Settings" from the menu\n` +
    `3. Click on "Manage" next to the "Archived Chats" section\n` +
    `4. You'll see a list of your archived chats that you can restore`
  );
  
  if (!confirmed) {
    console.log('Archive operation canceled by user');
    return;
  }
  
  // Disable action buttons during operation
  disableActionButtons();
  
  // Show loading indicator and progress bar
  const conversationsLoading = document.getElementById('conversationsLoading');
  const progressContainer = document.getElementById('progressContainer');
  const loadingText = document.getElementById('loadingText');
  
  if (conversationsLoading) conversationsLoading.classList.remove('hidden');
  if (progressContainer) progressContainer.classList.remove('hidden');
  if (loadingText) loadingText.textContent = `Archiving ${conversationIds.length} conversation(s)...`;
  
  // Reset progress bar
  window.updateProgressBar(0);
  
  // Set up progress listener
  const progressListener = (event, progressData) => {
    console.log(`Progress event received: ${progressData.current}/${progressData.total} (${progressData.percent}%)`);
    if (loadingText) loadingText.textContent = `Archiving conversations... ${progressData.current}/${progressData.total}`;
    
    // Make sure the progress bar is updating
    console.log(`Updating progress bar to ${progressData.percent}%`);
    window.updateProgressBar(progressData.percent);
  };
  
  // Register the progress event listener
  console.log('Registering archive-progress event listener');
  ipcRenderer.on('archive-progress', progressListener);
  
  try {
    // Call the main process to execute the archive API request
    console.log(`Invoking archive-conversations with ${conversationIds.length} IDs`);
    console.time('archive-operation-total-time');
    
    const result = await ipcRenderer.invoke('archive-conversations', { 
      conversationIds: conversationIds 
    });
    
    console.timeEnd('archive-operation-total-time');
    console.log('Received archive operation result:', result);
    
    // Hide loading indicators
    if (conversationsLoading) conversationsLoading.classList.add('hidden');
    if (progressContainer) progressContainer.classList.add('hidden');
    
    if (result.success) {
      // Find the titles of successfully archived conversations
      const archivedTitles = [];
      for (const id of result.results.success) {
        const conversation = state.cachedConversations.find(conv => conv.id === id);
        if (conversation) {
          archivedTitles.push(conversation.title || 'Untitled conversation');
        }
      }
      
      // Create success message with titles
      let successMessage = `Successfully archived ${result.results.success.length} of ${conversationIds.length} conversations:`;
      
      // Add titles with bullet points, limit to first 5 if there are many
      if (archivedTitles.length > 0) {
        // Create a properly styled list with no inline styles that could leak
        successMessage += '<div class="archive-list">';
        const displayTitles = archivedTitles.slice(0, 5);
        displayTitles.forEach(title => {
          successMessage += `<div>• ${title}</div>`;
        });
        
        // If there are more titles than we're showing, add a note
        if (archivedTitles.length > 5) {
          successMessage += `<div>• ... and ${archivedTitles.length - 5} more</div>`;
        }
        
        successMessage += '</div>';
      }
      
      // Create a persistent success notification using our utility function
      window.createNotification(
        successMessage, 
        'Archive Successful', 
        'success',
        10000
      );
      // Removed the bottom status message since we have the centered notification
      
      // If there were any failures, log them and create a failure notification
      if (result.results.failed.length > 0) {
        console.error('Failed to archive some conversations:', result.results.failed);
        
        let errorMessage = 'Failed to archive the following conversations:';
        errorMessage += '<div class="archive-list">';
        
        // Show the first 5 failures
        const displayFailures = result.results.failed.slice(0, 5);
        displayFailures.forEach(failure => {
          errorMessage += `<div>• ${failure.error}</div>`;
        });
        
        // If there are more failures than we're showing, add a note
        if (result.results.failed.length > 5) {
          errorMessage += `<div>• ... and ${result.results.failed.length - 5} more</div>`;
        }
        
        errorMessage += '</div>';
        
        // Create an error notification
        window.createNotification(
          errorMessage,
          'Archive Failures',
          'error',
          15000
        );
      }
      
      // Remove the archived conversations from the state
      for (const id of result.results.success) {
        const index = state.selectedForArchive.indexOf(id);
        if (index > -1) {
          state.selectedForArchive.splice(index, 1);
        }
        
        // Also remove from cached conversations to update the UI immediately
        const cachedIndex = state.cachedConversations.findIndex(conv => conv.id === id);
        if (cachedIndex > -1) {
          state.cachedConversations.splice(cachedIndex, 1);
        }
      }
      
      // Update the deletion counters
      window.updateButtonsVisibility();
      
      // Check if we're in a filtered view
      const currentFilter = state.currentCategoryFilter;
      
      if (currentFilter) {
        // Count how many conversations remain that match the current filter
        const remainingInFilter = state.cachedConversations.filter(conv => 
          conv.category === currentFilter || conv.category?.includes(currentFilter)
        );
        
        // If there are no more conversations in the current filter, clear the filter and show all conversations
        if (remainingInFilter.length === 0) {
          console.log('No more conversations in the current filter. Showing all conversations.');
          state.currentCategoryFilter = null;
          
          // Update any UI elements that show the current filter
          const filterNotice = document.querySelector('.filter-notice');
          if (filterNotice) {
            filterNotice.remove();
          }
          
          // Show full list
          window.loadConversations(0, state.pageSize);
        } else {
          console.log(`${remainingInFilter.length} conversations still in category "${currentFilter}". Keeping filter active.`);
          
          // Filter the conversation list to only show items in the current filter
          const filteredConversations = state.cachedConversations.filter(conv => 
            conv.category === currentFilter || conv.category?.includes(currentFilter)
          );
          
          // Update the filter notice count
          const filterCountElement = document.querySelector('.filter-count');
          if (filterCountElement) {
            filterCountElement.textContent = `${remainingInFilter.length} ${remainingInFilter.length === 1 ? 'conversation' : 'conversations'}`;
          }
          
          // Render the filtered list
          window.renderConversations(filteredConversations);
        }
      } else {
        // If not filtered, just refresh the conversation list to reflect changes
        window.renderConversations(state.cachedConversations);
      }
    } else {
      // Show error notification
      window.createNotification(
        `Error archiving conversations: ${result.error}`,
        'Archive Failed',
        'error'
      );
    }
  } catch (error) {
    console.error('Error during archive operation:', error);
    
    // Hide loading indicators
    if (conversationsLoading) conversationsLoading.classList.add('hidden');
    if (progressContainer) progressContainer.classList.add('hidden');
    
    // Show error notification
    window.createNotification(
      `Error archiving conversations: ${error.message}`,
      'Archive Failed',
      'error'
    );
  } finally {
    // Unregister the progress event listener
    ipcRenderer.removeListener('archive-progress', progressListener);
    
    // Re-enable all action buttons
    enableActionButtons();
  }
}

/**
 * Delete the selected conversations
 * @param {Object} state - Global application state
 * @returns {Promise<void>}
 */
async function deleteSelectedConversations(state) {
  const conversationIds = [...state.selectedForDeletion];
  
  if (!conversationIds || conversationIds.length === 0) {
    window.createNotification('No conversations selected for deletion.', 'Delete Operation', 'error');
    return;
  }
  
  // Show confirmation dialog
  const confirmed = await showConfirmationDialog(
    'Confirm Deletion', 
    `Are you sure you want to delete ${conversationIds.length} conversation(s)?\n\nThis action can't be undone.`
  );
  
  if (!confirmed) {
    console.log('Delete operation canceled by user');
    return;
  }
  
  // Disable action buttons during operation
  disableActionButtons();
  
  // Show loading indicator and progress bar
  const conversationsLoading = document.getElementById('conversationsLoading');
  const progressContainer = document.getElementById('progressContainer');
  const loadingText = document.getElementById('loadingText');
  
  if (conversationsLoading) conversationsLoading.classList.remove('hidden');
  if (progressContainer) progressContainer.classList.remove('hidden');
  if (loadingText) loadingText.textContent = `Deleting ${conversationIds.length} conversation(s)...`;
  
  // Reset progress bar
  window.updateProgressBar(0);
  
  // Set up progress listener
  const progressListener = (event, progressData) => {
    console.log(`Progress event received: ${progressData.current}/${progressData.total} (${progressData.percent}%)`);
    if (loadingText) loadingText.textContent = `Deleting conversations... ${progressData.current}/${progressData.total}`;
    
    // Make sure the progress bar is updating
    console.log(`Updating progress bar to ${progressData.percent}%`);
    window.updateProgressBar(progressData.percent);
  };
  
  // Register the progress event listener
  console.log('Registering delete-progress event listener');
  ipcRenderer.on('delete-progress', progressListener);
  
  try {
    // Call the main process to execute the delete API request
    console.log(`Invoking delete-conversations with ${conversationIds.length} IDs`);
    console.time('delete-operation-total-time');
    
    const result = await ipcRenderer.invoke('delete-conversations', { 
      conversationIds: conversationIds 
    });
    
    console.timeEnd('delete-operation-total-time');
    console.log('Received delete operation result:', result);
    
    // Hide loading indicators
    if (conversationsLoading) conversationsLoading.classList.add('hidden');
    if (progressContainer) progressContainer.classList.add('hidden');
    
    if (result.success) {
      // Find the titles of successfully deleted conversations
      const deletedTitles = [];
      for (const id of result.results.success) {
        const conversation = state.cachedConversations.find(conv => conv.id === id);
        if (conversation) {
          deletedTitles.push(conversation.title || 'Untitled conversation');
        }
      }
      
      // Create success message with titles
      let successMessage = `Successfully deleted ${result.results.success.length} of ${conversationIds.length} conversations:`;
      
      // Add titles with bullet points, limit to first 5 if there are many
      if (deletedTitles.length > 0) {
        // Create a properly styled list with no inline styles that could leak
        successMessage += '<div class="archive-list">';
        const displayTitles = deletedTitles.slice(0, 5);
        displayTitles.forEach(title => {
          successMessage += `<div>• ${title}</div>`;
        });
        
        // If there are more titles than we're showing, add a note
        if (deletedTitles.length > 5) {
          successMessage += `<div>• ... and ${deletedTitles.length - 5} more</div>`;
        }
        
        successMessage += '</div>';
      }
      
      // Create a persistent success notification using our utility function
      window.createNotification(
        successMessage, 
        'Delete Successful', 
        'delete',
        10000
      );
      // Removed the bottom status message since we have the centered notification
      
      // If there were any failures, log them and create a failure notification
      if (result.results.failed.length > 0) {
        console.error('Failed to delete some conversations:', result.results.failed);
        
        let errorMessage = 'Failed to delete the following conversations:';
        errorMessage += '<div class="archive-list">';
        
        // Show the first 5 failures
        const displayFailures = result.results.failed.slice(0, 5);
        displayFailures.forEach(failure => {
          errorMessage += `<div>• ${failure.error}</div>`;
        });
        
        // If there are more failures than we're showing, add a note
        if (result.results.failed.length > 5) {
          errorMessage += `<div>• ... and ${result.results.failed.length - 5} more</div>`;
        }
        
        errorMessage += '</div>';
        
        // Create an error notification
        window.createNotification(
          errorMessage,
          'Delete Failures',
          'error',
          15000
        );
      }
      
      // Remove the deleted conversations from the state
      for (const id of result.results.success) {
        const index = state.selectedForDeletion.indexOf(id);
        if (index > -1) {
          state.selectedForDeletion.splice(index, 1);
        }
        
        // Also remove from cached conversations to update the UI immediately
        const cachedIndex = state.cachedConversations.findIndex(conv => conv.id === id);
        if (cachedIndex > -1) {
          state.cachedConversations.splice(cachedIndex, 1);
        }
      }
      
      // Update the deletion counters
      window.updateButtonsVisibility();
      
      // Check if we're in a filtered view
      const currentFilter = state.currentCategoryFilter;
      
      if (currentFilter) {
        // Count how many conversations remain that match the current filter
        const remainingInFilter = state.cachedConversations.filter(conv => 
          conv.category === currentFilter || conv.category?.includes(currentFilter)
        );
        
        // If there are no more conversations in the current filter, clear the filter and show all conversations
        if (remainingInFilter.length === 0) {
          console.log('No more conversations in the current filter. Showing all conversations.');
          state.currentCategoryFilter = null;
          
          // Update any UI elements that show the current filter
          const filterNotice = document.querySelector('.filter-notice');
          if (filterNotice) {
            filterNotice.remove();
          }
          
          // Show full list
          window.loadConversations(0, state.pageSize);
        } else {
          console.log(`${remainingInFilter.length} conversations still in category "${currentFilter}". Keeping filter active.`);
          
          // Filter the conversation list to only show items in the current filter
          const filteredConversations = state.cachedConversations.filter(conv => 
            conv.category === currentFilter || conv.category?.includes(currentFilter)
          );
          
          // Update the filter notice count
          const filterCountElement = document.querySelector('.filter-count');
          if (filterCountElement) {
            filterCountElement.textContent = `${remainingInFilter.length} ${remainingInFilter.length === 1 ? 'conversation' : 'conversations'}`;
          }
          
          // Render the filtered list
          window.renderConversations(filteredConversations);
        }
      } else {
        // If not filtered, just refresh the conversation list to reflect changes
        window.renderConversations(state.cachedConversations);
      }
    } else {
      // Show error notification
      window.createNotification(
        `Error deleting conversations: ${result.error}`,
        'Delete Failed',
        'error'
      );
    }
  } catch (error) {
    console.error('Error during delete operation:', error);
    
    // Hide loading indicators
    if (conversationsLoading) conversationsLoading.classList.add('hidden');
    if (progressContainer) progressContainer.classList.add('hidden');
    
    // Show error notification
    window.createNotification(
      `Error deleting conversations: ${error.message}`,
      'Delete Failed',
      'error'
    );
  } finally {
    // Unregister the progress event listener
    ipcRenderer.removeListener('delete-progress', progressListener);
    
    // Re-enable all action buttons
    enableActionButtons();
  }
}

/**
 * Disable all action buttons during operations
 */
function disableActionButtons() {
  const bulkArchiveButton = document.getElementById('bulkArchiveButton');
  const bulkDeleteButton = document.getElementById('bulkDeleteButton');
  const deleteCounter = document.getElementById('deleteCounter');
  const archiveCounter = document.getElementById('archiveCounter');
  
  if (bulkArchiveButton) bulkArchiveButton.style.pointerEvents = 'none';
  if (bulkDeleteButton) bulkDeleteButton.style.pointerEvents = 'none';
  if (deleteCounter) deleteCounter.style.pointerEvents = 'none';
  if (archiveCounter) archiveCounter.style.pointerEvents = 'none';
}

/**
 * Re-enable all action buttons after operations
 */
function enableActionButtons() {
  const bulkArchiveButton = document.getElementById('bulkArchiveButton');
  const bulkDeleteButton = document.getElementById('bulkDeleteButton');
  const deleteCounter = document.getElementById('deleteCounter');
  const archiveCounter = document.getElementById('archiveCounter');
  
  if (bulkArchiveButton) bulkArchiveButton.style.pointerEvents = 'auto';
  if (bulkDeleteButton) bulkDeleteButton.style.pointerEvents = 'auto';
  if (deleteCounter) deleteCounter.style.pointerEvents = 'auto';
  if (archiveCounter) archiveCounter.style.pointerEvents = 'auto';
}

/**
 * Initialize conversation operations
 * @param {Object} state - Global application state
 */
function initOperations(state) {
  // Register the global functions
  window.archiveSelectedConversations = () => archiveSelectedConversations(state);
  window.deleteSelectedConversations = () => deleteSelectedConversations(state);
  window.showConfirmationDialog = showConfirmationDialog;
}

module.exports = {
  initOperations,
  archiveSelectedConversations,
  deleteSelectedConversations,
  disableActionButtons,
  enableActionButtons
};