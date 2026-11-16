// Small formatting helpers. Everything the API returns is escaped before it
// reaches the page, so a title or handle can never break the markup.

/** Text made safe to put inside HTML. */
export function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

/** A dollar amount ('1000.00', 719.5 or 0.5) as '$1,000' or '$0.50'. */
export function money(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return '—';
  return n.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: Number.isInteger(n) ? 0 : 2,
  });
}

/** A deadline as a readable date in UTC. */
export function date(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return `${d.toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'UTC' })} UTC`;
}

/** Whether a bounty still takes entries: its deadline, not its status alone —
 *  a bounty past its deadline may still read "open" until results publish. */
export function stillOpen(b) {
  return new Date(b.deadline).getTime() > Date.now();
}

/** Time until a deadline: 'closes in 13h', 'closes in 2d 4h', or 'closed'. */
export function timeLeft(iso) {
  const ms = new Date(iso).getTime() - Date.now();
  if (ms <= 0) return 'closed';
  const days = Math.floor(ms / 86400000);
  const hours = Math.floor((ms % 86400000) / 3600000);
  const minutes = Math.floor((ms % 3600000) / 60000);
  if (days > 0) return `closes in ${days}d ${hours}h`;
  if (hours > 0) return `closes in ${hours}h ${minutes}m`;
  if (minutes > 0) return `closes in ${minutes}m`;
  return 'closing now';
}

/** A win-rate stored as micro units (940081 = 94.0081%) as '94.01%'. */
export function winRate(micro) {
  const n = Number(micro);
  if (!Number.isFinite(n)) return '—';
  return `${(n / 10000).toFixed(2)}%`;
}

/** Shorten a Solana address: '3azy…GEgkP'. */
export function shortAddr(addr) {
  const s = String(addr ?? '');
  return s.length > 12 ? `${s.slice(0, 4)}…${s.slice(-5)}` : s || '—';
}
