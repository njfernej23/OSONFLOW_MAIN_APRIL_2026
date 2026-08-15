/* ============================================================
   Osonflow — Motion Layer v2 (vanilla, zero dependencies, ~7kb)
   Scroll choreography, split headlines, magnetic buttons,
   cursor spotlights, scroll-linked parallax, SVG draw-on charts.
   Safe to load alongside main.js — it never touches its state.
   ============================================================ */
(function () {
  "use strict";

  var REDUCE = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var FINE = window.matchMedia("(pointer:fine)").matches;
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var clamp = function (v, a, b) { return v < a ? a : v > b ? b : v; };
  var safe = function (name, fn) { try { fn(); } catch (err) { if (window.console) console.warn("[motion] " + name, err); } };

  function boot() {
    var root = document.querySelector(".japandi-landing");
    if (!root) return;
    document.documentElement.classList.add("mo-on");

    /* ---------- 0 · release the Framer-Motion placeholders ---------- */
    safe("unlock", function () {
      $$(".fm-pending").forEach(function (el) { el.classList.remove("fm-pending"); });
    });

    /* ---------- 1 · split headlines into words ---------- */
    var SPLIT = [
      ".hero__title", ".lede__title", ".method__title", ".signal__title",
      ".site-end__title", ".tenancy__title", ".feature__copy h2", ".embed__copy h3"
    ].join(",");

    function splitHeadline(el) {
      if (!el || REDUCE) return;
      // Snapshot pre-split HTML once (should be English from first paint).
      if (!el.getAttribute("data-i18n-original-html") && !el.querySelector(".mo-word")) {
        el.setAttribute("data-i18n-original-html", el.innerHTML);
      }
      // Already split — leave current (possibly translated) words alone.
      if (el.querySelector(".mo-word")) {
        el.dataset.moSplit = "1";
        el.classList.add("mo-host");
        if (!el.hasAttribute("data-reveal")) el.setAttribute("data-reveal", "");
        return;
      }
      el.dataset.moSplit = "1";
      var i = 0;
      (function walk(node) {
        Array.prototype.slice.call(node.childNodes).forEach(function (child) {
          if (child.nodeType === 3) {
            var parts = child.textContent.split(/(\s+)/);
            if (!parts.length) return;
            var frag = document.createDocumentFragment();
            parts.forEach(function (p) {
              if (!p) return;
              if (/^\s+$/.test(p)) { frag.appendChild(document.createTextNode(p)); return; }
              var s = document.createElement("span");
              s.className = "mo-word";
              s.style.setProperty("--mo-wi", i++);
              s.textContent = p;
              frag.appendChild(s);
            });
            node.replaceChild(frag, child);
          } else if (child.nodeType === 1 && !child.classList.contains("mo-word")) {
            walk(child);
          }
        });
      })(el);
      el.classList.add("mo-host");
      if (!el.hasAttribute("data-reveal")) el.setAttribute("data-reveal", "");
    }

    window.__osonflowSplitHeadlines = function (root) {
      var scope = root && root.querySelectorAll ? root : document;
      var nodes = scope.querySelectorAll
        ? scope.querySelectorAll(SPLIT)
        : $$(SPLIT);
      Array.prototype.forEach.call(nodes, splitHeadline);
    };

    safe("split", function () {
      window.__osonflowSplitHeadlines(root);
    });

    /* ---------- 2 · stagger children of grids & lists ---------- */
    var GROUPS = [
      ".plans", ".channels__grid", ".stat-band", ".method__track", ".signal__stats",
      ".opsboard__rail", ".pipeline__steps", ".tenancy__flow", ".tenancy__sheet",
      ".accordion", ".footer__grid", ".checks", ".opsintent__list"
    ].join(",");

    safe("groups", function () {
      $$(GROUPS).forEach(function (group) {
        Array.prototype.slice.call(group.children).forEach(function (child, i) {
          if (child.hasAttribute("data-reveal")) return;
          child.classList.add("mo-child");
          child.style.setProperty("--mo-delay", Math.min(i, 8) * 65 + "ms");
        });
      });
    });

    /* ---------- 3 · reveal observer (stagger per section) ---------- */
    safe("reveal", function () {
      var targets = $$("[data-reveal], .mo-child");
      if (REDUCE || !("IntersectionObserver" in window)) {
        targets.forEach(function (el) { el.classList.add("mo-in", "is-in"); });
        return;
      }
      // directional hints for side-by-side feature blocks
      $$(".feature").forEach(function (f) {
        var copy = $(".feature__copy", f), media = $(".feature__media", f);
        var flipped = f.classList.contains("feature--rev");
        if (copy) copy.classList.add("mo-child", flipped ? "mo-from-right" : "mo-from-left");
        if (media) media.classList.add("mo-child", flipped ? "mo-from-left" : "mo-from-right");
      });
      targets = $$("[data-reveal], .mo-child");

      var seen = new WeakMap();
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (!e.isIntersecting) return;
          var el = e.target;
          var section = el.closest("section") || document.body;
          var n = seen.get(section) || 0;
          if (!el.style.getPropertyValue("--mo-delay")) {
            el.style.setProperty("--mo-delay", Math.min(n, 6) * 70 + "ms");
          }
          seen.set(section, n + 1);
          el.classList.add("mo-in", "is-in");
          io.unobserve(el);
        });
      }, { threshold: 0.1, rootMargin: "0px 0px -7% 0px" });

      targets.forEach(function (el) { io.observe(el); });

      // hero fires immediately with a tighter cadence
      $$(".hero [data-reveal], .hero .mo-child").forEach(function (el, i) {
        el.style.setProperty("--mo-delay", 90 + i * 110 + "ms");
        requestAnimationFrame(function () { el.classList.add("mo-in", "is-in"); });
      });
    });

    /* ---------- 4 · SVG chart draw-on ---------- */
    safe("charts", function () {
      var paths = $$(".opsmetric__spark-line, .opschart__ai, .opschart__human");
      paths.forEach(function (p, i) {
        if (typeof p.getTotalLength !== "function") return;
        var len = 0;
        try { len = p.getTotalLength(); } catch (err) { return; }
        if (!len) return;
        p.style.setProperty("--mo-len", len);
        p.style.setProperty("--mo-delay", (i % 4) * 120 + "ms");
        if (!REDUCE) p.classList.add("mo-draw");
      });
      if (REDUCE || !("IntersectionObserver" in window)) {
        $$(".opsmetric, .opschart").forEach(function (c) { c.classList.add("mo-chart-in"); });
        paths.forEach(function (p) { p.classList.add("mo-in"); });
        return;
      }
      var co = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (!e.isIntersecting) return;
          e.target.classList.add("mo-chart-in");
          $$(".opsmetric__spark-line, .opschart__ai, .opschart__human", e.target)
            .forEach(function (p) { p.classList.add("mo-in"); });
          co.unobserve(e.target);
        });
      }, { threshold: 0.3 });
      $$(".opsmetric, .opschart").forEach(function (c) { co.observe(c); });
    });

    /* ---------- 5 · counter arrival pop ---------- */
    safe("counters", function () {
      if (REDUCE || !("IntersectionObserver" in window)) return;
      var po = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (!e.isIntersecting) return;
          var el = e.target;
          window.setTimeout(function () { el.classList.add("mo-pop"); }, 1450);
          po.unobserve(el);
        });
      }, { threshold: 0.4 });
      $$("[data-count]").forEach(function (el) { po.observe(el); });
    });

    /* ---------- 6 · ROI live tick ---------- */
    safe("roi", function () {
      if (REDUCE || !("MutationObserver" in window)) return;
      ["#roiSavings", "#roiResolved", "#roiConvVal", "#roiCostVal"].forEach(function (sel) {
        var el = $(sel);
        if (!el) return;
        var mo = new MutationObserver(function () {
          el.classList.remove("mo-tick");
          void el.offsetWidth;
          el.classList.add("mo-tick");
        });
        mo.observe(el, { childList: true, characterData: true, subtree: true });
      });
    });

    /* ---------- 7 · magnetic buttons ---------- */
    safe("magnet", function () {
      if (REDUCE || !FINE) return;
      $$(".btn, .wtool, .chip, .footer__social-link").forEach(function (btn) {
        var raf = null;
        btn.addEventListener("mousemove", function (e) {
          if (raf) return;
          raf = requestAnimationFrame(function () {
            raf = null;
            var r = btn.getBoundingClientRect();
            var x = (e.clientX - r.left - r.width / 2) / r.width;
            var y = (e.clientY - r.top - r.height / 2) / r.height;
            var pull = Math.min(10, r.height * 0.28);
            btn.style.setProperty("--mo-mx", (x * pull).toFixed(2) + "px");
            btn.style.setProperty("--mo-my", (y * pull * 0.7).toFixed(2) + "px");
            btn.classList.add("mo-magnet-active");
          });
        });
        btn.addEventListener("mouseleave", function () {
          btn.style.setProperty("--mo-mx", "0px");
          btn.style.setProperty("--mo-my", "0px");
          btn.classList.remove("mo-magnet-active");
        });
      });
    });

    /* ---------- 8 · cursor spotlight on cards ---------- */
    safe("spotlight", function () {
      var cards = $$(".tilt, .plan, .vcard, .opsmetric, .xaside__card, .train, .pool, .acc");
      cards.forEach(function (card) { card.classList.add("mo-spot"); });
      if (REDUCE || !FINE) return;
      cards.forEach(function (card) {
        var raf = null;
        card.addEventListener("mousemove", function (e) {
          if (raf) return;
          raf = requestAnimationFrame(function () {
            raf = null;
            var r = card.getBoundingClientRect();
            card.style.setProperty("--mo-px", (((e.clientX - r.left) / r.width) * 100).toFixed(1) + "%");
            card.style.setProperty("--mo-py", (((e.clientY - r.top) / r.height) * 100).toFixed(1) + "%");
          });
        });
      });
    });

    /* ---------- 9 · chrome: progress bar + back to top ---------- */
    var bar = null, top = null;
    safe("chrome", function () {
      bar = document.createElement("div");
      bar.className = "mo-progress";
      bar.innerHTML = "<i></i>";
      document.body.appendChild(bar);

      top = document.createElement("button");
      top.className = "mo-top";
      top.type = "button";
      top.setAttribute("aria-label", "Back to top");
      top.innerHTML = '<svg viewBox="0 0 24 24" width="17" height="17" fill="none"><path d="M12 19V6M6 12l6-6 6 6" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/></svg>';
      top.addEventListener("click", function () {
        window.scrollTo({ top: 0, behavior: REDUCE ? "auto" : "smooth" });
      });
      document.body.appendChild(top);
    });

    /* ---------- 10 · one rAF loop for every scroll-linked value ---------- */
    safe("scroll", function () {
      var hero = $(".hero");
      var heroCopy = $(".hero__copy");
      var track = $(".method__track");
      var nav = $("#nav");
      var progressFill = bar ? bar.querySelector("i") : null;
      var medias = $$(".feature__media");
      var links = $$(".nav__menu a[href^='#']");
      var sections = links.map(function (a) { return document.getElementById(a.getAttribute("href").slice(1)); });

      var lastY = window.scrollY;
      var vel = 0;
      var ticking = false;

      function frame() {
        ticking = false;
        var y = window.scrollY;
        var vh = window.innerHeight;
        var doc = Math.max(1, document.documentElement.scrollHeight - vh);

        // velocity (smoothed)
        vel = vel * 0.82 + Math.abs(y - lastY) * 0.18;

        if (progressFill) progressFill.style.setProperty("--mo-p", (y / doc).toFixed(4));

        if (hero && heroCopy) {
          var hp = clamp(y / Math.max(1, hero.offsetHeight * 0.85), 0, 1);
          hero.style.setProperty("--mo-hero-p", hp.toFixed(3));
          heroCopy.style.setProperty("--mo-hero-p", hp.toFixed(3));
        }

        if (track) {
          var tr = track.getBoundingClientRect();
          var tp = clamp((vh * 0.9 - tr.top) / Math.max(1, tr.height + vh * 0.25), 0, 1);
          track.style.setProperty("--mo-p", tp.toFixed(3));
        }

        medias.forEach(function (m) {
          var r = m.getBoundingClientRect();
          if (r.bottom < -200 || r.top > vh + 200) return;
          var p = clamp((vh - r.top) / (vh + r.height), 0, 1);
          m.style.setProperty("--mo-par", (p - 0.5).toFixed(3));
        });

        if (nav) nav.classList.remove("mo-hide");

        if (top) top.classList.toggle("is-in", y > vh * 1.2);

        // active nav link
        var currentIdx = -1;
        sections.forEach(function (sec, i) {
          if (!sec) return;
          var r = sec.getBoundingClientRect();
          if (r.top <= vh * 0.35 && r.bottom > vh * 0.35) currentIdx = i;
        });
        links.forEach(function (a, i) { a.classList.toggle("mo-current", i === currentIdx); });

        lastY = y;
      }

      function onScroll() {
        if (ticking) return;
        ticking = true;
        requestAnimationFrame(frame);
      }
      window.addEventListener("scroll", onScroll, { passive: true });
      window.addEventListener("resize", onScroll, { passive: true });
      frame();
    });

    /* ---------- 11 · eased anchor scrolling with nav offset ---------- */
    safe("anchors", function () {
      if (REDUCE) return;
      document.addEventListener("click", function (e) {
        var a = e.target.closest ? e.target.closest('a[href^="#"]') : null;
        if (!a) return;
        var id = a.getAttribute("href");
        if (!id || id === "#" || id.length < 2) return;
        var target = document.getElementById(id.slice(1));
        if (!target) return;
        e.preventDefault();
        var y = target.getBoundingClientRect().top + window.scrollY - 88;
        window.scrollTo({ top: y, behavior: "smooth" });
        if (history.replaceState) history.replaceState(null, "", id);
      });
    });

    /* ---------- 12 · accordion height keeps up with the new easing ---------- */
    safe("acc", function () {
      $$(".acc__q").forEach(function (q) {
        q.addEventListener("click", function () {
          window.setTimeout(function () {
            var open = $(".acc.is-open");
            if (!open) return;
            var body = $(".acc__a", open);
            if (body) body.style.maxHeight = body.scrollHeight + "px";
          }, 20);
        });
      });
    });
    /* ---------- 13 · failsafe: nothing may ever stay hidden ---------- */
    safe("failsafe", function () {
      window.setTimeout(function () {
        $$("[data-reveal]:not(.mo-in), .mo-child:not(.mo-in)").forEach(function (el) {
          var r = el.getBoundingClientRect();
          if (r.top < window.innerHeight * 1.5) el.classList.add("mo-in", "is-in");
        });
      }, 3500);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, { once: true });
  } else {
    boot();
  }
})();
