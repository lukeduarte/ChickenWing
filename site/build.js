// Zero-dependency static site generator.
// Reads site.json, content/*.txt and writings/*.txt, writes everything to dist/.
const fs = require("fs");
const path = require("path");

const ROOT = __dirname;
const DIST = path.join(ROOT, "dist");
const site = JSON.parse(fs.readFileSync(path.join(ROOT, "site.json"), "utf8"));

const esc = (s) =>
  String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

const read = (p) => fs.readFileSync(p, "utf8").replace(/\r\n/g, "\n");

function page({ title, body, description, depth = 0, bodyClass = "" }) {
  const css = (depth ? "../".repeat(depth) : "") + "style.css";
  const fullTitle = title ? `${title} | ${site.name}` : site.name;
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(fullTitle)}</title>
<meta name="description" content="${esc(description || site.tagline)}">
<link rel="stylesheet" href="${css}">
</head>
<body${bodyClass ? ` class="${bodyClass}"` : ""}>
${body}
</body>
</html>
`;
}

function header(depth, rule = true) {
  const home = depth ? "../".repeat(depth) : "./";
  return `<header>
<p class="name"><a href="${home}" data-text="${esc(site.name)}">${esc(site.name)}</a></p>
<p class="dim">${esc(site.location)}</p>
</header>${rule ? "\n<hr>" : ""}`;
}

function write(rel, html) {
  const out = path.join(DIST, rel);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, html);
}

// ---- load writings ----
function loadWritings() {
  const dir = path.join(ROOT, "writings");
  if (!fs.existsSync(dir)) return [];
  const items = [];
  for (const file of fs.readdirSync(dir)) {
    if (!file.toLowerCase().endsWith(".txt")) continue;
    let slug = file.replace(/\.txt$/i, "");
    let date = null;
    const m = slug.match(/^(\d{4}-\d{2}-\d{2})-(.+)$/);
    if (m) {
      date = m[1];
      slug = m[2];
    }
    let text = read(path.join(dir, file));
    let title = slug.replace(/[-_]+/g, " ");
    const first = text.split("\n")[0];
    if (first.startsWith("# ")) {
      title = first.slice(2).trim();
      text = text.split("\n").slice(1).join("\n");
    }
    text = text.replace(/^\n+/, "").replace(/\s+$/, "");
    items.push({ file, slug, date, title, text });
  }
  // newest dated first; undated sort after, alphabetically
  items.sort((a, b) => {
    if (a.date && b.date) return b.date.localeCompare(a.date) || a.slug.localeCompare(b.slug);
    if (a.date) return -1;
    if (b.date) return 1;
    return a.slug.localeCompare(b.slug);
  });
  const seen = new Set();
  for (const it of items) {
    if (seen.has(it.slug)) throw new Error(`Duplicate writing slug: ${it.slug}`);
    seen.add(it.slug);
  }
  return items;
}

const writings = loadWritings();

// ---- reset dist, copy static ----
fs.rmSync(DIST, { recursive: true, force: true });
fs.mkdirSync(DIST, { recursive: true });
for (const f of fs.readdirSync(path.join(ROOT, "static"))) {
  fs.copyFileSync(path.join(ROOT, "static", f), path.join(DIST, f));
}

// ---- home ----
const readArt = (name) => {
  const p = path.join(ROOT, "content", name);
  return fs.existsSync(p) ? read(p).replace(/^\n+|\s+$/g, "") : "";
};
// sky.txt holds small text-art pieces separated by a line containing only ---
const skyBlocks = readArt("sky.txt")
  .split(/\n---\n/)
  .map((b) => b.replace(/^\n+|\n+$/g, ""))
  .filter(Boolean);
const txArt = readArt("transmitter.txt");
const rxArt = readArt("receiver.txt");

// Seeded RNG so the "sky" is the same on every build.
function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const starLinks = [
  { label: "about", href: "about/" },
  { label: "writings", href: "writings/" },
  ...site.music.map((l) => ({ label: l.label, href: l.url, external: true })),
  { label: "contact by email", href: `mailto:${site.email}` },
].map((l) => ({ ...l, label: cap(l.label) }));

// Each link gets its own horizontal band (so they never collide), in a
// shuffled order, with a random x inside the band. Change SEED to reshuffle.
const SEED = 11;
function scatter(items) {
  const rand = rng(SEED);
  const top = 26;
  const bottom = 78;
  const band = (bottom - top) / items.length;

  const order = items.map((_, i) => i);
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }

  // x for each band, top to bottom, never too close to the band above
  const xs = [];
  for (let k = 0; k < items.length; k++) {
    let x;
    let tries = 0;
    do {
      x = 4 + rand() * 80;
      tries++;
    } while (k > 0 && Math.abs(x - xs[k - 1]) < 24 && tries < 50);
    xs.push(x);
  }

  return items.map((item, i) => {
    const k = order[i];
    const y = top + k * band + band * (0.15 + 0.55 * rand());
    const size = 0.88 + rand() * 0.22; // rem
    const opacity = 0.65 + rand() * 0.35;
    const delay = (rand() * 6).toFixed(2);
    const dur = (3 + rand() * 4).toFixed(2);
    const widthCh = ((item.label.length + 4) * 1.12).toFixed(1);
    const style =
      `left:min(${xs[k].toFixed(1)}%,calc(100% - ${widthCh}ch - 1.5rem));` +
      `top:${y.toFixed(1)}%;` +
      `--s:${size.toFixed(2)}rem;--o:${opacity.toFixed(2)};--d:${delay}s;--t:${dur}s`;
    return `<a class="star" href="${esc(item.href)}"${
      item.external ? ' rel="noopener"' : ""
    } style="${style}">${esc(item.label)}</a>`;
  });
}

// Tiny non-clickable background stars, drawn with one element + many box-shadows.
function dust(count) {
  const rand = rng(SEED + 1000);
  const tones = ["200,205,225", "170,185,170", "190,175,205"];
  const shadows = [];
  for (let i = 0; i < count; i++) {
    const x = (rand() * 100).toFixed(1);
    const y = (rand() * 100).toFixed(1);
    const a = (0.15 + rand() * 0.55).toFixed(2);
    const spread = rand() > 0.85 ? "1px" : "0";
    shadows.push(`${x}vw ${y}vh 0 ${spread} rgba(${tones[Math.floor(rand() * tones.length)]},${a})`);
  }
  return shadows.join(",");
}

write(
  "index.html",
  page({
    bodyClass: "home",
    body: `${header(0, false)}
<nav class="sky" aria-label="links">
<div class="dust" aria-hidden="true" style="box-shadow:${dust(24)}"></div>
${scatter(starLinks).join("\n")}
<pre class="antenna tx" aria-hidden="true">${esc(txArt)}</pre>
<pre class="antenna rx" aria-hidden="true">${esc(rxArt)}</pre>
</nav>
<script type="application/json" id="sky-data">${JSON.stringify({ sky: skyBlocks }).replace(/</g, "\\u003c")}</script>
<script src="sky.js" defer></script>`,
  })
);

// ---- about ----
const aboutPath = path.join(ROOT, "content/about.txt");
const aboutText = fs.existsSync(aboutPath) ? read(aboutPath).trim() : "";
const aboutHtml = aboutText
  .split(/\n{2,}/)
  .map((p) => `<p>${esc(p).replace(/\n/g, "<br>")}</p>`)
  .join("\n");

write(
  "about/index.html",
  page({
    title: "about",
    depth: 1,
    body: `${header(1)}
<div class="prose">
${aboutHtml}
</div>
<footer><a href="../">&larr; back</a></footer>`,
  })
);

// ---- writings index ----
const list = writings.length
  ? writings
      .map(
        (w) =>
          `<li>${w.date ? `<span class="date">${w.date}</span>` : ""}<a href="${encodeURIComponent(
            w.slug
          )}/">${esc(w.title)}</a></li>`
      )
      .join("\n")
  : `<li class="dim">nothing here yet.</li>`;

write(
  "writings/index.html",
  page({
    title: "writings",
    depth: 1,
    body: `${header(1)}
<ul class="plain">
${list}
</ul>
<footer><a href="../">&larr; back</a></footer>`,
  })
);

// ---- each poem ----
writings.forEach((w, i) => {
  const newer = writings[i - 1];
  const older = writings[i + 1];
  const nav = [
    older ? `<a href="../${encodeURIComponent(older.slug)}/">&larr; ${esc(older.title)}</a>` : "",
    newer ? `<a href="../${encodeURIComponent(newer.slug)}/">${esc(newer.title)} &rarr;</a>` : "",
  ]
    .filter(Boolean)
    .join(" &nbsp;&middot;&nbsp; ");

  write(
    `writings/${w.slug}/index.html`,
    page({
      title: w.title,
      depth: 2,
      description: w.text.split("\n")[0],
      body: `${header(2)}
<p>${esc(w.title)}${w.date ? ` <span class="dim">&middot; ${w.date}</span>` : ""}</p>
<pre class="poem">${esc(w.text)}</pre>
<hr>
<footer>
<div>${nav}</div>
<div><a href="../">all writings</a></div>
</footer>`,
    })
  );
});

// ---- 404 ----
write(
  "404.html",
  page({
    title: "not found",
    body: `<header><p class="name">404</p><p class="dim">nothing here.</p></header>
<hr>
<p><a href="/">go home</a></p>`,
  })
);

console.log(`built ${writings.length} writing(s) into dist/`);
