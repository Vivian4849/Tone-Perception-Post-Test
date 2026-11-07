/* ============================================================================
   Mandarin Tone Perception Test — application logic
   Shared by post-test pages: practice.html and post.html. The page type comes from
   <body data-test-type="pilot|main">.

   One item = TWO syllables. Each syllable gets its own row of four tone
   buttons, and both rows must be answered before "Next" unlocks.
   ========================================================================== */

(function () {
  "use strict";

  /* ==========================================================================
     [1]  GOOGLE APPS SCRIPT ENDPOINT
     --------------------------------------------------------------------------
     Two ways to set it — pick ONE:

     (a) RECOMMENDED — put it in assets/config.js, so you never touch this file:

             window.TONE_TEST_ENDPOINT = "https://script.google.com/macros/s/AKfy.../exec";

     (b) or paste it below between the quotes.

     Leave both empty and the page simply skips the network call — the CSV
     download keeps working, so nothing breaks before you are ready.
     ========================================================================== */
  const ENDPOINT_INLINE = "";

  const ENDPOINT = (function () {
    const inline = String(ENDPOINT_INLINE || "").trim();
    if (inline) return inline;
    try {
      const fromConfig = (typeof window !== "undefined" && window.TONE_TEST_ENDPOINT)
        ? String(window.TONE_TEST_ENDPOINT).trim()
        : "";
      return fromConfig || "";
    } catch (err) {
      return "";
    }
  })();

  /* Shown only when an upload fails, so a screenshot tells us which build ran. */
  const BUILD = "v2.7-post-2026-11-05";

  function endpointHost() {
    if (!ENDPOINT) return "(none)";
    try { return new URL(ENDPOINT).host; } catch (err) { return ENDPOINT.slice(0, 60); }
  }

  /* ==========================================================================
     [2]  Test definition (read from assets/config.js)
     ========================================================================== */
  const TEST_TYPE = (document.body.getAttribute("data-test-type") || "main").toLowerCase();
  const IS_PILOT = TEST_TYPE === "pilot";
  /* Post-test build: practice.html declares data-test-type="post-practice",
     post.html declares data-test-type="post". The matching key in
     assets/config.js is always the same string (AUDIO_CONFIG[TEST_TYPE]). */
  const TYPE_LABELS = {
    "pilot": "Pilot Test",
    "main": "Main Test",
    "post-practice": "Practice",
    "post": "Post Test"
  };
  const TYPE_LABEL = TYPE_LABELS[TEST_TYPE] ||
    (TEST_TYPE.charAt(0).toUpperCase() + TEST_TYPE.slice(1));

  /* Set on <body data-next="main.html"> — the page to open automatically once
     this test has been submitted. Empty on the last test in the chain. */
  const NEXT_PAGE = (document.body.getAttribute("data-next") || "").trim();

  /* How long the "well done" screen stays up before the next section starts.
     15 s, not 6: a student who is still reading the screen (or saving the CSV)
     must not be yanked into the next section mid-sentence. */
  const ADVANCE_MS = 15000;

  /* Audio preload: how many files at once, and how many extra attempts. */
  const AUDIO_CONCURRENCY = 4;
  const AUDIO_RETRY = 2;

  const TONES = [
    { id: 1, mark: "\u02C9", name: "High level" },
    { id: 2, mark: "\u02CA", name: "Rising" },
    { id: 3, mark: "\u02C7", name: "Dipping" },
    { id: 4, mark: "\u02CB", name: "Falling" }
  ];

  /* The four tone contours, drawn as strokes instead of relying on the tiny
     modifier letters (ˉ ˊ ˇ ˋ), which almost disappear at small sizes. */
  const TONE_PATHS = {
    1: "M5 17H35",
    2: "M6 28L34 6",
    3: "M6 6Q20 38 34 6",
    4: "M6 6L34 28"
  };

  const CFG_ITEMS = (typeof AUDIO_CONFIG !== "undefined" && Array.isArray(AUDIO_CONFIG[TEST_TYPE]))
    ? AUDIO_CONFIG[TEST_TYPE].filter(function (x) { return x && typeof x === "object"; })
    : [];

  const MAX_PLAYS = (typeof SETTINGS !== "undefined" && Number(SETTINGS.maxPlays) > 0)
    ? Math.floor(Number(SETTINGS.maxPlays)) : 2;

  const REQUIRE_ANSWER = !(typeof SETTINGS !== "undefined" && SETTINGS.requireAnswerBeforeNext === false);
  const SHUFFLE = !!(typeof SETTINGS !== "undefined" && SETTINGS.shuffleItems);

  const KEY_STORAGE = "ttp.answerKey.v2." + TEST_TYPE;
  const NAME_STORAGE = "ttp.student";
  const PROGRESS_STORAGE = "ttp.progress.v2." + TEST_TYPE;

  /* ==========================================================================
     [3]  State
     ========================================================================== */
  const state = {
    phase: "start",          // start | test | done
    student: { name: "", major: "" },
    items: [],
    pos: 0,
    uploads: [],             // [{ name, src }]  loaded at run time
    keyOverride: null,       // flat array of 0..4, or null
    qStart: 0,
    active: 0,               // flat index of the syllable the keyboard acts on
    blockEls: [],            // [{ group, stim, el }]  for the current item
    playerUI: [],            // [{ g, btn, status, hint, count }]
    playingGroup: null,
    preparingGroup: null,    // clicked, but the file is still loading
    playedThisAttempt: false,// a play was counted for the current attempt
    audioSrc: "",            // what the shared <audio> element currently holds
    waitCleanup: null,       // cancels the "wait for canplay" listeners
    playTimer: null,
    stallTimer: null,
    audio: null,
    audioCache: Object.create(null),   // src -> blob URL (preloaded)
    preload: null,                     // { total, done, failed }
    prefetch: null,
    prefetchSrc: "",
    csvUrl: "",
    submitted: false,
    postSettled: false,
    postOk: null,
    settledAt: 0,
    advTimer: null
  };

  const $ = function (id) { return document.getElementById(id); };
  const els = {};

  /* ==========================================================================
     [4]  Boot
     ========================================================================== */
  // If the previous section failed to upload, say so on this page instead of
  // letting it disappear with the page the student already left.
  function showUploadBanner() {
    let info = null;
    try {
      const raw = sessionStorage.getItem("tpUploadFailed");
      if (!raw) return;
      sessionStorage.removeItem("tpUploadFailed");
      info = JSON.parse(raw);
    } catch (e) { return; }
    if (!info) return;

    const bar = document.createElement("div");
    bar.setAttribute("role", "alert");
    bar.style.cssText = "margin:0 0 18px;padding:12px 16px;border:1px solid #e2b1aa;" +
      "border-left:4px solid #b4231a;border-radius:10px;background:#fdf1ef;color:#8a1b12;" +
      "font-size:13.5px;line-height:1.55";
    const which = info.test === "pilot" ? "Pilot" : "Main";
    bar.textContent = "Heads-up: the " + which + " results could not be uploaded to the spreadsheet (" +
      info.message + "). The CSV file on this computer is complete \u2014 please tell the researcher before continuing.";

    const host = document.querySelector(".card") || document.body;
    host.insertBefore(bar, host.firstChild);
  }

  function boot() {
    els.screens = {
      start: $("screen-start"),
      test: $("screen-test"),
      done: $("screen-done")
    };
    els.form = $("startForm");
    els.nameInput = $("nameInput");
    els.majorInput = $("majorInput");
    els.nationalityInput = $("nationalityInput");
    els.yearsSelect = $("yearsSelect");
    els.hskInput = $("hskInput");
    els.formError = $("formError");
    els.startBtn = $("startBtn");

    els.qNum = $("qNum");
    els.qTotal = $("qTotal");
    els.bar = $("bar");
    els.whoMeta = $("whoMeta");
    els.playsPill = $("playsPill");
    els.players = $("players");
    els.syllables = $("syllables");
    els.prevBtn = $("prevBtn");
    els.nextBtn = $("nextBtn");
    els.audioNote = $("audioNote");

    els.setupWarning = $("setupWarning");
    els.audioFiles = $("audioFiles");
    els.audioFolder = $("audioFolder");
    els.audioStatus = $("audioStatus");
    els.keyInput = $("keyInput");
    els.keyStatus = $("keyStatus");
    els.applyKey = $("applyKey");
    showUploadBanner();
    els.clearKey = $("clearKey");

    els.doneName = $("doneName");
    els.scoreValue = $("scoreValue");
    els.scoreDen = $("scoreDen");
    els.scoreSub = $("scoreSub");
    els.summaryBody = $("summaryBody");
    els.downloadBtn = $("downloadBtn");
    els.finishBtn = $("finishBtn");
    els.postStatus = $("postStatus");
    els.nextBox = $("nextBox");
    els.countdown = $("countdown");
    els.nextNowBtn = $("nextNowBtn");
    els.toast = $("toast");

    // Load a previously saved answer key for this test type.
    try {
      const saved = localStorage.getItem(KEY_STORAGE);
      if (saved) {
        const parsed = parseKeyList(saved);
        if (parsed.length === totalSyllables()) state.keyOverride = parsed;
      }
    } catch (err) { /* storage blocked — not fatal */ }

    syncKeyInput();
    refreshAudioStatus();
    refreshWarning();

    els.form.addEventListener("submit", onStart);

    [els.nameInput, els.majorInput, els.nationalityInput, els.yearsSelect, els.hskInput].forEach(function (input) {
      if (!input) return;
      input.addEventListener("input", function () {
        if (!els.formError.hidden) els.formError.hidden = true;
      });
      input.addEventListener("change", function () {
        if (!els.formError.hidden) els.formError.hidden = true;
      });
    });

    els.prevBtn.addEventListener("click", function () { if (state.pos > 0) goTo(state.pos - 1); });
    els.nextBtn.addEventListener("click", onNext);

    if (els.audioFiles) els.audioFiles.addEventListener("change", function () { onFilesPicked(this.files); });
    if (els.audioFolder) els.audioFolder.addEventListener("change", function () { onFilesPicked(this.files); });
    els.applyKey.addEventListener("click", onApplyKey);
    els.clearKey.addEventListener("click", onClearKey);

    els.downloadBtn.addEventListener("click", function () {
      downloadCsv();
      // A student who is busy saving the file must not be pushed into the next
      // section: give them 20 s more before the automatic hand-off.
      if (NEXT_PAGE) {
        if (state.advTimer) { clearInterval(state.advTimer); state.advTimer = null; }
        startAdvance();          // fresh 15 s, counted from the click
      }
    });
    els.finishBtn.addEventListener("click", function () {
      clearProgress();
      if (IS_PILOT) window.location.reload();
      else window.location.href = "index.html";
    });
    if (NEXT_PAGE) els.finishBtn.hidden = true;
    if (els.nextNowBtn) els.nextNowBtn.addEventListener("click", goNext);

    document.addEventListener("keydown", onKeydown);

    window.addEventListener("beforeunload", function (e) {
      if (state.phase === "test") {
        e.preventDefault();
        e.returnValue = "";
        return "";
      }
    });

    // Start pulling the audio into memory immediately: the student spends the
    // next half-minute typing their name, which is exactly enough time.
    preloadAudio();
    resume();
  }

  /* --------------------------------------------------------------------------
     Hand-off from the previous page: ?name=…&major=…&from=…
     If the audio for this section is fully available, the test starts at once.
     If it is not (nothing configured yet), the start screen stays up so the
     teacher can load the files in the setup panel first.
     -------------------------------------------------------------------------- */
  function resume() {
    const q = parseQuery();
    let name = q.name;
    let major = q.major;
    let session = q.session;
    let listen = q.listen;
    let answer = q.answer;
    let nationality = q.nat;
    let years = q.years;
    let hsk = q.hsk;

    if (!name || !major || !listen || !answer) {
      try {
        const saved = JSON.parse(sessionStorage.getItem(NAME_STORAGE) || "null");
        if (saved) {
          name = name || saved.name;
          major = major || saved.major;
          listen = listen || saved.listen;
          answer = answer || saved.answer;
          nationality = nationality || saved.nationality;
          years = years || saved.years;
          hsk = hsk || saved.hsk;
        }
      } catch (err) { /* ignore */ }
    }

    if (name) els.nameInput.value = name;
    if (major) els.majorInput.value = major;
    if (nationality && els.nationalityInput) els.nationalityInput.value = nationality;
    if (years && els.yearsSelect) els.yearsSelect.value = years;
    if (hsk && els.hskInput) els.hskInput.value = hsk;

    if (!name || !major) return;
    if (!CFG_ITEMS.length) return;

    /* Post-test safety net: while every answer is still the 0 placeholder the
       page must NOT auto-start, otherwise the red "No answer key" banner is
       skipped and a whole session gets recorded as "Not scored". */
    const hasAnyKey = CFG_ITEMS.some(function (it) {
      return Array.isArray(it.answer) && it.answer.some(function (v) { return v >= 1; });
    });

    if (audioReady() && hasAnyKey) {
      beginSession(name, major, {
        session: session, listen: listen, answer: answer,
        nationality: nationality, years: years, hsk: hsk
      });
    }
  }

  function parseQuery() {
    const out = { name: "", major: "", from: "", session: "", listen: "", answer: "", nat: "", years: "", hsk: "" };
    const search = String(window.location.search || "").replace(/^\?/, "");
    if (!search) return out;
    search.split("&").forEach(function (pair) {
      const bits = pair.split("=");
      const k = decodeURIComponent(bits[0] || "");
      let v = (bits[1] || "").replace(/\+/g, " ");
      try { v = decodeURIComponent(v); } catch (err) { /* keep raw */ }
      if (Object.prototype.hasOwnProperty.call(out, k) && k !== "from") out[k] = v;
      if (k === "from") out.from = v;
    });
    return out;
  }

  /* ==========================================================================
     [5]  Audio pool (batch files / whole folder)
     ========================================================================== */
  function naturalCompare(a, b) {
    return a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" });
  }

  function onFilesPicked(fileList) {
    if (!fileList || !fileList.length) return;

    const picked = Array.prototype.slice.call(fileList)
      .filter(function (f) { return /^audio\//i.test(f.type) || /\.(mp3|wav|m4a|ogg|aac|flac|webm)$/i.test(f.name); })
      .sort(function (a, b) { return naturalCompare(a.name, b.name); });

    if (!picked.length) {
      toast("No audio files found in that selection.");
      return;
    }

    state.uploads.forEach(function (u) { if (u.src.indexOf("blob:") === 0) URL.revokeObjectURL(u.src); });
    state.uploads = picked.map(function (f) {
      return { name: f.name, src: URL.createObjectURL(f) };
    });

    refreshAudioStatus();
    refreshWarning();
    if (state.phase === "test") renderItem();
  }

  function syllableCountOf(item) {
    if (Array.isArray(item.answer) && item.answer.length) return Math.max(1, item.answer.length);
    if (Array.isArray(item.audio) && item.audio.length) return Math.max(1, item.audio.length);
    if (typeof item.answer === "number") return 1;
    return 2;
  }

  function totalSyllables() {
    return CFG_ITEMS.reduce(function (sum, it) { return sum + syllableCountOf(it); }, 0);
  }

  /* Resolve the sound for syllable `s` of item `i`:
     a path from config.js wins, otherwise the files loaded in this session. */
  function resolveAudio(i, s, n) {
    const it = CFG_ITEMS[i] || {};
    const a = it.audio;
    let cfg = "";
    if (Array.isArray(a)) cfg = String(a[Math.min(s, a.length - 1)] || "").trim();
    else if (a) cfg = String(a).trim();

    if (cfg) return { src: cfg, name: cfg.split(/[\\/]/).pop() };

    const up = state.uploads;
    if (!up.length) return { src: "", name: "" };

    let file = null;
    if (up.length >= CFG_ITEMS.length * n) file = up[i * n + s];   // two files per item
    else file = up[i];                                            // one file per item

    return file ? { src: file.src, name: file.name } : { src: "", name: "" };
  }

  function audioReady() {
    let total = 0;
    let ok = 0;
    CFG_ITEMS.forEach(function (it, i) {
      const n = syllableCountOf(it);
      for (let s = 0; s < n; s++) {
        total += 1;
        if (resolveAudio(i, s, n).src) ok += 1;
      }
    });
    return total > 0 && ok === total;
  }

  function parseKeyList(text) {
    const out = [];
    String(text || "").split(/[\s,;]+/).forEach(function (token) {
      if (!token) return;
      token.split(/[-/|]/).forEach(function (part) {
        if (part === "") return;
        const n = parseInt(part, 10);
        out.push(n >= 1 && n <= 4 ? n : 0);
      });
    });
    return out;
  }

  function baseKeys() {
    const flat = [];
    CFG_ITEMS.forEach(function (it) {
      const n = syllableCountOf(it);
      for (let s = 0; s < n; s++) {
        let v = Array.isArray(it.answer) ? it.answer[s] : (n === 1 ? it.answer : 0);
        v = Number(v);
        flat.push(v >= 1 && v <= 4 ? v : 0);
      }
    });
    return flat;
  }

  function resolveKeys() {
    if (state.keyOverride && state.keyOverride.length === totalSyllables()) return state.keyOverride.slice();
    return baseKeys();
  }

  function keysToText(keys) {
    const pairs = [];
    for (let i = 0; i < keys.length; i += 2) {
      pairs.push(keys[i + 1] === undefined ? String(keys[i]) : keys[i] + "-" + keys[i + 1]);
    }
    return pairs.join(", ");
  }

  function syncKeyInput() {
    if (state.keyOverride) {
      els.keyInput.value = keysToText(state.keyOverride);
      els.keyStatus.textContent = "Using the key saved on this device (" + state.keyOverride.length + " syllables).";
      els.keyStatus.className = "status-line is-ok";
      return;
    }
    els.keyInput.value = keysToText(baseKeys());
    els.keyStatus.textContent = "Loaded from assets/config.js.";
    els.keyStatus.className = "status-line";
  }

  function onApplyKey() {
    const parsed = parseKeyList(els.keyInput.value);
    const expected = totalSyllables();

    if (expected === 0) {
      toast("There are no items configured for this test yet.");
      return;
    }
    if (parsed.length !== expected) {
      toast("Expected " + expected + " values (2 per item), got " + parsed.length + ". Nothing was applied.");
      return;
    }
    const known = parsed.filter(function (n) { return n >= 1; }).length;
    if (known === 0) {
      toast("That key has no valid 1\u20134 values.");
      return;
    }

    state.keyOverride = parsed;
    try { localStorage.setItem(KEY_STORAGE, parsed.join(",")); } catch (err) { /* ignore */ }
    syncKeyInput();
    refreshWarning();
    toast("Answer key applied: " + known + " of " + parsed.length + " syllables scored.");
  }

  function onClearKey() {
    state.keyOverride = null;
    try { localStorage.removeItem(KEY_STORAGE); } catch (err) { /* ignore */ }
    syncKeyInput();
    refreshWarning();
    toast("Saved key cleared \u2014 config.js is used again.");
  }

  function refreshAudioStatus() {
    if (!els.audioStatus) return;

    const items = CFG_ITEMS.length;
    const trials = totalSyllables();
    const n = items ? syllableCountOf(CFG_ITEMS[0]) : 2;

    if (!state.uploads.length) {
      let fromCfg = 0;
      CFG_ITEMS.forEach(function (it, i) {
        const m = syllableCountOf(it);
        for (let s = 0; s < m; s++) if (resolveAudio(i, s, m).src) fromCfg += 1;
      });
      els.audioStatus.textContent = fromCfg
        ? fromCfg + " of " + trials + " syllable sound(s) have a path in config.js; no files loaded in this session."
        : "No files loaded in this session and no audio path in config.js yet.";
      els.audioStatus.className = "status-line";
      return;
    }

    let msg = state.uploads.length + " audio file(s) loaded: " +
      state.uploads.slice(0, 3).map(function (u) { return u.name; }).join(", ");
    if (state.uploads.length > 3) msg += " \u2026";

    if (state.uploads.length === items * n) {
      msg += " \u2014 matched as " + n + " files per item (" + items + " items).";
      els.audioStatus.className = "status-line is-ok";
    } else if (state.uploads.length === items) {
      msg += " \u2014 matched as one file per item, used for both syllables.";
      els.audioStatus.className = "status-line is-ok";
    } else {
      msg += " \u2014 expected " + items + " or " + (items * n) + " files for " + items + " items.";
      els.audioStatus.className = "status-line is-warn";
    }
    els.audioStatus.textContent = msg;
  }

  function refreshWarning() {
    if (!els.setupWarning) return;
    const problems = [];

    if (!CFG_ITEMS.length) {
      problems.push("No test items are configured for the " + TYPE_LABEL + ". Add entries to the \"" +
        TEST_TYPE + "\" list in assets/config.js.");
    } else {
      const trials = totalSyllables();
      let withAudio = 0;
      CFG_ITEMS.forEach(function (it, i) {
        const n = syllableCountOf(it);
        for (let s = 0; s < n; s++) if (resolveAudio(i, s, n).src) withAudio += 1;
      });

      if (withAudio === 0) {
        problems.push("No audio is attached yet, so the " + TYPE_LABEL + " will run silently. Open " +
          "\u201cSetup (teacher only)\u201d below to load files, or add paths in assets/config.js.");
      } else if (withAudio < trials) {
        problems.push(withAudio + " of " + trials + " syllable sounds have audio; the rest will be silent.");
      }

      const keyed = resolveKeys().filter(function (k) { return k >= 1; }).length;
      if (keyed === 0) {
        problems.push("No answer key is set, so responses will be recorded but not scored. " +
          "Add answers in config.js or apply a key below.");
      } else if (keyed < trials) {
        problems.push(keyed + " of " + trials + " syllables have an answer key; the rest will be marked \u201cNot scored\u201d.");
      }
    }

    if (!problems.length) {
      els.setupWarning.hidden = true;
      els.setupWarning.textContent = "";
      return;
    }
    els.setupWarning.hidden = false;
    els.setupWarning.innerHTML = "";
    problems.forEach(function (p) {
      const line = document.createElement("div");
      line.textContent = p;
      els.setupWarning.appendChild(line);
    });
  }

  /* ==========================================================================
     [6]  Start a session
     ========================================================================== */
  function onStart(e) {
    e.preventDefault();

    const name = els.nameInput.value.trim();
    const major = els.majorInput.value.trim();
    const nationality = els.nationalityInput ? els.nationalityInput.value.trim() : "";
    const years = els.yearsSelect ? els.yearsSelect.value : "";
    const hsk = els.hskInput ? els.hskInput.value.trim() : "";

    if (!name || !major || (els.nationalityInput && !nationality) || (els.yearsSelect && !years)) {
      els.formError.hidden = false;
      if (!name) {
        els.formError.textContent = "Please enter your name before starting.";
        els.nameInput.focus();
      } else if (!major) {
        els.formError.textContent = "Please enter your major before starting.";
        els.majorInput.focus();
      } else if (els.nationalityInput && !nationality) {
        els.formError.textContent = "Please enter your nationality before starting.";
        els.nationalityInput.focus();
      } else {
        els.formError.textContent = "Please choose how long you have studied Chinese.";
        els.yearsSelect.focus();
      }
      return;
    }
    els.formError.hidden = true;

    if (!CFG_ITEMS.length) {
      els.formError.hidden = false;
      els.formError.textContent = "No test items are configured. Add entries to \"" + TEST_TYPE + "\" in assets/config.js.";
      return;
    }

    // Started from this page's own form (not handed over from the entry page):
    // keep whatever session / device info the URL or the last run carried.
    const q = parseQuery();
    let saved = null;
    try { saved = JSON.parse(sessionStorage.getItem(NAME_STORAGE) || "null"); } catch (err) { saved = null; }
    beginSession(name, major, {
      fresh: true,
      session: q.session || (saved && saved.session) || "1",
      listen: q.listen || (saved && saved.listen) || "",
      answer: q.answer || (saved && saved.answer) || "",
      nationality: nationality || q.nat || (saved && saved.nationality) || "",
      years: years || q.years || (saved && saved.years) || "",
      hsk: hsk || q.hsk || (saved && saved.hsk) || ""
    });
  }

  function beginSession(name, major, extras) {
    buildItems();
    const e = extras || {};
    state.student = {
      name: name,
      major: major,
      session: String(e.session || "1").trim() || "1",
      listen: String(e.listen || "").trim(),
      answer: String(e.answer || "").trim(),
      nationality: String(e.nationality || "").trim(),
      years: String(e.years || "").trim(),
      hsk: String(e.hsk || "").trim()
    };
    state.pos = 0;
    state.phase = "test";
    state.qStart = performance.now();

    /* A reload must never send the student back to item 1 (that is what
       happened when a download replaced the page). Same student, same test,
       under six hours old -> pick up exactly where the answers stop. */
    let restored = 0;
    if (!e.fresh) {
      const saved = loadProgress();
      if (saved) restored = applyProgress(saved);
    }

    try {
      sessionStorage.setItem(NAME_STORAGE, JSON.stringify({
        name: name, major: major, session: state.student.session,
        listen: state.student.listen, answer: state.student.answer,
        nationality: state.student.nationality, years: state.student.years, hsk: state.student.hsk
      }));
    } catch (err) { /* ignore */ }

    els.whoMeta.textContent = name + "  \u00B7  " + major + "  \u00B7  " + TYPE_LABEL;
    show("test");
    renderItem();
    if (restored > 0) {
      toast("Resumed at item " + (state.pos + 1) + " \u2014 " + restored + " earlier answers kept");
    }
    saveProgress();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  /* --------------------------------------------------------------------------
     Progress is written to localStorage on every change. Nothing is lost if
     the tab reloads, the laptop dies, or a download replaces the page.
     -------------------------------------------------------------------------- */
  function saveProgress() {
    if (state.phase !== "test" && !state.submitted) return;
    try {
      localStorage.setItem(PROGRESS_STORAGE, JSON.stringify({
        v: 2,
        test: TEST_TYPE,
        at: Date.now(),
        name: state.student.name,
        major: state.student.major,
        student: state.student,
        pos: state.pos,
        phase: state.phase,
        submitted: state.submitted,
        items: state.items.map(function (it) {
          return {
            n: it.n,
            g: it.groups.map(function (g) { return g.plays; }),
            s: it.groups.map(function (g) {
              return g.stims.map(function (x) { return x.choice; });
            })
          };
        })
      }));
    } catch (err) { /* storage full or disabled — the CSV still covers it */ }
  }

  function loadProgress() {
    let s = null;
    try { s = JSON.parse(localStorage.getItem(PROGRESS_STORAGE) || "null"); } catch (err) { s = null; }
    if (!s || s.v !== 2 || s.test !== TEST_TYPE) return null;
    if (s.submitted) return null;
    if (!state.student.name || s.name !== state.student.name) return null;
    if (Date.now() - s.at > 6 * 3600 * 1000) return null;
    if (!Array.isArray(s.items) || s.items.length !== state.items.length) return null;
    return s;
  }

  function applyProgress(s) {
    const byN = Object.create(null);
    s.items.forEach(function (rec) { byN[rec.n] = rec; });
    let restored = 0;

    state.items.forEach(function (it) {
      const rec = byN[it.n];
      if (!rec) return;
      it.groups.forEach(function (g, gi) {
        if (rec.g && typeof rec.g[gi] === "number") {
          g.plays = Math.max(0, Math.min(MAX_PLAYS, rec.g[gi]));
        }
        g.stims.forEach(function (st, si) {
          const c = rec.s && rec.s[gi] && rec.s[gi][si];
          if (c >= 1) { st.choice = c; restored += 1; }
        });
      });
    });

    state.pos = Math.max(0, Math.min(state.items.length - 1, Number(s.pos) || 0));
    return restored;
  }

  function clearProgress() {
    try { localStorage.removeItem(PROGRESS_STORAGE); } catch (err) { /* ignore */ }
  }

  function buildItems() {
    const keys = resolveKeys();
    let k = 0;

    let items = CFG_ITEMS.map(function (it, i) {
      const n = syllableCountOf(it);
      const groups = [];

      for (let s = 0; s < n; s++) {
        const a = resolveAudio(i, s, n);
        let g = null;
        for (let j = 0; j < groups.length; j++) if (groups[j].src === a.src) g = groups[j];
        if (!g) {
          g = { src: a.src, file: a.name, plays: 0, stims: [] };
          groups.push(g);
        }
        g.stims.push({ syll: s + 1, key: keys[k] || 0, choice: 0 });
        k += 1;
      }

      return { n: i + 1, groups: groups, timeMs: 0 };
    });

    if (SHUFFLE) items = shuffle(items);

    /* n = the item's ORIGINAL position in config.js — never changes, so two
       students who saw the same audio file still report the same question
       number. shownAs = the position this student actually saw it in.
       Writing the shown position into "question" would make per-item analysis
       meaningless as soon as shuffleItems is true. */
    items.forEach(function (it, i) { it.shownAs = i + 1; });
    state.items = items;
  }

  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  /* ==========================================================================
     [7]  Rendering the test screen
     ========================================================================== */
  function currentItem() { return state.items[state.pos] || null; }

  function renderItem() {
    const item = currentItem();
    if (!item) return;

    els.qNum.textContent = String(state.pos + 1);
    els.qTotal.textContent = String(state.items.length);
    els.bar.style.width = ((state.pos + 1) / state.items.length * 100).toFixed(1) + "%";

    const multi = item.groups.length > 1;
    let hasAudio = false;

    els.players.innerHTML = "";
    els.syllables.innerHTML = "";
    state.playerUI = [];
    state.blockEls = [];

    if (!multi) {
      if (item.groups[0].src) hasAudio = true;
      els.players.appendChild(makePlayer(item.groups[0], false));
    }

    let flat = 0;

    item.groups.forEach(function (g, gi) {
      if (g.src) hasAudio = true;

      g.stims.forEach(function (stim) {
        const block = document.createElement("section");
        block.className = "syllable";

        const head = document.createElement("div");
        head.className = "syllable-head";

        const label = document.createElement("p");
        label.className = "syllable-label";
        label.textContent = "Syllable " + stim.syll;
        head.appendChild(label);

        if (multi) head.appendChild(makePlayer(g, true));
        block.appendChild(head);

        const opts = document.createElement("div");
        opts.className = "options";
        opts.setAttribute("role", "group");
        opts.setAttribute("aria-label", "Tone options for syllable " + stim.syll);

        TONES.forEach(function (t) {
      const btn = makeOption(t, flat);
      // Re-rendering (or resuming after a reload) must show what is already
      // chosen, otherwise an answered item looks blank.
      if (stim.choice === t.id) {
        btn.classList.add("is-selected");
        btn.setAttribute("aria-pressed", "true");
      }
      opts.appendChild(btn);
    });
        block.appendChild(opts);

        block.addEventListener("click", function () {
          if (state.active !== flat) { state.active = flat; paintBlocks(); updatePlayers(); }
        });

        els.syllables.appendChild(block);
        state.blockEls.push({ group: gi, stim: stim, el: block });
        flat += 1;
      });
    });

    const firstUnanswered = state.blockEls.findIndex(function (b) { return b.stim.choice < 1; });
    state.active = firstUnanswered >= 0 ? firstUnanswered : 0;

    // Drop any half-finished "waiting for the file" from the previous item, then
    // start buffering this item's sound in the background.
    cancelPendingPlay();
    hideAudioBanner();
    warmAudio(item.groups[0] && item.groups[0].src);
    prefetchNextItem();

    paintBlocks();
    updatePlayers();
    updateNav();

    els.audioNote.textContent = hasAudio ? "" : "No audio file is attached to this item.";
    els.audioNote.hidden = hasAudio;
  }

  function makePlayer(g, compact) {
    const wrap = document.createElement("div");
    wrap.className = "player" + (compact ? " player--sm" : "");

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "play-btn";
    btn.setAttribute("aria-label", "Play the audio for this syllable");
    btn.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">' +
      '<path d="M8 5.5v13l11-6.5z" fill="currentColor" /></svg>';
    btn.addEventListener("click", function (e) {
      e.stopPropagation();
      const first = g.stims[0];
      const idx = state.blockEls.findIndex(function (b) { return b.stim === first; });
      if (idx >= 0) { state.active = idx; paintBlocks(); }
      playGroup(g);
    });

    const info = document.createElement("div");
    info.className = "player-info";

    const status = document.createElement("p");
    status.className = "player-status";

    const hint = document.createElement("p");
    hint.className = "player-hint";

    const count = document.createElement("span");
    count.className = "play-count";

    info.appendChild(status);
    info.appendChild(hint);
    info.appendChild(count);
    wrap.appendChild(btn);
    wrap.appendChild(info);

    state.playerUI.push({ g: g, btn: btn, status: status, hint: hint, count: count });
    return wrap;
  }

  function makeOption(t, flat) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "option";
    btn.dataset.tone = String(t.id);
    btn.setAttribute("aria-pressed", "false");

    const head = document.createElement("span");
    head.className = "option-head";

    const num = document.createElement("span");
    num.className = "option-num";
    num.textContent = String(t.id);

    const mark = document.createElement("span");
    mark.className = "option-mark";
    mark.innerHTML = '<svg viewBox="0 0 40 34" aria-hidden="true" focusable="false">' +
      '<path d="' + TONE_PATHS[t.id] + '" /></svg>';

    head.appendChild(num);
    head.appendChild(mark);

    const label = document.createElement("span");
    label.className = "option-name";
    label.textContent = t.name;

    btn.appendChild(head);
    btn.appendChild(label);

    btn.addEventListener("click", function (e) {
      e.stopPropagation();
      choose(flat, t.id);
    });

    return btn;
  }

  function paintBlocks() {
    state.blockEls.forEach(function (b, i) {
      b.el.classList.toggle("is-active", i === state.active);
      b.el.classList.toggle("is-answered", b.stim.choice >= 1);
    });
  }

  function updateNav() {
    const item = currentItem();
    if (!item) return;

    els.prevBtn.disabled = state.pos === 0;

    const last = state.pos === state.items.length - 1;
    els.nextBtn.textContent = last ? "Finish & submit" : "Next \u2192";
    els.nextBtn.disabled = REQUIRE_ANSWER ? !allAnswered() : false;
  }

  function activeGroup() {
    const b = state.blockEls[state.active];
    const item = currentItem();
    if (!b || !item) return item ? item.groups[0] : null;
    return item.groups[b.group] || item.groups[0];
  }

  function updatePlayers() {
    const g = activeGroup();

    state.playerUI.forEach(function (ui) {
      const grp = ui.g;
      const left = Math.max(0, MAX_PLAYS - grp.plays);
      const playing = state.playingGroup === grp;
      const loading = state.preparingGroup === grp;

      ui.count.textContent = grp.plays + " / " + MAX_PLAYS;
      // While the sound is playing (or still loading) the button does nothing
      // (a second click is ignored), so disable it — otherwise it looks
      // clickable and feels broken.
      ui.btn.disabled = left === 0 || !grp.src || playing;
      ui.btn.classList.toggle("is-playing", playing);

      if (loading) {
        ui.status.textContent = "Loading\u2026";
        ui.hint.textContent = "Getting the sound ready \u2014 it will start by itself.";
      } else if (playing) {
        ui.status.textContent = "Playing\u2026";
        ui.hint.textContent = "Listen carefully.";
      } else if (!grp.src) {
        ui.status.textContent = "No audio";
        ui.hint.textContent = "This item has no sound file attached.";
      } else if (left === 0) {
        ui.status.textContent = "No plays left";
        ui.hint.textContent = "You have used all " + MAX_PLAYS + " plays. Choose the tone you heard.";
      } else {
        ui.status.textContent = "Ready to play";
        ui.hint.textContent = left === MAX_PLAYS
          ? "You may play this sound " + MAX_PLAYS + " times in total."
          : "You may play this sound " + left + " more time" + (left === 1 ? "" : "s") + ".";
      }
    });

    if (els.playsPill && g) {
      const left = Math.max(0, MAX_PLAYS - g.plays);
      els.playsPill.textContent = left === 0
        ? "No plays left"
        : left + (left === 1 ? " play left" : " plays left");
      els.playsPill.classList.toggle("is-empty", left === 0);
    }
  }

  function allAnswered() {
    const item = currentItem();
    if (!item) return false;
    return item.groups.every(function (g) {
      return g.stims.every(function (s) { return s.choice >= 1; });
    });
  }

  /* ==========================================================================
     [8]  Interactions
     ========================================================================== */
  function choose(flat, toneId) {
    const item = currentItem();
    if (!item) return;

    const block = state.blockEls[flat];
    if (!block) return;

    block.stim.choice = toneId;

    Array.prototype.forEach.call(block.el.querySelectorAll(".option"), function (btn) {
      const on = Number(btn.dataset.tone) === toneId;
      btn.classList.toggle("is-selected", on);
      btn.setAttribute("aria-pressed", on ? "true" : "false");
    });

    const nextUnanswered = state.blockEls.findIndex(function (b) { return b.stim.choice < 1; });
    state.active = nextUnanswered >= 0 ? nextUnanswered : flat;

    paintBlocks();
    updatePlayers();
    updateNav();
    saveProgress();
  }

  /* --------------------------------------------------------------------------
     [6]  Audio
     --------------------------------------------------------------------------
     Rewritten after the first classroom run (2026-11-05). Two rules now hold:

       1. Every file is pulled into memory once, while the student is still
          filling in the start form. Playback never touches the network again,
          so a slow or flaky connection cannot silence an item mid-test.
       2. A play is only counted when sound actually comes out. A file that
          failed to load, or one that stalled halfway, can be retried without
          using up one of the two allowed plays.
     -------------------------------------------------------------------------- */
  function ensureAudio() {
    if (state.audio) return state.audio;
    const el = new Audio();
    el.preload = "auto";
    el.addEventListener("ended", onPlayEnd);
    el.addEventListener("error", onMediaError);
    state.audio = el;
    return el;
  }

  /* ---- cache: every src -> blob URL, filled before the test starts -------- */

  function audioUrl(src) { return state.audioCache[src] || src; }

  function collectSrcs() {
    const out = [], seen = Object.create(null);
    for (let i = 0; i < CFG_ITEMS.length; i++) {
      const n = syllableCountOf(CFG_ITEMS[i]);
      for (let s = 0; s < n; s++) {
        const src = resolveAudio(i, s, n).src;
        if (src && !seen[src]) { seen[src] = 1; out.push(src); }
      }
    }
    return out;
  }

  /* Fetch one file into memory. Two retries, 15 s each. Resolves with null
     when the file really cannot be had — the caller then falls back to the
     plain URL (which still works when the page is opened from a local disk). */
  function fetchOne(src) {
    return new Promise(function (resolve) {
      if (typeof fetch !== "function") { resolve(null); return; }
      let tries = 0;
      const attempt = function () {
        tries += 1;
        const ctl = (typeof AbortController === "function") ? new AbortController() : null;
        const timer = setTimeout(function () { if (ctl) { try { ctl.abort(); } catch (e) {} } }, 15000);
        const opts = { cache: "force-cache" };
        if (ctl) opts.signal = ctl.signal;
        fetch(src, opts).then(function (r) {
          if (!r.ok) throw new Error("HTTP " + r.status);
          return r.blob();
        }).then(function (b) {
          clearTimeout(timer);
          if (!b || b.size < 512) throw new Error("empty file");
          resolve(URL.createObjectURL(b));
        }).catch(function () {
          clearTimeout(timer);
          if (tries <= AUDIO_RETRY) { setTimeout(attempt, 500 * tries); return; }
          resolve(null);
        });
      };
      attempt();
    });
  }

  function ensurePreloadChip() {
    if (els.preloadChip) return els.preloadChip;
    const d = document.createElement("div");
    d.id = "preloadChip";
    d.setAttribute("role", "status");
    d.style.cssText = "position:fixed;left:16px;bottom:16px;z-index:60;padding:7px 13px;border-radius:999px;" +
      "background:#eef4ff;border:1px solid #b9cdf0;color:#1c3f7a;font-size:12.5px;line-height:1.5;" +
      "box-shadow:0 2px 10px rgba(15,40,90,.10);cursor:default";
    document.body.appendChild(d);
    els.preloadChip = d;
    return d;
  }

  function paintPreload(final) {
    const p = state.preload;
    if (!p || !p.total) return;
    const chip = ensurePreloadChip();
    if (!final) {
      chip.style.background = "#eef4ff"; chip.style.borderColor = "#b9cdf0"; chip.style.color = "#1c3f7a";
      chip.textContent = "Loading audio " + p.done + " / " + p.total + "\u2026";
      return;
    }
    if (p.failed.length) {
      chip.style.background = "#fdf1ef"; chip.style.borderColor = "#e2b1aa"; chip.style.color = "#8a1b12";
      chip.style.cursor = "pointer";
      chip.textContent = p.failed.length + " audio file(s) failed \u2014 click to retry";
      chip.onclick = function () { chip.onclick = null; retryFailed(); };
      return;
    }
    chip.style.background = "#eef8ef"; chip.style.borderColor = "#b9d8bd"; chip.style.color = "#1d5a26";
    chip.textContent = "Audio ready \u00b7 " + p.total + " files";
    setTimeout(function () {
      if (chip.parentNode) chip.parentNode.removeChild(chip);
      if (els.preloadChip === chip) els.preloadChip = null;
    }, 2500);
  }

  function retryFailed() {
    if (!state.preload) return;
    const list = state.preload.failed.slice();
    state.preload.failed = [];
    let i = 0;
    const next = function () {
      if (i >= list.length) { paintPreload(true); return; }
      const src = list[i++];
      fetchOne(src).then(function (u) {
        if (u) state.audioCache[src] = u; else state.preload.failed.push(src);
        paintPreload(true);
        next();
      });
    };
    next();
  }

  function preloadAudio() {
    if (typeof fetch !== "function") return;          // local file / very old browser
    const srcs = collectSrcs().filter(function (s) { return !state.audioCache[s]; });
    if (!srcs.length) return;
    state.preload = { total: srcs.length, done: 0, failed: [] };
    paintPreload(false);

    let i = 0;
    const worker = function () {
      if (i >= srcs.length) return Promise.resolve();
      const src = srcs[i++];
      return fetchOne(src).then(function (u) {
        if (u) state.audioCache[src] = u; else state.preload.failed.push(src);
        state.preload.done += 1;
        paintPreload(false);
        return worker();
      });
    };
    const all = [];
    for (let k = 0; k < AUDIO_CONCURRENCY; k++) all.push(worker());
    Promise.all(all).then(function () { paintPreload(true); });
  }

  /* ---- the shared element ------------------------------------------------ */

  /**
   * Point the element at a file WITHOUT playing it, so the bytes are already
   * decoded when the student taps play.
   */
  function warmAudio(src) {
    if (!src) return;
    const url = audioUrl(src);
    if (state.audioSrc === url) return;
    if (state.playingGroup || state.preparingGroup) return;  // never cut a sound short
    const el = ensureAudio();
    state.audioSrc = url;
    el.src = url;
    try { el.load(); } catch (err) { /* ignore */ }
  }

  function cancelPendingPlay() {
    if (state.waitCleanup) { state.waitCleanup(); state.waitCleanup = null; }
    state.preparingGroup = null;
  }

  /* Everything lives in memory now, so there is nothing left to prefetch. */
  function prefetchNextItem() {
    const next = state.items[state.pos + 1];
    const src = next && next.groups[0] && next.groups[0].src;
    if (!src || state.audioCache[src]) return;
    if (state.prefetchSrc === src) return;
    state.prefetchSrc = src;
    try {
      state.prefetch = new Audio();
      state.prefetch.preload = "auto";
      state.prefetch.src = src;
      state.prefetch.load();
    } catch (err) { /* a bonus, never fatal */ }
  }

  function playGroup(g) {
    if (!g) return;
    if (!g.src) { toast("No audio file is attached to this item."); return; }

    // Already sounding. A second tap must not burn a play — but if the sound
    // has silently stopped, restart it instead of ignoring the tap.
    if (state.playingGroup === g) {
      if (isStalled()) { stopPlayback(); startAttempt(g); }
      return;
    }
    if (state.preparingGroup === g) return;            // already waiting
    if (g.plays >= MAX_PLAYS) {
      toast("You have already used all " + MAX_PLAYS + " plays for this sound.");
      return;
    }

    stopPlayback();
    startAttempt(g);
  }

  function isStalled() {
    const el = state.audio;
    if (!el) return true;
    return el.paused || el.ended || el.readyState < 2;
  }

  function stopPlayback() {
    if (state.waitCleanup) { state.waitCleanup(); state.waitCleanup = null; }
    clearTimeout(state.playTimer);
    clearInterval(state.stallTimer);
    if (state.audio) { try { state.audio.pause(); } catch (err) { /* ignore */ } }
    state.playingGroup = null;
    state.preparingGroup = null;
    state.playedThisAttempt = false;
  }

  /* 1. make sure the right file is loaded, 2. wait (briefly) for canplay */
  function startAttempt(g) {
    const el = ensureAudio();
    const url = audioUrl(g.src);

    // A previous failure leaves the element in an error state; simply calling
    // play() again would reject straight away. Reset it properly.
    if (state.audioSrc !== url || el.error) {
      state.audioSrc = url;
      el.src = url;
      try { el.load(); } catch (err) { /* ignore */ }
    }

    state.preparingGroup = g;
    state.playingGroup = null;
    state.playedThisAttempt = false;
    updatePlayers();

    let timer = null, settled = false;
    function cleanup() {
      if (timer) { clearTimeout(timer); timer = null; }
      el.removeEventListener("canplay", go);
      el.removeEventListener("canplaythrough", go);
    }
    function go() {
      if (settled) return;
      settled = true;
      cleanup();
      if (state.waitCleanup === cleanup) state.waitCleanup = null;
      beginAttempt(g, el);
    }

    state.waitCleanup = cleanup;

    if (el.readyState >= 3) { go(); return; }
    el.addEventListener("canplay", go);
    el.addEventListener("canplaythrough", go);
    timer = setTimeout(go, 7000);        // never hang on a dead request
  }

  /* 3. actually play, and decide when a play counts */
  function beginAttempt(g, el) {
    if (state.preparingGroup !== g) return;     // the student moved on meanwhile
    try { el.currentTime = 0; } catch (err) { /* ignore */ }

    state.preparingGroup = null;
    state.playingGroup = g;
    updatePlayers();

    // "playing" means sound is really coming out. That — not the promise —
    // is what costs the student one of the two plays.
    const onPlaying = function () {
      el.removeEventListener("playing", onPlaying);
      if (state.playingGroup !== g) return;
      state.playedThisAttempt = true;
      g.plays += 1;
      hideAudioBanner();
      updatePlayers();
      clearTimeout(state.playTimer);
      const dur = (isFinite(el.duration) && el.duration > 0) ? el.duration : 2;
      state.playTimer = setTimeout(onPlayEnd, Math.min(25000, dur * 1000 + 4000));
    };
    el.addEventListener("playing", onPlaying);

    armStallWatch(g);

    let p = null;
    try { p = el.play(); } catch (err) { handlePlayFailure(g); return; }
    if (p && typeof p.then === "function") {
      p.catch(function () {
        el.removeEventListener("playing", onPlaying);
        handlePlayFailure(g);
      });
    }
  }

  /* A stalled stream fires no event worth trusting — watch the clock instead. */
  function armStallWatch(g) {
    clearInterval(state.stallTimer);
    let last = -1, lastChange = performance.now();
    state.stallTimer = setInterval(function () {
      const el = state.audio;
      if (!el || state.playingGroup !== g) { clearInterval(state.stallTimer); return; }
      if (el.currentTime > last + 0.01) { last = el.currentTime; lastChange = performance.now(); return; }
      if (performance.now() - lastChange < 1800) return;

      clearInterval(state.stallTimer);
      const heard = el.currentTime || 0;
      try { el.pause(); } catch (err) { /* ignore */ }
      state.playingGroup = null;
      state.preparingGroup = null;
      state.audioSrc = "";          // force a clean request next attempt

      // Barely anything came out: give the play back.
      if (state.playedThisAttempt && heard < 0.45 && g.plays > 0) g.plays -= 1;
      state.playedThisAttempt = false;
      updatePlayers();

      if (!state.audioCache[g.src]) {
        fetchOne(g.src).then(function (u) { if (u) { state.audioCache[g.src] = u; state.audioSrc = ""; } });
      }
      showAudioBanner("The sound stopped before the end. Tap play again \u2014 the interrupted attempt does not count.", true);
    }, 300);
  }

  function handlePlayFailure(g) {
    clearInterval(state.stallTimer);
    clearTimeout(state.playTimer);
    state.playingGroup = null;
    state.preparingGroup = null;
    state.playedThisAttempt = false;
    state.audioSrc = "";            // a broken element must be re-created
    if (state.audio) { try { state.audio.pause(); } catch (err) { /* ignore */ } }
    updatePlayers();

    const cached = !!(g && g.src && state.audioCache[g.src]);
    if (!cached && g && g.src) {
      showAudioBanner("This sound did not load. Fetching it again \u2014 it will start by itself in a moment; no play is used up.", true);
      fetchOne(g.src).then(function (u) {
        if (u) {
          state.audioCache[g.src] = u;
          state.audioSrc = "";
          hideAudioBanner();
          // The student already asked to hear this: play it once the copy is in
          // memory. Only if they are still on that item.
          if (isCurrentGroup(g)) startAttempt(g);
        } else {
          showAudioBanner("This sound still will not load. Tap \u201cTry again\u201d or tell the researcher \u2014 no play is used up and your answers are kept.", true);
        }
      });
    } else {
      showAudioBanner("This sound could not be played. Tap play again \u2014 no play is used up.", true);
    }
  }

  function isCurrentGroup(g) {
    const it = currentItem();
    return !!(it && it.groups.indexOf(g) >= 0);
  }

  function onMediaError() {
    const g = state.playingGroup || state.preparingGroup;
    if (!g) return;                       // a background load, nothing to report
    handlePlayFailure(g);
  }

  function onPlayEnd() {
    clearTimeout(state.playTimer);
    clearInterval(state.stallTimer);
    state.playingGroup = null;
    state.preparingGroup = null;
    state.playedThisAttempt = false;
    updatePlayers();
  }

  function onNext() {
    const item = currentItem();
    if (!item) return;

    if (REQUIRE_ANSWER && !allAnswered()) {
      toast("Choose a tone for both syllables before moving on.");
      return;
    }

    if (state.pos === state.items.length - 1) {
      finish();
      return;
    }
    goTo(state.pos + 1);
  }

  function goTo(pos) {
    const item = currentItem();
    if (item) item.timeMs += performance.now() - state.qStart;

    state.pos = pos;
    state.qStart = performance.now();
    renderItem();
    saveProgress();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function onKeydown(e) {
    if (state.phase !== "test") return;
    const tag = (e.target && e.target.tagName || "").toLowerCase();
    if (tag === "input" || tag === "textarea" || tag === "select") return;
    if (e.metaKey || e.ctrlKey || e.altKey) return;

    if (e.key >= "1" && e.key <= "4") {
      e.preventDefault();
      choose(state.active, Number(e.key));
    } else if (e.code === "Space" || e.key === " ") {
      e.preventDefault();
      playGroup(activeGroup());
    } else if (e.key === "Tab") {
      // Switch the keyboard target to the other syllable.
      e.preventDefault();
      if (!state.blockEls.length) return;
      state.active = (state.active + 1) % state.blockEls.length;
      paintBlocks();
      updatePlayers();
    } else if (e.key === "Enter" || e.key === "ArrowRight") {
      e.preventDefault();
      onNext();
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      if (state.pos > 0) goTo(state.pos - 1);
    }
  }

  /* ==========================================================================
     [9]  Finish, scoring, CSV
     ========================================================================== */
  function finish() {
    const item = currentItem();
    if (item) item.timeMs += performance.now() - state.qStart;

    state.phase = "done";
    state.submitted = true;
    saveProgress();

    show("done");
    renderSummary();
    window.scrollTo({ top: 0, behavior: "smooth" });

    // Save a copy right away — nothing is lost if the student walks away.
    downloadCsv();

    // Show the hand-off box and start the countdown immediately. Waiting for the
    // POST first means a slow (or unresponsive) Apps Script leaves the student
    // staring at a frozen screen with no way forward.
    if (NEXT_PAGE && els.nextBox) {
      els.nextBox.hidden = false;
      startAdvance();
    }

    postResults(buildPayload()).then(function (result) {
      state.postSettled = true;
      state.postOk = !!(result && result.ok);
      state.settledAt = Date.now();

      if (els.nextNowBtn) {
        els.nextNowBtn.disabled = false;
        els.nextNowBtn.textContent = "Start the " + nextLabel() + " now";
      }
    });
  }

  function nextLabel() {
    const match = NEXT_PAGE.match(/([a-z0-9_-]+)\.html/i);
    if (!match) return "next section";
    return match[1].toLowerCase() === "main" ? "Main Test" : match[1];
  }

  function startAdvance() {
    if (!NEXT_PAGE || state.advTimer) return;
    if (els.nextBox) els.nextBox.hidden = false;

    const started = Date.now();

    const tick = function () {
      const elapsed = Date.now() - started;
      const left = Math.max(0, Math.ceil((ADVANCE_MS - elapsed) / 1000));
      if (els.countdown) {
        els.countdown.textContent = left > 0
          ? left + " s"
          : (state.postSettled ? (state.postOk === false ? "error" : "now") : "sending\u2026");
      }

      // Success: leave as soon as the countdown ends.
      // Failure: wait until the red line has been readable for a few seconds.
      // Still sending: hard cap, so nobody is stuck on a dead server.
      let go;
      if (state.postSettled === false) {
        go = elapsed >= ADVANCE_MS + 24000;
      } else if (state.postOk) {
        go = elapsed >= ADVANCE_MS;
      } else {
        go = elapsed >= ADVANCE_MS && (Date.now() - state.settledAt) >= 4000;
      }

      if (go) {
        clearInterval(state.advTimer);
        state.advTimer = null;
        goNext();
      }
    };

    state.advTimer = setInterval(tick, 200);
    tick();
  }

  function goNext() {
    if (!NEXT_PAGE) return;
    clearInterval(state.advTimer);
    state.advTimer = null;

    const q = [];
    q.push("name=" + encodeURIComponent(state.student.name));
    q.push("major=" + encodeURIComponent(state.student.major));
    q.push("nat=" + encodeURIComponent(state.student.nationality));
    q.push("years=" + encodeURIComponent(state.student.years));
    q.push("hsk=" + encodeURIComponent(state.student.hsk));
    q.push("session=" + encodeURIComponent(state.student.session));
    q.push("listen=" + encodeURIComponent(state.student.listen));
    q.push("answer=" + encodeURIComponent(state.student.answer));
    q.push("from=" + encodeURIComponent(TEST_TYPE));

    window.location.href = NEXT_PAGE + "?" + q.join("&");
  }

  function toneLabel(id) {
    const t = TONES.filter(function (x) { return x.id === id; })[0];
    return t ? "Tone " + t.id + " (" + t.name.toLowerCase() + ")" : "";
  }

  function collectRows() {
    const rows = [];

    state.items.forEach(function (item) {
      item.groups.forEach(function (g) {
        g.stims.forEach(function (st) {
          const answered = st.choice >= 1;
          const hasKey = st.key >= 1;
          const correct = answered && hasKey ? (st.choice === st.key ? 1 : 0) : "";

          let result;
          if (!answered) result = "No answer";
          else if (!hasKey) result = "Not scored";
          else result = st.choice === st.key ? "Correct" : "Incorrect";

          rows.push({
            question: item.n,
            shownAs: item.shownAs || item.n,
            syllable: st.syll,
            audioFile: g.file || "",
            response: answered ? st.choice : "",
            responseLabel: answered ? toneLabel(st.choice) : "",
            answerKey: hasKey ? st.key : "",
            answerKeyLabel: hasKey ? toneLabel(st.key) : "",
            correct: correct,
            result: result,
            playsUsed: g.plays,
            timeSeconds: st.syll === 1 ? (item.timeMs / 1000).toFixed(1) : ""
          });
        });
      });
    });

    return rows;
  }

  function score() {
    const rows = collectRows();
    const scored = rows.filter(function (r) { return r.correct !== ""; });
    const correct = scored.filter(function (r) { return r.correct === 1; });
    return {
      rows: rows,
      total: rows.length,
      scoredTotal: scored.length,
      correctCount: correct.length,
      percent: scored.length ? Math.round(correct.length / scored.length * 100) : null,
      answered: rows.filter(function (r) { return r.response !== ""; }).length
    };
  }

  function renderSummary() {
    const s = score();
    els.doneName.textContent = state.student.name;

    if (s.percent === null) {
      els.scoreValue.textContent = "\u2014";
      els.scoreDen.textContent = "";
      els.scoreSub.textContent = "No answer key was available, so this session was recorded but not scored. " +
        "(" + s.answered + " of " + s.total + " syllables answered.)";
    } else {
      els.scoreValue.textContent = String(s.correctCount);
      els.scoreDen.textContent = "/ " + s.scoredTotal;
      els.scoreSub.textContent = s.percent + "% correct  \u00B7  " + s.scoredTotal + " of " + s.total +
        " syllables scored  \u00B7  " + state.student.major;
    }

    els.summaryBody.innerHTML = "";
    s.rows.forEach(function (r) {
      const tr = document.createElement("tr");

      const cells = [
        { text: r.question + "." + r.syllable, cls: "num" },
        { text: r.audioFile || "\u2014" },
        { text: r.response === "" ? "\u2014" : String(r.response) + " \u00B7 " + toneShort(r.response), cls: "num" },
        { text: r.answerKey === "" ? "\u2014" : String(r.answerKey), cls: "num" },
        { text: String(r.playsUsed), cls: "num" },
        { text: r.result, tag: r.result }
      ];

      cells.forEach(function (c) {
        const td = document.createElement("td");
        if (c.cls) td.className = c.cls;
        if (c.tag) {
          const span = document.createElement("span");
          span.className = "tag " + (c.tag === "Correct" ? "tag-correct" : c.tag === "Incorrect" ? "tag-wrong" : "tag-neutral");
          span.textContent = c.tag;
          td.appendChild(span);
        } else {
          td.textContent = c.text;
        }
        tr.appendChild(td);
      });

      els.summaryBody.appendChild(tr);
    });
  }

  function toneShort(id) {
    const t = TONES.filter(function (x) { return x.id === id; })[0];
    return t ? t.name.toLowerCase() : "";
  }

  function csvCell(value) {
    const s = value === null || value === undefined ? "" : String(value);
    return /[",\r\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  }

  function stamp(d) {
    const p = function (n) { return (n < 10 ? "0" : "") + n; };
    return d.getFullYear() + "-" + p(d.getMonth() + 1) + "-" + p(d.getDate()) +
      " " + p(d.getHours()) + ":" + p(d.getMinutes()) + ":" + p(d.getSeconds());
  }

  function buildCsv() {
    const s = score();
    const now = new Date();
    const ts = stamp(now);

    const header = [
      "Timestamp", "Test Type", "Student Name", "Major", "Session",
      "Listening Device", "Answering Device",
      "Nationality", "Time Studying Chinese", "HSK Score",
      "Question", "Shown As", "Syllable", "Audio File",
      "Response", "Response Label", "Answer Key", "Answer Key Label",
      "Correct (1/0)", "Result", "Plays Used", "Time on Item (s)"
    ];

    const rows = [header];
    s.rows.forEach(function (r) {
      rows.push([
        ts, TEST_TYPE, state.student.name, state.student.major, state.student.session,
        state.student.listen, state.student.answer,
        state.student.nationality, state.student.years, state.student.hsk,
        r.question, r.shownAs, r.syllable, r.audioFile,
        r.response, r.responseLabel, r.answerKey, r.answerKeyLabel,
        r.correct, r.result, r.playsUsed, r.timeSeconds
      ]);
    });

    rows.push([
      ts, TEST_TYPE, state.student.name, state.student.major, state.student.session,
      state.student.listen, state.student.answer,
      state.student.nationality, state.student.years, state.student.hsk,
      "TOTAL", "", "", "",
      s.answered, "", "", "",
      s.correctCount, s.percent === null ? "Not scored" : s.percent + "%", "", ""
    ]);

    return "\uFEFF" + rows.map(function (r) { return r.map(csvCell).join(","); }).join("\r\n") + "\r\n";
  }

  function csvFileName() {
    const d = new Date();
    const p = function (n) { return (n < 10 ? "0" : "") + n; };
    const slug = (state.student.name || "student")
      .replace(/[^\w\u4e00-\u9fa5]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "student";
    return "tone-test_" + TEST_TYPE + "_" + slug + "_" +
      d.getFullYear() + p(d.getMonth() + 1) + p(d.getDate()) + "-" + p(d.getHours()) + p(d.getMinutes()) +
      ".csv";
  }

  function downloadCsv() {
    if (!state.submitted) return;

    let url = state.csvUrl;
    try {
      if (!url) {
        url = URL.createObjectURL(new Blob([buildCsv()], { type: "text/csv;charset=utf-8;" }));
        state.csvUrl = url;          // kept all session: the fallback link needs it
      }
    } catch (err) {
      toast("Could not build the CSV. Please tell the researcher.");
      return;
    }

    const name = csvFileName();
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.rel = "noopener";
    document.body.appendChild(a);
    a.click();
    // Removing the anchor in the same tick cancels the download in some
    // browsers — the first classroom run showed exactly that.
    setTimeout(function () { if (a.parentNode) a.parentNode.removeChild(a); }, 4000);

    toast("CSV saved: " + name);
    offerCsvLink(url, name);
  }

  /* A real link, permanently visible on the done screen. Chrome blocks the
     second automatic download from one page, so the button alone is not
     enough — and unlike an automatic click, a link can never navigate the tab
     away (which is how one student ended up back at item 1). */
  function offerCsvLink(url, name) {
    if (els.csvLink && els.csvLink.parentNode) {
      els.csvLink.href = url;
      els.csvLink.download = name;
      return;
    }
    const done = document.getElementById("screen-done");
    if (!done) return;

    const box = document.createElement("div");
    box.style.cssText = "margin:12px 0 0;font-size:13px;line-height:1.7;color:#4a4a4a";

    const p = document.createElement("p");
    p.style.margin = "0";
    p.appendChild(document.createTextNode("Nothing in your Downloads folder? "));
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.textContent = "Click here to save the CSV again";
    a.style.cssText = "color:#1c4fa1;font-weight:600;text-decoration:underline";
    p.appendChild(a);
    box.appendChild(p);

    const det = document.createElement("details");
    det.style.cssText = "margin-top:6px";
    const sum = document.createElement("summary");
    sum.textContent = "Or show the data as text (copy & paste)";
    sum.style.cssText = "cursor:pointer;color:#1c4fa1";
    det.appendChild(sum);
    const ta = document.createElement("textarea");
    ta.readOnly = true;
    ta.value = buildCsv();
    ta.style.cssText = "width:100%;height:120px;margin-top:8px;font-size:11.5px;font-family:monospace;" +
      "border:1px solid #d5d5d5;border-radius:8px;padding:8px";
    det.appendChild(ta);
    box.appendChild(det);

    const host = done.querySelector(".actions");
    if (host && host.parentNode) host.parentNode.insertBefore(box, host.nextSibling);
    else done.appendChild(box);

    els.csvLink = a;
  }

  /* ==========================================================================
     [10]  POST to Google Apps Script
     ========================================================================== */
  function buildPayload() {
    const s = score();
    return {
      testType: TEST_TYPE,
      testLabel: TYPE_LABEL,
      studentName: state.student.name,
      major: state.student.major,
      session: state.student.session,
      listenDevice: state.student.listen,
      answerDevice: state.student.answer,
      nationality: state.student.nationality,
      yearsStudy: state.student.years,
      hsk: state.student.hsk,
      submittedAt: new Date().toISOString(),
      maxPlays: MAX_PLAYS,
      totalItems: s.total,
      scoredItems: s.scoredTotal,
      correctCount: s.correctCount,
      scorePercent: s.percent,
      subId: newSubId(),
      responses: s.rows
    };
  }

  // One id per submission, reused by the background retry so the server can
  // drop the second copy instead of writing every row twice.
  let pendingSubId = "";
  function newSubId() {
    if (pendingSubId) return pendingSubId;
    try {
      if (typeof crypto !== "undefined" && crypto.randomUUID) pendingSubId = crypto.randomUUID();
    } catch (err) { pendingSubId = ""; }
    if (!pendingSubId) pendingSubId = "s" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 10);
    return pendingSubId;
  }

  function setPostStatus(kind, text) {
    if (!els.postStatus) return;
    els.postStatus.textContent = text;
    els.postStatus.className = "post-status" + (kind === "ok" ? " is-ok" : kind === "err" ? " is-err" : "");
  }

  function postResults(payload) {
    if (!ENDPOINT) {
      setPostStatus("idle", "No server endpoint configured yet (add window.TONE_TEST_ENDPOINT = \"\u2026/exec\" to assets/config.js) \u2014 the CSV above already holds this result.");
      return Promise.resolve({ ok: false, skipped: true });
    }

    setPostStatus("pending", "Sending results to the server\u2026");

    // text/plain keeps this a "simple request", so Google Apps Script answers
    // without a CORS preflight. The body is still plain JSON.
    // keepalive lets the request finish even if the page navigates to the next
    // test — without it, Pilot's upload dies the moment Main opens.
    const ctrl = (typeof AbortController !== "undefined") ? new AbortController() : null;
    // 40 s: a whole class can finish within the same minute, and each upload
    // waits its turn behind the server's write lock (up to 25 s there).
    const timer = ctrl ? setTimeout(function () { ctrl.abort(); }, 40000) : null;

    return fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(payload),
      redirect: "follow",
      keepalive: true,
      signal: ctrl ? ctrl.signal : undefined
    })
      .then(function (res) {
        return res.text().then(function (text) {
          const raw = String(text || "");
          const head = raw.trim().charAt(0);

          // A web app answers a POST with a redirect. If the deployment is not
          // shared with "Anyone" (or this browser is signed in with a different
          // Google account than the sheet owner), that redirect lands on a
          // sign-in page: HTTP 200, HTML. Treating that as success silently
          // loses the whole run, so fail loudly instead.
          if (head === "<") {
            throw new Error("Google returned a sign-in / error page instead of a result. " +
              "Most likely the deployment is not shared with \"Anyone\", or this browser " +
              "is signed in with a Google account different from the sheet owner.");
          }

          let data = null;
          try { data = JSON.parse(raw); } catch (err) { data = null; }

          if (!data) {
            throw new Error("Unexpected reply from the server: " +
              raw.replace(/\s+/g, " ").trim().slice(0, 120));
          }
          if (data.ok === false) {
            const e = new Error(data.error || data.message || ("HTTP " + res.status));
            e.busy = data.busy === true || data.retryable === true;
            throw e;
          }

          const written = data.duplicate
            ? "already stored, not written twice"
            : (data.rows !== undefined ? data.rows + " row(s) written" : "ok");
          const where = data.spreadsheet ? " \u2192 " + data.spreadsheet : "";
          setPostStatus("ok", "Results sent to the server (" + written + where + ").");
          return { ok: true };
        });
      })
      .catch(function (err) {
        let msg = (err && err.name === "AbortError")
          ? "no reply within 40 seconds"
          : (err && err.message ? err.message : String(err));

        if (err && err.busy) {
          msg = "the server was busy (several tests arrived at the same moment) \u2014 " +
            "retrying automatically in the background";
        }

        // "Failed to fetch" is what a blocked / redirected reply looks like
        // from the page: it hides the real reason, so spell out the usual ones.
        if (/Failed to fetch|NetworkError|Load failed/i.test(msg)) {
          msg += " (the browser blocked the reply — check that the /exec URL is exact " +
            "and that the deployment is shared with \"Anyone\")";
        }
        setPostStatus(err && err.busy ? "pending" : "err",
          (err && err.busy ? "Waiting for the server: " : "Could not send to the server: ") + msg +
          " [" + endpointHost() + " \u00b7 " + BUILD + "]" +
          " \u2014 the CSV above is complete, so this run is not lost. " +
          "If it keeps failing, open the /exec?diag=1 URL in a browser.");

        // Carry the warning to the next page: the student may already have
        // moved on before anyone read this line. A "busy" reply is not a
        // failure yet (a retry is already in flight), so it is not carried
        // over — otherwise every student would see a red banner.
        if (!(err && err.busy)) {
          try {
            sessionStorage.setItem("tpUploadFailed", JSON.stringify({ test: TEST_TYPE, message: msg, at: new Date().toISOString() }));
          } catch (e) { /* storage disabled — the CSV is still on disk */ }
        }

        // Best-effort insurance: fire the same payload again in the background.
        // The payload carries a subId, so the script drops the second copy.
        try {
          if (navigator.sendBeacon) {
            navigator.sendBeacon(ENDPOINT, new Blob([JSON.stringify(payload)], { type: "text/plain;charset=utf-8" }));
          }
        } catch (e) { /* ignore */ }

        return { ok: false, error: String(err) };
      })
      .then(function (result) {
        if (timer) clearTimeout(timer);
        return result;
      });
  }

  /* ==========================================================================
     [11]  Helpers
     ========================================================================== */
  function show(which) {
    Object.keys(els.screens).forEach(function (k) {
      if (els.screens[k]) els.screens[k].hidden = (k !== which);
    });
  }

  let toastTimer = null;
  function toast(message) {
    if (!els.toast) return;
    els.toast.textContent = message;
    els.toast.classList.add("is-visible");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { els.toast.classList.remove("is-visible"); }, 3200);
  }

  /* A toast disappears after three seconds — useless for "the sound did not
     load". This one stays on screen until the next successful play. */
  function showAudioBanner(message, withRetry) {
    const card = document.querySelector("#screen-test .card");
    if (!card) { toast(message); return; }

    if (!els.audioBanner || !els.audioBanner.parentNode) {
      const box = document.createElement("div");
      box.id = "audioBanner";
      box.setAttribute("role", "alert");
      box.style.cssText = "margin:0 0 16px;padding:11px 14px;border:1px solid #e2b1aa;" +
        "border-left:4px solid #b4231a;border-radius:10px;background:#fdf1ef;color:#8a1b12;" +
        "font-size:13.5px;line-height:1.55;display:flex;gap:12px;align-items:center;flex-wrap:wrap";
      const txt = document.createElement("span");
      txt.id = "audioBannerText";
      txt.style.cssText = "flex:1 1 220px";
      box.appendChild(txt);
      const btn = document.createElement("button");
      btn.type = "button";
      btn.textContent = "Try again";
      btn.style.cssText = "flex:0 0 auto;padding:6px 12px;border:1px solid #b4231a;border-radius:8px;" +
        "background:#fff;color:#8a1b12;font:inherit;font-size:12.5px;cursor:pointer";
      btn.addEventListener("click", function () {
        hideAudioBanner();
        playGroup(activeGroup());
      });
      box.appendChild(btn);
      const head = card.querySelector(".test-head");
      card.insertBefore(box, head || card.firstChild);
      els.audioBanner = box;
      els.audioBannerText = txt;
      els.audioBannerBtn = btn;
    }

    els.audioBannerText.textContent = message;
    els.audioBannerBtn.hidden = !withRetry;
  }

  function hideAudioBanner() {
    if (els.audioBanner && els.audioBanner.parentNode) els.audioBanner.parentNode.removeChild(els.audioBanner);
    els.audioBanner = null;
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
