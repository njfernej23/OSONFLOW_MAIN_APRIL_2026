/* ============================================================
   Osonflow — Japandi landing interactivity (zero-build, vanilla)
   Live grounded chat + voice, knowledge training, agent inbox,
   interactive pipeline, ROI calculator, ASCII wave synthesizer,
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
    { id: "k-1", title: "Osonflow Core Overview", type: "file", source: "osonflow-faq.pdf",
      content: "Osonflow is an AI customer support platform. It behaves as a 'one calm front door' for websites. When a visitor reaches out via chat or voice, Osonflow answers using grounded local context like URLs, help-desk docs, and training files. When judgment is required, it gracefully routes the ticket to a human agent along with the full chat history.", date: "2026-06-01" },
    { id: "k-2", title: "Pricing & Plans", type: "url", source: "https://osonflow.ai/pricing",
      content: "Osonflow offers three tiers. Starter: $0/month with full AI widget, up to 1,000 threads, 1 crawler, and basic email handoff. Growth: 299.000 soms/month with priority voice, live shared inbox workspaces, up to 10 agent seats, unlimited crawler indexing, and Slack integration. Enterprise: custom pricing built with SLA guarantees, dedicated databases, and customized voice frequencies.", date: "2026-06-05" },
    { id: "k-3", title: "Real-time Voice Support", type: "file", source: "voice_capabilities.txt",
      content: "Osonflow includes bidirectional real-time streaming voice support. Visitors tap the voice button inside the widget to speak with the AI. It matches the same central queue as chat. If a voice interaction needs a person, it rings the active support team and hands off mid-call with an automated transcript prepared instantly in their shared inbox.", date: "2026-06-10" },
    { id: "k-4", title: "Integrations & Script Setup", type: "url", source: "https://docs.osonflow.ai/setup",
      content: "Osonflow installs with a single script tag in your head: <script src='https://embed.osonflow.ai/widget.js' data-id='oson-demo'></script>. It supports smooth state syncs, lets you customize theme presets like Japandi linen, and connects cleanly with CMS/CRM tools such as Shopify, WordPress, and HubSpot.", date: "2026-06-12" }
  ];

  function generateAiResponse(query) {
    const q = query.toLowerCase();
    const find = (id) => knowledge.find((k) => k.id === id);
    if (/(price|plan|cost|pricing|tier)/.test(q)) return (find("k-2") || {}).content || "We offer flexible plans from free, including a Growth plan with shared workspace seats and voice channels for 299.000 soms/mo.";
    if (/(voice|speak|realtime|audio|call)/.test(q)) return (find("k-3") || {}).content || "Osonflow features live, streaming voice-to-voice support. Users speak directly to the widget, and agents can join or read live transcripts inside the Shared Agent Workspace.";
    if (/(install|embed|script|setup|code|integrat)/.test(q)) return (find("k-4") || {}).content || "Setup is easy — inject our lightweight script tag in your document head to bring calm support live.";
    if (/(human|person|handoff|agent|escalat|specialist)/.test(q)) return "When confidence is below your buffers, or urgency is elevated, we gracefully queue the customer. The support agent inherits the entire transcript instantly on their screen.";
    for (const item of knowledge) {
      const kws = item.title.toLowerCase().split(/\s+/);
      if (kws.some((kw) => kw.length > 3 && q.includes(kw))) return "[Grounded from " + item.source + "]: " + item.content;
    }
    return "Based on our calm knowledge corpus, Osonflow handles repetitive inquiries with grounded AI and routes deeper questions to human agents with perfect conversation history.";
  }

  function intentFor(query) {
    const q = query.toLowerCase();
    if (/(price|plan|cost|pricing)/.test(q)) return "Pricing inquiry";
    if (/(voice|audio|call)/.test(q)) return "Voice capability";
    if (/(install|embed|script|setup|code)/.test(q)) return "Deployment setup";
    if (/(human|person|handoff|agent|escalat)/.test(q)) return "Escalation request";
    return "Sandbox interaction";
  }

  /* ---------------- Reveal on scroll (staggered) ---------------- */
  const reveals = $$("[data-reveal]");
  if ("IntersectionObserver" in window && !reduceMotion) {
    const io = trackObserver(new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          const sibs = $$("[data-reveal]", e.target.closest("section") || document).filter((n) => !n.classList.contains("is-in"));
          const i = sibs.indexOf(e.target);
          e.target.style.transitionDelay = Math.min(i, 4) * 80 + "ms";
          e.target.classList.add("is-in");
          io.unobserve(e.target);
        }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -8% 0px" }));
    reveals.forEach((el) => io.observe(el));
  } else { reveals.forEach((el) => el.classList.add("is-in")); }

  /* ---------------- Count-up stats ---------------- */
  const runCount = (el) => {
    const target = parseFloat(el.dataset.count), dur = 1500, start = performance.now();
    const step = (now) => { const p = Math.min((now - start) / dur, 1), eased = 1 - Math.pow(1 - p, 3); el.textContent = Math.round(eased * target).toString(); if (p < 1) requestAnimationFrame(step); };
    requestAnimationFrame(step);
  };
  if ("IntersectionObserver" in window) {
    const co = trackObserver(new IntersectionObserver((entries) => entries.forEach((e) => { if (e.isIntersecting) { runCount(e.target); co.unobserve(e.target); } }), { threshold: 0.6 }));
    $$("[data-count]").forEach((el) => co.observe(el));
  } else { $$("[data-count]").forEach((el) => (el.textContent = el.dataset.count)); }

  /* ---------------- Animate intent bars when revealed ---------------- */
  if ("IntersectionObserver" in window) {
    const bo = trackObserver(new IntersectionObserver((entries) => entries.forEach((e) => { if (e.isIntersecting) { $$("i[data-w]", e.target).forEach((i) => (i.style.width = i.dataset.w)); bo.unobserve(e.target); } }), { threshold: 0.4 }));
    $$(".ibars").forEach((el) => bo.observe(el));
  }

  /* ---------------- Hero parallax + tilt ---------------- */
  const stage = $(".hero__stage");
  if (stage && !reduceMotion && window.matchMedia("(pointer:fine)").matches) {
    stage.addEventListener("mousemove", (e) => {
      const r = stage.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
      $$("[data-float]", stage).forEach((p, i) => { const d = (i + 1) * 6; p.style.transform = "translate(" + (-x * d) + "px," + (-y * d) + "px)"; });
    }, { signal });
    stage.addEventListener("mouseleave", () => $$("[data-float]", stage).forEach((p) => (p.style.transform = "")), { signal });
  }

  /* ---------------- Hero typewriter ---------------- */
  const typeEl = $("#chatType");
  if (typeEl && !reduceMotion) {
    const phrases = ["Type a message…", "Ask about your order…", "Where is my refund?", "Talk to a human"];
    let pi = 0; typeEl.style.transition = "opacity 0.35s ease";
    trackInterval(() => { typeEl.style.opacity = "0"; setTimeout(() => { pi = (pi + 1) % phrases.length; typeEl.textContent = phrases[pi]; typeEl.style.opacity = "1"; }, 350); }, 2600);
  }

  /* ---------------- Pipeline stepper ---------------- */
  const pviews = [
    { rule: "", title: "Ingest raw organizational data", desc: "Rather than configuring static chatbots with keyphrase logic, Osonflow crawls public directories or matches local PDF context files. Every grounding variable is strictly indexed.",
      term: '<div class="term"><div class="term__title">=== OSONFLOW VECTOR GROUNDING ENGINE ===</div><pre>[RAW INDEX CHANNELS] ─────(oson index)─────▶ [SECURE CACHE MAPS]\n  ├─ billing_faqs.txt                    ├─ Fragment A [■■■■■■■■□□] 92ms\n  └─ setup_guides.pdf                    └─ Fragment B [■■■■■■■■■■] 130ms</pre><div class="term__ok">✔ SUCCESS: Generated vector segments automatically.</div></div>' },
    { title: "Immediate context generation", desc: "When a support ticket fires, context is paired down to corresponding semantic fragments. The LLM only reviews details strictly contained in your approved corpus.",
      term: '<div class="term"><div class="term__title term__title--ochre">=== ALIGNED CONTEXT CONSTRUCTOR ===</div><pre>PROMPT ───────────────▶ [ GROUNDING ALIGNER ] ─────▶ TARGET OUTPUT\n  "Do you have Pro?"          ▲                  "Growth plan is 299.000 soms/mo"\n                             │ (Verified Anchors)\n                     [APPROVED SYSTEM CORPUS]</pre><div class="term__ok">✔ RESPONSE: Fully cited matching corpus context.</div></div>' },
    { title: "Confidence scoring protection", desc: "Every candidate phrase undergoes structured scoring. If responses cannot link back to source vectors, Osonflow declines completion — bypassing user frustration.",
      term: '<div class="term"><div class="term__title">=== CONFIDENCE THRESHOLD EVALUATOR ===</div><pre>INCOMING ARTIFACT ─────▶ [ STOCHASTIC FILTER ] ────▶ 95% MATCH\n                            ├─ Anchor Matching: PASS\n                            ├─ Hallucination Prob: 0.02%\n                            └─ Handoff Bypass: OK</pre><div class="term__ok">✔ STATE: Highly confident output (bypasses human queue)</div></div>' },
    { title: "Seamless agent co-pilot switch", desc: "If confidence drops or a user requests human backup, Osonflow alerts staff, keeping dialogue visible in the shared dashboard. Transition requires zero customer interruption.",
      term: '<div class="term"><div class="term__title term__title--ochre">=== HUMAN CO-PILOT INJECTOR ===</div><pre>CUSTOMER STREAM ───────▶ [ LOW CONFIDENCE ] ──────▶ DISPATCH ALERT\n                            │ (Scored: 44%)         │\n                            └───────────────────────┴─▶ [AGENT DESK]</pre><div class="term__warn">! ACTION: Transitioning caller live to the Agent Workspace.</div></div>' }
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

  /* ---------------- Calm wave synthesizer (ASCII) ---------------- */
  const waveEl = $("#synthWave");
  if (waveEl) {
    const groundSlider = $("#groundSlider"), speedSlider = $("#speedSlider");
    let phase = 0, ground = 85, speed = 70;
    let waveCols = 44;
    const chars = ["█", "▓", "▒", "░", " "];
    function waveColumnCount() {
      const stage = waveEl.parentElement;
      if (!stage) return 44;
      const style = window.getComputedStyle(waveEl);
      const probe = document.createElement("span");
      probe.textContent = "█";
      probe.style.cssText = "position:absolute;visibility:hidden;white-space:pre;font-family:" + style.fontFamily + ";font-size:" + style.fontSize + ";letter-spacing:" + style.letterSpacing + ";";
      stage.appendChild(probe);
      const charWidth = probe.getBoundingClientRect().width || 10;
      stage.removeChild(probe);
      return Math.max(24, Math.min(44, Math.floor((stage.clientWidth - 8) / charWidth)));
    }
    function statusFor() {
      const total = ground + speed;
      if (ground < 40) return { label: "● Heuristic drift (risky)", drift: true };
      if (total > 165) return { label: "● Preternatural harmony", drift: false };
      if (total > 130) return { label: "● Hygge aligned (optimal)", drift: false };
      return { label: "● Stable infrastructure", drift: false };
    }
    function paramsChanged() {
      ground = parseInt(groundSlider.value, 10); speed = parseInt(speedSlider.value, 10);
      $("#groundVal").textContent = ground + "%";
      $("#speedVal").textContent = speed + "%";
      $("#mBounds").textContent = ground > 75 ? "ALIGNED" : "DRIFT";
      $("#mCalib").textContent = (6.5 - speed / 20).toFixed(1) + "s";
      $("#mStab").textContent = Math.round(ground * 0.98) + "dB";
      const s = statusFor(); const st = $("#synthStatus"); st.textContent = s.label; st.classList.toggle("drift", s.drift);
    }
    function draw() {
      const w = waveCols, h = 6; let out = "";
      const f1 = 0.12 + ground / 1000, f2 = 0.25, spd = 1 + speed / 50;
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const v1 = Math.sin(x * f1 + phase * spd) * (h / 2.2), v2 = Math.cos(x * f2 - phase * 0.5) * (h / 4.4);
          const dy = h / 2 + v1 + v2, dist = Math.abs(y - dy);
          out += dist < 0.6 ? chars[0] : dist < 1.2 ? chars[1] : dist < 1.8 ? chars[2] : dist < 2.4 ? chars[3] : chars[4];
        }
        out += "\n";
      }
      waveEl.textContent = out;
    }
    function resizeWave() {
      waveCols = waveColumnCount();
      draw();
    }
    groundSlider.addEventListener("input", paramsChanged, { signal });
    speedSlider.addEventListener("input", paramsChanged, { signal });
    paramsChanged();
    resizeWave();
    window.addEventListener("resize", resizeWave, { signal });
    if (!reduceMotion) { trackInterval(() => { phase = (phase + 0.15) % (Math.PI * 2); draw(); }, 60); }
  }

  /* ---------------- Experience room tabs ---------------- */
  const glider = $("#xtabGlider");
  function moveGlider(tab) { if (!glider || !tab) return; glider.style.left = tab.offsetLeft + "px"; glider.style.width = tab.offsetWidth + "px"; }
  function activateTab(name) {
    $$(".xtab").forEach((t) => { const on = t.dataset.xtab === name; t.classList.toggle("is-active", on); if (on) moveGlider(t); });
    $$(".xpanel").forEach((p) => p.classList.toggle("is-active", p.dataset.xpanel === name));
  }
  const firstTab = $(".xtab.is-active");
  if (firstTab) { requestAnimationFrame(() => moveGlider(firstTab)); window.addEventListener("resize", () => moveGlider($(".xtab.is-active")), { signal }); }
  $$(".xtab").forEach((t) => t.addEventListener("click", () => activateTab(t.dataset.xtab), { signal }));

  /* ---------------- Threads / workspace state ---------------- */
  const greet = "Greetings. I am Osonflow's calm AI assistant. Ask me anything about Osonflow plans, embed setups, or real-time voice routing pipelines.";
  const liveThread = { id: "t-live", name: "You (live simulation)", avatar: "U", status: "ai_handled", urgency: "low", conf: 95, intent: "Sandbox interaction",
    messages: [{ sender: "ai", text: greet }] };
  const threads = [ liveThread,
    { id: "t-1", name: "Hiroshi T.", avatar: "HT", status: "waiting", urgency: "high", conf: 74, intent: "Billing escalation",
      messages: [{ sender: "client", text: "Hi, I need help configuring our corporate credit card settings." }, { sender: "ai", text: "You can update billing info via Account settings in your dashboard. Want a direct update link?" }, { sender: "client", text: "No, we require single-invoice wire transfer setups. Can you route this only to billing specialists?" }] },
    { id: "t-2", name: "Freja Lindqvist", avatar: "FL", status: "ai_handled", urgency: "low", conf: 98, intent: "Documentation search",
      messages: [{ sender: "client", text: "Can I train the model by feeding it my support website link?" }, { sender: "ai", text: "Yes — on Growth you can register arbitrary URLs. The crawler indexes documents and updates context within 5 minutes." }, { sender: "client", text: "Perfect, works like a charm. I crawled the entire helpdesk." }] },
    { id: "t-3", name: "Julian Thorne", avatar: "JT", status: "agent_active", urgency: "medium", conf: 61, intent: "Voice debugging",
      messages: [{ sender: "client", text: "Hello, testing the Osonflow voice platform on my staging app." }, { sender: "ai", text: "Greetings, I'm ready to converse. How can I assist with your voice test?" }, { sender: "client", text: "The audio drops out slightly during real-time voice in local Chrome." }] },
    { id: "t-4", name: "Sora Tanaka", avatar: "ST", status: "resolved", urgency: "low", conf: 94, intent: "Customer gratitude",
      messages: [{ sender: "client", text: "Integrating Osonflow on Shopify. Will custom categories show automatically?" }, { sender: "ai", text: "Yes, Osonflow analyzes catalog metadata from Shopify tags and structures knowledge dynamically." }, { sender: "client", text: "Thank you! Setup reduced our initial response workload by 60%." }] }
  ];
  let activeThreadId = "t-live";

  /* ---------------- Grounding panel ---------------- */
  function setGrounding(intent, conf) {
    const gi = $("#groundIntent"), gm = $("#groundMeter"), gc = $("#groundConf");
    if (gi) gi.textContent = intent;
    if (gm) { gm.style.width = conf + "%"; gm.classList.toggle("low", conf < 80); }
    if (gc) gc.textContent = conf + "%";
  }

  /* ---------------- Chat widget ---------------- */
  const chatBody = $("#chatBody"), chatForm = $("#chatForm"), chatInput = $("#chatInput");
  function avatar(sender) { return sender === "client" ? "ME" : "AI"; }
  function appendChat(sender, text, voice) {
    const wrap = document.createElement("div");
    wrap.className = "msg msg--" + sender;
    wrap.innerHTML = '<span class="msg__ava">' + avatar(sender) + '</span><div class="msg__bubble">' + (voice ? '<span class="msg__voice">Voice log</span>' : "") + esc(text) + "</div>";
    chatBody.appendChild(wrap);
    chatBody.scrollTop = chatBody.scrollHeight;
  }
  function showTyping() {
    const t = document.createElement("div");
    t.className = "msg msg--ai"; t.id = "typingRow";
    t.innerHTML = '<span class="msg__ava">AI</span><div class="typing"><i></i><i></i><i></i></div>';
    chatBody.appendChild(t); chatBody.scrollTop = chatBody.scrollHeight;
  }
  function hideTyping() { const t = $("#typingRow"); if (t) t.remove(); }

  function pushToLive(sender, text, voice) {
    liveThread.messages.push({ sender, text, voice });
    if (activeThreadId === "t-live" && wsActivePanelVisible()) renderWsLog();
    renderThreads();
  }

  function handleUserMessage(text) {
    appendChat("client", text);
    pushToLive("client", text);
    const intent = intentFor(text);
    setGrounding(intent, /(human|person|handoff|agent|escalat)/.test(text.toLowerCase()) ? 62 : 95);
    liveThread.intent = intent;
    showTyping();
    setTimeout(() => {
      hideTyping();
      const reply = generateAiResponse(text);
      appendChat("ai", reply);
      pushToLive("ai", reply);
    }, 1100);
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
  $$("#suggestChips .chip").forEach((c) => c.addEventListener("click", () => { activateTab("chat"); handleUserMessage(c.textContent.trim()); }, { signal }));

  /* escalation */
  const escalateBtn = $("#escalateBtn");
  if (escalateBtn) escalateBtn.addEventListener("click", () => {
    appendChat("client", "[Alert] Visitor initiated human override / escalation.");
    liveThread.status = "waiting"; liveThread.urgency = "high"; liveThread.conf = 44; liveThread.intent = "Escalated bypass";
    pushToLive("client", "[Alert] Visitor initiated human override / escalation.");
    setGrounding("Escalated bypass", 44);
    showTyping();
    setTimeout(() => { hideTyping(); const m = "I have dispatched your thread to the Shared Agent Workspace. A specialist will assume control momentarily."; appendChat("ai", m); pushToLive("ai", m); }, 900);
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
    widgetState.textContent = on ? "Connected · Live voice link" : "Grounded AI assistant · Chat live";
    if (on) { setVoiceState("listening", "Listening carefully to your sound space…"); setTimeout(() => { if (voiceOn) setVoiceState("speaking", '"Greetings from Osonflow. I am trained on your local FAQs. Ask about pricing or widget setup."'); }, 1700); }
    else setVoiceState("idle", "Tap a prompt below to trigger a simulated real-time voice-to-voice support call.");
  }
  if (voiceToggle) voiceToggle.addEventListener("click", () => toggleVoice(!voiceOn), { signal });
  $$(".vbtn").forEach((b) => b.addEventListener("click", () => {
    const kind = b.dataset.voice;
    setVoiceState("listening", kind === "pricing" ? 'Analyzing voice… "What are your pricing plans?"' : 'Analyzing voice… "Can I connect a human specialist?"');
    setTimeout(() => {
      if (kind === "pricing") { const t = "Osonflow offers a Starter plan free, and a Growth plan at 299.000 soms/mo featuring priority real-time voice, crawling, and 10 agent workspace seats."; setVoiceState("speaking", '"' + t + '"'); pushToLive("ai", t, true); }
      else { const t = "Yes, I can transition us immediately. Handing off to the shared agent inbox with full history."; setVoiceState("speaking", '"' + t + '"'); liveThread.status = "waiting"; liveThread.urgency = "high"; liveThread.conf = 44; liveThread.intent = "Escalated bypass"; setGrounding("Escalated bypass", 44); pushToLive("ai", t, true); }
    }, 1400);
  }, { signal }));

  /* ---------------- Knowledge hub ---------------- */
  const poolList = $("#poolList"), trainForm = $("#trainForm");
  let trainType = "file";
  function renderPool() {
    if (!poolList) return;
    poolList.innerHTML = knowledge.map((k) => '<div class="kitem"><div class="kitem__top"><span class="kitem__title"><span class="kitem__type">' + (k.type === "file" ? "▤" : "↗") + "</span>" + esc(k.title) + '</span><span class="kitem__src">' + esc(k.source) + '</span></div><div class="kitem__body">' + esc(k.content) + '</div><div class="kitem__foot"><span>Active anchor · Secured</span><span>Indexed ' + k.date + "</span></div></div>").join("");
  }
  renderPool();
  $$(".tseg").forEach((s) => s.addEventListener("click", () => {
    $$(".tseg").forEach((x) => x.classList.remove("is-active")); s.classList.add("is-active");
    trainType = s.dataset.ttype;
    $("#trainSource").value = trainType === "file" ? "support_logs.txt" : "https://help.yoursite.com/faq";
  }, { signal }));
  if (trainForm) trainForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const title = $("#trainTitle").value.trim(), content = $("#trainContent").value.trim(), source = $("#trainSource").value.trim();
    if (!title || !content || !source) return;
    knowledge.unshift({ id: "k-" + Date.now(), title, type: trainType, source, content, date: new Date().toISOString().slice(0, 10) });
    renderPool();
    $("#trainTitle").value = ""; $("#trainContent").value = ""; $("#trainSource").value = "";
    const ok = $("#trainOk"); ok.hidden = false; setTimeout(() => (ok.hidden = true), 4000);
  }, { signal });

  /* ---------------- Agent workspace ---------------- */
  const wsThreads = $("#wsThreads"), wsLog = $("#wsLog"), wsClient = $("#wsClient"), wsIntent = $("#wsIntent"), wsResolve = $("#wsResolve");
  const statusIcon = { resolved: "✓", agent_active: "◉", waiting: "◷", ai_handled: "✦" };
  function wsActivePanelVisible() { const p = $('.xpanel[data-xpanel="inbox"]'); return p && p.classList.contains("is-active"); }
  function renderThreads() {
    if (!wsThreads) return;
    $("#wsOpenCount").textContent = threads.filter((t) => t.status !== "resolved").length + " open";
    wsThreads.innerHTML = threads.map((t) => {
      const last = t.messages[t.messages.length - 1].text;
      return '<button class="wsitem ' + (t.id === activeThreadId ? "is-active" : "") + '" data-id="' + t.id + '"><div class="wsitem__top"><span class="wsitem__who"><span class="wsitem__ava">' + t.avatar + '</span><span class="wsitem__name">' + esc(t.name) + '</span></span><span class="wsitem__conf">' + (statusIcon[t.status] || "✦") + " " + t.conf + '%</span></div><div class="wsitem__snip">' + esc(last) + '</div><div class="wsitem__foot"><span class="wsitem__intent">' + esc(t.intent) + '</span><span class="ubadge ubadge--' + t.urgency + '">' + t.urgency + "</span></div></button>";
    }).join("");
    $$(".wsitem", wsThreads).forEach((b) => b.addEventListener("click", () => { activeThreadId = b.dataset.id; renderThreads(); renderWsLog(); }, { signal }));
  }
  function renderWsLog() {
    const t = threads.find((x) => x.id === activeThreadId) || threads[0];
    if (!wsLog) return;
    wsClient.textContent = t.name; wsIntent.textContent = t.intent;
    wsResolve.classList.toggle("is-resolved", t.status === "resolved");
    wsResolve.textContent = t.status === "resolved" ? "Resolved" : "Resolve";
    const role = { client: "Client", ai: "AI Assistant", agent: "Human Specialist" };
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
  // re-render workspace log when switching to inbox tab
  $$('.xtab[data-xtab="inbox"]').forEach((t) => t.addEventListener("click", () => renderWsLog(), { signal }));

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
  const snippet = () => '<span class="c-com">&lt;!-- Osonflow calm portal --&gt;</span>\n<span class="c-tag">&lt;script&gt;</span>\n  window.osonflowConfig = {\n    portalId: <span class="c-str">"' + esc($("#modalCompany").value || "your-company") + '"</span>,\n    theme: <span class="c-str">"' + $("#modalTheme").value + '"</span>\n  };\n<span class="c-tag">&lt;/script&gt;</span>\n<span class="c-tag">&lt;script</span> <span class="c-attr">src</span>=<span class="c-str">"https://embed.osonflow.ai/widget.js"</span> async<span class="c-tag">&gt;&lt;/script&gt;</span>';
  function plainSnippet() { return '<!-- Osonflow calm portal -->\n<script>\n  window.osonflowConfig = {\n    portalId: "' + ($("#modalCompany").value || "your-company") + '",\n    theme: "' + $("#modalTheme").value + '"\n  };\n</' + 'script>\n<script src="https://embed.osonflow.ai/widget.js" async></' + "script>"; }
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
  if (copyBtn) copyBtn.addEventListener("click", () => copyText('<!-- Osonflow widget -->\n<script src="https://embed.osonflow.ai/widget.js"\n        data-id="osf_live_7f3a9c"></' + "script>", copyBtn), { signal });

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