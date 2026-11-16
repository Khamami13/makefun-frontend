// The four surfaces, each a function from live API data to HTML.
// Board, bounty page, leaderboard and public profile — every value shown
// comes from https://make.fun/api, nothing is hard-coded.

import { date, esc, money, shortAddr, stillOpen, timeLeft, winRate } from './format.js';

/** The reward as it stands now: the base prize plus entry fees paid in. */
const pot = (b) => money(b.potUsd ?? b.rewardAmount);

/** The entry fee, when the bounty charges one. */
const fee = (b) => (b.entryFeeUsd ? money(b.entryFeeUsd) : 'Free');

/** Open/closed badge, decided by the deadline (see format.stillOpen). */
const badge = (b) =>
  stillOpen(b)
    ? `<span class="badge open">Open</span>`
    : `<span class="badge closed">Closed</span>`;

/* ---------------------------------------------------------------- board */

export function board(items, state) {
  const open = items.filter(stillOpen);
  const shown = state.filter === 'open' ? open : items;
  const sorted = [...shown].sort((a, b) => {
    if (state.sort === 'reward') return Number(b.potUsd ?? b.rewardAmount) - Number(a.potUsd ?? a.rewardAmount);
    if (state.sort === 'entries') return (b.submissionCount ?? 0) - (a.submissionCount ?? 0);
    return new Date(a.deadline) - new Date(b.deadline); // deadline: soonest first
  });
  const rows = sorted
    .map(
      (b) => `
      <li class="card">
        <a class="card-title" href="#/bounty/${encodeURIComponent(b.slug)}">${esc(b.title)}</a>
        <p class="card-meta">${badge(b)} <span>${esc(b.category ?? '')}</span> · by ${esc(b.sponsor?.name ?? 'make.fun')}</p>
        <dl class="card-stats">
          <div><dt>Live pot</dt><dd class="pot">${pot(b)}</dd></div>
          <div><dt>Entry fee</dt><dd>${fee(b)}</dd></div>
          <div><dt>Deadline</dt><dd class="countdown" data-deadline="${esc(b.deadline)}">${timeLeft(b.deadline)}</dd></div>
          <div><dt>Entries</dt><dd>${Number(b.submissionCount ?? 0).toLocaleString('en-US')}</dd></div>
        </dl>
        <a class="card-link" href="#/bounty/${encodeURIComponent(b.slug)}/leaderboard">Leaderboard →</a>
      </li>`,
    )
    .join('');
  return `
    <h1>Live bounties</h1>
    <p class="lede">${open.length} open now · ${items.length} listed · pots grow as entry fees are paid in.</p>
    <form class="controls" id="board-controls">
      <label>Show
        <select name="filter">
          <option value="open" ${state.filter === 'open' ? 'selected' : ''}>Open only</option>
          <option value="all" ${state.filter === 'all' ? 'selected' : ''}>All bounties</option>
        </select>
      </label>
      <label>Sort by
        <select name="sort">
          <option value="deadline" ${state.sort === 'deadline' ? 'selected' : ''}>Deadline (soonest)</option>
          <option value="reward" ${state.sort === 'reward' ? 'selected' : ''}>Reward (highest)</option>
          <option value="entries" ${state.sort === 'entries' ? 'selected' : ''}>Entries (most)</option>
        </select>
      </label>
      <label class="search">Search
        <input type="search" name="q" value="${esc(state.q)}" placeholder="title or category…" autocomplete="off">
      </label>
    </form>
    ${sorted.length ? `<ul class="board">${rows}</ul>` : '<p class="empty">No bounties match.</p>'}`;
}

/* ------------------------------------------------------------- bounty page */

function rewardsTable(b) {
  // rewardsNow carries the live amount per place (base prize + fee share);
  // fall back to the static rewards map when it is absent.
  const live = Array.isArray(b.rewardsNow) ? b.rewardsNow : [];
  const places = live.length
    ? live
    : Object.entries(b.rewards ?? {}).map(([place, amount]) => ({ place: Number(place), amountUsd: String(amount) }));
  if (!places.length) return '<p>No reward table published for this bounty yet.</p>';
  const rows = places
    .map(
      (r) => `
      <tr>
        <td>${r.place}</td>
        <td class="num">${money(r.amountUsd)}</td>
        ${r.baseUsd !== undefined ? `<td class="num">${money(r.baseUsd)}</td><td class="num">${money(r.feeShareUsd)}</td>` : ''}
      </tr>`,
    )
    .join('');
  return `
    <table class="rewards">
      <thead><tr><th>Place</th><th class="num">Prize now</th>${live.length ? '<th class="num">Base prize</th><th class="num">Fee share</th>' : ''}</tr></thead>
      <tbody>${rows}</tbody>
    </table>`;
}

export function bounty(b) {
  const open = stillOpen(b);
  return `
    <p class="crumbs"><a href="#/">← All bounties</a></p>
    <h1>${esc(b.title)}</h1>
    <p class="lede">${esc(b.summary ?? b.description?.split('\n')[0] ?? '')}</p>
    <p>${badge(b)} <span class="meta">${esc(b.category ?? '')} · sponsored by ${esc(b.sponsor?.name ?? 'make.fun')}${b.sponsor?.isVerified ? ' ✓' : ''}</span></p>
    <dl class="stats">
      <div><dt>Live pot</dt><dd class="pot big">${pot(b)}</dd></div>
      <div><dt>Entry fee</dt><dd class="big">${fee(b)}</dd></div>
      <div><dt>Deadline</dt><dd class="big countdown" data-deadline="${esc(b.deadline)}">${timeLeft(b.deadline)}</dd></div>
      <div><dt>Entries</dt><dd class="big">${Number(b.submissionCount ?? 0).toLocaleString('en-US')}</dd></div>
    </dl>
    <p class="dates">Opens ${date(b.publishedAt)} · closes ${date(b.deadline)} · status: ${esc(b.status ?? '—')}</p>
    <p><a class="button" href="#/bounty/${encodeURIComponent(b.slug)}/leaderboard">See the leaderboard →</a>
       <a class="button ghost" href="https://make.fun/bounty/${encodeURIComponent(b.slug)}">Open on make.fun ↗</a></p>
    <h2>Rewards</h2>
    ${rewardsTable(b)}
    <p class="note">Prizes are the base reward plus this bounty's share of the entry fees paid in.</p>
    <h2>Rules &amp; description</h2>
    <div class="description">${esc(b.description ?? 'No description published.')}</div>`;
}

/* ------------------------------------------------------------- leaderboard */

export function leaderboard(lb) {
  const comp = lb.competition ?? {};
  const cols = Array.isArray(lb.columns) ? lb.columns : [];
  const winCol = cols.find((c) => c.key === 'judge');
  const entries = Array.isArray(lb.entries) ? lb.entries : [];
  const rows = entries
    .map((e) => {
      const v = e.values ?? {};
      const size = v.bytes != null ? Number(v.bytes).toLocaleString('en-US') : '—';
      return `
      <tr>
        <td class="rank">${e.rank ?? '—'}</td>
        <td><a href="#/profile/${encodeURIComponent(e.handle)}">${esc(e.handle)}</a>${e.house ? ' <span class="tag">house</span>' : ''}</td>
        <td>${esc(e.title ?? '—')}</td>
        <td class="num">${winCol ? winRate(v.judge) : '—'}</td>
        <td class="num">${v.valid === 1 ? '✓' : v.valid === 0 ? '✗' : '—'}</td>
        <td class="num">${size}</td>
      </tr>`;
    })
    .join('');
  return `
    <p class="crumbs"><a href="#/bounty/${encodeURIComponent(comp.slug ?? '')}">← ${esc(comp.title ?? 'Bounty')}</a> · <a href="#/">All bounties</a></p>
    <h1>${esc(lb.title ?? 'Leaderboard')}</h1>
    <p class="lede">${esc(comp.title ?? '')} — ranked by ${esc(winCol?.title ?? 'judge win rate')}. ${entries.length} ranked entries.</p>
    ${entries.length ? `
    <table class="leader">
      <thead><tr><th>#</th><th>Entrant</th><th>Entry</th><th class="num">Win rate</th><th class="num">Valid</th><th class="num">Size (bytes)</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>` : '<p class="empty">No ranked entries yet — check back once judging starts.</p>'}
    <p class="note">Win rate is the judge's share of head-to-head wins; the interval columns in the API give its 90% range.</p>`;
}

/* ----------------------------------------------------------------- profile */

export function profile(p) {
  const rec = p.record ?? {};
  const sols = Array.isArray(p.solutions) ? p.solutions : [];
  const rows = sols
    .map((s) => {
      const c = s.competition ?? {};
      const prize = s.prize_usd != null ? money(s.prize_usd) : '—';
      const place = s.placement != null ? `#${s.placement}` : '—';
      return `
      <li class="card">
        <a class="card-title" href="#/bounty/${encodeURIComponent(c.slug ?? '')}">${esc(s.title ?? 'Untitled entry')}</a>
        <p class="card-meta">in <a href="#/bounty/${encodeURIComponent(c.slug ?? '')}">${esc(c.title ?? c.slug ?? '')}</a> · entered ${date(s.entered_at)}</p>
        <dl class="card-stats">
          <div><dt>Placement</dt><dd>${place}</dd></div>
          <div><dt>Prize</dt><dd class="pot">${prize}</dd></div>
          <div><dt>Judge score</dt><dd>${s.score ? winRate(s.score.value) : '—'}</dd></div>
          <div><dt>Bounty pot</dt><dd>${money(c.reward_usd)}</dd></div>
        </dl>
      </li>`;
    })
    .join('');
  return `
    <p class="crumbs"><a href="#/">← All bounties</a></p>
    <h1>@${esc(p.handle)}</h1>
    ${p.bio ? `<p class="lede">${esc(p.bio)}</p>` : ''}
    <p class="meta">Joined ${date(p.joined_at)}${p.github_login ? ` · GitHub @${esc(p.github_login)}` : ''}</p>
    ${p.wallet?.address ? `<p class="meta">Wallet <code>${esc(shortAddr(p.wallet.address))}</code> · <a href="${esc(p.wallet.explorer_url ?? '')}">Solscan ↗</a></p>` : ''}
    <dl class="stats">
      <div><dt>Competitions entered</dt><dd class="big">${rec.competitions_entered ?? 0}</dd></div>
      <div><dt>Placed</dt><dd class="big">${rec.competitions_placed ?? 0}</dd></div>
      <div><dt>Won</dt><dd class="big">${rec.competitions_won ?? 0}</dd></div>
      <div><dt>Total prizes</dt><dd class="big pot">${money(rec.prize_usd ?? 0)}</dd></div>
    </dl>
    <h2>Entries (${sols.length})</h2>
    ${sols.length ? `<ul class="board">${rows}</ul>` : '<p class="empty">No entries yet.</p>'}
    ${Array.isArray(p.payouts) && p.payouts.length ? `<h2>Payouts</h2><p>${p.payouts.length} payout(s) recorded.</p>` : ''}`;
}
