const $ = (id) => document.getElementById(id);
const LS_KEY = 'internshipSurvivor.v4';
const MS_DAY = 24 * 60 * 60 * 1000;

const psalms = [
  ['The Lord is my shepherd; I shall not want.', 'Psalm 23:1'],
  ['God is our refuge and strength, a very present help in trouble.', 'Psalm 46:1'],
  ['I will lift up mine eyes unto the hills, from whence cometh my help.', 'Psalm 121:1'],
  ['Wait on the Lord: be of good courage, and he shall strengthen thine heart.', 'Psalm 27:14'],
  ['The Lord is my light and my salvation; whom shall I fear?', 'Psalm 27:1'],
  ['This is the day which the Lord hath made; we will rejoice and be glad in it.', 'Psalm 118:24'],
  ['Cast thy burden upon the Lord, and he shall sustain thee.', 'Psalm 55:22'],
  ['The Lord is nigh unto them that are of a broken heart.', 'Psalm 34:18'],
  ['The Lord shall preserve thy going out and thy coming in.', 'Psalm 121:8'],
  ['The steps of a good man are ordered by the Lord.', 'Psalm 37:23'],
  ['In God have I put my trust: I will not be afraid.', 'Psalm 56:11'],
  ['He healeth the broken in heart, and bindeth up their wounds.', 'Psalm 147:3'],
  ['I cried unto the Lord with my voice, and he heard me.', 'Psalm 3:4'],
  ['The Lord will give strength unto his people.', 'Psalm 29:11'],
  ['Thou art my hiding place and my shield: I hope in thy word.', 'Psalm 119:114']
];

const defaultRotations = [
  { name: 'Surgery', days: 90 },
  { name: 'Internal Medicine', days: 90 },
  { name: 'Pediatrics', days: 60 },
  { name: 'OBGYN', days: 60 },
  { name: 'Elective / Other', days: 65 }
];

let state = loadState();
let selectedMood = state.todayDraft?.mood || '';

function todayLocal() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}
function parseDate(v) {
  const [y, m, d] = v.split('-').map(Number);
  return new Date(y, m - 1, d);
}
function isoDate(d) {
  const z = new Date(d);
  z.setHours(0, 0, 0, 0);
  return `${z.getFullYear()}-${String(z.getMonth() + 1).padStart(2, '0')}-${String(z.getDate()).padStart(2, '0')}`;
}
function formatDate(d) {
  return d.toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}
function shortDate(d) {
  return d.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short' });
}
function daysBetween(a, b) {
  return Math.round((parseDate(isoDate(b)) - parseDate(isoDate(a))) / MS_DAY);
}
function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}
function clamp(n, min, max) { return Math.max(min, Math.min(max, n)); }

function loadState() {
  const today = todayLocal();
  const saved = localStorage.getItem(LS_KEY);
  if (saved) {
    try { return JSON.parse(saved); } catch {}
  }
  const start = isoDate(today);
  const end = isoDate(addDays(today, 364));
  return {
    startDate: start,
    endDate: end,
    defaultRotation: 'Surgery',
    rotations: defaultRotations,
    entries: [],
    todayDraft: { mood: '', diary: '' }
  };
}
function saveState() { localStorage.setItem(LS_KEY, JSON.stringify(state)); }

function getTotalDays() {
  return Math.max(1, daysBetween(state.startDate, state.endDate) + 1);
}
function getDayIndex(date = todayLocal()) {
  return clamp(daysBetween(state.startDate, date) + 1, 1, getTotalDays());
}
function getCurrentRotation(dayIndex) {
  let count = 0;
  for (const r of state.rotations) {
    const days = Math.max(1, Number(r.days) || 1);
    if (dayIndex <= count + days) return { ...r, currentDay: dayIndex - count, percent: Math.round(((dayIndex - count) / days) * 100) };
    count += days;
  }
  return { name: state.defaultRotation || 'Internship', days: getTotalDays(), currentDay: dayIndex, percent: Math.round(dayIndex / getTotalDays() * 100) };
}
function getPsalm(dayIndex) { return psalms[(dayIndex - 1) % psalms.length]; }
function todayEntry() { return state.entries.find(e => e.date === isoDate(todayLocal())); }
function tornCount() { return state.entries.length; }
function daysLeft() { return Math.max(0, getTotalDays() - getDayIndex(todayLocal())); }
function moodLabel(m) { return ({happy:'Happy', normal:'Normal', difficult:'Difficult', exhausting:'Exhausting'})[m] || 'Memory'; }
function moodEmoji(m) { return ({happy:'😊', normal:'😐', difficult:'😟', exhausting:'🥵'})[m] || '📝'; }

function showToast(msg) {
  const t = $('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 1700);
}

function renderAll() {
  renderToday();
  renderStats();
  renderTimeline();
  renderRotationPanel();
  renderMemories();
  renderSettings();
  renderNavCounts();
}

function renderToday() {
  const dayIndex = getDayIndex();
  const total = getTotalDays();
  const remaining = Math.max(0, total - dayIndex);
  const currentDate = todayLocal();
  const rotation = getCurrentRotation(dayIndex);
  const [verse, ref] = getPsalm(dayIndex);
  const entry = todayEntry();

  $('overallPercent').textContent = `${Math.round((tornCount() / total) * 100)}%`;
  $('overallMeta').textContent = `${tornCount()} pages torn • ${Math.max(0, total - tornCount())} left • ${total} total`;
  $('overallBar').style.width = `${clamp((tornCount() / total) * 100, 0, 100)}%`;

  $('dayNumber').textContent = `Day ${dayIndex}`;
  $('dateText').textContent = formatDate(currentDate);
  $('rotationText').textContent = `${rotation.name} Rotation`;
  $('remainingText').textContent = `${remaining} pages remaining`;
  $('psalmVerse').textContent = verse;
  $('psalmRef').textContent = ref;

  $('tearBtn').textContent = entry ? 'Today Already Torn' : '▰ Tear Off Today';
  $('tearBtn').classList.toggle('done', !!entry);
  $('tearHint').textContent = entry ? 'Come back tomorrow for the next page.' : 'One day at a time. You got this. 💛';

  if (entry) {
    selectedMood = entry.mood;
    $('diaryInput').value = entry.diary || '';
  } else {
    $('diaryInput').value = state.todayDraft?.diary || '';
  }
  renderMoodButtons();
  updateCharCount();
}

function renderMoodButtons() {
  document.querySelectorAll('.mood-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.mood === selectedMood);
  });
}
function updateCharCount() { $('charCount').textContent = `${$('diaryInput').value.length} / 500`; }


function getRotationRows() {
  const dayIndex = getDayIndex();
  let start = 1;
  return state.rotations.map((r, i) => {
    const days = Math.max(1, Number(r.days) || 1);
    const end = start + days - 1;
    const completed = clamp(dayIndex - start + 1, 0, days);
    const pct = Math.round((completed / days) * 100);
    const status = dayIndex < start ? 'upcoming' : (dayIndex > end ? 'finished' : 'current');
    const row = { ...r, index: i + 1, start, end, days, completed, pct, status };
    start += days;
    return row;
  });
}

function renderTimeline() {
  const rows = getRotationRows();
  const html = rows.map(r => `<div class="timeline-row ${r.status}">
      <div class="timeline-head"><span>${escapeHtml(r.name)}</span><small>${r.completed} / ${r.days} days</small></div>
      <div class="mini-track"><span style="width:${r.pct}%"></span></div>
      <div class="timeline-head"><small>${rotationStatusText(r)}</small><small>${r.pct}%</small></div>
    </div>`).join('') + `<div class="timeline-total">Total: ${rows.reduce((a,r)=>a+r.days,0)} days</div>`;
  $('rotationTimeline').innerHTML = html;
}

function renderRotationPanel() {
  const rows = getRotationRows();
  const total = rows.reduce((a, r) => a + r.days, 0);
  const html = rows.map(r => `
    <article class="rotation-big-card ${r.status}">
      <div class="rotation-big-head">
        <div>
          <span class="rotation-badge">${r.status === 'current' ? 'Current Rotation' : rotationStatusText(r)}</span>
          <h3>${escapeHtml(r.name)}</h3>
        </div>
        <strong>${r.pct}%</strong>
      </div>
      <div class="big-track"><span style="width:${r.pct}%"></span></div>
      <div class="rotation-meta">
        <span>${r.completed} days completed</span>
        <span>${Math.max(0, r.days - r.completed)} days left</span>
        <span>${r.days} days total</span>
      </div>
    </article>`).join('');
  $('rotationPanelList').innerHTML = html + `<div class="rotation-total-card">Total rotation plan: <b>${total} days</b></div>`;
}

function rotationStatusText(r) {
  if (r.status === 'finished') return 'Completed';
  if (r.status === 'current') return `Day ${r.completed} of ${r.days}`;
  return 'Upcoming';
}

function renderStats() {
  const total = getTotalDays();
  const survived = tornCount();
  const happy = state.entries.filter(e => e.mood === 'happy').length;
  const normal = state.entries.filter(e => e.mood === 'normal').length;
  const difficult = state.entries.filter(e => e.mood === 'difficult').length;
  const exhausting = state.entries.filter(e => e.mood === 'exhausting').length;
  const longest = getLongestStreak();
  const current = getCurrentStreak();
  const rotation = getCurrentRotation(getDayIndex());

  $('statsAtGlance').innerHTML = `
    <div class="stats-line"><span>Days Survived</span><b class="green">${survived}</b></div>
    <div class="stats-line"><span>Days Remaining</span><b class="blue">${Math.max(0, total - survived)}</b></div>
    <div class="stats-line"><span>😊 Happy Moments</span><b class="green">${happy}</b></div>
    <div class="stats-line"><span>😐 Normal Moments</span><b class="blue">${normal}</b></div>
    <div class="stats-line"><span>😟 Difficult Moments</span><b>${difficult}</b></div>
    <div class="stats-line"><span>🥵 Exhausting Moments</span><b class="red">${exhausting}</b></div>
    <div class="stats-line"><span>🔥 Longest Streak</span><b>${longest} day${longest===1?'':'s'}</b></div>
    <div class="stats-line"><span>🦁 Current Streak</span><b>${current} day${current===1?'':'s'}</b></div>
    <div class="stats-line"><span>◔ Rotation Progress</span><b>${rotation.percent}%</b></div>`;

  $('statsGrid').innerHTML = [
    ['Days Survived', survived], ['Days Remaining', Math.max(0, total - survived)], ['Happy', happy], ['Normal', normal], ['Difficult', difficult], ['Exhausting', exhausting], ['Longest Streak', `${longest}d`], ['Current Streak', `${current}d`], ['Internship Progress', `${Math.round((survived / total) * 100)}%`], ['Rotation Progress', `${rotation.percent}%`]
  ].map(([a,b]) => `<div class="stat-card"><span>${a}</span><b>${b}</b></div>`).join('');
}

function renderNavCounts() {
  $('happyNavCount').textContent = state.entries.filter(e => e.mood === 'happy').length;
  $('difficultNavCount').textContent = state.entries.filter(e => e.mood === 'difficult' || e.mood === 'exhausting').length;
}

function renderMemories() {
  const sorted = [...state.entries].sort((a,b) => b.date.localeCompare(a.date));
  $('pagesList').innerHTML = renderMemoryCards(sorted);
  $('happyList').innerHTML = renderMemoryCards(sorted.filter(e => e.mood === 'happy'));
  $('difficultList').innerHTML = renderMemoryCards(sorted.filter(e => e.mood === 'difficult' || e.mood === 'exhausting'));
  renderSideMonths(sorted);
}

function renderMemoryCards(entries) {
  if (!entries.length) return `<div class="empty">No pages here yet. Tear off a day and it will appear here.</div>`;
  return entries.map(e => {
    const d = parseDate(e.date);
    return `<article class="memory-card">
      <header><span>${formatDate(d)}</span><span class="mood-pill">${moodEmoji(e.mood)} ${moodLabel(e.mood)}</span></header>
      <p>${escapeHtml(e.diary || 'No diary written for this day.')}</p>
      <blockquote>${escapeHtml(e.psalmVerse || '')}</blockquote>
      <strong>${escapeHtml(e.psalmRef || '')}</strong>
    </article>`;
  }).join('');
}

function renderSideMonths(entries) {
  if (!entries.length) { $('sideMonths').innerHTML = '<div class="empty">No pages torn yet.</div>'; return; }
  const groups = {};
  entries.forEach(e => {
    const d = parseDate(e.date);
    const key = d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    groups[key] ||= [];
    groups[key].push(e);
  });
  $('sideMonths').innerHTML = Object.entries(groups).map(([month, list], idx) => `
    <div class="month-group">
      <div class="month-head"><span>${month}</span><b>${list.length}</b></div>
      <div class="month-items" style="display:${idx === 0 ? 'block' : 'none'}">
        ${list.slice(0, 6).map(e => `<div class="month-item"><b>Day ${e.dayIndex}</b><small>${shortDate(parseDate(e.date))} • ${moodEmoji(e.mood)} ${moodLabel(e.mood)}</small></div>`).join('')}
      </div>
    </div>`).join('');
  document.querySelectorAll('.month-head').forEach(head => head.addEventListener('click', () => {
    const items = head.nextElementSibling;
    items.style.display = items.style.display === 'none' ? 'block' : 'none';
  }));
}

function renderSettings() {
  $('startDateInput').value = state.startDate;
  $('endDateInput').value = state.endDate;
  $('defaultRotationInput').value = state.defaultRotation || 'Surgery';
  $('rotationEditor').innerHTML = state.rotations.map((r, i) => `
    <div class="rotation-edit-row">
      <input data-rot-name="${i}" value="${escapeAttr(r.name)}" placeholder="Rotation name">
      <input data-rot-days="${i}" type="number" min="1" value="${Number(r.days)||1}" placeholder="Days">
      <button type="button" data-remove-rot="${i}" class="nav-item">Remove</button>
    </div>`).join('') + `<button type="button" id="addRotationBtn" class="nav-item">+ Add Rotation</button>`;

  $('addRotationBtn').onclick = () => { state.rotations.push({ name: 'New Rotation', days: 30 }); saveState(); renderAll(); };
  document.querySelectorAll('[data-remove-rot]').forEach(btn => btn.onclick = () => {
    if (state.rotations.length <= 1) return showToast('Keep at least one rotation.');
    state.rotations.splice(Number(btn.dataset.removeRot), 1); saveState(); renderAll();
  });
}

function saveEntry(tear = false) {
  const dayIndex = getDayIndex();
  const [psalmVerse, psalmRef] = getPsalm(dayIndex);
  const date = isoDate(todayLocal());
  const existing = todayEntry();
  const entry = {
    date, dayIndex,
    mood: selectedMood || 'normal',
    diary: $('diaryInput').value.trim(),
    psalmVerse, psalmRef,
    rotation: getCurrentRotation(dayIndex).name,
    savedAt: new Date().toISOString()
  };
  if (existing) Object.assign(existing, entry);
  else state.entries.push(entry);
  state.todayDraft = { mood: selectedMood, diary: $('diaryInput').value };
  saveState();
  renderAll();
  showToast(tear ? 'Page torn and saved.' : 'Entry saved.');
}

function getLongestStreak() {
  if (!state.entries.length) return 0;
  const dates = [...new Set(state.entries.map(e => e.date))].sort();
  let best = 1, cur = 1;
  for (let i = 1; i < dates.length; i++) {
    const prev = parseDate(dates[i - 1]);
    const now = parseDate(dates[i]);
    if (daysBetween(prev, now) === 1) cur++; else cur = 1;
    best = Math.max(best, cur);
  }
  return best;
}
function getCurrentStreak() {
  const set = new Set(state.entries.map(e => e.date));
  let d = todayLocal(), count = 0;
  while (set.has(isoDate(d))) { count++; d = addDays(d, -1); }
  return count;
}
function escapeHtml(str) { return String(str || '').replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c])); }
function escapeAttr(str) { return escapeHtml(str).replace(/`/g, '&#96;'); }

function switchTab(tab) {
  document.querySelectorAll('.nav-item').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
  document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
  $(`${tab}Panel`)?.classList.add('active');
  if (window.innerWidth < 1120) window.scrollTo({ top: 0, behavior: 'smooth' });
}

document.addEventListener('click', (e) => {
  const nav = e.target.closest('[data-tab]');
  if (nav) switchTab(nav.dataset.tab);
  const mood = e.target.closest('.mood-btn');
  if (mood) {
    selectedMood = mood.dataset.mood;
    state.todayDraft = { mood: selectedMood, diary: $('diaryInput').value };
    saveState();
    renderMoodButtons();
  }
});

$('diaryInput').addEventListener('input', () => {
  updateCharCount();
  state.todayDraft = { mood: selectedMood, diary: $('diaryInput').value };
  saveState();
});
$('saveEntryBtn').addEventListener('click', () => saveEntry(false));
$('tearBtn').addEventListener('click', () => {
  if (todayEntry()) return showToast('Today is already torn.');
  $('paper').classList.add('tearing');
  setTimeout(() => { saveEntry(true); $('paper').classList.remove('tearing'); }, 650);
});
$('resetTodayBtn').addEventListener('click', () => {
  const date = isoDate(todayLocal());
  state.entries = state.entries.filter(e => e.date !== date);
  saveState(); renderAll(); showToast('Today unlocked for testing.');
});
$('themeBtn').addEventListener('click', () => showToast('Dark faith theme is active.'));
$('saveSettingsBtn').addEventListener('click', () => {
  state.startDate = $('startDateInput').value || state.startDate;
  state.endDate = $('endDateInput').value || state.endDate;
  state.defaultRotation = $('defaultRotationInput').value.trim() || 'Surgery';
  document.querySelectorAll('[data-rot-name]').forEach(input => {
    const i = Number(input.dataset.rotName);
    state.rotations[i].name = input.value.trim() || `Rotation ${i+1}`;
  });
  document.querySelectorAll('[data-rot-days]').forEach(input => {
    const i = Number(input.dataset.rotDays);
    state.rotations[i].days = Math.max(1, Number(input.value) || 1);
  });
  saveState(); renderAll(); showToast('Settings saved.'); switchTab('today');
});

renderAll();
