/**
 * utils/index.js
 *
 * Shared utility helpers used across controllers and services.
 */

/**
 * Build a public URL for an uploaded file.
 * @param {import('express').Request} req
 * @param {string|null} filePath  — relative path stored in DB
 * @returns {string|null}
 */
function buildFileUrl(req, filePath) {
  if (!filePath) return null;
  return `${req.protocol}://${req.get('host')}/uploads/${filePath}`;
}

/**
 * Format a decimal price to 2 decimal places.
 * @param {number|string} price
 * @returns {string}
 */
function formatPrice(price) {
  return parseFloat(price || 0).toFixed(2);
}

/**
 * Safely parse a positive integer from a query param.
 * @param {string|undefined} value
 * @param {number} defaultVal
 * @param {number} [min=1]
 * @returns {number}
 */
function parsePositiveInt(value, defaultVal, min = 1) {
  const n = parseInt(value || String(defaultVal), 10);
  return isNaN(n) ? defaultVal : Math.max(min, n);
}

module.exports = { buildFileUrl, formatPrice, parsePositiveInt };
