const STORAGE_KEY = 'internshipTearCalendarV2';

const todayISO = () => {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 10);
};
const parseDate = iso => new Date(`${iso}T00:00:00`);
const fmt = iso => parseDate(iso).toLocaleDateString(undefined, {
  weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
});
const daysBetween = (a, b) => Math.round((parseDate(b) - parseDate(a)) / 86400000);
const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
const $ = id => document.getElementById(id);

const quotes = [
  'I only need to survive this page.',
  'One day closer to Dr. Milkyas.',
  'Today becomes experience tomorrow.',
  'Tear the page. Keep the lesson.',
  'This year is not your whole life.',
  'Small survival is still survival.',
  'Even difficult days become pages torn.'
];

const psalms = [
  { ref: 'Psalm 23:4', text: 'I will fear no evil: for thou art with me.' },
  { ref: 'Psalm 27:1', text: 'The LORD is my light and my salvation; whom shall I fear?' },
  { ref: 'Psalm 34:18', text: 'The LORD is nigh unto them that are of a broken heart.' },
  { ref: 'Psalm 46:1', text: 'God is our refuge and strength, a very present help in trouble.' },
  { ref: 'Psalm 55:22', text: 'Cast thy burden upon the LORD, and he shall sustain thee.' },
  { ref: 'Psalm 56:3', text: 'What time I am afraid, I will trust in thee.' },
  { ref: 'Psalm 121:2', text: 'My help cometh from the LORD, which made heaven and earth.' },
  { ref: 'Psalm 138:3', text: 'In the day when I cried thou answeredst me.' }
];

const moods = [
  { key: 'happy', icon: '😊', label: 'Happy moment', group: 'happy' },
  { key: 'exciting', icon: '🌟', label: 'Exciting moment', group: 'happy' },
  { key: 'normal', icon: '😐', label: 'Normal day', group: 'neutral' },
  { key: 'lesson', icon: '📚', label: 'Learned something', group: 'happy' },
  { key: 'difficult', icon: '😔', label: 'Difficult day', group: 'sad' },
  { key: 'sad', icon: '💔', label: 'Sad moment', group: 'sad' },
  { key: 'exhausting', icon: '😩', label: 'Exhausting day', group: 'sad' },
  { key: 'meaningful', icon: '❤️', label: 'Meaningful patient', group: 'happy' }
];

let state = load();
let pendingTearDate = null;
let selectedMoodKey = 'happy';
let currentTab = 'history';

function defaultState() {
  const start = todayISO();
  const endDate = new Date();
  endDate.setDate(endDate.getDate() + 364);
  const end = endDate.toISOString().slice(0, 10);
  return { setup: false, start, end, rotation: 'Surgery', entries: [] };
}

function load() {
  try {
    const oldV2 = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (oldV2) return oldV2;
    const oldV1 = JSON.parse(localStorage.getItem('internshipTearCalendarV1'));
    if (oldV1) return oldV1;
    return defaultState();
  } catch {
    return defaultState();
  }
}
function save() { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
function getMood(key) { return moods.find(m => m.key === key) || moods[0]; }
function escapeHTML(str) {
  return String(str || '').replace(/[&<>'"]/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
  }[c]));
}

function init() {
  renderMoodGrid();
  bindEvents();
  render();
}

function bindEvents() {
  $('saveSetupBtn').addEventListener('click', () => {
    state.start = $('startDate').value || todayISO();
    state.end = $('endDate').value || state.end;
    state.rotation = $('rotationName').value.trim() || 'Surgery';
    state.setup = true;
    save();
    render();
  });

  $('tearBtn').addEventListener('click', tearToday);
  $('skipJournalBtn').addEventListener('click', () => saveEntry(true));
  $('saveJournalBtn').addEventListener('click', () => saveEntry(false));
  $('settingsBtn').addEventListener('click', openSettings);
  $('closeSettingsBtn').addEventListener('click', () => $('settingsModal').classList.add('hidden'));
  $('saveSettingsBtn').addEventListener('click', saveSettings);
  $('resetBtn').addEventListener('click', resetAll);

  $('journalText').addEventListener('touchstart', () => $('journalText').focus(), { passive: true });
  $('journalText').addEventListener('click', () => $('journalText').focus());
  $('moodGrid').addEventListener('click', chooseMoodFromEvent);
  $('moodGrid').addEventListener('touchend', chooseMoodFromEvent, { passive: false });

  document.querySelectorAll('.tab').forEach(btn => {
    btn.addEventListener('click', () => {
      currentTab = btn.dataset.tab;
      renderTabs();
    });
  });
}

function render() {
  $('setupScreen').classList.toggle('hidden', state.setup);
  $('homeScreen').classList.toggle('hidden', !state.setup);

  if (!state.setup) {
    $('startDate').value = state.start;
    $('endDate').value = state.end;
    $('rotationName').value = state.rotation;
    return;
  }

  const t = todayISO();
  const total = Math.max(1, daysBetween(state.start, state.end) + 1);
  const rawDay = daysBetween(state.start, t) + 1;
  const day = clamp(rawDay, 1, total);
  const tornToday = state.entries.some(e => e.date === t);
  const completed = state.entries.length;
  const pct = clamp(Math.round((completed / total) * 100), 0, 100);

  $('dayTitle').textContent = rawDay > total ? 'DONE' : `DAY ${day}`;
  $('paperDate').textContent = fmt(t);
  $('rotationText').textContent = `${state.rotation} Rotation`;
  $('daysLeftText').textContent = rawDay > total ? 'Internship completed.' : `${Math.max(0, total - completed)} pages remaining`;
  const dailyPsalm = psalms[day % psalms.length];
  $('quoteText').innerHTML = `<span class="main-quote">“${quotes[day % quotes.length]}”</span><span class="psalm-quote">${dailyPsalm.text}<br><strong>${dailyPsalm.ref}</strong></span>`;
  $('progressText').textContent = `${pct}%`;
  $('progressFill').style.width = `${pct}%`;
  $('daysSummary').textContent = `${completed} pages torn • ${Math.max(0, total - completed)} left • ${total} total`;
  $('tearBtn').disabled = tornToday || rawDay > total;
  $('tearBtn').textContent = tornToday ? 'TODAY ALREADY TORN' : rawDay > total ? 'INTERNSHIP COMPLETE' : 'TEAR OFF TODAY';
  $('tearHint').textContent = tornToday ? 'Come back tomorrow for the next page.' : 'At the end of the day, tear this page and save a memory.';
  $('paper').classList.remove('tearing');
  renderTabs();
}

function tearToday() {
  pendingTearDate = todayISO();
  $('tearBtn').disabled = true;
  $('paper').classList.add('tearing');
  setTimeout(() => {
    $('journalScreen').classList.remove('hidden');
    $('journalText').value = '';
    selectedMoodKey = 'happy';
    updateMoodSelection();
    $('journalScreen').scrollIntoView({ behavior: 'smooth', block: 'start' });
    setTimeout(() => $('journalText').focus(), 300);
  }, 700);
}

function renderMoodGrid() {
  const grid = $('moodGrid');
  grid.innerHTML = '';
  moods.forEach(m => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'mood-option';
    b.dataset.moodKey = m.key;
    b.innerHTML = `<span class="mood-icon">${m.icon}</span><span class="mood-copy"><strong>${m.label}</strong><small>${m.group === 'happy' ? 'Saved as happy' : m.group === 'sad' ? 'Saved as difficult' : 'Saved as normal'}</small></span>`;
    grid.appendChild(b);
  });
  updateMoodSelection();
}

function chooseMoodFromEvent(event) {
  const btn = event.target.closest('.mood-option');
  if (!btn) return;
  event.preventDefault();
  selectedMoodKey = btn.dataset.moodKey;
  updateMoodSelection();
}

function updateMoodSelection() {
  document.querySelectorAll('.mood-option').forEach(btn => {
    btn.classList.toggle('selected', btn.dataset.moodKey === selectedMoodKey);
  });
}

function saveEntry(skipped) {
  const date = pendingTearDate || todayISO();
  const mood = getMood(selectedMoodKey);
  const text = $('journalText').value.trim();

  const existingIndex = state.entries.findIndex(e => e.date === date);
  const entry = {
    date,
    moodKey: mood.key,
    mood,
    text: skipped ? '' : text,
    skipped,
    createdAt: new Date().toISOString()
  };

  if (existingIndex >= 0) state.entries[existingIndex] = entry;
  else state.entries.push(entry);

  state.entries.sort((a, b) => a.date.localeCompare(b.date));
  save();
  $('journalText').value = '';
  $('journalScreen').classList.add('hidden');
  pendingTearDate = null;
  render();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function renderTabs() {
  document.querySelectorAll('.tab').forEach(b => b.classList.toggle('active', b.dataset.tab === currentTab));
  const box = $('tabContent');
  const entries = [...state.entries].sort((a, b) => b.date.localeCompare(a.date));

  if (currentTab === 'stats') return renderStats(box, entries);

  let filtered = entries;
  if (currentTab === 'happy') filtered = entries.filter(e => getMood(e.moodKey || e.mood?.key).group === 'happy');
  if (currentTab === 'sad') filtered = entries.filter(e => getMood(e.moodKey || e.mood?.key).group === 'sad');

  if (!filtered.length) {
    box.innerHTML = `<p class="muted">No pages here yet.</p>`;
    return;
  }

  box.innerHTML = filtered.map(e => {
    const mood = getMood(e.moodKey || e.mood?.key);
    return `<div class="memory"><div class="memory-top"><span>${fmt(e.date)}</span><span class="badge">${mood.icon} ${mood.label}</span></div><p>${e.text ? escapeHTML(e.text) : '<span class="muted">No diary written.</span>'}</p></div>`;
  }).join('');
}

function renderStats(box, entries) {
  const total = Math.max(1, daysBetween(state.start, state.end) + 1);
  const happy = entries.filter(e => getMood(e.moodKey || e.mood?.key).group === 'happy').length;
  const sad = entries.filter(e => getMood(e.moodKey || e.mood?.key).group === 'sad').length;
  const neutral = entries.filter(e => getMood(e.moodKey || e.mood?.key).group === 'neutral').length;
  box.innerHTML = `<div class="stat-grid">
    <div class="stat-box"><strong>${entries.length}</strong><span>pages torn</span></div>
    <div class="stat-box"><strong>${Math.max(0, total - entries.length)}</strong><span>pages left</span></div>
    <div class="stat-box"><strong>${happy}</strong><span>happy / meaningful</span></div>
    <div class="stat-box"><strong>${sad}</strong><span>difficult / sad</span></div>
    <div class="stat-box"><strong>${neutral}</strong><span>normal days</span></div>
    <div class="stat-box"><strong>${Math.round((entries.length / total) * 100)}%</strong><span>completed</span></div>
  </div>`;
}

function openSettings() {
  $('settingsStart').value = state.start;
  $('settingsEnd').value = state.end;
  $('settingsRotation').value = state.rotation;
  $('settingsModal').classList.remove('hidden');
}

function saveSettings() {
  state.start = $('settingsStart').value || state.start;
  state.end = $('settingsEnd').value || state.end;
  state.rotation = $('settingsRotation').value.trim() || state.rotation;
  state.setup = true;
  save();
  $('settingsModal').classList.add('hidden');
  render();
}

function resetAll() {
  if (confirm('Reset everything? This deletes all torn pages and diary memories on this device.')) {
    state = defaultState();
    save();
    $('settingsModal').classList.add('hidden');
    $('journalScreen').classList.add('hidden');
    render();
  }
}

init();
