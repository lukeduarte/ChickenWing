# my site

A tiny, dependency-free static site: home links, an about page, and a writings section generated from plain `.txt` files.

## Edit things

| What | Where |
| --- | --- |
| Name, tagline, location, email, music links | `site.json` |
| About page text | `content/about.txt` (blank line = new paragraph) |
| Stars/moons/planets sprinkled around the home page | `content/sky.txt` (pieces separated by a line containing only `---`) |
| Transmitter (top right) and receiver (bottom left) | `content/transmitter.txt`, `content/receiver.txt` |
| Colors, fonts, spacing | `static/style.css` |
| Poems | `writings/*.txt` |

## Adding a poem

Drop a `.txt` file in `writings/` and push to GitHub. Coolify rebuilds and the poem appears.

- **Filename** becomes the URL: `writings/2026-11-09-first-snow.txt` -> `/writings/first-snow/`
- **Date** (optional): start the filename with `YYYY-MM-DD-`. Dated poems are listed newest first.
- **Title** (optional): if the first line is `# My Title`, that's the title. Otherwise the title comes from the filename (`first-snow` -> "first snow").
- Line breaks and spacing in the file are preserved exactly.

## Preview locally

```
node build.js
npx serve dist
```

## Deploy on Hetzner with Coolify

1. Push this folder to a GitHub repo.
2. In Coolify: **Project -> New Resource -> Public/Private Repository** (use the GitHub App or a deploy key for private repos).
3. Pick the repo and branch. Set **Build Pack** to **Dockerfile**.
4. Set **Ports Exposes** to `80`.
5. Under **Domains**, enter your domain (e.g. `https://yourdomain.com`). Point an `A` record for it at your Hetzner server's IP. Coolify handles HTTPS automatically.
6. Deploy. For auto-deploys on every push, enable the webhook in the application's **Webhooks** tab and add it in your GitHub repo's settings (Settings -> Webhooks), or use the GitHub App integration.
