/**
 * Theme Management for Quotation Scanner
 * Handles dark/light mode switching with localStorage persistence
 * and system preference detection
 */

const THEME_KEY = 'quotation-scanner-theme';

/**
 * Get user's theme preference
 * Priority: localStorage > system preference > default light
 */
function getThemePreference() {
  const stored = localStorage.getItem(THEME_KEY);
  if (stored) {
    return stored;
  }

  if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
    return 'dark';
  }

  return 'light';
}

/**
 * Apply theme to document and save preference
 */
function setTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem(THEME_KEY, theme);
  updateThemeToggleIcon(theme);
}

/**
 * Toggle between light and dark themes
 */
function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme') || 'light';
  const next = current === 'light' ? 'dark' : 'light';
  setTheme(next);
}

/**
 * Update the theme toggle button icon based on current theme
 * Shows sun icon in dark mode, moon icon in light mode
 */
function updateThemeToggleIcon(theme) {
  const toggleButton = document.getElementById('themeToggle');
  if (!toggleButton) return;

  const sunIcon = `
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="10" cy="10" r="3.5" fill="currentColor"/>
      <line x1="10" y1="2" x2="10" y2="4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
      <line x1="10" y1="16" x2="10" y2="18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
      <line x1="18" y1="10" x2="16" y2="10" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
      <line x1="4" y1="10" x2="2" y2="10" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
      <line x1="15.5" y1="4.5" x2="14.2" y2="5.8" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
      <line x1="5.8" y1="14.2" x2="4.5" y2="15.5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
      <line x1="15.5" y1="15.5" x2="14.2" y2="14.2" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
      <line x1="5.8" y1="5.8" x2="4.5" y2="4.5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
    </svg>
  `;

  const moonIcon = `
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M17 11.5C17 15.366 13.866 18.5 10 18.5C6.13401 18.5 3 15.366 3 11.5C3 9.5 3.5 7.5 4.5 6C4 6.5 4 7 4 8C4 11.866 7.13401 15 11 15C13 15 15 14 16 12.5C16.5 13.5 17 14.5 17 15.5C17 13.5 17 12.5 17 11.5Z" fill="currentColor"/>
    </svg>
  `;

  toggleButton.innerHTML = theme === 'dark' ? sunIcon : moonIcon;
  toggleButton.setAttribute('aria-label', `Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`);
}

/**
 * Initialize theme on page load
 * Must be called early to prevent flash of wrong theme
 */
function initTheme() {
  const theme = getThemePreference();
  document.documentElement.setAttribute('data-theme', theme);
  updateThemeToggleIcon(theme);
}

/**
 * Listen for system theme preference changes
 * Only auto-switch if user hasn't set manual preference
 */
function setupSystemThemeListener() {
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
    if (!localStorage.getItem(THEME_KEY)) {
      setTheme(e.matches ? 'dark' : 'light');
    }
  });
}

/**
 * Setup theme toggle button click handler
 */
function setupThemeToggle() {
  const toggleButton = document.getElementById('themeToggle');
  if (toggleButton) {
    toggleButton.addEventListener('click', toggleTheme);
  }
}

/**
 * Initialize everything when DOM is ready
 */
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
    updateThemeToggleIcon(currentTheme);
    setupThemeToggle();
    setupSystemThemeListener();
  });
} else {
  const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
  updateThemeToggleIcon(currentTheme);
  setupThemeToggle();
  setupSystemThemeListener();
}

// Export for inline script usage
if (typeof window !== 'undefined') {
  window.initTheme = initTheme;
}
