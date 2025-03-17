// src/utils/element-cache.js - Element caching utilities

// Element cache to avoid repeated DOM lookups
const elementCache = new Map();

/**
 * Get an element by ID, using cache to avoid repeated DOM lookups
 * @param {string} id - Element ID to look up
 * @returns {HTMLElement|null} - The found element or null
 */
function getElement(id) {
  if (!elementCache.has(id)) {
    const element = document.getElementById(id);
    if (element) {
      elementCache.set(id, element);
    } else {
      console.warn(`Element with ID "${id}" not found`);
      return null;
    }
  }
  return elementCache.get(id);
}

/**
 * Clears the element cache - use when elements are dynamically removed/changed
 */
function clearElementCache() {
  elementCache.clear();
}

/**
 * Initialize element cache for the application
 */
function initElementCache() {
  // Attach the element cache functions to the window for global use
  window.getElement = getElement;
  window.clearElementCache = clearElementCache;
}

module.exports = {
  initElementCache,
  getElement,
  clearElementCache
};