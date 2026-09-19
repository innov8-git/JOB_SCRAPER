/**
 * Curated list of tech skills to match against job descriptions.
 */
const SKILL_KEYWORDS = [
  'React', 'TypeScript', 'JavaScript', 'Node.js', 'Python', 'Java',
  'SQL', 'MongoDB', 'AWS', 'Docker', 'Kubernetes', 'Git', 'GraphQL',
  'REST', 'Redux', 'Next.js', 'Express', 'PostgreSQL', 'Redis',
  'Angular', 'Vue', 'C++', 'Go', 'Rust', 'HTML', 'CSS', 'Figma',
  'Firebase', 'Azure', 'GCP', 'Tailwind', 'Spring', 'Django',
  'Flask', 'Terraform', '.NET', 'Scala', 'Kafka', 'ElasticSearch',
  'Jenkins', 'CI/CD', 'Linux', 'Agile', 'Scrum', 'Microservices',
  'Machine Learning', 'Deep Learning', 'NLP', 'Computer Vision',
  'TensorFlow', 'PyTorch', 'Pandas', 'NumPy'
];

/**
 * Extract recognizable tech skills from a text string.
 * @param {string} text - Job description or snippet
 * @returns {string[]} - Deduplicated array of matched skills
 */
export function extractSkills(text) {
  if (!text || typeof text !== 'string') return [];

  const found = new Set();

  SKILL_KEYWORDS.forEach((skill) => {
    // Escape special regex characters in skill name
    const escaped = skill.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`\\b${escaped}\\b`, 'i');
    if (regex.test(text)) {
      found.add(skill);
    }
  });

  return Array.from(found);
}

/**
 * Extract salary information from a text string.
 * Handles formats like: ₹10-15 LPA, $80,000-$120,000, 10 LPA, etc.
 * @param {string} text - Job description or snippet
 * @returns {string|null} - Formatted salary string or null
 */
export function extractSalary(text) {
  if (!text || typeof text !== 'string') return null;

  // Match Indian LPA format: ₹10-15 LPA, 10-15 LPA, 10 LPA
  const lpaMatch = text.match(/₹?\s*(\d+(?:\.\d+)?)\s*[-–to]*\s*(\d+(?:\.\d+)?)?\s*(?:LPA|lpa|Lpa|lakhs?\s*per\s*annum|CTC)/i);
  if (lpaMatch) {
    if (lpaMatch[2]) {
      return `₹${lpaMatch[1]} - ${lpaMatch[2]} LPA`;
    }
    return `₹${lpaMatch[1]} LPA`;
  }

  // Match USD format: $80,000 - $120,000, $80K-$120K
  const usdMatch = text.match(/\$\s*(\d{1,3}(?:,\d{3})*(?:\.\d+)?[KkMm]?)\s*[-–to]*\s*\$?\s*(\d{1,3}(?:,\d{3})*(?:\.\d+)?[KkMm]?)?(?:\s*(?:per\s*(?:year|annum|month)|\/(?:yr|mo|year|month)|annually|monthly))?/i);
  if (usdMatch) {
    if (usdMatch[2]) {
      return `$${usdMatch[1]} - $${usdMatch[2]}`;
    }
    return `$${usdMatch[1]}`;
  }

  // Match EUR format
  const eurMatch = text.match(/€\s*(\d{1,3}(?:,\d{3})*(?:\.\d+)?[KkMm]?)\s*[-–to]*\s*€?\s*(\d{1,3}(?:,\d{3})*(?:\.\d+)?[KkMm]?)?/i);
  if (eurMatch) {
    if (eurMatch[2]) {
      return `€${eurMatch[1]} - €${eurMatch[2]}`;
    }
    return `€${eurMatch[1]}`;
  }

  // Match generic "per month" / "per annum" with rupee
  const genericMatch = text.match(/(?:₹|Rs\.?|INR)\s*(\d[\d,]*(?:\.\d+)?)\s*[-–to]*\s*(?:₹|Rs\.?|INR)?\s*(\d[\d,]*(?:\.\d+)?)?\s*(?:per\s*(?:month|annum)|\/\s*(?:month|annum)|p\.?[am]\.?)/i);
  if (genericMatch) {
    if (genericMatch[2]) {
      return `₹${genericMatch[1]} - ₹${genericMatch[2]}`;
    }
    return `₹${genericMatch[1]}`;
  }

  return null;
}
