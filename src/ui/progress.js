// src/ui/progress.js - Progress bar functionality

/**
 * Initialize progress bar functionality
 */
function initProgress() {
  const progressBar = document.getElementById('progressBar');
  const progressText = document.getElementById('progressText');
  
  // Make update progress bar function available globally
  window.updateProgressBar = function(percentage) {
    progressBar.style.width = `${percentage}%`;
    progressText.textContent = `${Math.round(percentage)}%`;
  };
}

module.exports = {
  initProgress
};