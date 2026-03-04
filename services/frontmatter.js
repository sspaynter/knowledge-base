// services/frontmatter.js
// YAML frontmatter parsing and serialization for vault .md files.

'use strict';

const yaml = require('js-yaml');

const FRONTMATTER_RE = /^---\r?\n([\s\S]*?)(?:\r?\n)?---(?:\r?\n)?/;

/**
 * Parse YAML frontmatter from markdown content.
 * Returns { data: {parsed fields}, content: body without frontmatter }.
 * Gracefully handles missing or malformed frontmatter.
 */
function parseFrontmatter(content) {
  if (!content || typeof content !== 'string') {
    return { data: {}, content: content || '' };
  }

  const match = content.match(FRONTMATTER_RE);
  if (!match) {
    return { data: {}, content };
  }

  try {
    const data = yaml.load(match[1]) || {};
    const body = content.slice(match[0].length);
    return { data, content: body };
  } catch {
    // Malformed YAML — return content unchanged
    return { data: {}, content };
  }
}

/**
 * Serialize metadata as YAML frontmatter + body.
 * Filters out null/undefined values. Returns body unchanged if metadata is empty.
 */
function serializeFrontmatter(metadata, body) {
  if (!metadata || typeof metadata !== 'object') return body || '';

  // Filter out null, undefined, and empty values
  const filtered = {};
  for (const [key, value] of Object.entries(metadata)) {
    if (value !== null && value !== undefined && value !== '') {
      filtered[key] = value;
    }
  }

  if (Object.keys(filtered).length === 0) return body || '';

  const yamlStr = yaml.dump(filtered, { lineWidth: -1, sortKeys: true }).trimEnd();
  return `---\n${yamlStr}\n---\n\n${body || ''}`;
}

/**
 * Map frontmatter keys to DB column names and values.
 * Only includes fields that are present and valid.
 */
function mapFrontmatterToColumns(data) {
  const columns = {};

  if (data.title && typeof data.title === 'string') {
    columns.title = data.title;
  }

  if (data.status && ['published', 'draft', 'archived'].includes(data.status)) {
    columns.status = data.status;
  }

  if (data.author && ['claude', 'user', 'both'].includes(data.author)) {
    columns.created_by = data.author;
  }

  if (data.order !== undefined && data.order !== null) {
    const order = parseInt(data.order, 10);
    if (!isNaN(order)) {
      columns.sort_order = order;
    }
  }

  if (data.created) {
    const d = new Date(data.created);
    if (!isNaN(d.getTime())) {
      columns.created_at = d.toISOString();
    }
  }

  if (data.updated) {
    const d = new Date(data.updated);
    if (!isNaN(d.getTime())) {
      columns.updated_at = d.toISOString();
    }
  }

  // parent slug → resolved later (needs DB lookup)
  if (data.parent && typeof data.parent === 'string') {
    columns._parent_slug = data.parent;
  }

  return columns;
}

module.exports = { parseFrontmatter, serializeFrontmatter, mapFrontmatterToColumns };
