const STORAGE_KEY = 'internshipTearCalendarV1';
const todayISO = () => new Date().toISOString().slice(0,10);
const parseDate = iso => new Date(`${iso}T00:00:00`);
const fmt = iso => parseDate(iso).toLocaleDateString(undefined,{weekday:'long',year:'numeric',month:'long',day:'numeric'});
const daysBetween = (a,b) => Math.round((parseDate(b)-parseDate(a))/(1000*60*60*24));
const clamp = (n,min,max)=>Math.max(min,Math.min(max,n));

const quotes = [
  'I only need to survive this page.',
  'One day closer to Dr. Milkyas.',
  'Today becomes experience tomorrow.',
  'Tear the page. Keep the lesson.',
  'This year is not your whole life.',
  'Small survival is still survival.',
  'Even difficult days become pages torn.'
];
const moods = [
  {key:'happy', icon:'😊', label:'Happy moment', group:'happy'},
  {key:'exciting', icon:'🌟', label:'Exciting moment', group:'happy'},
  {key:'normal', icon:'😐', label:'Normal day', group:'neutral'},
  {key:'lesson', icon:'📚', label:'Learned something', group:'happy'},
  {key:'difficult', icon:'😔', label:'Difficult day', group:'sad'},
  {key:'sad', icon:'💔', label:'Sad moment', group:'sad'},
  {key:'exhausting', icon:'😩', label:'Exhausting day', group:'sad'},
  {key:'meaningful', icon:'❤️', label:'Meaningful patient', group:'happy'}
];
let state = load();
let pendingTearDate = null;
let selectedMood = moods[0];
let currentTab = 'history';

function defaultState(){
  const start = todayISO();
  const endDate = new Date();
  endDate.setDate(endDate.getDate()+364);
  return { setup:false, start, end:endDate.toISOString().slice(0,10), rotation:'Surgery', entries:[] };
}
function load(){
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || defaultState(); }
  catch { return defaultState(); }
}
function save(){ localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
const $ = id => document.getElementById(id);

function init(){
  renderMoodGrid();
  bindEvents();
  render();
}
function bindEvents(){
  $('saveSetupBtn').onclick = () => {
    state.start = $('startDate').value || todayISO();
    state.end = $('endDate').value || state.end;
    state.rotation = $('rotationName').value.trim() || 'Surgery';
    state.setup = true; save(); render();
  };
  $('tearBtn').onclick = tearToday;
  $('skipJournalBtn').onclick = () => saveEntry(true);
  $('saveJournalBtn').onclick = () => saveEntry(false);
  $('settingsBtn').onclick = openSettings;
  $('closeSettingsBtn').onclick = () => $('settingsModal').classList.add('hidden');
  $('saveSettingsBtn').onclick = saveSettings;
  $('resetBtn').onclick = resetAll;
  document.querySelectorAll('.tab').forEach(btn=>btn.onclick=()=>{currentTab=btn.dataset.tab;renderTabs();});
}
function render(){
  $('setupScreen').classList.toggle('hidden', state.setup);
  $('homeScreen').classList.toggle('hidden', !state.setup);
  if(!state.setup){
    $('startDate').value = state.start; $('endDate').value = state.end; $('rotationName').value = state.rotation;
    return;
  }
  const t = todayISO();
  const total = Math.max(1, daysBetween(state.start,state.end)+1);
  const rawDay = daysBetween(state.start,t)+1;
  const day = clamp(rawDay,1,total);
  const tornToday = state.entries.some(e=>e.date===t);
  const completed = state.entries.length;
  const pct = clamp(Math.round((completed/total)*100),0,100);
  $('dayTitle').textContent = rawDay > total ? 'DONE' : `DAY ${day}`;
  $('paperDate').textContent = fmt(t);
  $('rotationText').textContent = `${state.rotation} Rotation`;
  $('daysLeftText').textContent = rawDay > total ? 'Internship completed.' : `${Math.max(0,total-completed)} pages remaining`;
  $('quoteText').textContent = `“${quotes[day % quotes.length]}”`;
  $('progressText').textContent = `${pct}%`;
  $('progressFill').style.width = `${pct}%`;
  $('daysSummary').textContent = `${completed} pages torn • ${Math.max(0,total-completed)} left • ${total} total`;
  $('tearBtn').disabled = tornToday || rawDay > total;
  $('tearBtn').textContent = tornToday ? 'TODAY ALREADY TORN' : rawDay > total ? 'INTERNSHIP COMPLETE' : 'TEAR OFF TODAY';
  $('tearHint').textContent = tornToday ? 'Come back tomorrow for the next page.' : 'At the end of the day, tear this page and save a memory.';
  $('paper').classList.remove('tearing');
  renderTabs();
}
function tearToday(){
  pendingTearDate = todayISO();
  $('paper').classList.add('tearing');
  setTimeout(()=>{
    $('journalScreen').classList.remove('hidden');
    $('journalScreen').scrollIntoView({behavior:'smooth'});
  }, 850);
}
function renderMoodGrid(){
  const grid = $('moodGrid'); grid.innerHTML='';
  moods.forEach(m=>{
    const b=document.createElement('button');
    b.className='mood-option';
    b.innerHTML=`${m.icon} <strong>${m.label}</strong>`;
    b.onclick=()=>{selectedMood=m;document.querySelectorAll('.mood-option').forEach(x=>x.classList.remove('selected'));b.classList.add('selected');};
    grid.appendChild(b);
  });
  setTimeout(()=>grid.firstChild?.classList.add('selected'));
}
function saveEntry(skipped){
  const date = pendingTearDate || todayISO();
  if(!state.entries.some(e=>e.date===date)){
    state.entries.push({ date, mood:selectedMood, text: skipped ? '' : $('journalText').value.trim(), skipped, createdAt:new Date().toISOString() });
  }
  state.entries.sort((a,b)=>a.date.localeCompare(b.date)); save();
  $('journalText').value=''; $('journalScreen').classList.add('hidden'); pendingTearDate=null; render();
}
function renderTabs(){
  document.querySelectorAll('.tab').forEach(b=>b.classList.toggle('active',b.dataset.tab===currentTab));
  const box=$('tabContent');
  const entries=[...state.entries].sort((a,b)=>b.date.localeCompare(a.date));
  if(currentTab==='stats') return renderStats(box, entries);
  let filtered=entries;
  if(currentTab==='happy') filtered=entries.filter(e=>e.mood.group==='happy');
  if(currentTab==='sad') filtered=entries.filter(e=>e.mood.group==='sad');
  if(!filtered.length){ box.innerHTML=`<p class="muted">No pages here yet.</p>`; return; }
  box.innerHTML=filtered.map(e=>`<div class="memory"><div class="memory-top"><span>${fmt(e.date)}</span><span class="badge">${e.mood.icon} ${e.mood.label}</span></div><p>${e.text ? escapeHTML(e.text) : '<span class="muted">No diary written.</span>'}</p></div>`).join('');
}
function renderStats(box, entries){
  const total = Math.max(1, daysBetween(state.start,state.end)+1);
  const happy=entries.filter(e=>e.mood.group==='happy').length;
  const sad=entries.filter(e=>e.mood.group==='sad').length;
  const neutral=entries.filter(e=>e.mood.group==='neutral').length;
  box.innerHTML=`<div class="stat-grid">
    <div class="stat-box"><strong>${entries.length}</strong><span>pages torn</span></div>
    <div class="stat-box"><strong>${Math.max(0,total-entries.length)}</strong><span>pages left</span></div>
    <div class="stat-box"><strong>${happy}</strong><span>happy / meaningful</span></div>
    <div class="stat-box"><strong>${sad}</strong><span>difficult / sad</span></div>
    <div class="stat-box"><strong>${neutral}</strong><span>normal days</span></div>
    <div class="stat-box"><strong>${Math.round((entries.length/total)*100)}%</strong><span>completed</span></div>
  </div>`;
}
function openSettings(){
  $('settingsStart').value=state.start; $('settingsEnd').value=state.end; $('settingsRotation').value=state.rotation;
  $('settingsModal').classList.remove('hidden');
}
function saveSettings(){
  state.start=$('settingsStart').value || state.start; state.end=$('settingsEnd').value || state.end; state.rotation=$('settingsRotation').value.trim() || state.rotation;
  state.setup=true; save(); $('settingsModal').classList.add('hidden'); render();
}
function resetAll(){
  if(confirm('Reset everything? This deletes all torn pages and diary memories on this device.')){
    state=defaultState(); save(); $('settingsModal').classList.add('hidden'); render();
  }
}
function escapeHTML(str){return str.replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));}
init();
