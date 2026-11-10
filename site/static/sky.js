// Sprinkles small text-art stars/moons/planets around the home page links,
// and draws a beam of signal waves from the transmitter to the receiver.
// Everything is placed to avoid the links, header and antennas. Layout is
// seeded, so the same screen size always gives the same sky.
(function () {
  "use strict";

  var sky = document.querySelector(".sky");
  var dataEl = document.getElementById("sky-data");
  if (!sky || !dataEl) return;

  var blocks = [];
  try {
    blocks = JSON.parse(dataEl.textContent).sky || [];
  } catch (e) {}
  if (!blocks.length) return;

  var layer = document.createElement("div");
  layer.className = "layer";
  layer.setAttribute("aria-hidden", "true");
  sky.insertBefore(layer, sky.firstChild);

  // single glyphs (<= 3 wide, 1 line) count as "stars", the rest as "bodies"
  var stars = [];
  var bodies = [];
  blocks.forEach(function (b) {
    var ls = b.split("\n");
    var w = Math.max.apply(
      null,
      ls.map(function (l) {
        return l.length;
      })
    );
    (ls.length === 1 && w <= 3 ? stars : bodies).push(b);
  });
  if (!stars.length) stars = bodies;
  if (!bodies.length) bodies = stars;

  function rng(seed) {
    var a = seed >>> 0;
    return function () {
      a = (a + 0x6d2b79f5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // Shades of blue, green, pink and purple. Each star/moon/planet gets one.
  var PALETTE = [
    "#7fa8ff", "#5c8be0", "#9fc4f5", "#6fd0ee", // blues
    "#7fd9a8", "#5fbf92", "#a8e6b8", "#8fd0b0", // greens
    "#f08cc0", "#e66fa8", "#f5a9cf", "#d98ab8", // pinks
    "#b08cf0", "#9a78e0", "#c7a5f5", "#8f7bd1", // purples
  ];

  function hexToRgb(hex) {
    var h = String(hex).trim().replace("#", "");
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    var n = parseInt(h, 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }

  function mix(a, b, f) {
    var out = [];
    for (var i = 0; i < 3; i++) out.push(Math.round(a[i] + (b[i] - a[i]) * f));
    return "rgb(" + out.join(",") + ")";
  }

  function hit(a, b) {
    return a.l < b.r && a.r > b.l && a.t < b.b && a.b > b.t;
  }

  var lastW = 0;
  var lastH = 0;

  function build(force) {
    var sr = sky.getBoundingClientRect();
    var W = sr.width;
    var H = sr.height;
    if (force !== true && Math.abs(W - lastW) < 2 && Math.abs(H - lastH) < 2 && layer.firstChild) return;
    lastW = W;
    lastH = H;
    layer.textContent = "";

    var rand = rng(5);
    var colorRand = rng(99); // separate stream, so colors never move the layout

    function rel(el, pad) {
      var r = el.getBoundingClientRect();
      return {
        l: r.left - sr.left - pad,
        t: r.top - sr.top - pad,
        r: r.right - sr.left + pad,
        b: r.bottom - sr.top + pad,
      };
    }

    // things nothing else may overlap
    var avoid = [];
    var links = sky.querySelectorAll("a.star");
    for (var i = 0; i < links.length; i++) avoid.push(rel(links[i], 16));
    var hdr = document.querySelector("header");
    if (hdr) avoid.push(rel(hdr, 16));
    var tx = sky.querySelector(".antenna.tx");
    var rx = sky.querySelector(".antenna.rx");
    if (tx) avoid.push(rel(tx, 18));
    if (rx) avoid.push(rel(rx, 18));

    function blocked(box) {
      for (var k = 0; k < avoid.length; k++) if (hit(box, avoid[k])) return true;
      return false;
    }

    // ---- the beam ----
    var seg = null;
    if (tx && rx) {
      var t = rel(tx, 0);
      var r = rel(rx, 0);
      var x1 = t.l + (t.r - t.l) * 0.16;
      var y1 = t.t + (t.b - t.t) * 0.32;
      var x2 = r.l + (r.r - r.l) * 0.9;
      var y2 = r.t + (r.b - r.t) * 0.2;
      var dx = x2 - x1;
      var dy = y2 - y1;
      var L = Math.sqrt(dx * dx + dy * dy);
      seg = { x1: x1, y1: y1, x2: x2, y2: y2 };

      // "(" bulges left; rotate so the bulge faces the receiver
      var rot = (Math.atan2(dy, dx) * 180) / Math.PI - 180;
      var step = Math.max(56, Math.min(88, L / 12));
      var n = Math.floor(L / step);
      var pattern = ["(", "((", "((("];
      var cs = getComputedStyle(document.documentElement);
      var cTx = hexToRgb(cs.getPropertyValue("--tx") || "#e68fc4");
      var cRx = hexToRgb(cs.getPropertyValue("--rx") || "#7fd0e6");

      for (var s = 1; s < n; s++) {
        var f = s / n;
        var w = document.createElement("span");
        w.className = "wave";
        w.textContent = pattern[s % 3];
        w.style.setProperty("--rot", rot.toFixed(1) + "deg");
        w.style.setProperty("--d", (s * 0.28).toFixed(2) + "s");
        w.style.color = mix(cTx, cRx, f); // fades from transmitter to receiver color
        w.style.left = x1 + dx * f + "px";
        w.style.top = y1 + dy * f + "px";
        layer.appendChild(w);
        var wr = w.getBoundingClientRect();
        var wbox = {
          l: wr.left - sr.left - 4,
          t: wr.top - sr.top - 4,
          r: wr.right - sr.left + 4,
          b: wr.bottom - sr.top + 4,
        };
        if (blocked(wbox)) layer.removeChild(w);
      }
    }

    function segDist(px, py) {
      if (!seg) return 1e9;
      var vx = seg.x2 - seg.x1;
      var vy = seg.y2 - seg.y1;
      var u = ((px - seg.x1) * vx + (py - seg.y1) * vy) / (vx * vx + vy * vy);
      u = Math.max(0, Math.min(1, u));
      var cx = seg.x1 + vx * u;
      var cy = seg.y1 + vy * u;
      return Math.sqrt((px - cx) * (px - cx) + (py - cy) * (py - cy));
    }

    // ---- scattered stars, moons, planets ----
    var target = Math.max(10, Math.min(46, Math.round((W * H) / 30000)));
    var margin = 12;
    var placed = [];

    for (var d = 0; d < target; d++) {
      var isStar = rand() < 0.68;
      var pool = isStar ? stars : bodies;
      var text = pool[Math.floor(rand() * pool.length)];

      var el = document.createElement("pre");
      el.className = "orb";
      el.textContent = text;
      el.style.visibility = "hidden";
      layer.appendChild(el);
      var m = el.getBoundingClientRect();
      var bw = m.width;
      var bh = m.height;

      var ok = false;
      for (var tries = 0; tries < 40 && !ok; tries++) {
        var px = margin + rand() * Math.max(1, W - 2 * margin - bw);
        var py = margin + rand() * Math.max(1, H - 2 * margin - bh);
        var box = { l: px, t: py, r: px + bw, b: py + bh };
        if (blocked(box)) continue;
        if (segDist(px + bw / 2, py + bh / 2) < 30 + Math.max(bw, bh) / 2) continue;
        var clash = false;
        for (var q = 0; q < placed.length; q++) {
          if (hit(box, placed[q])) {
            clash = true;
            break;
          }
        }
        if (clash) continue;
        el.style.left = px.toFixed(1) + "px";
        el.style.top = py.toFixed(1) + "px";
        el.style.visibility = "visible";
        el.style.setProperty("--o", (isStar ? 0.5 + rand() * 0.45 : 0.6 + rand() * 0.3).toFixed(2));
        el.style.color = PALETTE[Math.floor(colorRand() * PALETTE.length)];
        if (isStar && rand() < 0.5) {
          el.classList.add("twinkle");
          el.style.setProperty("--d", (rand() * 6).toFixed(2) + "s");
          el.style.setProperty("--t", (3 + rand() * 4).toFixed(2) + "s");
        }
        placed.push({ l: box.l - 20, t: box.t - 20, r: box.r + 20, b: box.b + 20 });
        ok = true;
      }
      if (!ok) layer.removeChild(el);
    }
  }

  build();
  // links can change width once the font loads, so lay out again then
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(function () {
      build(true);
    });
  }
  window.addEventListener("load", function () {
    build(true);
  });

  var timer;
  window.addEventListener("resize", function () {
    clearTimeout(timer);
    timer = setTimeout(build, 150);
  });
})();
