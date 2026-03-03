// services/vault-config.js
// Vault directory configuration and path helpers.

'use strict';

const path = require('path');
const fs = require('fs');

const VAULT_DIR = process.env.VAULT_DIR || '';

/**
 * Check whether vault is configured and the directory exists.
 * @returns {boolean}
 */
function isVaultEnabled() {
  if (!VAULT_DIR) return false;
  try {
    return fs.statSync(VAULT_DIR).isDirectory();
  } catch {
    return false;
  }
}

/**
 * Resolve a vault-relative path to an absolute path.
 * @param {string} relativePath  e.g. 'work/job-search/scoring.md'
 * @returns {string}
 */
function resolveVaultPath(relativePath) {
  return path.join(VAULT_DIR, relativePath);
}

/**
 * Strip VAULT_DIR prefix to get a relative path.
 * @param {string} absolutePath
 * @returns {string}
 */
function toRelativePath(absolutePath) {
  return path.relative(VAULT_DIR, absolutePath);
}

module.exports = { VAULT_DIR, isVaultEnabled, resolveVaultPath, toRelativePath };
