// tests/frontmatter.test.js
// Unit tests for frontmatter parsing, serialization, and column mapping.

'use strict';

const { parseFrontmatter, serializeFrontmatter, mapFrontmatterToColumns } = require('../services/frontmatter');

// ── parseFrontmatter ────────────────────────────────────────

describe('parseFrontmatter', () => {
  test('extracts valid YAML frontmatter and strips it from body', () => {
    const content = '---\nstatus: draft\norder: 5\n---\n\n# Hello\n\nBody text.';
    const result = parseFrontmatter(content);

    expect(result.data).toEqual({ status: 'draft', order: 5 });
    expect(result.content).toBe('\n# Hello\n\nBody text.');
  });

  test('returns empty data and full content when no frontmatter', () => {
    const content = '# No frontmatter\n\nJust body text.';
    const result = parseFrontmatter(content);

    expect(result.data).toEqual({});
    expect(result.content).toBe(content);
  });

  test('handles empty frontmatter block', () => {
    const content = '---\n---\n\nBody after empty frontmatter.';
    const result = parseFrontmatter(content);

    expect(result.data).toEqual({});
    expect(result.content).toContain('Body after empty frontmatter.');
  });

  test('handles malformed YAML gracefully', () => {
    const content = '---\ninvalid: [\n---\n\nBody text.';
    const result = parseFrontmatter(content);

    expect(result.data).toEqual({});
    expect(result.content).toBe(content);
  });

  test('handles null/undefined input', () => {
    expect(parseFrontmatter(null)).toEqual({ data: {}, content: '' });
    expect(parseFrontmatter(undefined)).toEqual({ data: {}, content: '' });
    expect(parseFrontmatter('')).toEqual({ data: {}, content: '' });
  });

  test('parses all supported frontmatter fields', () => {
    const content = [
      '---',
      'title: Architecture Overview',
      'status: published',
      'order: 10',
      'author: claude',
      'parent: overview',
      'created: 2026-03-01',
      'updated: 2026-03-04',
      'tags: [infrastructure, deployment]',
      '---',
      '',
      '# Architecture',
    ].join('\n');

    const result = parseFrontmatter(content);
    expect(result.data.title).toBe('Architecture Overview');
    expect(result.data.status).toBe('published');
    expect(result.data.order).toBe(10);
    expect(result.data.author).toBe('claude');
    expect(result.data.parent).toBe('overview');
    expect(result.data.tags).toEqual(['infrastructure', 'deployment']);
    expect(result.content).toBe('\n# Architecture');
  });

  test('does not match --- in the middle of content', () => {
    const content = '# Title\n\nSome text\n---\nstatus: draft\n---\n\nMore text.';
    const result = parseFrontmatter(content);

    expect(result.data).toEqual({});
    expect(result.content).toBe(content);
  });
});

// ── serializeFrontmatter ────────────────────────────────────

describe('serializeFrontmatter', () => {
  test('generates valid YAML frontmatter with body', () => {
    const result = serializeFrontmatter({ status: 'draft', order: 10 }, '# Hello');

    expect(result).toContain('---\n');
    expect(result).toContain('status: draft');
    expect(result).toContain('order: 10');
    expect(result).toContain('# Hello');
  });

  test('returns body unchanged when metadata is empty', () => {
    expect(serializeFrontmatter({}, '# Hello')).toBe('# Hello');
  });

  test('filters out null and undefined values', () => {
    const result = serializeFrontmatter({ status: 'draft', order: null, author: undefined }, '# Hello');

    expect(result).toContain('status: draft');
    expect(result).not.toContain('order');
    expect(result).not.toContain('author');
  });

  test('returns body when metadata is null', () => {
    expect(serializeFrontmatter(null, '# Hello')).toBe('# Hello');
  });

  test('round-trips correctly with parseFrontmatter', () => {
    const original = { status: 'draft', order: 20 };
    const body = '# Round Trip Test\n\nContent here.';

    const serialized = serializeFrontmatter(original, body);
    const parsed = parseFrontmatter(serialized);

    expect(parsed.data.status).toBe('draft');
    expect(parsed.data.order).toBe(20);
    expect(parsed.content).toBe('\n' + body);
  });
});

// ── mapFrontmatterToColumns ─────────────────────────────────

describe('mapFrontmatterToColumns', () => {
  test('maps order to sort_order', () => {
    const result = mapFrontmatterToColumns({ order: 30 });
    expect(result.sort_order).toBe(30);
  });

  test('maps author to created_by', () => {
    const result = mapFrontmatterToColumns({ author: 'claude' });
    expect(result.created_by).toBe('claude');
  });

  test('maps status directly', () => {
    const result = mapFrontmatterToColumns({ status: 'archived' });
    expect(result.status).toBe('archived');
  });

  test('rejects invalid status values', () => {
    const result = mapFrontmatterToColumns({ status: 'invalid' });
    expect(result.status).toBeUndefined();
  });

  test('rejects invalid author values', () => {
    const result = mapFrontmatterToColumns({ author: 'admin' });
    expect(result.created_by).toBeUndefined();
  });

  test('maps title directly', () => {
    const result = mapFrontmatterToColumns({ title: 'Custom Title' });
    expect(result.title).toBe('Custom Title');
  });

  test('parses ISO date for created', () => {
    const result = mapFrontmatterToColumns({ created: '2026-03-01' });
    expect(result.created_at).toBeDefined();
    expect(new Date(result.created_at).getFullYear()).toBe(2026);
  });

  test('stores parent slug as _parent_slug', () => {
    const result = mapFrontmatterToColumns({ parent: 'overview' });
    expect(result._parent_slug).toBe('overview');
  });

  test('handles order: 0 correctly', () => {
    const result = mapFrontmatterToColumns({ order: 0 });
    expect(result.sort_order).toBe(0);
  });

  test('returns empty object for empty input', () => {
    expect(mapFrontmatterToColumns({})).toEqual({});
  });
});
