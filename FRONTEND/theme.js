// theme.js - Global Theme Management for LiveQuiz+
// Handles dark/light mode toggle with localStorage persistence

/**
 * Initialize theme on page load
 * Reads from localStorage and applies saved theme
 */
function initTheme() {
  const savedTheme = localStorage.getItem('theme') || 'light';
  document.body.setAttribute('data-theme', savedTheme);
  updateToggleButton(savedTheme);
}

/**
 * Toggle between light and dark themes
 */
function toggleTheme() {
  const currentTheme = document.body.getAttribute('data-theme') || 'light';
  const newTheme = currentTheme === 'light' ? 'dark' : 'light';
  
  document.body.setAttribute('data-theme', newTheme);
  localStorage.setItem('theme', newTheme);
  updateToggleButton(newTheme);
}

/**
 * Update the toggle button icon based on current theme
 * @param {string} theme - Current theme ('light' or 'dark')
 */
function updateToggleButton(theme) {
  const toggleBtn = document.getElementById('theme-toggle');
  if (toggleBtn) {
    toggleBtn.innerHTML = theme === 'light' ? '🌙' : '☀️';
    toggleBtn.setAttribute('title', theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode');
  }
}

/**
 * Create and inject theme toggle button into the page
 * Call this function after DOM is loaded
 */
function createThemeToggle() {
  // Check if button already exists
  if (document.getElementById('theme-toggle')) {
    return;
  }

  // Create toggle button
  const toggleBtn = document.createElement('button');
  toggleBtn.id = 'theme-toggle';
  toggleBtn.className = 'theme-toggle-btn';
  toggleBtn.onclick = toggleTheme;
  toggleBtn.setAttribute('aria-label', 'Toggle theme');
  
  // Style the button
  toggleBtn.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    width: 50px;
    height: 50px;
    border-radius: 50%;
    border: 2px solid var(--text-primary, #333);
    background: var(--bg-primary, white);
    font-size: 24px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    transition: transform 0.2s, box-shadow 0.2s;
    z-index: 9999;
  `;

  // Add hover effect
  toggleBtn.onmouseenter = () => {
    toggleBtn.style.transform = 'scale(1.1)';
    toggleBtn.style.boxShadow = '0 6px 16px rgba(0, 0, 0, 0.2)';
  };
  
  toggleBtn.onmouseleave = () => {
    toggleBtn.style.transform = 'scale(1)';
    toggleBtn.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
  };

  // Insert into navbar if it exists, otherwise into body
  const navbar = document.querySelector('.navbar');
  if (navbar) {
    // Create a container for the button in navbar
    const btnContainer = document.createElement('div');
    btnContainer.style.cssText = 'margin-left: auto; padding: 0 10px;';
    btnContainer.appendChild(toggleBtn);
    
    // Adjust button style for navbar
    toggleBtn.style.position = 'relative';
    toggleBtn.style.top = 'auto';
    toggleBtn.style.right = 'auto';
    toggleBtn.style.width = '40px';
    toggleBtn.style.height = '40px';
    toggleBtn.style.fontSize = '20px';
    
    navbar.appendChild(btnContainer);
  } else {
    document.body.appendChild(toggleBtn);
  }

  // Set initial icon
  const currentTheme = document.body.getAttribute('data-theme') || 'light';
  updateToggleButton(currentTheme);
}

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    createThemeToggle();
  });
} else {
  initTheme();
  createThemeToggle();
}
