---
title: SimonSays42 — Content Workflow
status: published
order: 30
author: both
created: 2026-03-11
updated: 2026-03-12
---

# SimonSays42 — Content Workflow

How to write, publish, and manage blog posts on simonsays42.com.

## Writing a new post

### 1. Create the markdown file

Create a new file in `site/content/posts/` with a descriptive kebab-case filename:

```
site/content/posts/my-new-post-title.md
```

### 2. Add frontmatter

Every post starts with YAML frontmatter between `---` delimiters:

```yaml
---
title: "My New Post Title"
date: 2026-03-11
draft: false
tags: ["technology", "ai"]
categories: ["Blog"]
summary: "A brief description that appears on the blog listing page."
cover:
  image: "images/my-cover-image.jpg"
  alt: "Description of the cover image"
  hidden: false
---
```

| Field | Required | Purpose |
|---|---|---|
| `title` | Yes | Post title — displayed on the page and in listings |
| `date` | Yes | Publication date — controls sort order |
| `draft` | No | Set to `true` to hide from the live site (default: false) |
| `tags` | No | Topic tags — displayed on the post and used for tag pages |
| `categories` | No | Category grouping |
| `summary` | No | Excerpt shown on the blog listing page |
| `cover.image` | No | Path to featured image (relative to `static/`) |
| `cover.alt` | No | Alt text for the cover image |
| `cover.hidden` | No | Set to `true` to hide cover on the post page (still shows in listings) |

### 3. Write the content

Write in standard markdown below the frontmatter. Hugo uses Goldmark with unsafe HTML enabled, so raw HTML works if needed.

#### Inline images

Reference images stored in `site/static/images/`:

```markdown
![Alt text](/images/my-photo.jpg)
```

The path starts with `/images/` (not `images/` or `static/images/`). Hugo maps `static/` to the site root, so `static/images/photo.jpg` becomes `/images/photo.jpg` in the built site.

#### Links

Standard markdown links:

```markdown
[Link text](https://example.com)
[Another post](/posts/my-other-post/)
```

Internal links use Hugo's pretty URL format: `/posts/{slug}/` where the slug is the filename without `.md`.

### 4. Add images

Place image files in `site/static/images/`. Supported formats: JPG, JPEG, PNG, GIF, SVG, WebP.

Keep filenames descriptive and kebab-case:
- Good: `tasmania-mtb-trail-view.jpg`
- Avoid: `IMG_03751.png`, `screenshot-2025-04-05-at-5.39.04pm.png`

When migrating from WordPress, the exported filenames are often hashed or camera-generated. These work fine but are harder to manage long-term.

## Publishing

### Local preview

Test the site locally before deploying:

```bash
cd site
hugo server
```

This starts a local server at `http://localhost:1313` with live reload. Changes to markdown files appear instantly.

### Deploy to NAS

1. Rsync the updated site files to the NAS:

```bash
rsync -avz --delete --exclude '.git' --exclude 'public' --exclude 'resources' \
  ~/Documents/Claude/simonsays42/site/ nas:/share/Container/simonsays42/
```

2. Rebuild on the NAS:

```bash
ssh nas "cd /share/Container/simonsays42 && ./rebuild.sh"
```

The rebuild script stops the container, rebuilds with `docker compose build --no-cache blog`, and restarts. The site is live within a few seconds.

### Verify

- **LAN:** `http://192.168.86.18:8090`
- **Public:** `https://simonsays42.com` (once DNS is pointed)

## Editing an existing post

1. Edit the markdown file in `site/content/posts/`
2. Preview locally with `hugo server` if desired
3. Rsync to NAS and run `rebuild.sh`

Hugo regenerates the entire site on each build. There is no incremental publish — every rebuild produces a fresh set of HTML files from all content.

## Draft posts

Set `draft: true` in frontmatter to exclude a post from the built site:

```yaml
---
title: "Work in Progress"
date: 2026-03-11
draft: true
---
```

Draft posts are visible in local preview with `hugo server -D` (the `-D` flag includes drafts) but are excluded from production builds.

## Pages (non-post content)

Pages like About and Contact live directly in `site/content/`:

```
site/content/about.md
site/content/contact.md
site/content/search.md
```

These use the same frontmatter format but are not listed in the blog feed. The Search page uses PaperMod's built-in search layout (powered by Fuse.js and the JSON output format).

## Content authoring with Claude

The simplest workflow for new posts:

1. Describe what you want to write about or dictate your thoughts
2. Ask Claude to format it as a Hugo markdown file with correct frontmatter
3. Review and refine the draft
4. Save to `site/content/posts/`
5. Deploy using the steps above

For longer or more considered posts, use the `blog-workshop` skill which guides through audience, tone, key points, and iterative drafting.

## File reference

| Path | Purpose |
|---|---|
| `site/content/posts/` | All blog posts (29 files) |
| `site/content/about.md` | About page |
| `site/content/contact.md` | Contact page |
| `site/content/search.md` | Search page |
| `site/static/images/` | All images (127 files) |
| `site/hugo.toml` | Site configuration |
| `site/themes/PaperMod/` | Theme files (do not edit directly) |
| `site/layouts/` | Layout overrides (takes precedence over theme) |
| `site/archetypes/` | Content templates for `hugo new` |
