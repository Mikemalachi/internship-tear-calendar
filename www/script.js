const STORAGE_KEY = 'internshipTearCalendar.v7';
const psalms = [
  ['The Lord is my shepherd; I shall not want.', 'Psalm 23:1'],
  ['God is our refuge and strength, a very present help in trouble.', 'Psalm 46:1'],
  ['I will lift up mine eyes unto the hills, from whence cometh my help.', 'Psalm 121:1'],
  ['Wait on the Lord: be of good courage, and he shall strengthen thine heart.', 'Psalm 27:14'],
  ['This is the day which the Lord hath made; we will rejoice and be glad in it.', 'Psalm 118:24'],
  ['The Lord is my light and my salvation; whom shall I fear?', 'Psalm 27:1'],
  ['The Lord is nigh unto them that are of a broken heart.', 'Psalm 34:18'],
  ['Commit thy way unto the Lord; trust also in him; and he shall bring it to pass.', 'Psalm 37:5'],
  ['Cast thy burden upon the Lord, and he shall sustain thee.', 'Psalm 55:22'],
  ['My help cometh from the Lord, which made heaven and earth.', 'Psalm 121:2'],
  ['He healeth the broken in heart, and bindeth up their wounds.', 'Psalm 147:3'],
  ['The Lord will give strength unto his people; the Lord will bless his people with peace.', 'Psalm 29:11']
];
const defaultRotations = [
  { name: 'Surgery', days: 90 },
  { name: 'Internal Medicine', days: 90 },
  { name: 'Pediatrics', days: 60 },
  { name: 'OBGYN', days: 60 },
  { name: 'Elective / Other', days: 65 }
];
let state = loadState();
let selectedMood = 'normal';
let activeFilter = 'all';

const $ = (id) => document.getElementById(id);
function todayISO(){ const d=new Date(); d.setHours(0,0,0,0); return d.toISOString().slice(0,10); }
function parseDate(s){ const d=new Date(s+'T00:00:00'); return isNaN(d) ? new Date() : d; }
function diffDays(a,b){ return Math.round((parseDate(b)-parseDate(a))/(1000*60*60*24)); }
function addDays(s,n){ const d=parseDate(s); d.setDate(d.getDate()+n); return d.toISOString().slice(0,10); }
function clamp(n,min,max){ return Math.max(min, Math.min(max,n)); }
function formatDate(iso){ return parseDate(iso).toLocaleDateString(undefined,{weekday:'long',day:'numeric',month:'long',year:'numeric'}); }
function loadState(){
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || null; } catch(e){ return null; }
}
function save(){ localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
function initDefaultDates(){
  const start = todayISO();
  const end = addDays(start,364);
  $('startDateInput').value = start;
  $('endDateInput').value = end;
}
function showScreen(id){
  document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active'));
  $(id).classList.add('active');
  document.querySelectorAll('.nav-btn').forEach(b=>b.classList.toggle('active', b.dataset.screen===id));
  render();
}
function buildState(){
  const start = $('startDateInput').value || todayISO();
  const end = $('endDateInput').value || addDays(start,364);
  const rotation = $('rotationInput').value.trim() || 'Surgery Rotation';
  return { startDate:start, endDate:end, firstRotation:rotation, rotations: defaultRotations, entries:[] };
}
function currentDayIndex(){
  const total = totalDays();
  return clamp(diffDays(state.startDate, todayISO()), 0, total-1);
}
function totalDays(){ return Math.max(1, diffDays(state.startDate,state.endDate)+1); }
function entriesTorn(){ return state.entries.length; }
function hasEntryForToday(){ return state.entries.some(e=>e.date===todayISO()); }
function dayNumber(){ return clamp(currentDayIndex()+1, 1, totalDays()); }
function getPsalm(day){ return psalms[(day-1)%psalms.length]; }
function rotationInfo(){
  const index = currentDayIndex();
  let passed = 0;
  for (const r of state.rotations){
    if(index < passed + r.days){
      const done = clamp(index - passed + 1,0,r.days);
      return { name:r.name, done, total:r.days, percent:Math.round(done/r.days*100) };
    }
    passed += r.days;
  }
  const last = state.rotations[state.rotations.length-1];
  return { name:last.name, done:last.days, total:last.days, percent:100 };
}
function render(){
  if(!state){
    document.querySelector('.bottom-nav').style.display='none';
    if(!$('setupScreen').classList.contains('active')) showScreen('setupScreen');
    return;
  }
  document.querySelector('.bottom-nav').style.display='grid';
  const total = totalDays();
  const day = dayNumber();
  const torn = entriesTorn();
  const left = Math.max(0,total-torn);
  const percent = Math.round((torn/total)*100);
  const [verse, ref] = getPsalm(day);
  const rot = rotationInfo();
  $('overallPercent').textContent = percent + '%';
  $('overallText').textContent = `${torn} pages torn • ${left} left • ${total} total`;
  $('overallBar').style.width = percent + '%';
  $('dayNumber').textContent = `DAY ${day}`;
  $('todayDate').textContent = formatDate(todayISO());
  $('currentRotation').textContent = rot.name + ' Rotation';
  $('daysRemaining').textContent = `${Math.max(0,total-day)} pages remaining`;
  $('psalmText').textContent = '“' + verse + '”';
  $('psalmRef').textContent = ref;
  const already = hasEntryForToday();
  $('tearBtn').disabled = already;
  $('tearBtn').textContent = already ? 'Today already torn' : '📄 Tear off today';
  $('tearHint').textContent = already ? 'Come back tomorrow for the next page.' : 'One day at a time. You got this. 🧡';
  renderRotations(); renderStats(); renderMemories();
}
function renderRotations(){
  const index = currentDayIndex();
  let passed=0;
  $('rotationBars').innerHTML = state.rotations.map(r=>{
    const done = clamp(index - passed + 1, 0, r.days);
    const pct = Math.round(done/r.days*100);
    const current = done>0 && done<r.days || (index>=passed && index<passed+r.days);
    passed += r.days;
    return `<div class="rotation-item ${current?'current':''}">
      <div class="rotation-top"><span class="rotation-name">${r.name}</span><span class="rotation-meta">${done} / ${r.days} days • ${pct}%</span></div>
      <div class="progress-track"><div class="rotation-fill" style="width:${pct}%"></div></div>
    </div>`;
  }).join('');
}
function moodCounts(){
  const c={happy:0,normal:0,difficult:0,exhausting:0};
  state.entries.forEach(e=>{ if(c[e.mood]!==undefined)c[e.mood]++; });
  return c;
}
function streak(){
  let count=0; let date=todayISO();
  for(;;){ if(state.entries.some(e=>e.date===date)){ count++; date=addDays(date,-1); } else break; }
  return count;
}
function renderStats(){
  const c=moodCounts(); const total=totalDays(); const torn=entriesTorn(); const left=Math.max(0,total-torn); const rot=rotationInfo();
  $('statsList').innerHTML = [
    ['Days survived', torn], ['Days remaining', left], ['😊 Happy moments', c.happy], ['😐 Normal moments', c.normal], ['😔 Difficult moments', c.difficult], ['😩 Exhausting moments', c.exhausting], ['🔥 Current streak', streak()+' day'+(streak()===1?'':'s')], ['Rotation progress', rot.percent+'%']
  ].map(([a,b])=>`<div class="stat-row"><span>${a}</span><strong>${b}</strong></div>`).join('');
}
function renderMemories(){
  let entries=[...state.entries].sort((a,b)=>b.date.localeCompare(a.date));
  if(activeFilter==='happy') entries=entries.filter(e=>e.mood==='happy');
  if(activeFilter==='difficult') entries=entries.filter(e=>['difficult','exhausting'].includes(e.mood));
  $('memoryList').innerHTML = entries.length ? entries.map(e=>{
    const [verse,ref] = getPsalm(e.day);
    return `<div class="memory-card"><div style="display:flex;justify-content:space-between;gap:8px"><strong>Day ${e.day} • ${formatDate(e.date)}</strong><span class="memory-badge">${e.mood}</span></div><p>${escapeHTML(e.text || 'No diary written.')}</p><p>📖 ${verse} — ${ref}</p></div>`;
  }).join('') : '<p class="hint">No memories here yet.</p>';
}
function escapeHTML(str){ return String(str).replace(/[&<>"]/g, m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m])); }

document.addEventListener('DOMContentLoaded',()=>{
  initDefaultDates();
  if(state){ showScreen('tearScreen'); } else showScreen('setupScreen');
  $('startBtn').addEventListener('click',()=>{ state=buildState(); save(); showScreen('tearScreen'); });
  document.querySelectorAll('.nav-btn').forEach(b=>b.addEventListener('click',()=>showScreen(b.dataset.screen)));
  $('tearBtn').addEventListener('click',()=>{
    if(hasEntryForToday()) return;
    $('paperCard').classList.add('tearing');
    setTimeout(()=>{ $('paperCard').classList.remove('tearing'); selectedMood='normal'; document.querySelectorAll('.mood-btn').forEach(x=>x.classList.toggle('selected',x.dataset.mood==='normal')); $('diaryText').value=''; showScreen('diaryScreen'); },700);
  });
  document.querySelectorAll('.mood-btn').forEach(b=>b.addEventListener('click',()=>{ selectedMood=b.dataset.mood; document.querySelectorAll('.mood-btn').forEach(x=>x.classList.toggle('selected',x===b)); }));
  document.querySelector('.mood-btn[data-mood="normal"]').classList.add('selected');
  function saveEntry(skip=false){
    if(hasEntryForToday()){ showScreen('statsScreen'); return; }
    state.entries.push({date:todayISO(), day:dayNumber(), mood:selectedMood, text: skip ? '' : $('diaryText').value.trim(), rotation: rotationInfo().name});
    save(); showScreen('statsScreen');
  }
  $('saveEntryBtn').addEventListener('click',()=>saveEntry(false));
  $('skipEntryBtn').addEventListener('click',()=>saveEntry(true));
  document.querySelectorAll('.filter-btn').forEach(b=>b.addEventListener('click',()=>{ activeFilter=b.dataset.filter; document.querySelectorAll('.filter-btn').forEach(x=>x.classList.toggle('active',x===b)); renderMemories(); }));
  $('settingsBtn').addEventListener('click',()=>{ if(state){ $('settingsStart').value=state.startDate; $('settingsEnd').value=state.endDate; $('settingsRotation').value=state.firstRotation || ''; } $('settingsDialog').showModal(); });
  $('saveSettingsBtn').addEventListener('click',(e)=>{ e.preventDefault(); if(state){ state.startDate=$('settingsStart').value||state.startDate; state.endDate=$('settingsEnd').value||state.endDate; state.firstRotation=$('settingsRotation').value||state.firstRotation; save(); render(); } $('settingsDialog').close(); });
});
