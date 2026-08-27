/**
 * app.js — Personal Dashboard
 * Features: Clock/Greeting, Focus Timer, To-Do List, Quick Links
 *           + Light/Dark mode, Custom name, Task sort
 * Storage: localStorage
 */

'use strict';

const $ = (sel) => document.querySelector(sel);

function pad(n) {
  return String(n).padStart(2, '0');
}

/* =============================================
   THEME (Light / Dark)
   ============================================= */
const THEME_KEY = 'dashboard_theme';

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  $('#theme-icon').textContent = theme === 'dark' ? '☀️' : '🌙';
  localStorage.setItem(THEME_KEY, theme);
}

(function initTheme() {
  const saved = localStorage.getItem(THEME_KEY) || 'light';
  applyTheme(saved);
})();

$('#theme-toggle').addEventListener('click', () => {
  const current = document.documentElement.getAttribute('data-theme');
  applyTheme(current === 'dark' ? 'light' : 'dark');
});

/* =============================================
   CUSTOM NAME & GREETING
   ============================================= */
const NAME_KEY = 'dashboard_name';

function getSavedName() {
  return localStorage.getItem(NAME_KEY) || '';
}

function updateGreeting() {
  const h    = new Date().getHours();
  const name = getSavedName();
  let base;
  if (h < 12)      base = 'Good Morning';
  else if (h < 17) base = 'Good Afternoon';
  else if (h < 21) base = 'Good Evening';
  else             base = 'Good Night';
  $('#greeting').textContent = name ? `${base}, ${name}!` : base;
}

// Show/hide name editor
$('#name-edit-btn').addEventListener('click', () => {
  const form = $('#name-form');
  form.hidden = false;
  const input = $('#name-input');
  input.value = getSavedName();
  input.focus();
  input.select();
});

$('#name-cancel').addEventListener('click', () => {
  $('#name-form').hidden = true;
});

$('#name-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const val = $('#name-input').value.trim();
  if (val) {
    localStorage.setItem(NAME_KEY, val);
  } else {
    localStorage.removeItem(NAME_KEY);
  }
  $('#name-form').hidden = true;
  updateGreeting();
});

/* =============================================
   CLOCK
   ============================================= */
const DAYS   = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

function updateClock() {
  const now = new Date();
  $('#clock').textContent = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
  $('#date').textContent  = `${DAYS[now.getDay()]}, ${MONTHS[now.getMonth()]} ${now.getDate()}, ${now.getFullYear()}`;
  updateGreeting();
}

setInterval(updateClock, 1000);
updateClock();

/* =============================================
   FOCUS TIMER
   ============================================= */
const TIMER_DURATION = 25 * 60;
let timerSeconds = TIMER_DURATION;
let timerInterval = null;

const timerDisplay = $('#timer-display');
const timerStart   = $('#timer-start');
const timerStop    = $('#timer-stop');
const timerReset   = $('#timer-reset');

function playDing() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const notes = [523.25, 659.25, 783.99];
    let t = ctx.currentTime;
    notes.forEach((freq) => {
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.5, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.6);
      osc.start(t);
      osc.stop(t + 0.6);
      t += 0.3;
    });
    setTimeout(() => ctx.close(), 2500);
  } catch (e) { /* unsupported — silent */ }
}

function renderTimer() {
  timerDisplay.textContent = `${pad(Math.floor(timerSeconds / 60))}:${pad(timerSeconds % 60)}`;
}

timerStart.addEventListener('click', () => {
  if (timerSeconds === 0) return;
  timerStart.disabled = true;
  timerStop.disabled  = false;
  timerDisplay.style.color = '';
  timerInterval = setInterval(() => {
    timerSeconds--;
    renderTimer();
    if (timerSeconds === 0) {
      clearInterval(timerInterval);
      timerStop.disabled  = true;
      timerStart.disabled = true;
      timerDisplay.style.color = '#22c55e';
      playDing();
    }
  }, 1000);
});

timerStop.addEventListener('click', () => {
  clearInterval(timerInterval);
  timerStart.disabled = false;
  timerStop.disabled  = true;
});

timerReset.addEventListener('click', () => {
  clearInterval(timerInterval);
  timerSeconds = TIMER_DURATION;
  renderTimer();
  timerStart.disabled = false;
  timerStop.disabled  = true;
  timerDisplay.style.color = '';
});

renderTimer();

/* =============================================
   TO-DO LIST
   ============================================= */
const TODOS_KEY = 'dashboard_todos';
const SORT_KEY  = 'dashboard_sort';
let todos = [];

function loadTodos() {
  try { todos = JSON.parse(localStorage.getItem(TODOS_KEY)) || []; }
  catch { todos = []; }
}

function saveTodos() {
  localStorage.setItem(TODOS_KEY, JSON.stringify(todos));
}

// Restore saved sort preference
(function initSort() {
  const saved = localStorage.getItem(SORT_KEY);
  if (saved) $('#sort-select').value = saved;
})();

function getSortedIndices() {
  const mode = $('#sort-select').value;
  // Create array of {todo, i} then sort
  const indexed = todos.map((todo, i) => ({ todo, i }));

  if (mode === 'az') {
    indexed.sort((a, b) => {
      if (a.todo.done !== b.todo.done) return Number(a.todo.done) - Number(b.todo.done);
      return a.todo.text.localeCompare(b.todo.text);
    });
  } else if (mode === 'za') {
    indexed.sort((a, b) => {
      if (a.todo.done !== b.todo.done) return Number(a.todo.done) - Number(b.todo.done);
      return b.todo.text.localeCompare(a.todo.text);
    });
  } else {
    // Default: undone first, then done — preserve insertion order within each group
    indexed.sort((a, b) => Number(a.todo.done) - Number(b.todo.done));
  }
  return indexed;
}

function renderTodos() {
  const list  = $('#todo-list');
  const empty = $('#todo-empty');
  list.innerHTML = '';

  if (todos.length === 0) {
    empty.style.display = 'block';
    return;
  }
  empty.style.display = 'none';

  getSortedIndices().forEach(({ todo, i }) => {
    const li = document.createElement('li');
    li.className = 'todo__item' + (todo.done ? ' done' : '');

    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.className = 'todo__checkbox';
    cb.checked = todo.done;
    cb.setAttribute('aria-label', `Mark "${todo.text}" done`);
    cb.addEventListener('change', () => { todos[i].done = !todos[i].done; saveTodos(); renderTodos(); });

    const span = document.createElement('span');
    span.className = 'todo__text';
    span.textContent = todo.text;

    const editBtn = document.createElement('button');
    editBtn.className = 'btn btn--outline';
    editBtn.style.cssText = 'padding:0.3rem 0.7rem;font-size:0.8rem;margin-right:0.35rem;';
    editBtn.textContent = 'Edit';
    editBtn.addEventListener('click', () => openEditModal(i));

    const delBtn = document.createElement('button');
    delBtn.className = 'btn btn--danger';
    delBtn.textContent = 'Delete';
    delBtn.addEventListener('click', () => { todos.splice(i, 1); saveTodos(); renderTodos(); });

    li.appendChild(cb);
    li.appendChild(span);
    li.appendChild(editBtn);
    li.appendChild(delBtn);
    list.appendChild(li);
  });
}

$('#sort-select').addEventListener('change', () => {
  localStorage.setItem(SORT_KEY, $('#sort-select').value);
  renderTodos();
});

$('#todo-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const input = $('#todo-input');
  const text  = input.value.trim();
  if (!text) return;
  todos.push({ text, done: false });
  saveTodos();
  renderTodos();
  input.value = '';
  input.focus();
});

/* Edit Modal */
let editingIndex = null;

function openEditModal(i) {
  editingIndex = i;
  $('#modal-input').value = todos[i].text;
  $('#modal-overlay').removeAttribute('hidden');
  $('#modal-input').focus();
  $('#modal-input').select();
}

function closeEditModal() {
  editingIndex = null;
  $('#modal-overlay').setAttribute('hidden', '');
}

$('#modal-save').addEventListener('click', () => {
  const t = $('#modal-input').value.trim();
  if (!t || editingIndex === null) return;
  todos[editingIndex].text = t;
  saveTodos();
  renderTodos();
  closeEditModal();
});

$('#modal-cancel').addEventListener('click', closeEditModal);
$('#modal-overlay').addEventListener('click', (e) => { if (e.target === $('#modal-overlay')) closeEditModal(); });
$('#modal-input').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') $('#modal-save').click();
  if (e.key === 'Escape') closeEditModal();
});

loadTodos();
renderTodos();

/* =============================================
   QUICK LINKS
   ============================================= */
const LINKS_KEY = 'dashboard_links';
let links = [];

function loadLinks() {
  try { links = JSON.parse(localStorage.getItem(LINKS_KEY)) || []; }
  catch { links = []; }
}

function saveLinks() {
  localStorage.setItem(LINKS_KEY, JSON.stringify(links));
}

function renderLinks() {
  const grid  = $('#links-grid');
  const empty = $('#links-empty');
  grid.innerHTML = '';

  if (links.length === 0) {
    empty.style.display = 'block';
    return;
  }
  empty.style.display = 'none';

  links.forEach((link, i) => {
    const chip = document.createElement('div');
    chip.className = 'link-chip';

    const a = document.createElement('a');
    a.href      = link.url;
    a.target    = '_blank';
    a.rel       = 'noopener noreferrer';
    a.className = 'link-chip__anchor';
    a.textContent = link.name;

    const del = document.createElement('button');
    del.className = 'link-chip__delete';
    del.setAttribute('aria-label', `Remove ${link.name}`);
    del.textContent = '×';
    del.addEventListener('click', () => { links.splice(i, 1); saveLinks(); renderLinks(); });

    chip.appendChild(a);
    chip.appendChild(del);
    grid.appendChild(chip);
  });
}

$('#links-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const name = $('#links-name').value.trim();
  let   url  = $('#links-url').value.trim();
  if (!name || !url) return;
  if (!/^https?:\/\//i.test(url)) url = 'https://' + url;
  links.push({ name, url });
  saveLinks();
  renderLinks();
  $('#links-name').value = '';
  $('#links-url').value  = '';
  $('#links-name').focus();
});

loadLinks();
renderLinks();
