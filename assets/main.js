/* designbyashish.com — shared script. Content lives in /content/*.json (edit those, not this file). */
(function () {
  "use strict";
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var esc = function (s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); };
  var inline = function (s) { return esc(s).replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>"); };

  /* tiny markdown: paragraphs, "- " bullet lists, **bold** */
  function md(text) {
    var out = [], list = [];
    var flush = function () { if (list.length) { out.push("<ul>" + list.map(function (i) { return "<li>" + inline(i) + "</li>"; }).join("") + "</ul>"); list = []; } };
    String(text || "").split(/\n\s*\n/).forEach(function (block) {
      var lines = block.split("\n").map(function (l) { return l.trim(); }).filter(Boolean);
      var bullets = lines.filter(function (l) { return /^[-*] /.test(l); });
      if (lines.length && bullets.length === lines.length) { lines.forEach(function (l) { list.push(l.slice(2)); }); flush(); }
      else { flush(); if (lines.length) out.push("<p>" + lines.map(inline).join("<br>") + "</p>"); }
    });
    flush();
    return out.join("");
  }

  function get(url) { return fetch(url, { cache: "no-cache" }).then(function (r) { if (!r.ok) throw new Error(url); return r.json(); }); }

  /* image/video box. If the file is missing it shows a quiet placeholder instead of a broken icon. */
  var io = "IntersectionObserver" in window ? new IntersectionObserver(function (es) {
    es.forEach(function (e) { var v = e.target; if (e.isIntersecting) { var p = v.play(); if (p && p.catch) p.catch(function () {}); } else v.pause(); });
  }, { threshold: 0.25 }) : null;

  function mediaBox(src, type, alt) {
    var box = document.createElement("div");
    box.className = "media";
    var name = String(src || "").split("/").pop();
    var miss = function () { box.classList.add("missing"); box.dataset.name = name; };
    if (!src) { miss(); return box; }
    if (type === "video") {
      var v = document.createElement("video");
      v.muted = true; v.loop = true; v.playsInline = true; v.preload = "metadata";
      v.setAttribute("muted", ""); v.setAttribute("playsinline", "");
      v.addEventListener("error", function () { v.remove(); miss(); });
      v.src = src;
      box.appendChild(v);
      if (io) io.observe(v); else v.autoplay = true;
    } else {
      var i = document.createElement("img");
      i.alt = alt || ""; i.loading = "lazy"; i.decoding = "async";
      i.addEventListener("error", function () { i.remove(); miss(); });
      i.src = src;
      box.appendChild(i);
    }
    return box;
  }
  function placeMedia(host, src, type, alt) { var b = mediaBox(src, type, alt); b.setAttribute("data-img", ""); host.appendChild(b); }

  /* clocks */
  function startClocks(tz) {
    var f24 = new Intl.DateTimeFormat("en-GB", { timeZone: tz, hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" });
    var f12 = new Intl.DateTimeFormat("en-US", { timeZone: tz, hour12: true, hour: "numeric", minute: "2-digit", second: "2-digit" });
    var tick = function () {
      var n = new Date(), a = $("#clock"), b = $("#clock2");
      if (a) a.textContent = f24.format(n);
      if (b) b.textContent = f12.format(n);
    };
    tick(); setInterval(tick, 1000);
  }

  var lenis = null;
  function smooth() {
    if (!window.Lenis) return;
    lenis = new Lenis({ lerp: 0.085, smoothWheel: true, wheelMultiplier: 0.9 });
    var raf = function (t) { lenis.raf(t); requestAnimationFrame(raf); };
    requestAnimationFrame(raf);
    if (location.hash) setTimeout(function () { var el = $(location.hash); if (el) lenis.scrollTo(el, { immediate: true }); }, 80);
  }

  function theme() {
    var b = $("#themeBtn"); if (!b) return;
    b.addEventListener("click", function () {
      var next = document.documentElement.dataset.theme === "light" ? "dark" : "light";
      document.documentElement.dataset.theme = next;
      try { localStorage.setItem("theme", next); } catch (e) {}
    });
  }

  function footer(site, extraHtml) {
    var f = $("#foot"); if (!f) return;
    f.innerHTML = (extraHtml || "") + '<div class="art"></div>' +
      '<div class="contact"><span>' + esc(site.contact_heading) + '</span><div class="pills">' +
      site.socials.map(function (s) { return '<a class="pill" target="_blank" rel="noopener" href="' + esc(s.url) + '">' + esc(s.label) + "</a>"; }).join("") +
      '</div><time id="clock2"></time></div>';
    placeMedia($(".art", f), site.footer_image, "image", "");
  }

  /* ---------- hero tags with physics ---------- */
  function heroTags(site) {
    var hero = $("#hero"), box = $("#tags"), name = $("#bigname");
    if (!hero || !window.Matter) return;
    var words = site.tags.slice();
    var els = [];
    words.forEach(function (w, i) {
      var e = document.createElement("div");
      e.className = "tag";
      e.innerHTML = esc(w) + (w === "HMI" ? "<i></i>" : "");
      box.appendChild(e); els.push({ el: e, round: false });
    });
    var star = document.createElement("div"); star.className = "tag round"; star.textContent = "✱"; box.appendChild(star); els.push({ el: star, round: true });
    var down = document.createElement("button"); down.className = "tag round"; down.textContent = "↓"; down.setAttribute("aria-label", "Scroll down");
    down.addEventListener("click", function () { var t = $("#heroImages"); if (lenis) lenis.scrollTo(t); else t.scrollIntoView({ behavior: "smooth" }); });
    box.appendChild(down); els.push({ el: down, round: true });

    var M = Matter, engine, runner, rafId, bodies = [], mc, built = false;
    function build() {
      if (built) { cancelAnimationFrame(rafId); M.World.clear(engine.world); M.Engine.clear(engine); }
      built = true;
      var W = hero.clientWidth, H = hero.clientHeight;
      var fs = parseFloat(getComputedStyle(name).fontSize);
      var floorY = H - name.offsetHeight + fs * 0.2;
      engine = M.Engine.create({ gravity: { y: 0.9 } });
      var t = 80;
      var walls = [
        M.Bodies.rectangle(W / 2, floorY + t / 2, W * 2, t, { isStatic: true }),
        M.Bodies.rectangle(-t / 2, H / 2, t, H * 4, { isStatic: true }),
        M.Bodies.rectangle(W + t / 2, H / 2, t, H * 4, { isStatic: true })
      ];
      M.World.add(engine.world, walls);
      bodies = els.map(function (o, i) {
        var w = o.el.offsetWidth, h = o.el.offsetHeight;
        var x = w / 2 + Math.random() * Math.max(10, W - w), y = -60 - i * 90;
        var opts = { restitution: 0.45, friction: 0.25, frictionAir: 0.01, angle: (Math.random() - 0.5) * 0.7 };
        var b = o.round ? M.Bodies.circle(x, y, w / 2, opts) : M.Bodies.rectangle(x, y, w, h, Object.assign({ chamfer: { radius: h / 2 } }, opts));
        o.w = w; o.h = h; return b;
      });
      M.World.add(engine.world, bodies);
      var mouse = M.Mouse.create(hero);
      /* let the page scroll normally with wheel/touch */
      ["mousewheel", "DOMMouseScroll"].forEach(function (n) { hero.removeEventListener(n, mouse.mousewheel); });
      hero.removeEventListener("touchmove", mouse.mousemove); hero.removeEventListener("touchstart", mouse.mousedown); hero.removeEventListener("touchend", mouse.mouseup);
      mc = M.MouseConstraint.create(engine, { mouse: mouse, constraint: { stiffness: 0.2, render: { visible: false } } });
      M.World.add(engine.world, mc);
      var last = performance.now();
      (function loop(now) {
        M.Engine.update(engine, Math.min(32, now - last)); last = now;
        bodies.forEach(function (b, i) {
          var o = els[i];
          o.el.style.transform = "translate(" + (b.position.x - o.w / 2) + "px," + (b.position.y - o.h / 2) + "px) rotate(" + b.angle + "rad)";
        });
        rafId = requestAnimationFrame(loop);
      })(last);
    }
    var still = matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (still) {
      els.forEach(function (o, i) { o.el.style.transform = "translate(" + (20 + i * 150) + "px," + (80 + (i % 2) * 70) + "px)"; });
      return;
    }
    (document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve()).then(build);
    var rt; addEventListener("resize", function () { clearTimeout(rt); rt = setTimeout(build, 250); });
  }

  /* make the big name span exactly the page width, and put its baseline one page-margin above the images */
  var nameR = null;
  function fitName() {
    var el = $("#bigname"), wrap = $("#nameWrap"); if (!el || !wrap) return;
    var cs = getComputedStyle(el), pad = parseFloat(cs.paddingLeft);
    var avail = el.clientWidth - pad - parseFloat(cs.paddingRight);
    el.style.fontSize = "100px";
    var w = wrap.getBoundingClientRect().width;
    var fs = w > 0 ? 100 * avail / w : 100;
    el.style.fontSize = fs + "px";
    if (!wrap.querySelector(".ln")) {   /* measure the space under the baseline (only possible before the letters are split) */
      var probe = document.createElement("span");
      probe.style.cssText = "display:inline-block;width:0;height:0;vertical-align:baseline";
      wrap.appendChild(probe);
      var below = el.getBoundingClientRect().bottom - parseFloat(cs.paddingBottom) - probe.getBoundingClientRect().bottom;
      wrap.removeChild(probe);
      if (fs > 0) nameR = below / fs;
    }
    if (nameR !== null) el.style.bottom = (pad - nameR * fs) + "px";
  }

  /* ---------- entrance animations (modelled on the Enerblock reference) ----------
     headings : a solid block grows in line by line, then wipes away and the text is revealed
     labels   : typed out with scrambled letters and a block cursor
     images   : expand from the top-left corner as you scroll, with a live X / Y readout       */
  var CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#%&*+/<>";
  var clamp = function (v, a, b) { return Math.min(b, Math.max(a, v)); };
  var escHtml = esc;

  function blockReveal(el, delay, inline) {
    var saved = el.innerHTML;
    var words = el.textContent.replace(/\s+/g, " ").trim().split(" ");
    el.innerHTML = words.map(function (w) { return '<span class="bw">' + escHtml(w) + "</span>"; }).join(" ");
    var lines = [], lastTop = null;
    Array.prototype.forEach.call(el.querySelectorAll(".bw"), function (w) {
      var t = Math.round(w.getBoundingClientRect().top);
      if (lastTop === null || Math.abs(t - lastTop) > 4) { lines.push([]); lastTop = t; }
      lines[lines.length - 1].push(w.textContent);
    });
    el.innerHTML = lines.map(function (l) {
      return '<span class="ln' + (inline ? " ln-inline" : "") + '"><span class="ln-t">' + escHtml(l.join(" ")) + '</span><i class="ln-b" aria-hidden="true"></i></span>';
    }).join("");
    el.classList.add("is-ready");
    var dur = 1050, cut = 0.42, step = 110, end = 0;
    Array.prototype.forEach.call(el.querySelectorAll(".ln"), function (ln, i) {
      var d = delay * 1000 + i * step; end = Math.max(end, d + dur);
      ln.querySelector(".ln-b").animate([
        { clipPath: "inset(0 100% 0 0)", easing: "cubic-bezier(.7,0,.2,1)" },
        { clipPath: "inset(0 0% 0 0)", offset: cut, easing: "cubic-bezier(.6,0,.3,1)" },
        { clipPath: "inset(0 0 0 100%)" }
      ], { duration: dur, delay: d, fill: "both" });
      ln.querySelector(".ln-t").animate([
        { opacity: 0 }, { opacity: 0, offset: cut }, { opacity: 1, offset: cut + 0.0001 }, { opacity: 1 }
      ], { duration: dur, delay: d, fill: "both", easing: "linear" });
    });
    setTimeout(function () { el.innerHTML = saved; el.classList.add("is-done"); }, end + 80);
  }

  function textOf(el) {
    var s = "";
    Array.prototype.forEach.call(el.childNodes, function (n) { s += n.nodeType === 3 ? n.nodeValue : (n.tagName === "BR" ? "\n" : n.textContent); });
    return s.replace(/[ \t]+/g, " ").replace(/^\s+|\s+$/g, "");
  }
  function typeIn(el, delay) {
    var saved = el.innerHTML, final = textOf(el), len = final.length;
    var box = el.getBoundingClientRect(), cs = getComputedStyle(el);
    var wasInline = cs.display === "inline";
    var total = clamp(260 + len * 16, 380, 1000);
    var cur = document.createElement("span"); cur.className = "cur"; cur.setAttribute("aria-hidden", "true");
    var t0 = null;
    function frame(now) {
      if (t0 === null) t0 = now;
      var t = now - t0, k = Math.floor(clamp(t / total, 0, 1) * (len + 1));
      if (k > len) {
        el.innerHTML = saved; el.style.minWidth = el.style.minHeight = el.style.whiteSpace = el.style.display = "";
        el.removeAttribute("aria-label"); el.classList.add("is-done"); return;
      }
      var out = final.slice(0, k);
      var junk = "";
      for (var i = k; i < Math.min(len, k + 2); i++) junk += /\s/.test(final[i]) ? final[i] : CHARS[Math.floor(Math.random() * CHARS.length)];
      el.textContent = out + (k < len ? junk.slice(0, 1) : "");
      el.appendChild(cur);
      requestAnimationFrame(frame);
    }
    setTimeout(function () {
      el.style.minWidth = box.width + "px"; el.style.minHeight = box.height + "px"; el.style.whiteSpace = "pre-line";
      if (wasInline) el.style.display = "inline-block";
      el.setAttribute("aria-label", final); el.classList.add("is-ready");
      requestAnimationFrame(frame);
    }, delay * 1000);
  }

  function initReveals() {
    var root = document.documentElement;
    if (!root.classList.contains("js") || !("IntersectionObserver" in window)) return;
    var jobs = new WeakMap();
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (!e.isIntersecting) return; io.unobserve(e.target); var f = jobs.get(e.target); if (f) f(); });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0 });
    var queue = function (el, fn) { if (!el || !document.body.classList.contains("home")) return; jobs.set(el, fn); io.observe(el); };
    var all = function (sel) { return Array.prototype.slice.call(document.querySelectorAll(sel)); };

    /* hero */
    queue($("#email"), function () { typeIn($("#email"), 0.2); });
    queue($("#roleText"), function () { typeIn($("#roleText"), 0.35); });
    queue($("#clock"), function () { var c = $("#clock"); c.classList.add("is-in"); });
    queue($("#nameWrap"), function () { blockReveal($("#nameWrap"), 0.45, true); });
    /* intro */
    queue($("#introHeading"), function () { blockReveal($("#introHeading"), 0); });
    queue($("#introText"), function () { $("#introText").classList.add("is-in"); });
    /* works */
    queue($("#worksHeading"), function () { blockReveal($("#worksHeading"), 0); });
    queue($("#worksYears"), function () { typeIn($("#worksYears"), 0.4); });
    all("#grid .card .meta span").forEach(function (s, i) { queue(s, function () { typeIn(s, 0.2 + (i % 2) * 0.1); }); });
    /* experiences */
    queue($(".exp h2"), function () { blockReveal($(".exp h2"), 0); });
    all(".exp-cols > div").forEach(function (col, ci) {
      Array.prototype.forEach.call(col.children, function (c, k) { queue(c, function () { typeIn(c, 0.3 + ci * 0.18 + k * 0.12); }); });
    });
    /* footer */
    queue($(".contact > span"), function () { typeIn($(".contact > span"), 0.1); });
    all(".contact .pills a").forEach(function (a, i) { queue(a, function () { a.classList.add("is-in"); a.style.transitionDelay = 0.15 + i * 0.08 + "s"; }); });
    queue($(".contact time"), function () { $(".contact time").classList.add("is-in"); });

    /* images: scroll-scrubbed expansion from the top-left corner */
    var imgs = all("[data-img]").map(function (el) {
      var host = el.parentElement, mk = function (c) { var s = document.createElement("span"); s.className = "dim " + c; s.setAttribute("aria-hidden", "true"); host.appendChild(s); return s; };
      return { el: el, x: mk("dim-x"), y: mk("dim-y") };
    });
    var ease = function (t) { return t * t * (3 - 2 * t); };
    function scrub() {
      var vh = innerHeight, maxS = Math.max(0, root.scrollHeight - vh);
      imgs.forEach(function (o) {
        if (o.done) return;
        var r = o.el.getBoundingClientRect(), w = o.el.offsetWidth, h = o.el.offsetHeight;
        var startTop = vh * 0.99;
        var endTop = Math.max(vh * 0.58, (r.top + scrollY - maxS) + 18);
        var t = clamp((startTop - r.top) / Math.max(1, startTop - endTop), 0, 1), e = ease(t);
        var pw = 0.22 + 0.78 * e, ph = 0.3 + 0.7 * e;
        if (t >= 1 && !document.body.classList.contains("home")) o.done = true;
        o.el.style.clipPath = t >= 1 ? "none" : "inset(0 " + ((1 - pw) * 100).toFixed(2) + "% " + ((1 - ph) * 100).toFixed(2) + "% 0)";
        var show = t > 0.02 && t < 0.995;
        o.x.style.opacity = o.y.style.opacity = show ? 1 : 0;
        if (show) {
          o.x.textContent = "X: " + Math.round(w * pw); o.y.textContent = "Y: " + Math.round(h * ph);
          o.x.style.left = (o.el.offsetLeft + w * pw + 8) + "px"; o.x.style.top = (o.el.offsetTop + h * ph - 14) + "px";
          o.y.style.left = (o.el.offsetLeft + 4) + "px";          o.y.style.top = (o.el.offsetTop + h * ph + 6) + "px";
        }
      });
    }
    scrub();
    addEventListener("scroll", scrub, { passive: true });
    addEventListener("resize", scrub);
    setTimeout(scrub, 400);
    fitName();
  }

  /* ---------- pages ---------- */
  function home(site, data) {
    document.title = site.seo_title;
    var em = $("#email"); em.href = "mailto:" + site.email; em.textContent = site.email;
    $("#roleText").innerHTML = esc(site.role_line).replace(/\n/g, "<br>");
    $("#nameFirst").textContent = site.name_first; $("#nameLast").textContent = site.name_last;
    var strip = $("#heroImages"), cells = [];
    (site.hero_images || []).forEach(function (s) {
      var cell = document.createElement("div"); cell.className = "cell";
      var m = mediaBox(s, "image", ""), rx = document.createElement("span"), ry = document.createElement("span");
      rx.className = ry.className = "rd"; cell.appendChild(m); cell.appendChild(rx); cell.appendChild(ry); strip.appendChild(cell);
      cells.push({ cell: cell, m: m, rx: rx, ry: ry });
    });
    growStrip(cells);
    $("#introHeading").textContent = site.intro_heading; $("#introText").innerHTML = inline(site.intro_text);
    $("#worksHeading").textContent = site.works_heading; $("#worksYears").textContent = site.works_years;
    var grid = $("#grid");
    data.projects.forEach(function (p) {
      var a = document.createElement("a"); a.className = "card"; a.href = "/" + p.slug;
      placeMedia(a, p.cover, "image", p.title);
      var m = document.createElement("div"); m.className = "meta"; m.innerHTML = "<span>" + esc(p.card_label || p.title) + "</span><span>" + esc(p.year) + "</span>";
      a.appendChild(m); grid.appendChild(a);
    });
    $("#exp").innerHTML = site.experiences.map(function (e) { return "<div><small>" + esc(e.years) + "</small><p>" + esc(e.company) + "</p><p>" + esc(e.role) + "</p></div>"; }).join("");
    footer(site);
    fitName();
    addEventListener("resize", fitName);
    var go = function () { try { fitName(); initReveals(); } catch (e) { console.error(e); document.documentElement.classList.remove("js"); } };
    var started = false, once = function () { if (started) return; started = true; setTimeout(go, 650); };
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(once); else once();
    setTimeout(once, 2500);
    /* floating tags are switched off for now: call heroTags(site) here to bring them back */
  }

  function project(site, data) {
    var slug = (new URLSearchParams(location.search).get("slug") || location.pathname).replace(/^\/+|\/+$/g, "").replace(/\.html$/, "");
    var idx = data.projects.findIndex(function (p) { return p.slug === slug; });
    var page = $("#page");
    if (idx < 0) { document.title = "Page not found"; $("#crumb").textContent = "404"; page.innerHTML = '<div class="nf"><h1>404</h1><p>This page does not exist.</p><a class="pill" href="/">← Back to home</a></div>'; footer(site); return; }
    var p = data.projects[idx], next = data.projects[idx + 1];
    document.title = p.title + " - Projects";
    $("#crumb").textContent = p.title;
    page.innerHTML =
      '<section class="p-head"><div class="p-title"><div id="logo"></div><h1>' + esc(p.title) + '</h1></div>' + (p.overview ? '<div class="p-over"><small>Overview</small>' + md(p.overview) + "</div>" : "") + "</section>" +
      ((p.top_images || []).length ? '<section class="p-top" id="top" style="--n:' + Math.min(2, p.top_images.length) + '"></section>' : "") +
      (p.about_text ? '<section class="about"><h2>About the project</h2><div class="body">' + md(p.about_text) + "</div></section>" : '<div style="height:clamp(60px,8vw,120px)"></div>') +
      ((p.intro_title || p.intro_text || p.intro_video) ? '<section class="pax">' + (p.intro_title ? "<h2>" + esc(p.intro_title) + "</h2>" : "") + md(p.intro_text) + '<div class="pax-v"></div></section>' : "") +
      '<section class="shots" id="shots"></section>';
    var lg = $("#logo");
    if (p.logo) { lg.style.display = "contents"; placeMedia(lg, p.logo, "image", ""); lg.firstChild.style.cssText = "width:clamp(48px,6vw,86px);aspect-ratio:1;background:none"; } else lg.remove();
    var kind = function (m) { return m.type || (/\.(mp4|webm|mov|m4v)$/i.test(m.src || "") ? "video" : "image"); };
    (p.top_images || []).slice(0, 2).forEach(function (s) { placeMedia($("#top"), s, "image", p.title); });
    if (p.intro_video) placeMedia($(".pax-v"), p.intro_video, "video", p.intro_title); else { var pv = $(".pax-v"); if (pv) pv.remove(); }
    (p.media || []).forEach(function (m) {
      var t = kind(m), h = m.heading || m.caption, fig = document.createElement("figure"); fig.className = "shot" + (t === "image" ? " is-image" : "");
      if (h) { var c = document.createElement("h3"); c.textContent = h; fig.appendChild(c); }
      placeMedia(fig, m.src, t, h);
      $("#shots").appendChild(fig);
    });
    var go = function () { try { initReveals(); } catch (e) { console.error(e); } };
    (document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve()).then(function () { setTimeout(go, 700); });
    footer(site, '<div class="back-next"><a href="/">← BACK TO HOME</a><a href="' + (next ? "/" + next.slug : "/") + '">NEXT PROJECT →</a></div>');
  }

  /* hero tiles grow from small to full size as you scroll, with a live X / Y readout */
  function growStrip(cells) {
    function upd() {
      var vh = innerHeight;
      cells.forEach(function (o) {
        var r = o.cell.getBoundingClientRect();
        var p = Math.min(1, Math.max(0, (vh * 1.02 - r.top) / (vh * 0.7)));
        var k = 0.08 + 0.92 * p, w = o.cell.clientWidth * k, h = o.cell.clientHeight * k;
        o.m.style.width = w + "px"; o.m.style.height = h + "px";
        o.rx.textContent = "X: " + Math.round(w); o.ry.textContent = "Y: " + Math.round(h);
        o.rx.style.left = Math.max(w, 96) + "px"; o.rx.style.top = (h + 6) + "px"; o.rx.style.transform = "translateX(-100%)";
        o.ry.style.left = "0px"; o.ry.style.top = (h + 6) + "px";
      });
    }
    addEventListener("scroll", upd, { passive: true }); addEventListener("resize", upd); upd();
  }

  /* page wipe: a stepped diagonal edge sweeps across (blue cover, light band on its edge) */
  var cv = $("#curtain"), cb = $("#cband"), cDone = false;
  function drawCurtain(by, t) {
    var W = innerWidth, H = innerHeight, bx = W * 0.1, a = 1.6 * H, bw = W * 0.52;
    var S = [[bx - a, by + a], [bx, by], [bx + bw, by], [bx + bw + a, by - a]];
    var cov = S.concat([[S[3][0], -3 * H], [S[0][0], -3 * H]]);
    var band = S.concat(S.slice().reverse().map(function (p) { return [p[0], p[1] + t]; }));
    var f = function (pts) { return "polygon(" + pts.map(function (p) { return p[0].toFixed(1) + "px " + p[1].toFixed(1) + "px"; }).join(",") + ")"; };
    cv.style.clipPath = f(cov); cb.style.clipPath = f(band);
  }
  function curtainHide() { if (cv) { cv.style.display = "none"; cb.style.display = "none"; } cDone = true; }
  function curtainRun(dir, done) {
    if (!cv || !document.documentElement.classList.contains("js")) { if (done) done(); return; }
    var W = innerWidth, H = innerHeight, from = H + 0.6 * W, to = -W * 0.1 - 60, t0 = null, dur = 1300;
    cv.style.display = cb.style.display = "block";
    requestAnimationFrame(function step(now) {
      if (t0 === null) t0 = now;
      var p = Math.min(1, (now - t0) / dur), e = p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2, q = dir === "out" ? e : 1 - e;
      drawCurtain(from + (to - from) * q, H * 0.07 * Math.sin(Math.PI * p));
      if (p < 1) requestAnimationFrame(step); else { if (dir === "out") curtainHide(); if (done) done(); }
    });
  }
  /* ---------- decrypt preloader: scrambled characters resolve line by line (first load + between pages) ---------- */
  var HEX = "0123456789ABCDEF", NOISE = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#%&*+/<>=";
  function rnd(n, set) { var s = ""; while (n--) s += set[Math.floor(Math.random() * set.length)]; return s; }
  function preRun(path, dur, done) {
    var lines = ["ASHISH KUMAR / HMI DESIGNER", "DECRYPTING " + path, "KEY 0x" + rnd(8, HEX) + " // VERIFIED", "ACCESS GRANTED"];
    cv.innerHTML = '<div class="pl"></div><div class="pn">000</div>';
    var box = cv.firstChild, num = cv.lastChild, nz = [], last = 0, t0 = performance.now(), fin = false;
    var rows = lines.map(function (t) { var d = document.createElement("div"); d.className = "pr"; box.appendChild(d); return d; });
    (function f(now) {
      var el = now - t0, redo = now - last > 50; if (redo) last = now;
      var q = clamp(el / dur, 0, 1);
      lines.forEach(function (t, i) {
        var p = clamp((q - i * 0.14) / 0.55, 0, 1), lock = Math.floor(p * t.length);
        if (redo || !nz[i]) nz[i] = t.replace(/\S/g, function () { return NOISE[Math.floor(Math.random() * NOISE.length)]; });
        rows[i].innerHTML = esc(t.slice(0, lock)) + (lock < t.length ? "<i>" + esc(nz[i].slice(lock)) + "</i>" : "");
      });
      num.textContent = ("00" + Math.round(q * 100)).slice(-3).replace(/^0+(?=\d)/, function (m) { return m; });
      if (q < 1) requestAnimationFrame(f); else if (!fin) { fin = true; num.textContent = "100"; if (done) done(); }
    })(t0);
  }
  function preIntro() {
    var fast = false; try { fast = !!sessionStorage.getItem("pre"); sessionStorage.removeItem("pre"); } catch (x) {}
    if (!cv || !document.documentElement.classList.contains("js")) return { ready: Promise.resolve(), exit: curtainHide };
    var path = location.pathname === "/" ? "/INDEX" : location.pathname.replace(/\/$/, "").toUpperCase();
    var ready = new Promise(function (res) { preRun(path, fast ? 900 : 1500, function () { setTimeout(res, 140); }); });
    return { ready: ready, exit: function () {
      cv.animate([{ clipPath: "inset(0 0 0 0)" }, { clipPath: "inset(0 0 100% 0)" }], { duration: 800, easing: "cubic-bezier(.7,0,.2,1)", fill: "forwards" }).onfinish = curtainHide;
    } };
  }
  function preLeave(u, go) {
    try { sessionStorage.setItem("pre", "1"); } catch (x) {}
    cv.style.display = "flex";
    cv.animate([{ clipPath: "inset(100% 0 0 0)" }, { clipPath: "inset(0 0 0 0)" }], { duration: 480, easing: "cubic-bezier(.7,0,.2,1)", fill: "forwards" }).onfinish = go;
    preRun(u.pathname === "/" ? "/INDEX" : u.pathname.replace(/\/$/, "").toUpperCase(), 900);
  }

  document.addEventListener("click", function (e) {
    var a = e.target.closest && e.target.closest("a[href]");
    if (!a || e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.button || a.target === "_blank") return;
    var u; try { u = new URL(a.href, location.href); } catch (x) { return; }
    if (u.origin !== location.origin || (u.pathname === location.pathname && u.hash)) return;
    if (!document.documentElement.classList.contains("js")) return;
    e.preventDefault(); preLeave(u, function () { location.href = u.href; });
  });
  addEventListener("pageshow", function (e) { if (e.persisted) curtainHide(); });

  document.addEventListener("DOMContentLoaded", function () {
    theme(); smooth();
    var pre = preIntro();
    Promise.all([get("/content/site.json"), get("/content/projects.json"), pre.ready]).then(function (r) {
      if (document.body.classList.contains("home")) home(r[0], r[1]); else project(r[0], r[1]);
      startClocks(r[0].timezone || "Europe/Rome");
      pre.exit();
    }).catch(function (e) { console.error(e); curtainHide(); document.body.insertAdjacentHTML("beforeend", '<p style="padding:24px;font:14px monospace">Could not load content files. If you opened this file directly, run it from a web server (see README).</p>'); });
  });
})();
