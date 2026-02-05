/**
 * Hawk Authentication Module for Absence.io API
 * 
 * Generates Hawk authorization headers for API requests.
 * See: https://docs.absence.io/#authentication
 */

const Hawk = require('hawk');

/**
 * Create Hawk credentials object from environment variables
 * @returns {Object} Hawk credentials
 */
function getCredentials() {
  const id = process.env.ABSENCE_API_ID;
  const key = process.env.ABSENCE_API_KEY;
  
  if (!id || !key) {
    throw new Error('Missing ABSENCE_API_ID or ABSENCE_API_KEY environment variables');
  }
  
  return {
    id,
    key,
    algorithm: 'sha256'
  };
}

/**
 * Generate Hawk authorization header for a request
 * @param {string} url - Full URL of the API request
 * @param {string} method - HTTP method (GET, POST, PUT, DELETE)
 * @param {Object} options - Additional options
 * @returns {Object} Object containing the Authorization header
 */
function generateAuthHeader(url, method, options = {}) {
  const credentials = getCredentials();
  
  const hawkOptions = {
    credentials,
    ...options
  };
  
  const { header } = Hawk.client.header(url, method, hawkOptions);
  
  return {
    'Authorization': header,
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  };
}

module.exports = {
  generateAuthHeader,
  getCredentials
};
