/**
 * Returns a color string for the given job platform.
 * @param {string} platform - "LinkedIn" | "Naukri" | "Monster"
 * @returns {string} CSS color value
 */
export function getPlatformColor(platform) {
  const colors = {
    LinkedIn: '#0a66c2',
    Naukri: '#0dbab1',
    Monster: '#6e38b9',
  };
  return colors[platform] || '#666';
}

/**
 * Returns a background gradient for the given platform.
 * @param {string} platform - "LinkedIn" | "Naukri" | "Monster"
 * @returns {string} CSS gradient
 */
export function getPlatformGradient(platform) {
  const gradients = {
    LinkedIn: 'linear-gradient(135deg, #0a66c2, #004182)',
    Naukri: 'linear-gradient(135deg, #0dbab1, #068a82)',
    Monster: 'linear-gradient(135deg, #8544e7, #54229d)',
  };
  return gradients[platform] || 'linear-gradient(135deg, #666, #444)';
}

/**
 * Open a job URL in a new browser tab.
 * @param {string} jobUrl - The URL to open
 */
export function handleJobClick(jobUrl) {
  if (jobUrl) {
    window.open(jobUrl, '_blank', 'noopener,noreferrer');
  }
}
