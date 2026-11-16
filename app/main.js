// Router and page lifecycle for the make.fun frontend.
//
//   #/                          the bounty board
//   #/bounty/<slug>             one bounty
//   #/bounty/<slug>/leaderboard its leaderboard
//   #/profile/<handle>          a public profile
//
// window.__shotReady is false while a page loads and true once its data is
// on screen, so a screenshot script knows when to capture. Countdowns tick
// in place every 30 s without rebuilding the page.

import { getBounty, getLeaderboard, getProfile, listBounties } from './api.js';
import { board, bounty, leaderboard, profile } from './views.js';

const app = document.getElementById('app');

// Board controls, kept across re-renders (a re-render only happens on
// navigation, never on a countdown tick).
const boardState = { filter: 'open', sort: 'deadline', q: '' };

function loading(message) {
  return `<p class="loading" role="status">${message}</p>`;
}

function failed(err, retry) {
  return `
    <h1>Something went wrong</h1>
    <p class="error">Could not load this page from make.fun's API${err?.status ? ` (HTTP ${err.status})` : ''}. Check your connection and try again.</p>
    ${retry ? `<p><a class="button" href="${retry}">Try again</a></p>` : ''}
    <p><a href="#/">← Back to the board</a></p>`;
}

/** Re-render every countdown on the page from its data-deadline. */
function tickCountdowns() {
  for (const el of document.querySelectorAll('.countdown[data-deadline]')) {
    const ms = new Date(el.dataset.deadline).getTime() - Date.now();
    if (ms <= 0) {
      el.textContent = 'closed';
      continue;
    }
    const days = Math.floor(ms / 86400000);
    const hours = Math.floor((ms % 86400000) / 3600000);
    const minutes = Math.floor((ms % 3600000) / 60000);
    el.textContent =
      days > 0 ? `closes in ${days}d ${hours}h` : hours > 0 ? `closes in ${hours}h ${minutes}m` : `closes in ${minutes}m`;
  }
}

let tickTimer = 0;

function startTicks() {
  clearInterval(tickTimer);
  tickTimer = setInterval(tickCountdowns, 30000);
}

function parseRoute() {
  const hash = location.hash || '#/';
  const parts = hash.replace(/^#\//, '').split('/').map(decodeURIComponent);
  if (parts[0] === 'bounty' && parts[1]) {
    return parts[2] === 'leaderboard'
      ? { view: 'leaderboard', slug: parts[1] }
      : { view: 'bounty', slug: parts[1] };
  }
  if (parts[0] === 'profile' && parts[1]) return { view: 'profile', handle: parts[1] };
  return { view: 'board' };
}

async function renderBoard() {
  app.innerHTML = loading('Loading live bounties…');
  const data = await listBounties();
  const items = Array.isArray(data.items) ? data.items : [];
  const q = boardState.q.trim().toLowerCase();
  const filtered = q
    ? items.filter((b) => `${b.title ?? ''} ${b.category ?? ''}`.toLowerCase().includes(q))
    : items;
  document.title = 'make.fun — live bounties';
  app.innerHTML = board(filtered, boardState);
  const form = document.getElementById('board-controls');
  form.addEventListener('change', (event) => {
    boardState[event.target.name] = event.target.value;
    renderBoardView(items);
  });
  form.addEventListener('input', (event) => {
    if (event.target.name !== 'q') return;
    boardState.q = event.target.value;
    renderBoardView(items);
  });
}

// Re-render the board list from already-fetched data (filter/sort/search
// never refetch: one request per board visit).
function renderBoardView(items) {
  const q = boardState.q.trim().toLowerCase();
  const filtered = q
    ? items.filter((b) => `${b.title ?? ''} ${b.category ?? ''}`.toLowerCase().includes(q))
    : items;
  const scroll = window.scrollY;
  const html = board(filtered, boardState);
  const form = document.getElementById('board-controls');
  const focus = document.activeElement?.name;
  app.innerHTML = html;
  const nextForm = document.getElementById('board-controls');
  nextForm.addEventListener('change', (event) => {
    boardState[event.target.name] = event.target.value;
    renderBoardView(items);
  });
  nextForm.addEventListener('input', (event) => {
    if (event.target.name !== 'q') return;
    boardState.q = event.target.value;
    renderBoardView(items);
  });
  if (focus === 'q') {
    const input = nextForm.querySelector('input[name="q"]');
    input.focus();
    input.setSelectionRange(input.value.length, input.value.length);
  }
  window.scrollTo(0, scroll);
}

async function render() {
  window.__shotReady = false;
  startTicks();
  const route = parseRoute();
  try {
    if (route.view === 'bounty') {
      app.innerHTML = loading('Loading bounty…');
      const b = await getBounty(route.slug);
      document.title = `${b.title} | make.fun bounties`;
      app.innerHTML = bounty(b);
    } else if (route.view === 'leaderboard') {
      app.innerHTML = loading('Loading leaderboard…');
      const lb = await getLeaderboard(route.slug);
      document.title = `${lb.competition?.title ?? route.slug} leaderboard | make.fun bounties`;
      app.innerHTML = leaderboard(lb);
    } else if (route.view === 'profile') {
      app.innerHTML = loading('Loading profile…');
      const p = await getProfile(route.handle);
      document.title = `@${p.handle} | make.fun bounties`;
      app.innerHTML = profile(p);
    } else {
      await renderBoard();
    }
  } catch (err) {
    document.title = 'Error | make.fun bounties';
    app.innerHTML = failed(err, `#${location.hash.slice(1) || '/'}`);
  }
  tickCountdowns();
  window.scrollTo(0, 0);
  window.__shotReady = true;
}

window.addEventListener('hashchange', render);
render();
