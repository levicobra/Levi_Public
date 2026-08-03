/* =========================================================================
   XP Education — app core
   A single-file, dependency-free SPA. Hash routing so it works from any
   static host (and installed as a PWA). All content ships with the app and
   is precached by sw.js, so every view works fully offline.
   ========================================================================= */
'use strict';

/* ---------- tiny helpers ---------- */
const $ = (sel, el = document) => el.querySelector(sel);
const view = $('#view');

function esc(s) {
  return String(s).replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}

/* Escape first, then allow **bold**, *italic*, `code`, and _sub_ / ^sup^
   markers that content files may use. Never inserts raw content HTML. */
function fmt(s) {
  return esc(s)
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\^([^^\s][^^]*)\^/g, '<sup>$1</sup>')
    .replace(/~([^~\s][^~]*)~/g, '<sub>$1</sub>');
}

function toast(msg, ms = 2600) {
  const t = $('#toast');
  t.textContent = msg;
  t.hidden = false;
  clearTimeout(toast._t);
  toast._t = setTimeout(() => { t.hidden = true; }, ms);
}

/* ---------- persistent state ---------- */
const store = {
  read(key, fallback) {
    try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; }
    catch { return fallback; }
  },
  write(key, val) {
    try { localStorage.setItem(key, JSON.stringify(val)); } catch { /* full/blocked */ }
  }
};

const PROGRESS_KEY = 'xped.progress.v1';
const SETTINGS_KEY = 'xped.settings.v1';

let progress = store.read(PROGRESS_KEY, { subjects: {}, days: {} });
let settings = store.read(SETTINGS_KEY, { theme: 'dark', textSize: 'm' });

function saveProgress() { store.write(PROGRESS_KEY, progress); }
function saveSettings() { store.write(SETTINGS_KEY, settings); }

function subjectProgress(id) {
  if (!progress.subjects[id]) progress.subjects[id] = { done: {}, last: null };
  return progress.subjects[id];
}
function lessonKey(unitId, lessonId) { return unitId + '/' + lessonId; }
function markActivityToday() {
  const d = new Date();
  const iso = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') +
    '-' + String(d.getDate()).padStart(2, '0');
  progress.days[iso] = true;
}
function streak() {
  let n = 0;
  const day = new Date();
  for (;;) {
    const iso = day.getFullYear() + '-' + String(day.getMonth() + 1).padStart(2, '0') +
      '-' + String(day.getDate()).padStart(2, '0');
    if (progress.days[iso]) { n++; day.setDate(day.getDate() - 1); }
    else if (n === 0 && day.getDate() === new Date().getDate()) {
      // today has no activity yet — check yesterday before giving up
      day.setDate(day.getDate() - 1);
      const y = day.getFullYear() + '-' + String(day.getMonth() + 1).padStart(2, '0') +
        '-' + String(day.getDate()).padStart(2, '0');
      if (!progress.days[y]) break;
    } else break;
  }
  return n;
}

/* ---------- data loading ---------- */
let catalog = null;                 // catalog.json
const subjectCache = new Map();     // id -> subject file
let searchIndex = null;             // search-index.json (lazy)

const subjectMeta = new Map();      // id -> {subject, domain}

async function loadCatalog() {
  const res = await fetch('content/catalog.json');
  if (!res.ok) throw new Error('catalog fetch failed: ' + res.status);
  catalog = await res.json();
  for (const d of catalog.domains) {
    for (const s of d.subjects) subjectMeta.set(s.id, { subject: s, domain: d });
  }
}

async function loadSubject(id) {
  if (subjectCache.has(id)) return subjectCache.get(id);
  const res = await fetch('content/subjects/' + id + '.json');
  if (!res.ok) throw new Error('subject fetch failed: ' + id);
  const data = await res.json();
  subjectCache.set(id, data);
  return data;
}

async function loadSearchIndex() {
  if (searchIndex) return searchIndex;
  const res = await fetch('content/search-index.json');
  if (!res.ok) throw new Error('search index fetch failed');
  searchIndex = await res.json();
  return searchIndex;
}

/* ---------- subject stats ---------- */
function countLessons(subj) {
  return subj.units.reduce((n, u) => n + u.lessons.length, 0);
}
function countDone(subjId, subj) {
  const p = progress.subjects[subjId];
  if (!p) return 0;
  let n = 0;
  for (const u of subj.units) for (const l of u.lessons) {
    if (p.done[lessonKey(u.id, l.id)]) n++;
  }
  return n;
}

/* ---------- router ---------- */
const routes = [
  { re: /^\/?$/, fn: renderHome },
  { re: /^\/d\/([\w-]+)$/, fn: (m) => renderDomain(m[1]) },
  { re: /^\/s\/([\w-]+)$/, fn: (m) => renderSubject(m[1]) },
  { re: /^\/l\/([\w-]+)\/([\w-]+)\/([\w-]+)$/, fn: (m) => renderLesson(m[1], m[2], m[3]) },
  { re: /^\/search$/, fn: renderSearch },
  { re: /^\/library$/, fn: renderLibrary },
  { re: /^\/settings$/, fn: renderSettings },
  { re: /^\/about$/, fn: renderAbout },
];

async function route() {
  const hash = location.hash.replace(/^#/, '') || '/';
  const path = hash.split('?')[0];
  for (const r of routes) {
    const m = path.match(r.re);
    if (m) {
      try {
        await r.fn(m);
      } catch (err) {
        console.error(err);
        view.innerHTML = `<div class="wrap pad-y"><h1>Something went wrong</h1>
          <p class="muted">${esc(err.message)}</p>
          <p><a class="btn" href="#/">Back to home</a></p></div>`;
      }
      view.focus({ preventScroll: true });
      window.scrollTo(0, 0);
      return;
    }
  }
  view.innerHTML = `<div class="wrap pad-y"><h1>Not found</h1>
    <p><a class="btn" href="#/">Back to home</a></p></div>`;
}

/* ---------- views ---------- */

function heroStats() {
  let done = 0;
  for (const id of Object.keys(progress.subjects)) {
    done += Object.keys(progress.subjects[id].done).length;
  }
  const s = streak();
  return { done, streak: s };
}

function resumeTarget() {
  let latest = null;
  for (const [sid, p] of Object.entries(progress.subjects)) {
    if (p.last && p.last.t && (!latest || p.last.t > latest.t)) {
      latest = { sid, ...p.last };
    }
  }
  return latest;
}

function renderHome() {
  const { done, streak: st } = heroStats();
  const resume = resumeTarget();
  const nSubjects = subjectMeta.size;

  const resumeCard = resume && subjectMeta.has(resume.sid) ? `
    <a class="resume-card" href="#/l/${resume.sid}/${resume.u}/${resume.l}">
      <span class="resume-label">Continue learning</span>
      <span class="resume-title">${esc(subjectMeta.get(resume.sid).subject.title)}</span>
      <span class="resume-lesson">${esc(resume.title || 'Pick up where you left off')}</span>
    </a>` : '';

  view.innerHTML = `
  <section class="hero">
    <div class="wrap">
      <p class="eyebrow">Free · Open · Works offline</p>
      <h1>Learn anything.<br>No internet required.</h1>
      <p class="lead">${nSubjects} subjects from kindergarten to college — real lessons,
      worked examples, and practice, built on OpenStax and open educational resources.
      Visit once and the whole library lives on your device.</p>
      <div class="hero-row">
        <a class="btn btn-primary" href="#/search">Find a topic</a>
        <a class="btn" href="#/library">Offline library</a>
      </div>
      <div class="stats-row" aria-label="Your progress">
        <div class="stat"><span class="stat-num">${done}</span><span class="stat-label">lessons completed</span></div>
        <div class="stat"><span class="stat-num">${st}</span><span class="stat-label">day streak</span></div>
        <div class="stat"><span class="stat-num">${nSubjects}</span><span class="stat-label">subjects available</span></div>
      </div>
      ${resumeCard}
    </div>
  </section>
  <section class="wrap domains-section">
    <h2 class="sec-label">Browse by domain</h2>
    <div class="domain-grid">
      ${catalog.domains.map(d => `
        <a class="domain-card" href="#/d/${d.id}" style="--accent:${esc(d.accent)}">
          <span class="domain-card-title">${esc(d.title)}</span>
          <span class="domain-card-tag">${esc(d.tagline)}</span>
          <span class="domain-card-count">${d.subjects.length} subjects</span>
        </a>`).join('')}
    </div>
  </section>`;
}

function renderDomain(id) {
  const d = catalog.domains.find(x => x.id === id);
  if (!d) throw new Error('Unknown domain: ' + id);
  view.innerHTML = `
  <section class="page-head" style="--accent:${esc(d.accent)}">
    <div class="wrap">
      <nav class="crumbs" aria-label="Breadcrumb"><a href="#/">Home</a><span>/</span><span aria-current="page">${esc(d.title)}</span></nav>
      <h1>${esc(d.title)}</h1>
      <p class="lead">${esc(d.tagline)}</p>
    </div>
  </section>
  <section class="wrap pad-y">
    <div class="subject-grid">
      ${d.subjects.map(s => `
        <a class="subject-card" href="#/s/${s.id}" style="--accent:${esc(d.accent)}">
          <span class="subject-card-level">${esc(s.level)}</span>
          <span class="subject-card-title">${esc(s.title)}</span>
          <span class="subject-card-blurb">${esc(s.blurb)}</span>
          ${s.source.url ? `<span class="subject-card-src">Aligned to ${esc(s.source.name)}</span>` : ''}
        </a>`).join('')}
    </div>
  </section>`;
}

async function renderSubject(id) {
  const meta = subjectMeta.get(id);
  if (!meta) throw new Error('Unknown subject: ' + id);
  view.innerHTML = `<div class="wrap pad-y"><p class="muted loading">Loading ${esc(meta.subject.title)}…</p></div>`;
  const subj = await loadSubject(id);
  const total = countLessons(subj);
  const done = countDone(id, subj);
  const pct = total ? Math.round(done / total * 100) : 0;
  const p = subjectProgress(id);
  const src = meta.subject.source;

  view.innerHTML = `
  <section class="page-head" style="--accent:${esc(meta.domain.accent)}">
    <div class="wrap">
      <nav class="crumbs" aria-label="Breadcrumb">
        <a href="#/">Home</a><span>/</span>
        <a href="#/d/${meta.domain.id}">${esc(meta.domain.title)}</a><span>/</span>
        <span aria-current="page">${esc(subj.title)}</span>
      </nav>
      <h1>${esc(subj.title)}</h1>
      <p class="lead">${esc(subj.description)}</p>
      <div class="progress-wrap" role="img" aria-label="${pct}% complete">
        <div class="progress-bar"><span style="width:${pct}%"></span></div>
        <span class="progress-text">${done} / ${total} lessons · ${pct}%</span>
      </div>
      ${src && src.url ? `<p class="src-note">Aligned to
        <a href="${esc(src.url)}" target="_blank" rel="noopener">${esc(src.name)}</a>
        (${esc(src.license)}) — the full free textbook, when you're online.</p>`
      : `<p class="src-note">Original XP Education course · ${esc(src ? src.license : 'CC BY 4.0')}</p>`}
    </div>
  </section>
  <section class="wrap pad-y">
    ${subj.outcomes && subj.outcomes.length ? `
      <div class="outcomes">
        <h2 class="sec-label">You'll learn to</h2>
        <ul>${subj.outcomes.map(o => `<li>${fmt(o)}</li>`).join('')}</ul>
      </div>` : ''}
    <h2 class="sec-label">Course outline</h2>
    ${subj.units.map((u, ui) => `
      <details class="unit" ${ui === 0 || u.lessons.some(l => p.done[lessonKey(u.id, l.id)]) ? 'open' : ''}>
        <summary>
          <span class="unit-num">Unit ${ui + 1}</span>
          <span class="unit-title">${esc(u.title)}</span>
          <span class="unit-count">${u.lessons.filter(l => p.done[lessonKey(u.id, l.id)]).length}/${u.lessons.length}</span>
        </summary>
        <p class="unit-summary">${esc(u.summary)}</p>
        <ol class="lesson-list">
          ${u.lessons.map(l => `
            <li>
              <a class="lesson-link ${p.done[lessonKey(u.id, l.id)] ? 'is-done' : ''}"
                 href="#/l/${id}/${u.id}/${l.id}">
                <span class="lesson-check" aria-hidden="true"></span>
                <span class="lesson-title">${esc(l.title)}</span>
                <span class="lesson-mins">${l.minutes} min</span>
              </a>
            </li>`).join('')}
        </ol>
      </details>`).join('')}
  </section>`;
}

function findLesson(subj, unitId, lessonId) {
  const ui = subj.units.findIndex(u => u.id === unitId);
  if (ui < 0) return null;
  const li = subj.units[ui].lessons.findIndex(l => l.id === lessonId);
  if (li < 0) return null;
  return { ui, li, unit: subj.units[ui], lesson: subj.units[ui].lessons[li] };
}

function adjacentLesson(subj, ui, li, dir) {
  let u = ui, l = li + dir;
  while (u >= 0 && u < subj.units.length) {
    if (l >= 0 && l < subj.units[u].lessons.length) {
      return { unit: subj.units[u], lesson: subj.units[u].lessons[l] };
    }
    u += dir;
    if (u >= 0 && u < subj.units.length) {
      l = dir > 0 ? 0 : subj.units[u].lessons.length - 1;
    }
  }
  return null;
}

async function renderLesson(subjId, unitId, lessonId) {
  const meta = subjectMeta.get(subjId);
  if (!meta) throw new Error('Unknown subject: ' + subjId);
  const subj = await loadSubject(subjId);
  const found = findLesson(subj, unitId, lessonId);
  if (!found) throw new Error('Lesson not found');
  const { ui, li, unit, lesson } = found;
  const p = subjectProgress(subjId);
  const key = lessonKey(unitId, lessonId);
  const isDone = !!p.done[key];

  // remember as "continue learning" target
  p.last = { u: unitId, l: lessonId, title: lesson.title, t: Date.now() };
  markActivityToday();
  saveProgress();

  const prev = adjacentLesson(subj, ui, li, -1);
  const next = adjacentLesson(subj, ui, li, +1);

  view.innerHTML = `
  <article class="lesson" style="--accent:${esc(meta.domain.accent)}">
    <header class="page-head page-head--lesson">
      <div class="wrap wrap--reading">
        <nav class="crumbs" aria-label="Breadcrumb">
          <a href="#/d/${meta.domain.id}">${esc(meta.domain.title)}</a><span>/</span>
          <a href="#/s/${subjId}">${esc(subj.title)}</a><span>/</span>
          <span aria-current="page">${esc(unit.title)}</span>
        </nav>
        <h1>${esc(lesson.title)}</h1>
        <p class="lesson-meta">Unit ${ui + 1} · Lesson ${li + 1} · ${lesson.minutes} min read</p>
      </div>
    </header>
    <div class="wrap wrap--reading lesson-body">
      <p class="lesson-intro">${fmt(lesson.intro)}</p>
      ${lesson.sections.map(sec => `
        <section class="lesson-section">
          <h2>${esc(sec.heading)}</h2>
          ${sec.body.map(para => `<p>${fmt(para)}</p>`).join('')}
          ${sec.example ? `
            <div class="example">
              <p class="example-label">Worked example</p>
              <p class="example-problem">${fmt(sec.example.problem)}</p>
              <ol class="example-steps">${sec.example.steps.map(s => `<li>${fmt(s)}</li>`).join('')}</ol>
              <p class="example-answer"><strong>Answer:</strong> ${fmt(sec.example.answer)}</p>
            </div>` : ''}
        </section>`).join('')}
      ${lesson.keyTerms && lesson.keyTerms.length ? `
        <section class="key-terms">
          <h2>Key terms</h2>
          <dl>${lesson.keyTerms.map(k =>
            `<div class="term"><dt>${fmt(k.term)}</dt><dd>${fmt(k.def)}</dd></div>`).join('')}</dl>
        </section>` : ''}
      ${lesson.practice && lesson.practice.length ? `
        <section class="practice" id="practice">
          <h2>Check your understanding</h2>
          ${lesson.practice.map((q, qi) => `
            <fieldset class="quiz-q" data-qi="${qi}" data-answer="${q.answer}">
              <legend>${qi + 1}. ${fmt(q.q)}</legend>
              <div class="quiz-choices">
                ${q.choices.map((c, ci) => `
                  <button type="button" class="quiz-choice" data-ci="${ci}">${fmt(c)}</button>`).join('')}
              </div>
              <p class="quiz-explain" hidden>${fmt(q.explain)}</p>
            </fieldset>`).join('')}
          <p class="quiz-score" id="quiz-score" hidden></p>
        </section>` : ''}
      <div class="lesson-actions">
        <button type="button" class="btn btn-primary" id="complete-btn" ${isDone ? 'data-done' : ''}>
          ${isDone ? '✓ Completed' : 'Mark lesson complete'}
        </button>
      </div>
      <nav class="lesson-nav" aria-label="Lesson navigation">
        ${prev ? `<a class="lesson-nav-link prev" href="#/l/${subjId}/${prev.unit.id}/${prev.lesson.id}">
          <span class="lesson-nav-dir">← Previous</span><span>${esc(prev.lesson.title)}</span></a>` : '<span></span>'}
        ${next ? `<a class="lesson-nav-link next" href="#/l/${subjId}/${next.unit.id}/${next.lesson.id}">
          <span class="lesson-nav-dir">Next →</span><span>${esc(next.lesson.title)}</span></a>` : '<span></span>'}
      </nav>
    </div>
  </article>`;

  // quiz interactivity
  const practiceEl = $('#practice');
  if (practiceEl) {
    const total = lesson.practice.length;
    const answered = new Set();
    let correct = 0;
    practiceEl.addEventListener('click', (e) => {
      const btn = e.target.closest('.quiz-choice');
      if (!btn) return;
      const q = btn.closest('.quiz-q');
      const qi = q.dataset.qi;
      if (answered.has(qi)) return;
      answered.add(qi);
      const right = Number(q.dataset.answer);
      const chosen = Number(btn.dataset.ci);
      q.querySelectorAll('.quiz-choice').forEach((b, i) => {
        b.disabled = true;
        if (i === right) b.classList.add('is-right');
      });
      if (chosen === right) { correct++; btn.classList.add('is-right'); }
      else btn.classList.add('is-wrong');
      q.querySelector('.quiz-explain').hidden = false;
      if (answered.size === total) {
        const score = $('#quiz-score');
        score.hidden = false;
        score.textContent = `Score: ${correct} / ${total}` +
          (correct === total ? ' — perfect!' : correct >= total * 0.7 ? ' — nice work.' : ' — review the sections above and try again later.');
        markActivityToday();
        saveProgress();
      }
    });
  }

  $('#complete-btn').addEventListener('click', (e) => {
    const btn = e.currentTarget;
    const pr = subjectProgress(subjId);
    if (pr.done[key]) {
      delete pr.done[key];
      btn.removeAttribute('data-done');
      btn.textContent = 'Mark lesson complete';
    } else {
      pr.done[key] = Date.now();
      btn.setAttribute('data-done', '');
      btn.textContent = '✓ Completed';
      markActivityToday();
      toast(next ? 'Lesson complete — next one is queued up.' : 'Lesson complete!');
    }
    saveProgress();
  });
}

/* ---------- search ---------- */
function renderSearch() {
  view.innerHTML = `
  <section class="wrap pad-y search-page">
    <h1>Search</h1>
    <div class="search-box">
      <input id="search-input" type="search" placeholder="Try “fractions”, “photosynthesis”, “supply and demand”…"
             autocomplete="off" aria-label="Search all subjects and lessons">
    </div>
    <div id="search-results" class="search-results" aria-live="polite">
      <p class="muted">Search across ${subjectMeta.size} subjects and every lesson — all offline.</p>
    </div>
  </section>`;
  const input = $('#search-input');
  const results = $('#search-results');
  input.focus();

  let idxPromise = null;
  const run = async () => {
    const q = input.value.trim().toLowerCase();
    if (q.length < 2) {
      results.innerHTML = `<p class="muted">Type at least two characters.</p>`;
      return;
    }
    if (!idxPromise) idxPromise = loadSearchIndex().catch(() => null);
    const idx = await idxPromise;
    const out = [];

    // subjects from catalog
    for (const { subject, domain } of subjectMeta.values()) {
      const hay = (subject.title + ' ' + subject.blurb + ' ' + subject.level).toLowerCase();
      if (hay.includes(q)) {
        out.push({ rank: subject.title.toLowerCase().startsWith(q) ? 0 : 1,
          html: `<a class="result" href="#/s/${subject.id}" style="--accent:${esc(domain.accent)}">
            <span class="result-kind">Subject</span>
            <span class="result-title">${esc(subject.title)}</span>
            <span class="result-sub">${esc(domain.title)} · ${esc(subject.level)}</span></a>` });
      }
    }
    // lessons from index
    if (idx) {
      for (const s of idx.subjects) {
        const meta = subjectMeta.get(s.id);
        if (!meta) continue;
        for (const e of s.entries) {
          const hay = (e.t + ' ' + (e.k || '')).toLowerCase();
          if (hay.includes(q)) {
            out.push({ rank: e.t.toLowerCase().includes(q) ? 2 : 3,
              html: `<a class="result" href="#/l/${s.id}/${e.u}/${e.l}" style="--accent:${esc(meta.domain.accent)}">
                <span class="result-kind">Lesson</span>
                <span class="result-title">${esc(e.t)}</span>
                <span class="result-sub">${esc(meta.subject.title)}</span></a>` });
            if (out.length > 220) break;
          }
        }
        if (out.length > 220) break;
      }
    }
    out.sort((a, b) => a.rank - b.rank);
    const top = out.slice(0, 80);
    results.innerHTML = top.length
      ? top.map(r => r.html).join('')
      : `<p class="muted">No matches for “${esc(input.value)}”. Try a broader term.</p>`;
  };
  let t = null;
  input.addEventListener('input', () => { clearTimeout(t); t = setTimeout(run, 120); });
}

/* ---------- offline library ---------- */
async function renderLibrary() {
  const persisted = navigator.storage && navigator.storage.persisted
    ? await navigator.storage.persisted().catch(() => false) : false;
  let usage = null;
  if (navigator.storage && navigator.storage.estimate) {
    usage = await navigator.storage.estimate().catch(() => null);
  }
  const swReady = !!(navigator.serviceWorker && navigator.serviceWorker.controller);

  view.innerHTML = `
  <section class="wrap pad-y">
    <h1>Offline library</h1>
    <p class="lead">XP Education stores its entire library on your device, so lessons
    open instantly with no connection — on a plane, on deployment, or anywhere the
    internet isn't.</p>

    <div class="lib-status">
      <div class="lib-row">
        <span class="lib-dot ${swReady ? 'is-on' : ''}"></span>
        <div><strong>${swReady ? 'Offline mode is active' : 'Offline mode is preparing'}</strong>
        <p class="muted">${swReady
          ? 'The app and all course content are cached on this device.'
          : 'First visit: content is being cached in the background. Keep this page open for a minute.'}</p></div>
      </div>
      ${usage && usage.usage != null ? `
      <div class="lib-row">
        <span class="lib-dot is-on"></span>
        <div><strong>${(usage.usage / 1048576).toFixed(1)} MB stored</strong>
        <p class="muted">of the space your browser allows${persisted ? ' · storage is persistent' : ''}.</p></div>
      </div>` : ''}
    </div>

    <div class="lib-actions">
      <button type="button" class="btn btn-primary" id="warm-btn">Re-download all content</button>
      <button type="button" class="btn" id="persist-btn" ${persisted ? 'disabled' : ''}>
        ${persisted ? 'Storage already persistent' : 'Protect storage from cleanup'}</button>
    </div>
    <p class="muted" id="warm-status"></p>

    <h2 class="sec-label">Install as an app</h2>
    <p>On <strong>Android / desktop Chrome or Edge</strong>: use the “Install app” button in the
    header (or the browser's install icon in the address bar).</p>
    <p>On <strong>iPhone / iPad</strong>: open this site in Safari, tap the Share button, then
    <em>Add to Home Screen</em>. It launches full-screen and works offline like any app.</p>
  </section>`;

  $('#warm-btn').addEventListener('click', async () => {
    const status = $('#warm-status');
    status.textContent = 'Downloading full library…';
    try {
      const ids = [...subjectMeta.keys()];
      let n = 0;
      for (const id of ids) {
        await fetch('content/subjects/' + id + '.json');
        n++;
        if (n % 10 === 0) status.textContent = `Downloading full library… ${n}/${ids.length}`;
      }
      await loadSearchIndex().catch(() => {});
      status.textContent = `Done — ${ids.length} subjects cached for offline use.`;
      toast('Full library cached offline');
    } catch {
      status.textContent = 'Could not finish — check your connection and try again.';
    }
  });

  $('#persist-btn').addEventListener('click', async () => {
    if (navigator.storage && navigator.storage.persist) {
      const ok = await navigator.storage.persist();
      toast(ok ? 'Storage is now persistent' : 'Browser declined — content is still cached');
      renderLibrary();
    }
  });
}

/* ---------- settings ---------- */
function renderSettings() {
  view.innerHTML = `
  <section class="wrap pad-y settings">
    <h1>Settings</h1>

    <h2 class="sec-label">Appearance</h2>
    <div class="setting-row">
      <span>Theme</span>
      <div class="seg" role="group" aria-label="Theme">
        <button type="button" data-theme="dark" class="${settings.theme === 'dark' ? 'is-active' : ''}">Dark</button>
        <button type="button" data-theme="light" class="${settings.theme === 'light' ? 'is-active' : ''}">Light</button>
      </div>
    </div>
    <div class="setting-row">
      <span>Text size</span>
      <div class="seg" role="group" aria-label="Text size">
        <button type="button" data-size="s" class="${settings.textSize === 's' ? 'is-active' : ''}">Small</button>
        <button type="button" data-size="m" class="${settings.textSize === 'm' ? 'is-active' : ''}">Medium</button>
        <button type="button" data-size="l" class="${settings.textSize === 'l' ? 'is-active' : ''}">Large</button>
      </div>
    </div>

    <h2 class="sec-label">Your data</h2>
    <p class="muted">Progress lives only on this device — no account, no tracking, nothing sent anywhere.</p>
    <div class="lib-actions">
      <button type="button" class="btn" id="export-btn">Export progress</button>
      <button type="button" class="btn" id="import-btn">Import progress</button>
      <button type="button" class="btn btn-danger" id="reset-btn">Reset all progress</button>
    </div>
    <input type="file" id="import-file" accept="application/json" hidden>

    <h2 class="sec-label">App</h2>
    <div class="lib-actions">
      <button type="button" class="btn" id="update-btn">Check for updates</button>
    </div>
    <p class="muted">XP Education · <a href="#/about">About &amp; licenses</a></p>
  </section>`;

  view.querySelectorAll('[data-theme]').forEach(b => b.addEventListener('click', () => {
    settings.theme = b.dataset.theme; saveSettings(); applySettings(); renderSettings();
  }));
  view.querySelectorAll('[data-size]').forEach(b => b.addEventListener('click', () => {
    settings.textSize = b.dataset.size; saveSettings(); applySettings(); renderSettings();
  }));

  $('#export-btn').addEventListener('click', () => {
    const blob = new Blob([JSON.stringify({ progress, settings }, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'xp-education-progress.json';
    a.click();
    URL.revokeObjectURL(a.href);
  });
  $('#import-btn').addEventListener('click', () => $('#import-file').click());
  $('#import-file').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const data = JSON.parse(await file.text());
      if (data.progress && data.progress.subjects) {
        progress = data.progress; saveProgress();
        if (data.settings) { settings = data.settings; saveSettings(); applySettings(); }
        toast('Progress imported');
        renderSettings();
      } else toast('That file doesn\'t look like an XP Education export');
    } catch { toast('Could not read that file'); }
  });
  $('#reset-btn').addEventListener('click', () => {
    if (confirm('Reset all progress on this device? This cannot be undone.')) {
      progress = { subjects: {}, days: {} };
      saveProgress();
      toast('Progress reset');
    }
  });
  $('#update-btn').addEventListener('click', async () => {
    if (navigator.serviceWorker) {
      const reg = await navigator.serviceWorker.getRegistration();
      if (reg) { await reg.update(); toast('Checked — you\'ll get the new version on next launch if one exists.'); return; }
    }
    toast('Service worker not active yet');
  });
}

/* ---------- about ---------- */
function renderAbout() {
  view.innerHTML = `
  <section class="wrap wrap--reading pad-y about">
    <h1>About XP Education</h1>
    <p class="lead">A free learning platform that treats internet access as optional.
    Every subject, every lesson, and every practice question is stored on your device
    after your first visit.</p>

    <h2>What's inside</h2>
    <p>${subjectMeta.size} subjects across ${catalog.domains.length} domains, from K–8
    foundations through college courses. College subjects are aligned to
    <a href="https://openstax.org" target="_blank" rel="noopener">OpenStax</a> textbooks —
    peer-reviewed, openly licensed books from Rice University — and each subject links to
    its full free textbook for deeper study. Subjects OpenStax doesn't cover (languages,
    trades, arts, K–8, and more) are original XP Education courses.</p>

    <h2>Licenses</h2>
    <p>OpenStax textbooks are licensed under
    <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener">Creative Commons Attribution 4.0</a>.
    XP Education lessons aligned to those books are original summaries and teaching
    material inspired by their scope and sequence, with attribution and a link on every
    subject page. Original XP Education courses are likewise released under CC BY 4.0 —
    use them, copy them, teach with them.</p>

    <h2>Privacy</h2>
    <p>No accounts, no analytics, no tracking. Your progress is stored only in your
    browser and you can export or erase it any time in Settings.</p>

    <h2>Who builds this</h2>
    <p>XP Education is an <a href="/">XPLabs</a> project by Levi Colby, built in
    Honolulu, Hawaiʻi — free for students, families, homeschoolers, and service members
    anywhere, connected or not.</p>
  </section>`;
}

/* ---------- settings application ---------- */
function applySettings() {
  document.documentElement.dataset.theme = settings.theme;
  document.documentElement.dataset.textsize = settings.textSize;
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.content = settings.theme === 'light' ? '#F7F5F0' : '#07090A';
}

/* ---------- install prompt ---------- */
let deferredInstall = null;
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredInstall = e;
  $('#install-btn').hidden = false;
});
$('#install-btn').addEventListener('click', async () => {
  if (!deferredInstall) return;
  deferredInstall.prompt();
  await deferredInstall.userChoice;
  deferredInstall = null;
  $('#install-btn').hidden = true;
});
window.addEventListener('appinstalled', () => toast('XP Education installed — it now works fully offline.'));

/* ---------- online/offline indicator ---------- */
function updateOnlineState() {
  $('#offline-pill').hidden = navigator.onLine;
}
window.addEventListener('online', updateOnlineState);
window.addEventListener('offline', updateOnlineState);

/* ---------- boot ---------- */
async function boot() {
  applySettings();
  updateOnlineState();
  try {
    await loadCatalog();
  } catch (err) {
    view.innerHTML = `<div class="wrap pad-y"><h1>Couldn't load the library</h1>
      <p class="muted">${esc(err.message)}. If this is your first visit, you need a
      connection once — after that everything works offline.</p></div>`;
    return;
  }
  window.addEventListener('hashchange', route);
  await route();

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').then(reg => {
      // Warm the search index once the SW is in control, so search works offline.
      if (reg.active) loadSearchIndex().catch(() => {});
    }).catch(err => console.warn('SW registration failed', err));
  }
}

boot();
