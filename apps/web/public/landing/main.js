/* ============================================================
   Osonflow — Japandi landing interactivity (zero-build, vanilla)
   Live grounded chat + voice, knowledge training, agent inbox,
   interactive pipeline, ROI calculator,
   animated FAQ, embed modal, and calm scroll choreography.
   ============================================================ */
(function () {
  "use strict";

  function initOsonflowLanding() {
    const root = document.getElementById("main");
    if (!root) return;

    if (typeof window.__destroyOsonflowLanding === "function") {
      window.__destroyOsonflowLanding();
    }

    const ac = new AbortController();
    const { signal } = ac;
    const intervals = [];
    const observers = [];
    const trackInterval = (fn, ms) => {
      const id = setInterval(fn, ms);
      intervals.push(id);
      return id;
    };
    const trackObserver = (observer) => {
      observers.push(observer);
      return observer;
    };

    window.__destroyOsonflowLanding = function () {
      ac.abort();
      intervals.forEach(clearInterval);
      observers.forEach((observer) => observer.disconnect());
      delete root.dataset.landingInitialized;
      window.__destroyOsonflowLanding = undefined;
    };

    root.dataset.landingInitialized = "true";

const $ = (s, c) => (c || document).querySelector(s);
  const $$ = (s, c) => Array.from((c || document).querySelectorAll(s));
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const esc = (t) => String(t).replace(/[&<>"']/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m]));

  /* ---------------- Shared knowledge corpus ---------------- */
  const knowledge = [
    { id: "k-1", title: "What Osonflow does", type: "file", source: "osonflow-faq.pdf",
      content: "Osonflow is an AI customer support tool for websites. When a visitor writes or calls in, Osonflow answers using your own content — your web pages, help articles, and uploaded files. When a question needs a person, it passes the whole conversation to your team so the customer never repeats themselves.", date: "2026-06-01" },
    { id: "k-2", title: "Pricing and plans", type: "url", source: "https://osonflow.ai/pricing",
      content: "There are three plans. Starter is free: the full chat widget, up to 1,000 conversations, one website to read from, and email handover. Growth is 299.000 soms a month: voice support, the shared team inbox, up to 10 team seats, unlimited pages read from your site, and Slack. Enterprise is custom-priced with an SLA, a dedicated database, and custom voice options.", date: "2026-06-05" },
    { id: "k-3", title: "Voice support", type: "file", source: "voice_capabilities.txt",
      content: "Customers can speak to Osonflow instead of typing — they tap the voice button in the widget and talk. Voice calls go into the same queue as chat. If a call needs a person, Osonflow rings your support team and hands over mid-call, with a written transcript already waiting in the shared inbox.", date: "2026-06-10" },
    { id: "k-4", title: "Setup and integrations", type: "url", source: "https://docs.osonflow.ai/setup",
      content: "Installing Osonflow is one line of code in your site's head: <script src='https://widget.osonflow.uz/widget.js' data-id='oson-demo'></script>. You can pick a colour theme to match your brand, and it works with Shopify, WordPress, and HubSpot.", date: "2026-06-12" }
  ];

  function generateAiResponse(query) {
    const q = query.toLowerCase();
    const find = (id) => knowledge.find((k) => k.id === id);
    if (/(price|plan|cost|pricing|tier)/.test(q)) return (find("k-2") || {}).content || "Plans start free. Growth is 299.000 soms a month and adds voice support and shared inbox seats for your team.";
    if (/(voice|speak|realtime|audio|call)/.test(q)) return (find("k-3") || {}).content || "Customers can talk to Osonflow instead of typing, and your team can join the call or read the live transcript from the shared inbox.";
    if (/(install|embed|script|setup|code|integrat)/.test(q)) return (find("k-4") || {}).content || "Setup is one line of code in your site's head — that's it.";
    if (/(human|person|handoff|agent|escalat|specialist)/.test(q)) return "When Osonflow is not sure enough, or the question is urgent, the chat goes to your team. They see the whole conversation the moment they open it.";
    for (const item of knowledge) {
      const kws = item.title.toLowerCase().split(/\s+/);
      if (kws.some((kw) => kw.length > 3 && q.includes(kw))) return "[From " + item.source + "]: " + item.content;
    }
    return "Osonflow answers the repetitive questions from your own content, and passes the harder ones to your team with the full conversation attached.";
  }

  function intentFor(query) {
    const q = query.toLowerCase();
    if (/(price|plan|cost|pricing)/.test(q)) return "About pricing";
    if (/(voice|audio|call)/.test(q)) return "About voice";
    if (/(install|embed|script|setup|code)/.test(q)) return "Setup question";
    if (/(human|person|handoff|agent|escalat)/.test(q)) return "Wants a person";
    return "Just trying it out";
  }

  /* ---------------- Reveal on scroll (hero only; rest uses Framer Motion) ---------------- */
  const reveals = $$("[data-reveal]");
  if ("IntersectionObserver" in window && !reduceMotion) {
    const io = trackObserver(new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          if (!e.target.closest(".hero")) return;
          const sibs = $$("[data-reveal]", e.target.closest("section") || document).filter((n) => !n.classList.contains("is-in"));
          const i = sibs.indexOf(e.target);
          e.target.style.transitionDelay = Math.min(i, 4) * 80 + "ms";
          e.target.classList.add("is-in");
          io.unobserve(e.target);
        }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -8% 0px" }));
    reveals.forEach((el) => {
      if (el.closest(".hero")) {
        if (!el.classList.contains("is-in")) io.observe(el);
      } else {
        el.classList.add("fm-pending");
      }
    });
  } else { reveals.forEach((el) => el.classList.add("is-in")); }

  /* ---------------- Count-up stats ---------------- */
  const formatCountValue = (value, el) => {
    const decimals = el.dataset.countDecimals ? parseInt(el.dataset.countDecimals, 10) : 0;
    const prefix = el.dataset.countPrefix || "";
    const suffix = el.dataset.countSuffix || "";
    let numeric;
    if (decimals > 0) {
      numeric = value.toFixed(decimals);
    } else {
      numeric = Math.round(value).toLocaleString("en-US");
    }
    return prefix + numeric + suffix;
  };
  const runCount = (el) => {
    const target = parseFloat(el.dataset.count);
    if (!Number.isFinite(target)) return;
    if (reduceMotion) {
      el.textContent = formatCountValue(target, el);
      return;
    }
    const dur = parseInt(el.dataset.countDuration || "1500", 10);
    const start = performance.now();
    const step = (now) => {
      const p = Math.min((now - start) / dur, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      el.textContent = formatCountValue(eased * target, el);
      if (p < 1) requestAnimationFrame(step);
      else el.textContent = formatCountValue(target, el);
    };
    requestAnimationFrame(step);
  };
  if ("IntersectionObserver" in window) {
    const co = trackObserver(new IntersectionObserver((entries) => entries.forEach((e) => { if (e.isIntersecting) { runCount(e.target); co.unobserve(e.target); } }), { threshold: 0.35, rootMargin: "0px 0px -8% 0px" }));
    $$("[data-count]").forEach((el) => co.observe(el));
  } else { $$("[data-count]").forEach((el) => (el.textContent = formatCountValue(parseFloat(el.dataset.count), el))); }

  /* ---------------- Animate intent bars + ops stack when revealed ---------------- */
  if ("IntersectionObserver" in window) {
    const bo = trackObserver(new IntersectionObserver((entries) => entries.forEach((e) => {
      if (!e.isIntersecting) return;
      const root = e.target;
      root.classList.add("is-in");
      $$("i[data-w]", root).forEach((i) => (i.style.width = i.dataset.w));
      $$(".opsintent__stack span", root).forEach((s) => { s.style.width = getComputedStyle(s).getPropertyValue("--share"); });
      bo.unobserve(root);
    }), { threshold: 0.28 }));
    $$(".ibars, .opsboard").forEach((el) => bo.observe(el));
  }

  /* ---------------- Tenancy board reveal ---------------- */
  const tenancyBoard = $("#tenancyBoard");
  if (tenancyBoard && "IntersectionObserver" in window) {
    const to = trackObserver(new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        e.target.classList.add("is-in");
        to.unobserve(e.target);
      });
    }, { threshold: 0.3 }));
    to.observe(tenancyBoard);
  } else if (tenancyBoard) {
    tenancyBoard.classList.add("is-in");
  }

  /* ---------------- Hero parallax + tilt ---------------- */
  const stage = $(".hero__stage");
  if (stage && !reduceMotion && window.matchMedia("(pointer:fine)").matches) {
    stage.addEventListener("mousemove", (e) => {
      const r = stage.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
      $$("[data-float]", stage).forEach((p, i) => {
        const d = (i + 1) * 4;
        p.style.setProperty("--fx", (-x * d).toFixed(2) + "px");
        p.style.setProperty("--fy", (-y * d).toFixed(2) + "px");
      });
    }, { signal });
    stage.addEventListener("mouseleave", () => $$("[data-float]", stage).forEach((p) => {
      p.style.setProperty("--fx", "0px");
      p.style.setProperty("--fy", "0px");
    }), { signal });
  }

  /* ---------------- Hero typewriter ---------------- */
  const typeEl = $("#chatType");
  if (typeEl && !reduceMotion) {
    const phrases = ["Type a message…", "Where is my order?", "Can I get a refund?", "Talk to a human"];
    let pi = 0; typeEl.style.transition = "opacity 0.35s ease";
    trackInterval(() => { typeEl.style.opacity = "0"; setTimeout(() => { pi = (pi + 1) % phrases.length; typeEl.textContent = phrases[pi]; typeEl.style.opacity = "1"; }, 350); }, 2600);
  }

  /* ---------------- Pipeline stepper ---------------- */
  const pviews = [
    { rule: "", title: "You add your content", desc: "You don't write scripts or keyword rules. Point Osonflow at your website, or upload the PDFs and text files your team already answers from. It reads them once and keeps them up to date.",
      term: '<div class="term"><div class="term__title">WHAT YOU GIVE IT</div><pre>Your files and pages  ───────▶  Read and organised\n  ├─ billing-faq.txt                  ├─ ready in 92ms\n  └─ setup-guide.pdf                  └─ ready in 130ms</pre><div class="term__ok">Done — Osonflow can now answer from both.</div></div>' },
    { title: "Osonflow reads it", desc: "When a customer asks something, Osonflow pulls up only the parts of your content that actually relate to the question — then writes its answer from those, and nothing else.",
      term: '<div class="term"><div class="term__title term__title--ochre">FINDING THE ANSWER</div><pre>Customer asks ────────▶ Osonflow looks it up ────────▶ Answer\n  "Do you have Pro?"           in your own content       "Growth is 299.000 soms a month"</pre><div class="term__ok">The answer came from your pricing page.</div></div>' },
    { title: "It answers — or it stops", desc: "Before replying, Osonflow rates how well the answer is backed by your content. If that rating falls below the level you set, it doesn't send a guess — it stops and gets a person.",
      term: '<div class="term"><div class="term__title">CHECKING BEFORE IT REPLIES</div><pre>Draft answer ─────────▶ How well is this backed up?\n                          ├─ Found in your content: yes\n                          ├─ Confidence: 95%\n                          └─ Your threshold: 80%</pre><div class="term__ok">Confident enough — send it, no one needed.</div></div>' },
    { title: "Your team steps in", desc: "If confidence drops, or the customer just asks for a person, your team is notified and the chat appears in the shared inbox. The customer stays in the same conversation and never repeats themselves.",
      term: '<div class="term"><div class="term__title term__title--ochre">HANDING OVER</div><pre>Customer ──────────────▶ Not confident enough ──────▶ Team notified\n                            │ (Confidence: 44%)        │\n                            └──────────────────────────┴─▶ Shared inbox</pre><div class="term__warn">Passing this conversation to your team, with the full history.</div></div>' }
  ];
  const pipelineView = $("#pipelineView");
  function renderPipeline(i) {
    const v = pviews[i];
    pipelineView.innerHTML = '<div class="pview__in"><span class="pview__rule"></span><h4>' + v.title + "</h4><p>" + v.desc + "</p>" + v.term + "</div>";
  }
  if (pipelineView) {
    renderPipeline(0);
    $$(".pstep").forEach((btn) => btn.addEventListener("click", () => {
      $$(".pstep").forEach((b) => b.classList.remove("is-active"));
      btn.classList.add("is-active");
      renderPipeline(parseInt(btn.dataset.step, 10));
    }, { signal }));
  }

  /* ---------------- ROI calculator ---------------- */
  const roiConv = $("#roiConv"), roiCost = $("#roiCost");
  function fmt(n) { return Math.round(n).toLocaleString("en-US"); }
  function updateRoi() {
    const conv = parseInt(roiConv.value, 10), cost = parseFloat(roiCost.value);
    $("#roiConvVal").textContent = fmt(conv);
    $("#roiCostVal").textContent = "$" + cost.toFixed(2);
    $("#roiResolved").textContent = fmt(conv * 0.82);
    $("#roiSavings").textContent = "$" + fmt(conv * 0.82 * (cost - 0.4));
  }
  if (roiConv && roiCost) { roiConv.addEventListener("input", updateRoi, { signal }); roiCost.addEventListener("input", updateRoi, { signal }); updateRoi(); }

  /* ---------------- Experience room tabs / loop UX ---------------- */
  const glider = $("#xtabGlider");
  const xstagePrompt = $("#xstagePrompt");
  const xNudge = $("#xNudge");
  const xNudgeText = $("#xNudgeText");
  const xNudgeGo = $("#xNudgeGo");
  const xNudgeDismiss = $("#xNudgeDismiss");
  const PROMPTS = {
    chat: "Try a suggested question — or type your own.",
    train: "Teach it a new fact, then ask about it in the chat.",
    inbox: "The same conversation shows up here, in full."
  };
  const LOOP_ORDER = ["chat", "train", "inbox"];
  const visited = new Set(["chat"]);
  let currentTab = "chat";
  let nudgeTimer = null;
  let nudgeTarget = null;
  let hasChatted = false;
  let hasTrained = false;

  function moveGlider(tab) {
    if (!glider || !tab) return;
    const parent = tab.parentElement;
    if (!parent) return;
    const left = tab.offsetLeft;
    glider.style.left = left + "px";
    glider.style.width = tab.offsetWidth + "px";
  }

  function setStagePrompt(name) {
    if (!xstagePrompt) return;
    const next = PROMPTS[name] || PROMPTS.chat;
    if (reduceMotion) {
      xstagePrompt.textContent = next;
      return;
    }
    xstagePrompt.classList.add("is-swap");
    window.setTimeout(() => {
      xstagePrompt.textContent = next;
      xstagePrompt.classList.remove("is-swap");
    }, 180);
  }

  function syncLoop(name) {
    visited.add(name);
  }

  function hideNudge() {
    if (!xNudge) return;
    xNudge.classList.remove("is-in");
    window.setTimeout(() => {
      if (!xNudge.classList.contains("is-in")) xNudge.hidden = true;
    }, 320);
    nudgeTarget = null;
  }

  function showNudge(text, targetTab) {
    if (!xNudge || !xNudgeText || !xNudgeGo) return;
    if (currentTab === targetTab) return;
    nudgeTarget = targetTab;
    xNudgeText.textContent = text;
    xNudgeGo.textContent = targetTab === "inbox" ? "Open inbox" : targetTab === "train" ? "Teach it" : "Open chat";
    xNudge.hidden = false;
    requestAnimationFrame(() => xNudge.classList.add("is-in"));
    if (nudgeTimer) window.clearTimeout(nudgeTimer);
    nudgeTimer = window.setTimeout(hideNudge, 7000);
  }

  if (xNudgeGo) xNudgeGo.addEventListener("click", () => {
    const target = nudgeTarget;
    hideNudge();
    if (target) activateTab(target);
  }, { signal });
  if (xNudgeDismiss) xNudgeDismiss.addEventListener("click", hideNudge, { signal });

  function activateTab(name, opts) {
    opts = opts || {};
    if (!name || (name === currentTab && !opts.force)) {
      moveGlider($('.xtab[data-xtab="' + name + '"]'));
      return;
    }

    const prevName = currentTab;
    const prevPanel = $('.xpanel[data-xpanel="' + prevName + '"]');
    const nextPanel = $('.xpanel[data-xpanel="' + name + '"]');

    $$(".xtab").forEach((t) => {
      const on = t.dataset.xtab === name;
      t.classList.toggle("is-active", on);
      t.setAttribute("aria-selected", on ? "true" : "false");
      if (on) moveGlider(t);
    });

    if (prevPanel && nextPanel && prevPanel !== nextPanel && !reduceMotion) {
      prevPanel.classList.add("is-leaving");
      prevPanel.classList.remove("is-active");
      window.setTimeout(() => {
        prevPanel.classList.remove("is-leaving");
        prevPanel.hidden = true;
      }, 260);
      nextPanel.hidden = false;
      nextPanel.classList.add("is-active");
    } else {
      $$(".xpanel").forEach((p) => {
        const on = p.dataset.xpanel === name;
        p.classList.toggle("is-active", on);
        p.hidden = !on;
        p.classList.remove("is-leaving");
      });
    }

    currentTab = name;
    syncLoop(name);
    setStagePrompt(name);
    if (name === "inbox") renderWsLog();
    hideNudge();
  }

  const firstTab = $(".xtab.is-active");
  if (firstTab) {
    requestAnimationFrame(() => moveGlider(firstTab));
    window.addEventListener("resize", () => moveGlider($(".xtab.is-active")), { signal });
  }
  $$(".xtab").forEach((t) => t.addEventListener("click", () => activateTab(t.dataset.xtab), { signal }));
  syncLoop("chat");

  /* ---------------- Threads / workspace state ---------------- */

  const greet = "Hi! I'm the Osonflow assistant. Ask me about plans, setting up the widget, or voice support.";
  const liveThread = { id: "t-live", name: "You (live demo)", avatar: "U", status: "ai_handled", urgency: "low", conf: 95, intent: "Just trying it out",
    messages: [{ sender: "ai", text: greet }] };
  const threads = [ liveThread,
    { id: "t-1", name: "Hiroshi T.", avatar: "HT", status: "waiting", urgency: "high", conf: 74, intent: "Billing question",
      messages: [{ sender: "client", text: "Hi, I need help configuring our corporate credit card settings." }, { sender: "ai", text: "You can update billing info via Account settings in your dashboard. Want a direct update link?" }, { sender: "client", text: "No, we require single-invoice wire transfer setups. Can you route this only to billing specialists?" }] },
    { id: "t-2", name: "Freja Lindqvist", avatar: "FL", status: "ai_handled", urgency: "low", conf: 98, intent: "Setup question",
      messages: [{ sender: "client", text: "Can I train the model by feeding it my support website link?" }, { sender: "ai", text: "Yes — on Growth you can add any web address. Osonflow reads the pages and knows them within 5 minutes." }, { sender: "client", text: "Perfect, works like a charm. I crawled the entire helpdesk." }] },
    { id: "t-3", name: "Julian Thorne", avatar: "JT", status: "agent_active", urgency: "medium", conf: 61, intent: "Voice problem",
      messages: [{ sender: "client", text: "Hello, testing the Osonflow voice platform on my staging app." }, { sender: "ai", text: "Greetings, I'm ready to converse. How can I assist with your voice test?" }, { sender: "client", text: "The audio drops out slightly during real-time voice in local Chrome." }] },
    { id: "t-4", name: "Sora Tanaka", avatar: "ST", status: "resolved", urgency: "low", conf: 94, intent: "Happy customer",
      messages: [{ sender: "client", text: "Integrating Osonflow on Shopify. Will custom categories show automatically?" }, { sender: "ai", text: "Yes — Osonflow reads your Shopify product tags and keeps its answers in step with your catalogue." }, { sender: "client", text: "Thank you! Setup reduced our initial response workload by 60%." }] }
  ];
  let activeThreadId = "t-live";

  /* ---------------- Grounding panel ---------------- */
  function setGrounding(intent, conf) {
    const gi = $("#groundIntent"), gm = $("#groundMeter"), gc = $("#groundConf");
    const card = $(".xaside__card--ground");
    if (gi) gi.textContent = intent;
    if (gm) {
      gm.style.width = conf + "%";
      gm.classList.toggle("low", conf < 80);
      gm.classList.remove("is-tick");
      void gm.offsetWidth;
      gm.classList.add("is-tick");
    }
    if (gc) gc.textContent = conf + "%";
    if (card) {
      card.classList.remove("is-flash");
      void card.offsetWidth;
      card.classList.add("is-flash");
    }
  }

  /* ---------------- Chat widget ---------------- */
  const chatBody = $("#chatBody"), chatForm = $("#chatForm"), chatInput = $("#chatInput");
  function avatar(sender) { return sender === "client" ? "ME" : "AI"; }
  function clearChipInvite() {
    $$("#suggestChips .chip--invite").forEach((c) => c.classList.remove("chip--invite"));
  }
  function appendChat(sender, text, voice) {
    const wrap = document.createElement("div");
    wrap.className = "msg msg--" + sender + " is-enter";
    wrap.innerHTML = '<span class="msg__ava">' + avatar(sender) + '</span><div class="msg__bubble">' + (voice ? '<span class="msg__voice">Voice log</span>' : "") + esc(text) + "</div>";
    chatBody.appendChild(wrap);
    chatBody.scrollTop = chatBody.scrollHeight;
    window.setTimeout(() => wrap.classList.remove("is-enter"), 500);
  }
  function showTyping() {
    const widget = $("#widget");
    if (widget) widget.classList.add("is-busy");
    const t = document.createElement("div");
    t.className = "msg msg--ai is-enter"; t.id = "typingRow";
    t.innerHTML = '<span class="msg__ava">AI</span><div class="typing"><i></i><i></i><i></i></div>';
    chatBody.appendChild(t); chatBody.scrollTop = chatBody.scrollHeight;
  }
  function hideTyping() {
    const t = $("#typingRow"); if (t) t.remove();
    const widget = $("#widget");
    if (widget) widget.classList.remove("is-busy");
  }

  function pushToLive(sender, text, voice) {
    liveThread.messages.push({ sender, text, voice });
    if (activeThreadId === "t-live" && wsActivePanelVisible()) renderWsLog();
    renderThreads(true);
  }

  function handleUserMessage(text) {
    clearChipInvite();
    hasChatted = true;
    visited.add("chat");
    appendChat("client", text);
    pushToLive("client", text);
    const intent = intentFor(text);
    const low = /(human|person|handoff|agent|escalat)/.test(text.toLowerCase());
    setGrounding(intent, low ? 62 : 95);
    liveThread.intent = intent;
    if (low) {
      liveThread.status = "waiting";
      liveThread.urgency = "high";
      liveThread.conf = 62;
    }
    showTyping();
    setTimeout(() => {
      hideTyping();
      const reply = generateAiResponse(text);
      appendChat("ai", reply);
      pushToLive("ai", reply);
      if (currentTab === "chat") {
        showNudge(low
          ? "Not confident enough — this chat is now waiting in the team inbox."
          : "Answered from your content. The same chat is now in the team inbox.", "inbox");
      }
    }, reduceMotion ? 400 : 1100);
  }

  if (chatForm) {
    chatForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const v = chatInput.value.trim();
      if (!v) return;
      chatInput.value = "";
      handleUserMessage(v);
    }, { signal });
  }
  $$("#suggestChips .chip").forEach((c) => c.addEventListener("click", () => {
    clearChipInvite();
    activateTab("chat");
    handleUserMessage(c.textContent.trim());
  }, { signal }));

  /* escalation */
  const escalateBtn = $("#escalateBtn");
  if (escalateBtn) escalateBtn.addEventListener("click", () => {
    escalateBtn.classList.remove("is-pulse");
    void escalateBtn.offsetWidth;
    escalateBtn.classList.add("is-pulse");
    appendChat("client", "[Alert] Visitor asked to speak to a person.");
    liveThread.status = "waiting"; liveThread.urgency = "high"; liveThread.conf = 44; liveThread.intent = "Asked for a person";
    pushToLive("client", "[Alert] Visitor asked to speak to a person.");
    setGrounding("Asked for a person", 44);
    showTyping();
    setTimeout(() => {
      hideTyping();
      const m = "I have passed this over to the support team. Someone will pick it up in a moment.";
      appendChat("ai", m);
      pushToLive("ai", m);
      showNudge("Passed to a person — open the team inbox to take over.", "inbox");
    }, reduceMotion ? 350 : 900);
  }, { signal });

  /* ---------------- Voice mode ---------------- */
  const voiceToggle = $("#voiceToggle"), voiceStage = $("#voiceStage"), widgetInput = $("#chatForm");
  const orb = $("#voiceOrb"), voiceStateLabel = $("#voiceStateLabel"), voiceText = $("#voiceText"), widgetState = $("#widgetState");
  let voiceOn = false;
  function setVoiceState(state, text) { if (orb) orb.dataset.state = state; if (voiceStateLabel) voiceStateLabel.textContent = "State: " + state; if (text && voiceText) voiceText.textContent = text; }
  function toggleVoice(on) {
    voiceOn = on;
    voiceToggle.classList.toggle("is-on", on);
    voiceStage.hidden = !on; chatBody.hidden = on; widgetInput.hidden = on;
    widgetState.textContent = on ? "Connected · On a call" : "AI assistant · Online";
    if (on) { setVoiceState("listening", "Listening…"); setTimeout(() => { if (voiceOn) setVoiceState("speaking", '"Hi, this is Osonflow. I know your help content — ask me about pricing or setup."'); }, 1700); }
    else setVoiceState("idle", "Tap a prompt below to hear how a spoken support call would go.");
  }
  if (voiceToggle) voiceToggle.addEventListener("click", () => toggleVoice(!voiceOn), { signal });
  $$(".vbtn").forEach((b) => b.addEventListener("click", () => {
    const kind = b.dataset.voice;
    setVoiceState("listening", kind === "pricing" ? 'Listening… "What are your pricing plans?"' : 'Listening… "Can I speak to a person?"');
    setTimeout(() => {
      if (kind === "pricing") { const t = "Starter is free, and Growth is 299.000 soms a month — that adds voice support, reading from your website, and 10 seats for your team."; setVoiceState("speaking", '"' + t + '"'); pushToLive("ai", t, true); }
      else { const t = "Of course — passing you over now. Your team will see this whole conversation."; setVoiceState("speaking", '"' + t + '"'); liveThread.status = "waiting"; liveThread.urgency = "high"; liveThread.conf = 44; liveThread.intent = "Asked for a person"; setGrounding("Asked for a person", 44); pushToLive("ai", t, true); }
    }, 1400);
  }, { signal }));

  /* ---------------- Knowledge hub ---------------- */
  const poolList = $("#poolList"), trainForm = $("#trainForm");
  let trainType = "file";
  function renderPool(flashId) {
    if (!poolList) return;
    poolList.innerHTML = knowledge.map((k) => '<div class="kitem' + (flashId && k.id === flashId ? " is-new" : "") + '"><div class="kitem__top"><span class="kitem__title"><span class="kitem__type">' + (k.type === "file" ? "▤" : "↗") + "</span>" + esc(k.title) + '</span><span class="kitem__src">' + esc(k.source) + '</span></div><div class="kitem__body">' + esc(k.content) + '</div><div class="kitem__foot"><span>In use · Private to you</span><span>Added ' + k.date + "</span></div></div>").join("");
  }
  renderPool();
  $$(".tseg").forEach((s) => s.addEventListener("click", () => {
    $$(".tseg").forEach((x) => x.classList.remove("is-active")); s.classList.add("is-active");
    trainType = s.dataset.ttype;
    $("#trainSource").value = trainType === "file" ? "refund-policy.txt" : "https://help.yoursite.com/faq";
  }, { signal }));
  if (trainForm) trainForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const title = $("#trainTitle").value.trim(), content = $("#trainContent").value.trim(), source = $("#trainSource").value.trim();
    if (!title || !content || !source) return;
    const id = "k-" + Date.now();
    knowledge.unshift({ id, title, type: trainType, source, content, date: new Date().toISOString().slice(0, 10) });
    hasTrained = true;
    visited.add("train");
    syncLoop(currentTab);
    renderPool(id);
    $("#trainTitle").value = ""; $("#trainContent").value = ""; $("#trainSource").value = "";
    const ok = $("#trainOk"); ok.hidden = false; setTimeout(() => (ok.hidden = true), 4000);
    showNudge("Saved. Now ask about “" + title + "” in the customer chat.", "chat");
  }, { signal });

  /* ---------------- Agent workspace ---------------- */
  const wsThreads = $("#wsThreads"), wsLog = $("#wsLog"), wsClient = $("#wsClient"), wsIntent = $("#wsIntent"), wsResolve = $("#wsResolve");
  const statusIcon = { resolved: "✓", agent_active: "◉", waiting: "◷", ai_handled: "✦" };
  function wsActivePanelVisible() { const p = $('.xpanel[data-xpanel="inbox"]'); return p && p.classList.contains("is-active"); }
  function renderThreads(flashLive) {
    if (!wsThreads) return;
    const openEl = $("#wsOpenCount");
    if (openEl) {
      openEl.textContent = threads.filter((t) => t.status !== "resolved").length + " open";
      if (flashLive) {
        openEl.classList.remove("is-bump");
        void openEl.offsetWidth;
        openEl.classList.add("is-bump");
      }
    }
    wsThreads.innerHTML = threads.map((t) => {
      const last = t.messages[t.messages.length - 1].text;
      const liveFlash = flashLive && t.id === "t-live" ? " is-live-update" : "";
      return '<button class="wsitem ' + (t.id === activeThreadId ? "is-active" : "") + liveFlash + '" data-id="' + t.id + '"><div class="wsitem__top"><span class="wsitem__who"><span class="wsitem__ava">' + t.avatar + '</span><span class="wsitem__name">' + esc(t.name) + '</span></span><span class="wsitem__conf">' + (statusIcon[t.status] || "✦") + " " + t.conf + '%</span></div><div class="wsitem__snip">' + esc(last) + '</div><div class="wsitem__foot"><span class="wsitem__intent">' + esc(t.intent) + '</span><span class="ubadge ubadge--' + t.urgency + '">' + t.urgency + "</span></div></button>";
    }).join("");
    $$(".wsitem", wsThreads).forEach((b) => b.addEventListener("click", () => { activeThreadId = b.dataset.id; renderThreads(); renderWsLog(); }, { signal }));
  }
  function renderWsLog() {
    const t = threads.find((x) => x.id === activeThreadId) || threads[0];
    if (!wsLog) return;
    wsClient.textContent = t.name; wsIntent.textContent = t.intent;
    wsResolve.classList.toggle("is-resolved", t.status === "resolved");
    wsResolve.textContent = t.status === "resolved" ? "Resolved" : "Resolve";
    const role = { client: "Customer", ai: "AI assistant", agent: "Your team" };
    wsLog.innerHTML = t.messages.map((m) => '<div class="wsmsg wsmsg--' + m.sender + '"><span class="wsmsg__who">' + role[m.sender] + (m.voice ? " · Voice" : "") + '</span><div class="wsmsg__bubble">' + esc(m.text) + "</div></div>").join("");
    wsLog.scrollTop = wsLog.scrollHeight;
  }
  if (wsThreads) {
    renderThreads(); renderWsLog();
    wsResolve.addEventListener("click", () => { const t = threads.find((x) => x.id === activeThreadId); if (t && t.status !== "resolved") { t.status = "resolved"; renderThreads(); renderWsLog(); } }, { signal });
    $("#wsReplyForm").addEventListener("submit", (e) => {
      e.preventDefault();
      const v = $("#wsReplyInput").value.trim(); if (!v) return;
      const t = threads.find((x) => x.id === activeThreadId); t.messages.push({ sender: "agent", text: v }); t.status = "agent_active";
      $("#wsReplyInput").value = "";
      renderThreads(); renderWsLog();
      if (t.id === "t-live") appendChat("ai", v);
    }, { signal });
  }

  /* ---------------- FAQ accordion ---------------- */
  $$(".acc").forEach((acc) => {
    const q = $(".acc__q", acc), a = $(".acc__a", acc);
    const open = (el) => { el.classList.add("is-open"); $(".acc__a", el).style.maxHeight = $(".acc__a", el).scrollHeight + "px"; };
    const close = (el) => { el.classList.remove("is-open"); $(".acc__a", el).style.maxHeight = ""; };
    if (acc.classList.contains("is-open")) requestAnimationFrame(() => open(acc));
    q.addEventListener("click", () => {
      const isOpen = acc.classList.contains("is-open");
      $$(".acc").forEach((o) => { if (o !== acc) close(o); });
      isOpen ? close(acc) : open(acc);
    }, { signal });
  });
  window.addEventListener("resize", () => { const o = $(".acc.is-open"); if (o) $(".acc__a", o).style.maxHeight = $(".acc__a", o).scrollHeight + "px"; }, { signal });

  /* ---------------- Embed modal ---------------- */
  const modal = $("#embedModal");
  const snippet = () => '<span class="c-com">&lt;!-- Osonflow calm portal --&gt;</span>\n<span class="c-tag">&lt;script&gt;</span>\n  window.osonflowConfig = {\n    portalId: <span class="c-str">"' + esc($("#modalCompany").value || "your-company") + '"</span>,\n    theme: <span class="c-str">"' + $("#modalTheme").value + '"</span>\n  };\n<span class="c-tag">&lt;/script&gt;</span>\n<span class="c-tag">&lt;script</span> <span class="c-attr">src</span>=<span class="c-str">"https://widget.osonflow.uz/widget.js"</span> async<span class="c-tag">&gt;&lt;/script&gt;</span>';
  function plainSnippet() { return '<!-- Osonflow calm portal -->\n<script>\n  window.osonflowConfig = {\n    portalId: "' + ($("#modalCompany").value || "your-company") + '",\n    theme: "' + $("#modalTheme").value + '"\n  };\n</' + 'script>\n<script src="https://widget.osonflow.uz/widget.js" async></' + "script>"; }
  function renderSnippet() { $("#modalSnippet").innerHTML = snippet(); }
  function openModal() { renderSnippet(); modal.hidden = false; document.body.style.overflow = "hidden"; }
  function closeModal() { modal.hidden = true; document.body.style.overflow = ""; }
  ["#heroEmbed", "#embedOpen2", "#ctaEmbed"].forEach((id) => { const el = $(id); if (el) el.addEventListener("click", openModal, { signal }); });
  ["#modalClose", "#modalCancel", "#modalOverlay"].forEach((id) => { const el = $(id); if (el) el.addEventListener("click", closeModal, { signal }); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !modal.hidden) closeModal(); }, { signal });
  $("#modalCompany") && $("#modalCompany").addEventListener("input", (e) => { e.target.value = e.target.value.toLowerCase().replace(/\s+/g, "-"); renderSnippet(); }, { signal });
  $("#modalTheme") && $("#modalTheme").addEventListener("change", renderSnippet, { signal });
  function copyText(text, btn) {
    const done = () => { const o = btn.textContent; btn.textContent = "Copied"; btn.classList.add("is-copied"); setTimeout(() => { btn.textContent = o; btn.classList.remove("is-copied"); }, 1600); };
    if (navigator.clipboard) navigator.clipboard.writeText(text).then(done, done); else done();
  }
  $("#modalCopy") && $("#modalCopy").addEventListener("click", (e) => copyText(plainSnippet(), e.currentTarget), { signal });
  $("#modalCopyClose") && $("#modalCopyClose").addEventListener("click", () => { copyText(plainSnippet(), $("#modalCopy")); setTimeout(closeModal, 300); }, { signal });

  /* ---------------- Embed code copy (channels) ---------------- */
  const copyBtn = $("#copyBtn");
  if (copyBtn) copyBtn.addEventListener("click", () => copyText('<!-- Osonflow widget -->\n<script src="https://widget.osonflow.uz/widget.js"\n        data-id="osf_live_7f3a9c"></' + "script>", copyBtn), { signal });

  /* ---------------- Card tilt micro-interaction ---------------- */
  if (!reduceMotion && window.matchMedia("(pointer:fine)").matches) {
    $$(".tilt").forEach((card) => {
      card.addEventListener("mousemove", (e) => {
        const r = card.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
        card.style.transform = "perspective(900px) rotateX(" + (-y * 4).toFixed(2) + "deg) rotateY(" + (x * 4).toFixed(2) + "deg) translateY(-4px)";
      }, { signal });
      card.addEventListener("mouseleave", () => (card.style.transform = ""), { signal });
    });
  }

  }

  window.__initOsonflowLanding = initOsonflowLanding;
})();