# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Personal site + Russian-language blog of Artem Bolotov (bolotov.dev), built with Jekyll and deployed to GitHub Pages. All content, UI text, and commit-facing copy are in Russian.

## Build and deploy

- There is no Gemfile. The site is built by GitHub Actions (`.github/workflows/jekyll-gh-pages.yml`) using `actions/jekyll-build-pages` (the `github-pages` gem environment) on every push to `main`.
- Local preview requires Jekyll with the `jekyll-seo-tag` and `jekyll-sitemap` plugins (easiest: `gem install github-pages`), then `jekyll serve`.
- No tests, no linters.
- `future: true` in `_config.yml`: future-dated posts are built and published.

## Content model

- Posts live in `blog/_posts/` (not the root `_posts/`, which is empty). Filename date defines the URL: `/blog/:year/:month/:day/:title`.
- Post front matter: `title`, `description`, `tags` (plus defaults from `_config.yml`: layout `post`, author, image).
- **Drafts are a custom convention, not Jekyll drafts**: `draft: true` in front matter. The post still builds (its URL is live), but listing pages skip it, and series pages show it greyed-out as "выйдет <date>" (`.article-upcoming`).
- Tags double as sections. Each tag has a landing page `blog/<tag>/index.html` with layout `tag-page`; `series: true` in its front matter switches the layout to a numbered series listing (e.g. `blog/internet/` — the "Внутри интернета" series). Russian tag labels come from `_data/tag_translations.yml` via `_includes/tag-translations.html`; the top tag menu is a hardcoded list in `_includes/tag-menu.html`.
- The root `index.html` is a standalone single-page personal site, unrelated to the blog machinery.

## Layouts and styles

- Layout chain: `compress` ← `default` ← `post` / `tag-page`. `default.html` contains the whole page shell (nav, logo) and loads all CSS/JS.
- CSS is plain, no preprocessor: `styles/all.css` (base + nav, loaded everywhere), `styles/main.css` (homepage only), `styles/blog.css` (shared blog components: galleries, code highlighting, author footer...). New shared component styles go into `blog.css` by convention.
- Page-specific stylesheets are opt-in via front matter (see the `page.styles` loop in `default.html`): each name in `styles:` loads `/styles/<name>.css`. Interactive elements of the `internet` series are split into a shared framework (`styles/internet.css`) plus one file per component (`styles/internet-<include-name>.css`); a post using a component lists both, e.g. `styles: [internet, internet-dns-lookup]`.
- Dark theme is handled via `@media (prefers-color-scheme: dark)` blocks in each stylesheet — every new component needs one. Accent colors: `#0089ff` (dark: `#64b2ff`), hover red `#f41224` (dark: `#ff453a`).
- `html.no-js` class is removed by an inline script in `default.html`; use it for no-JavaScript fallbacks (see galleries).

## Includes (components)

- `img.html` — single image; bare filenames auto-resolve to `/blog/img/<post-slug>/<file>`.
- `gallery.html` + `scripts/gallery.js` (loaded globally), `youtube.html`, `code-block.html`, `reading-time.html`, `author-footer.html`.
- Series-specific interactive components live in subfolders named after the series tag, e.g. `_includes/internet/live-editor.html` (self-contained markup + inline JS; styles are in `styles/internet-<include-name>.css` on top of the `styles/internet.css` framework, loaded via `styles:` front matter).
- All `internet` simulators share the `sim-*` framework classes defined in `styles/internet.css`: `sim-window`/`sim-head`/`sim-title` shell, `sim-label`, `sim-actors`/`sim-actor` status pills, `sim-choices`/`sim-choice` action buttons, `sim-btn`/`sim-btn--ghost`, and the chat log `sim-log`/`sim-step` with `--right`/`--result`/`--explain`/`--hint` modifiers (dark theme included). New components should reuse these and keep only unique styles under their own prefix.

## HTML compression caveats

`compress_html` (see `_config.yml`) processes all output except in the `development` environment:
- HTML comments (`<!-- ... -->`) are stripped — don't rely on them at runtime.
- Blank lines are removed, but newlines within non-blank lines survive, so inline `<script>` blocks with `//` comments are safe; just avoid meaningful blank lines outside `<pre>`.

## Markdown conventions in posts

- External links: `[text](url){:target="_blank" rel="noopener"}` (kramdown IAL).
- Ordered lists use repeated `1.` markers.
- iOS Safari quirk to respect in interactive elements: form fields need `font-size: 16px`+ on mobile to avoid focus auto-zoom (see `.live-editor-input`).
