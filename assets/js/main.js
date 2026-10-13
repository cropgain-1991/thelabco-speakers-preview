/* The Lab Co — page behaviours and motion. No libraries. */
(function () {
  "use strict";

  window.__labco = true; /* tells the fail-safe in <head> that this file loaded */

  /* Event day starts at midnight in Sydney (AEDT, UTC+11) on 16 October 2026.
     When the start time is fixed, put it here to make the countdown exact. */
  var EVENT_START = Date.parse("2026-10-16T00:00:00+11:00");
  var EVENT_END = Date.parse("2026-10-17T00:00:00+11:00");

  var root = document.documentElement;
  var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var finePointer = window.matchMedia && window.matchMedia("(hover: hover) and (pointer: fine)").matches;

  function each(selector, fn, scope) {
    Array.prototype.forEach.call((scope || document).querySelectorAll(selector), fn);
  }

  /* ---- Countdown ---- */
  var counters = Array.prototype.slice.call(document.querySelectorAll("[data-countdown]"));
  function pad(n) { return n < 10 ? "0" + n : String(n); }
  function setNumber(node, text) {
    if (!node || node.textContent === text) return;
    node.textContent = text;
    if (reduceMotion) return;
    node.classList.remove("tick");
    void node.offsetWidth;
    node.classList.add("tick");
  }
  function tick() {
    var now = Date.now();
    var left = EVENT_START - now;
    counters.forEach(function (el) {
      var boxes = el.querySelector("[data-countdown-boxes]");
      var done = el.querySelector("[data-countdown-done]");
      if (left > 0) {
        var s = Math.floor(left / 1000);
        var parts = { d: Math.floor(s / 86400), h: Math.floor((s % 86400) / 3600), m: Math.floor((s % 3600) / 60), s: s % 60 };
        Object.keys(parts).forEach(function (k) {
          setNumber(el.querySelector('[data-unit="' + k + '"]'), k === "d" ? String(parts[k]) : pad(parts[k]));
        });
      } else {
        if (boxes) boxes.hidden = true;
        if (done) { done.hidden = false; done.textContent = now < EVENT_END ? "The event is today" : "This event has taken place"; }
        var label = el.querySelector("[data-countdown-label]");
        if (label) label.hidden = true;
      }
      el.hidden = false;
    });
  }
  if (counters.length) { tick(); setInterval(tick, 1000); }

  /* ---- Numbers count up when they come into view ---- */
  function countUp(node) {
    var target = parseInt(node.getAttribute("data-count"), 10);
    if (isNaN(target)) return;
    if (reduceMotion) { node.textContent = String(target); return; }
    var from = node.hasAttribute("data-count-from") ? parseInt(node.getAttribute("data-count-from"), 10) : 0;
    var start = null, DURATION = 1500;
    function frame(t) {
      if (start === null) start = t;
      var p = Math.min(1, (t - start) / DURATION);
      var eased = 1 - Math.pow(1 - p, 3);
      node.textContent = String(Math.round(from + (target - from) * eased));
      if (p < 1) requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  /* ---- Reveal on scroll ---- */
  var REVEAL = ".section__head, .card, .facts, .tier, .venue__map, .contact, .partner-cta, .stats, .tabs, .rowlist__item, .reveal";
  function settle(el) {
    el.classList.add("is-in");
    each("[data-count]", countUp, el);
    var delay = parseInt(el.style.getPropertyValue("--d"), 10) || 0;
    setTimeout(function () { el.classList.add("is-done"); }, delay + 900);
  }
  each(".cards, .tiers, .bento, .rowlist", function (group) {
    Array.prototype.forEach.call(group.children, function (child, i) { child.style.setProperty("--d", i * 100 + "ms"); });
  });
  if (reduceMotion || !("IntersectionObserver" in window)) {
    each(REVEAL, function (el) { el.classList.add("is-in", "is-done"); each("[data-count]", countUp, el); });
  } else {
    var revealer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        settle(entry.target);
        revealer.unobserve(entry.target);
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });
    each(REVEAL, function (el) { revealer.observe(el); });
  }

  /* ---- Scroll progress bar and header ---- */
  var bar = document.querySelector(".progress");
  var header = document.querySelector(".site-header");
  var scrollQueued = false;
  function onScroll() {
    scrollQueued = false;
    var max = root.scrollHeight - window.innerHeight;
    var y = window.pageYOffset || root.scrollTop || 0;
    if (bar) bar.style.setProperty("--p", max > 0 ? Math.min(1, y / max).toFixed(4) : "0");
    if (header) header.classList.toggle("is-scrolled", y > 12);
  }
  window.addEventListener("scroll", function () { if (!scrollQueued) { scrollQueued = true; requestAnimationFrame(onScroll); } }, { passive: true });
  onScroll();

  /* ---- Cards: light follows the pointer ---- */
  if (finePointer) {
    each(".card", function (card) {
      card.addEventListener("pointermove", function (e) {
        var r = card.getBoundingClientRect();
        card.style.setProperty("--mx", (e.clientX - r.left) + "px");
        card.style.setProperty("--my", (e.clientY - r.top) + "px");
      });
    });
  }

  /* ---- Moving word band ---- */
  if (!reduceMotion) {
    each("[data-band]", function (band) {
      var track = band.querySelector(".band__track");
      if (!track) return;
      var originals = Array.prototype.slice.call(track.children);
      for (var copy = 0; copy < 2; copy++) {
        originals.forEach(function (item) {
          var clone = item.cloneNode(true);
          clone.setAttribute("aria-hidden", "true");
          track.appendChild(clone);
        });
      }
      band.classList.add("is-live");
    });
  }

  /* ---- Sector switcher (works as plain stacked sections without this) ---- */
  each("[data-tabs]", function (tabs) {
    var buttons = Array.prototype.slice.call(tabs.querySelectorAll('[role="tab"]'));
    var panels = Array.prototype.slice.call(tabs.querySelectorAll('[role="tabpanel"]'));
    if (!buttons.length || buttons.length !== panels.length) return;
    var list = tabs.querySelector(".tabs__list");
    if (list) list.hidden = false;
    tabs.classList.add("is-live");
    function show(i, focus) {
      buttons.forEach(function (b, n) {
        b.setAttribute("aria-selected", n === i ? "true" : "false");
        b.setAttribute("tabindex", n === i ? "0" : "-1");
        panels[n].hidden = n !== i;
      });
      if (focus) buttons[i].focus();
    }
    buttons.forEach(function (b, i) {
      b.addEventListener("click", function () { show(i, false); });
      b.addEventListener("keydown", function (e) {
        if (e.key === "ArrowRight" || e.key === "ArrowDown") { e.preventDefault(); show((i + 1) % buttons.length, true); }
        if (e.key === "ArrowLeft" || e.key === "ArrowUp") { e.preventDefault(); show((i - 1 + buttons.length) % buttons.length, true); }
      });
    });
    /* a link such as #agriculture opens that sector */
    function fromHash() {
      var id = location.hash.replace("#", "");
      panels.forEach(function (p, i) { if (p.id === id) show(i, false); });
    }
    show(0, false);
    fromHash();
    window.addEventListener("hashchange", fromHash);
  });

  /* ---- Home hero: rotating sphere of connected points ---- */
  function sphere(canvas) {
    var ctx = canvas.getContext("2d");
    if (!ctx) return;
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var size = 0, pts = [], links = [], pulses = [], angle = 0, running = false, visible = true, raf = 0;
    var tiltX = 0.38, aimX = 0.38, aimSpin = 0, spinBoost = 0;
    var COUNT = window.innerWidth < 700 ? 300 : 520;

    function build() {
      var rect = canvas.getBoundingClientRect();
      size = rect.width;
      canvas.width = Math.round(size * dpr);
      canvas.height = Math.round(size * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    (function seed() {
      var golden = Math.PI * (3 - Math.sqrt(5));
      for (var i = 0; i < COUNT; i++) {
        var y = 1 - (2 * (i + 0.5)) / COUNT;
        var r = Math.sqrt(1 - y * y);
        var phi = i * golden;
        pts.push({ x: Math.cos(phi) * r, y: y, z: Math.sin(phi) * r, hub: i % 13 === 0 });
      }
      var hubs = pts.filter(function (p) { return p.hub; });
      hubs.forEach(function (a) {
        var near = hubs.filter(function (b) { return b !== a; }).map(function (b) {
          var dx = a.x - b.x, dy = a.y - b.y, dz = a.z - b.z;
          return { b: b, d: dx * dx + dy * dy + dz * dz };
        }).sort(function (p, q) { return p.d - q.d; }).slice(0, 2);
        near.forEach(function (n) { links.push([a, n.b]); });
      });
      for (var k = 0; k < 7; k++) pulses.push({ link: links[(k * 11) % links.length], t: Math.random(), v: 0.004 + Math.random() * 0.005 });
    })();

    function project(p, cosA, sinA, cosT, sinT, R, c) {
      var x = p.x * cosA + p.z * sinA;
      var z = -p.x * sinA + p.z * cosA;
      var y = p.y * cosT - z * sinT;
      z = p.y * sinT + z * cosT;
      var s = 2.6 / (2.6 + z);
      return { x: c + x * R * s, y: c + y * R * s, z: z, s: s };
    }

    function colour(y, alpha) {
      /* aqua at the top, lime at the bottom */
      var t = (y + 1) / 2;
      var r = Math.round(25 + (200 - 25) * t), g = Math.round(227 + (245 - 227) * t), b = Math.round(208 + (60 - 208) * t);
      return "rgba(" + r + "," + g + "," + b + "," + alpha.toFixed(3) + ")";
    }

    function draw() {
      var c = size / 2, R = size * 0.36;
      var cosA = Math.cos(angle), sinA = Math.sin(angle), cosT = Math.cos(tiltX), sinT = Math.sin(tiltX);
      ctx.clearRect(0, 0, size, size);

      /* two orbit rings */
      ctx.lineWidth = 1;
      ctx.strokeStyle = "rgba(140,255,220,0.16)";
      ctx.beginPath(); ctx.ellipse(c, c, R * 1.28, R * 0.42, -0.35, 0, Math.PI * 2); ctx.stroke();
      ctx.strokeStyle = "rgba(200,245,60,0.12)";
      ctx.beginPath(); ctx.ellipse(c, c, R * 1.18, R * 0.3, 0.6, 0, Math.PI * 2); ctx.stroke();

      var i, a, b;
      for (i = 0; i < links.length; i++) {
        a = project(links[i][0], cosA, sinA, cosT, sinT, R, c);
        b = project(links[i][1], cosA, sinA, cosT, sinT, R, c);
        var depth = 1 - (a.z + b.z + 2) / 4; /* 1 = front */
        ctx.strokeStyle = colour(links[i][0].y, 0.06 + depth * 0.34);
        ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
      }
      for (i = 0; i < pts.length; i++) {
        var p = pts[i];
        a = project(p, cosA, sinA, cosT, sinT, R, c);
        var front = 1 - (a.z + 1) / 2;
        ctx.fillStyle = colour(p.y, 0.14 + front * 0.82);
        var rad = (p.hub ? 2.3 : 1.1) * a.s * (0.6 + front * 0.6);
        if (p.hub && front > 0.55) { ctx.shadowColor = colour(p.y, 0.9); ctx.shadowBlur = 12; }
        ctx.beginPath(); ctx.arc(a.x, a.y, rad, 0, Math.PI * 2); ctx.fill();
        ctx.shadowBlur = 0;
      }
      /* signals travelling between hubs */
      for (i = 0; i < pulses.length; i++) {
        var pu = pulses[i], l = pu.link;
        var mx = l[0].x + (l[1].x - l[0].x) * pu.t, my = l[0].y + (l[1].y - l[0].y) * pu.t, mz = l[0].z + (l[1].z - l[0].z) * pu.t;
        var len = Math.sqrt(mx * mx + my * my + mz * mz) || 1;
        a = project({ x: mx / len, y: my / len, z: mz / len }, cosA, sinA, cosT, sinT, R, c);
        if (a.z < 0.25) {
          ctx.shadowColor = "rgba(255,255,255,0.95)"; ctx.shadowBlur = 14;
          ctx.fillStyle = "rgba(255,255,255,0.95)";
          ctx.beginPath(); ctx.arc(a.x, a.y, 2.4 * a.s, 0, Math.PI * 2); ctx.fill();
          ctx.shadowBlur = 0;
        }
      }
    }

    function step() {
      spinBoost += (aimSpin - spinBoost) * 0.05;
      tiltX += (aimX - tiltX) * 0.05;
      angle += 0.0032 + spinBoost;
      for (var i = 0; i < pulses.length; i++) {
        var pu = pulses[i];
        pu.t += pu.v;
        if (pu.t >= 1) { pu.t = 0; pu.link = links[Math.floor(Math.random() * links.length)]; }
      }
      draw();
      if (running) raf = requestAnimationFrame(step);
    }
    function start() { if (running || reduceMotion || !visible || document.hidden) return; running = true; raf = requestAnimationFrame(step); }
    function stop() { running = false; cancelAnimationFrame(raf); }

    build(); draw();

    if (finePointer && !reduceMotion) {
      window.addEventListener("pointermove", function (e) {
        var r = canvas.getBoundingClientRect();
        var nx = (e.clientX - (r.left + r.width / 2)) / window.innerWidth;
        var ny = (e.clientY - (r.top + r.height / 2)) / window.innerHeight;
        aimSpin = nx * 0.012;
        aimX = 0.38 + ny * 0.5;
      }, { passive: true });
    }
    var resizeTimer, lastWidth = window.innerWidth;
    window.addEventListener("resize", function () {
      if (window.innerWidth === lastWidth) return;
      lastWidth = window.innerWidth;
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(function () { build(); draw(); }, 150);
    });
    document.addEventListener("visibilitychange", function () { if (document.hidden) stop(); else start(); });
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (entries) { visible = entries[0].isIntersecting; if (visible) start(); else stop(); }).observe(canvas);
    }
    start();
  }
  each("canvas[data-sphere]", sphere);

  /* ---- Event hero: drifting network ---- */
  function network(canvas) {
    var ctx = canvas.getContext("2d");
    if (!ctx) return;
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var w = 0, h = 0, nodes = [], running = false, visible = true, raf = 0;
    var LINK = 140, REACH = 180;
    var pointer = { x: 0, y: 0, on: false };
    var colours = ["25, 227, 208", "92, 242, 155", "200, 245, 60"];

    function build() {
      var rect = canvas.getBoundingClientRect();
      w = rect.width; h = rect.height;
      canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      var count = Math.max(22, Math.min(85, Math.round((w * h) / 17000)));
      nodes = [];
      for (var i = 0; i < count; i++) {
        var a = Math.random() * Math.PI * 2, sp = 0.12 + Math.random() * 0.22;
        nodes.push({ x: Math.random() * w, y: Math.random() * h, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, r: 1 + Math.random() * 1.5, c: colours[i % colours.length], hot: i % 9 === 0 });
      }
    }
    function draw() {
      ctx.clearRect(0, 0, w, h);
      var i, j, a, b, dx, dy, d;
      for (i = 0; i < nodes.length; i++) {
        a = nodes[i];
        for (j = i + 1; j < nodes.length; j++) {
          b = nodes[j]; dx = a.x - b.x; dy = a.y - b.y; d = Math.sqrt(dx * dx + dy * dy);
          if (d < LINK) { ctx.strokeStyle = "rgba(" + a.c + "," + ((1 - d / LINK) * 0.28).toFixed(3) + ")"; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); }
        }
        if (pointer.on) {
          dx = a.x - pointer.x; dy = a.y - pointer.y; d = Math.sqrt(dx * dx + dy * dy);
          if (d < REACH) { ctx.strokeStyle = "rgba(220,255,240," + ((1 - d / REACH) * 0.65).toFixed(3) + ")"; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(pointer.x, pointer.y); ctx.stroke(); }
        }
      }
      for (i = 0; i < nodes.length; i++) {
        a = nodes[i];
        if (a.hot) { ctx.shadowColor = "rgba(" + a.c + ",0.9)"; ctx.shadowBlur = 12; }
        ctx.fillStyle = "rgba(" + a.c + "," + (a.hot ? 1 : 0.7) + ")";
        ctx.beginPath(); ctx.arc(a.x, a.y, a.hot ? a.r + 1.2 : a.r, 0, Math.PI * 2); ctx.fill();
        ctx.shadowBlur = 0;
      }
    }
    function step() {
      for (var i = 0; i < nodes.length; i++) {
        var n = nodes[i];
        if (pointer.on) { var dx = pointer.x - n.x, dy = pointer.y - n.y, d = Math.sqrt(dx * dx + dy * dy); if (d < REACH && d > 1) { n.x += (dx / d) * 0.3; n.y += (dy / d) * 0.3; } }
        n.x += n.vx; n.y += n.vy;
        if (n.x < -20) n.x = w + 20; else if (n.x > w + 20) n.x = -20;
        if (n.y < -20) n.y = h + 20; else if (n.y > h + 20) n.y = -20;
      }
      draw();
      if (running) raf = requestAnimationFrame(step);
    }
    function start() { if (running || reduceMotion || !visible || document.hidden) return; running = true; raf = requestAnimationFrame(step); }
    function stop() { running = false; cancelAnimationFrame(raf); }
    build(); draw();
    var host = canvas.parentElement;
    if (host && finePointer && !reduceMotion) {
      host.addEventListener("pointermove", function (e) { var r = canvas.getBoundingClientRect(); pointer.x = e.clientX - r.left; pointer.y = e.clientY - r.top; pointer.on = true; });
      host.addEventListener("pointerleave", function () { pointer.on = false; });
    }
    var resizeTimer, lastWidth = window.innerWidth;
    window.addEventListener("resize", function () { if (window.innerWidth === lastWidth) return; lastWidth = window.innerWidth; clearTimeout(resizeTimer); resizeTimer = setTimeout(function () { build(); draw(); }, 150); });
    document.addEventListener("visibilitychange", function () { if (document.hidden) stop(); else start(); });
    if ("IntersectionObserver" in window) { new IntersectionObserver(function (entries) { visible = entries[0].isIntersecting; if (visible) start(); else stop(); }).observe(canvas); }
    start();
  }
  each("canvas[data-network]", network);
})();
