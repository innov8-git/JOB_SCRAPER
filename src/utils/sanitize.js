/**
 * Sanitize user input to prevent SQL injection-style patterns.
 * Strips dangerous characters, SQL keywords, and collapses whitespace.
 */
export function sanitize(input) {
  if (!input || typeof input !== 'string') return '';

  let cleaned = input;

  // Remove dangerous characters and sequences
  cleaned = cleaned.replace(/['"`;]/g, '');
  cleaned = cleaned.replace(/--/g, '');
  cleaned = cleaned.replace(/\/\*/g, '');
  cleaned = cleaned.replace(/\*\//g, '');

  // Remove SQL keywords (case-insensitive, whole words)
  const sqlKeywords = ['EXEC', 'UNION', 'SELECT', 'DROP', 'INSERT', 'DELETE', 'UPDATE', 'ALTER', 'CREATE', 'TABLE'];
  sqlKeywords.forEach((keyword) => {
    const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
    cleaned = cleaned.replace(regex, '');
  });

  // Trim and collapse multiple spaces into one
  cleaned = cleaned.replace(/\s+/g, ' ').trim();

  return cleaned;
}
