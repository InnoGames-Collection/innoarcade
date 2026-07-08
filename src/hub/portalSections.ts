// Hub portal sections — trending, tournament banner, sidebar widgets, news, etc.
// Phase 1: catalog-driven + static placeholders; no game code touched.

import { t, type Lang, type I18nKey } from '../i18n';
import {
  trendingGames, recentlyAddedGames, COMING_SOON, CATEGORY_CHIPS,
  type GameMeta, type GameCategory, type ComingSoonMeta,
} from '../platform/catalog';
import {
  countdown, type Tournament,
} from '../platform/tournaments';
import { etbPrizesForCadence, formatEtbPrize } from '../platform/config';
import { type LeaderEntry } from '../platform/tournaments';

export function escapeHtml(s: string): string {
  return s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));
}

export function fmtPlayCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${Math.round(n / 100) / 10}K`;
  return String(n);
}

export function starsHtml(rating: number): string {
  const full = Math.round(rating);
  return '★'.repeat(Math.min(5, full)) + '☆'.repeat(Math.max(0, 5 - full));
}

const dShort = (lang: Lang): string => (lang === 'am' ? 'ቀ' : 'd');
const hShort = (lang: Lang): string => (lang === 'am' ? 'ሰ' : 'h');
const mShort = (lang: Lang): string => (lang === 'am' ? 'ደ' : 'm');
const sShort = (lang: Lang): string => (lang === 'am' ? 'ሰ' : 's');

export function fmtCountdown(end: number, lang: Lang): string {
  const c = countdown(end);
  if (c.done) return '—';
  if (c.days > 0) return `${c.days}${dShort(lang)} ${c.hours}${hShort(lang)} ${c.minutes}${mShort(lang)}`;
  return `${c.hours}${hShort(lang)} ${c.minutes}${mShort(lang)} ${c.seconds}${sShort(lang)}`;
}

export function sectionHead(emoji: string, titleKey: I18nKey, link?: { href: string; labelKey: I18nKey }): string {
  const linkHtml = link
    ? `<a class="section-link" href="${link.href}">${t(link.labelKey)} →</a>`
    : '';
  return `
    <div class="section-head">
      <h2 class="section-title">${emoji} <span data-i18n="${titleKey}">${t(titleKey)}</span></h2>
      ${linkHtml}
    </div>`;
}

export function categoryChipsHtml(active: GameCategory | 'all', lang: Lang): string {
  return CATEGORY_CHIPS.map((c) => {
    const label = lang === 'am' ? c.labelAm : c.labelEn;
    const on = c.id === active ? ' on' : '';
    return `<button type="button" class="cat-chip${on}" data-cat="${c.id}"><span class="cat-chip-ico">${c.icon}</span><span>${escapeHtml(label)}</span></button>`;
  }).join('');
}

export function quickActionsHtml(): string {
  const items: { href?: string; icon: string; key: I18nKey; isBtn?: boolean }[] = [
    { href: '#weeklyTournament', icon: '🏆', key: 'hub.quickTournaments' },
    { href: '#lbPreview', icon: '🥇', key: 'hub.quickLeaderboard' },
    { href: '#rewards', icon: '🎁', key: 'hub.quickRewards' },
    { href: '#dailyChallenge', icon: '🎯', key: 'hub.quickMissions' },
    { href: '#games', icon: '🎮', key: 'hub.quickGames' },
    { icon: '👤', key: 'hub.quickAccount', isBtn: true },
  ];
  return items.map((item) => {
    if (item.isBtn) {
      return `<button type="button" class="qa-btn" data-qa-account><span class="qa-ico">${item.icon}</span><span data-i18n="${item.key}">${t(item.key)}</span></button>`;
    }
    return `<a class="qa-btn" href="${item.href}"><span class="qa-ico">${item.icon}</span><span data-i18n="${item.key}">${t(item.key)}</span></a>`;
  }).join('');
}

export interface WeeklyBannerOpts {
  lang: Lang;
  gameName: string;
  gameIcon: string;
  gameRoute: string;
  tour: Tournament;
  title: string;
}

export function weeklyTournamentBannerHtml(opts: WeeklyBannerOpts): string {
  const prizes = etbPrizesForCadence('weekly');
  const pool = prizes.reduce((s, p) => s + p, 0);
  const poolStr = formatEtbPrize(pool, opts.lang);
  return `
    <article class="weekly-banner" style="--wb-accent:${opts.tour.gameId ? '' : ''}">
      <div class="wb-glow" aria-hidden="true">${opts.gameIcon}</div>
      <div class="wb-body">
        <span class="wb-eyebrow" data-i18n="hub.weeklyChampionship">${t('hub.weeklyChampionship')}</span>
        <h2 class="wb-title">${escapeHtml(opts.title)}</h2>
        <p class="wb-game">${escapeHtml(opts.gameName)}</p>
        <div class="wb-meta">
          <div class="wb-stat">
            <span class="wb-stat-lbl" data-i18n="hub.pool">${t('hub.pool')}</span>
            <strong class="wb-stat-val">${escapeHtml(poolStr)}</strong>
          </div>
          <div class="wb-stat">
            <span class="wb-stat-lbl" data-i18n="hub.endsIn">${t('hub.endsIn')}</span>
            <strong class="wb-stat-val" data-ends="${opts.tour.endsAt}">${fmtCountdown(opts.tour.endsAt, opts.lang)}</strong>
          </div>
        </div>
        <a class="btn primary wb-cta" href="${opts.gameRoute}" data-i18n="hub.joinTournament">${t('hub.joinTournament')}</a>
      </div>
    </article>`;
}

export function dailyChallengeHtml(): string {
  const tasks: { key: I18nKey; done: boolean }[] = [
    { key: 'hub.challengeScore', done: false },
    { key: 'hub.challengePlay3', done: false },
    { key: 'hub.challengeMemory', done: false },
  ];
  const rows = tasks.map((task) =>
    `<li class="dc-task${task.done ? ' done' : ''}"><span class="dc-check">${task.done ? '✔' : '○'}</span><span data-i18n="${task.key}">${t(task.key)}</span></li>`,
  ).join('');
  return `
    <article class="widget-card challenge-card" id="dailyChallenge">
      <h3 class="widget-title">🎯 <span data-i18n="hub.dailyChallenge">${t('hub.dailyChallenge')}</span></h3>
      <ul class="dc-tasks">${rows}</ul>
      <div class="dc-reward">
        <span data-i18n="hub.reward">${t('hub.reward')}</span>
        <strong>+200 <span data-i18n="hub.coinsLabel">${t('hub.coinsLabel')}</span></strong>
      </div>
      <a class="btn primary dc-cta" href="#games" data-i18n="hub.playNow">${t('hub.playNow')}</a>
      <p class="widget-note" data-i18n="hub.challengeNote">${t('hub.challengeNote')}</p>
    </article>`;
}

export interface SidebarDashOpts {
  level: number;
  xpPct: number;
  xp: number;
  nextXp: number;
  coins: number;
  gamesPlayed: number;
  rank?: number;
}

export function sidebarDashboardHtml(opts: SidebarDashOpts): string {
  const rankStr = opts.rank != null && opts.rank > 0 ? `#${opts.rank}` : '—';
  return `
    <article class="widget-card dash-card">
      <h3 class="widget-title">📊 <span data-i18n="hub.myDashboard">${t('hub.myDashboard')}</span></h3>
      <div class="dash-level">
        <span data-i18n="hub.statLevel">${t('hub.statLevel')}</span>
        <strong>${opts.level}</strong>
      </div>
      <div class="dash-bar" role="progressbar" aria-valuenow="${opts.xpPct}" aria-valuemin="0" aria-valuemax="100">
        <div class="dash-bar-fill" style="width:${opts.xpPct}%"></div>
      </div>
      <div class="dash-grid">
        <div class="dash-stat"><span class="dash-lbl" data-i18n="hub.dashScore">${t('hub.dashScore')}</span><strong>${opts.xp.toLocaleString()}</strong></div>
        <div class="dash-stat"><span class="dash-lbl" data-i18n="hub.dashGames">${t('hub.dashGames')}</span><strong>${opts.gamesPlayed}</strong></div>
        <div class="dash-stat"><span class="dash-lbl" data-i18n="hub.dashRank">${t('hub.dashRank')}</span><strong>${rankStr}</strong></div>
        <div class="dash-stat"><span class="dash-lbl" data-i18n="hub.coinsLabel">${t('hub.coinsLabel')}</span><strong>${opts.coins.toLocaleString()}</strong></div>
      </div>
    </article>`;
}

export function dailyMissionsHtml(): string {
  const missions: { key: I18nKey; cur: number; max: number; reward: number }[] = [
    { key: 'hub.missionPlay5', cur: 0, max: 5, reward: 50 },
    { key: 'hub.missionWin2', cur: 0, max: 2, reward: 80 },
    { key: 'hub.missionTournament', cur: 0, max: 1, reward: 100 },
  ];
  const rows = missions.map((m) => {
    const pct = Math.round((m.cur / m.max) * 100);
    return `
      <div class="mission-row">
        <div class="mission-top">
          <span data-i18n="${m.key}">${t(m.key)}</span>
          <span class="mission-reward">+${m.reward} 🪙</span>
        </div>
        <div class="mission-bar"><div class="mission-bar-fill" style="width:${pct}%"></div></div>
        <span class="mission-prog">${m.cur}/${m.max}</span>
      </div>`;
  }).join('');
  return `
    <article class="widget-card missions-card">
      <h3 class="widget-title">📋 <span data-i18n="hub.dailyMissions">${t('hub.dailyMissions')}</span></h3>
      ${rows}
      <p class="widget-note" data-i18n="hub.missionsNote">${t('hub.missionsNote')}</p>
    </article>`;
}

export function nextRewardHtml(level: number, xpToNext: number): string {
  const pct = xpToNext > 0 ? Math.min(95, Math.round((1 - xpToNext / (xpToNext + 500)) * 100)) : 80;
  return `
    <article class="widget-card reward-next-card">
      <h3 class="widget-title">🎁 <span data-i18n="hub.nextReward">${t('hub.nextReward')}</span></h3>
      <div class="reward-chest" aria-hidden="true">🧰</div>
      <p class="reward-next-txt">${t('hub.nextRewardSub').replace('{n}', String(level + 1))}</p>
      <div class="mission-bar"><div class="mission-bar-fill mission-bar-fill--gold" style="width:${pct}%"></div></div>
    </article>`;
}

const NEWS_ITEMS: { icon: string; key: I18nKey; ago: string }[] = [
  { icon: '🏆', key: 'hub.newsTournament', ago: '2h' },
  { icon: '🎮', key: 'hub.newsGames', ago: '1d' },
  { icon: '⭐', key: 'hub.newsDouble', ago: '2d' },
  { icon: '🔧', key: 'hub.newsMaintenance', ago: '3d' },
];

export function newsFeedHtml(): string {
  const rows = NEWS_ITEMS.map((n) => `
    <li class="news-item">
      <span class="news-ico">${n.icon}</span>
      <div class="news-body">
        <span data-i18n="${n.key}">${t(n.key)}</span>
        <time class="news-ago">${n.ago}</time>
      </div>
    </li>`).join('');
  return `
    <section class="portal-section news-section" id="news">
      ${sectionHead('📰', 'hub.newsEvents')}
      <ul class="news-list">${rows}</ul>
    </section>`;
}

export function sidebarNewsHtml(): string {
  const rows = NEWS_ITEMS.slice(0, 3).map((n) => `
    <li class="news-item news-item--compact">
      <span class="news-ico">${n.icon}</span>
      <span data-i18n="${n.key}">${t(n.key)}</span>
    </li>`).join('');
  return `
    <article class="widget-card news-widget">
      <h3 class="widget-title">📰 <span data-i18n="hub.newsEvents">${t('hub.newsEvents')}</span></h3>
      <ul class="news-list news-list--compact">${rows}</ul>
      <a class="section-link" href="#news" data-i18n="hub.viewAll">${t('hub.viewAll')} →</a>
    </article>`;
}

export function rewardsTiersHtml(lang: Lang): string {
  const weekly = etbPrizesForCadence('weekly');
  const tiles = weekly.slice(0, 3).map((p) =>
    `<div class="reward-tier"><span class="reward-tier-val">${formatEtbPrize(p, lang)}</span><span class="reward-tier-lbl" data-i18n="hub.prize">${t('hub.prize')}</span></div>`,
  ).join('');
  return `<div class="reward-tiers">${tiles}</div>`;
}

export function lbPreviewRow(r: LeaderEntry): string {
  const medal = ['🥇', '🥈', '🥉'];
  const rp = r.rp ?? r.score;
  const rpStr = typeof rp === 'number' ? (rp % 1 === 0 ? String(rp) : rp.toFixed(1)) : String(rp);
  return `
    <div class="lb-preview-row${r.rank <= 3 ? ' top' : ''}${r.isPlayer ? ' me' : ''}">
      <span class="lb-preview-rank">${medal[r.rank - 1] ?? r.rank}</span>
      <span class="lb-preview-name">${escapeHtml(r.isPlayer ? t('td.you') : r.name)}</span>
      <span class="lb-preview-score">${rpStr} RP</span>
    </div>`;
}

export function comingSoonCard(teaser: ComingSoonMeta, lang: Lang): string {
  const name = lang === 'am' ? teaser.nameAm : teaser.nameEn;
  const eta = lang === 'am' ? (teaser.etaAm ?? teaser.etaEn) : teaser.etaEn;
  return `
    <article class="cs-card">
      <div class="cs-thumb" style="background:linear-gradient(145deg,${teaser.thumb[0]},${teaser.thumb[1]})">
        <span class="cs-glyph">${teaser.icon}</span>
        <span class="cs-badge" data-i18n="hub.soon">${t('hub.soon')}</span>
      </div>
      <h4 class="cs-title">${escapeHtml(name)}</h4>
      ${eta ? `<p class="cs-eta">${escapeHtml(eta)}</p>` : ''}
    </article>`;
}

export function hScrollShelf(games: GameMeta[], cardHtml: (g: GameMeta) => string): string {
  if (!games.length) return `<p class="cat-empty">${t('hub.noResults')}</p>`;
  return `<div class="hscroll-track">${games.map((g) => `<div class="hscroll-item">${cardHtml(g)}</div>`).join('')}</div>`;
}

export function comingSoonShelfHtml(lang: Lang): string {
  return `<div class="hscroll-track cs-track">${COMING_SOON.map((teaser) => `<div class="hscroll-item hscroll-item--cs">${comingSoonCard(teaser, lang)}</div>`).join('')}</div>`;
}

/** IDs for trending/recent helpers (re-export for tests). */
export { trendingGames, recentlyAddedGames };
