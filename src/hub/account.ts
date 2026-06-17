// Account screen + subscription flow + feedback survey.
//
// Self-contained like signin.ts / wallet.ts: injects its own markup and styles
// and speaks only to the subscription / auth / payments modules. Opened from the
// bottom-nav "Account" tab. Strings are inline EN/AM.

import { getLang } from '../i18n';
import { currentUser, signOut, type AuthUser } from '../platform/auth';
import { openSignIn } from './signin';
import {
  SUB_PLANS, currentSub, trialAvailable, subscribe, cancelSub, loadSubscription,
  type SubPeriod, type Subscription,
} from '../platform/subscription';
import { paymentMethodsEnabled } from '../platform/config';
import { PAY_METHOD_LABEL, type PayMethod } from '../platform/payments';
import { activeDraws, myTickets } from '../platform/draws';
import { fetchReferral, redeemReferralRemote } from '../platform/backend';
import { balance } from '../platform/wallet';

const STR = {
  en: {
    account: 'Account', back: 'Close', signedOut: 'Not signed in', signIn: 'Sign in', signOut: 'Sign out',
    premium: 'Premium', expiresIn: 'Renews in', daysLeft: 'days left', notSub: "You're not subscribed yet",
    subscribeNow: 'Subscribe now', choosePlan: 'Choose your plan', daily: 'Daily', weekly: 'Weekly', monthly: 'Monthly',
    perDay: 'Charged once a day', perWeek: 'Charged once a week', perMonth: 'Charged once a month',
    freeTrial: '1-day free trial for first-time subscribers', subWith: 'Subscribe with', cancel: 'Cancel subscription',
    payVia: 'Pay with', confirm: 'Confirm', subbed: "You're subscribed!", general: 'General info',
    terms: 'Terms & conditions', faq: 'FAQ', feedback: 'Write your feedback', rateQ: 'How would you rate your experience?',
    submit: 'Submit', thanks: 'Thanks for your feedback!', close: 'Close', active: 'Active plan',
    myEntries: 'My draw entries', tickets: 'tickets', failed: "Couldn't complete. Try again.",
    invite: 'Invite friends', inviteSub: 'Share your code — you both get coins!', yourCode: 'Your code',
    copy: 'Copy', copied: 'Copied!', share: 'Share', haveCode: 'Have a friend’s code?',
    enterCode: 'Enter code', redeem: 'Redeem', refOk: '🎉 +10 coins! Your friend got 20.',
    refAlready: 'You’ve already redeemed a code.', refInvalid: 'That code isn’t valid.', refSelf: 'You can’t use your own code.',
  },
  am: {
    account: 'መለያ', back: 'ዝጋ', signedOut: 'አልገቡም', signIn: 'ግባ', signOut: 'ውጣ',
    premium: 'ፕሪሚየም', expiresIn: 'ይታደሳል በ', daysLeft: 'ቀናት ቀርተዋል', notSub: 'እስካሁን አልተመዘገቡም',
    subscribeNow: 'አሁን ይመዝገቡ', choosePlan: 'ዕቅድ ይምረጡ', daily: 'ዕለታዊ', weekly: 'ሳምንታዊ', monthly: 'ወርሃዊ',
    perDay: 'በቀን አንዴ ይከፈላል', perWeek: 'በሳምንት አንዴ ይከፈላል', perMonth: 'በወር አንዴ ይከፈላል',
    freeTrial: 'ለመጀመሪያ ጊዜ ለሚመዘገቡ የ1-ቀን ነጻ ሙከራ', subWith: 'ይመዝገቡ በ', cancel: 'ምዝገባ ሰርዝ',
    payVia: 'ይክፈሉ በ', confirm: 'አረጋግጥ', subbed: 'ተመዝግበዋል!', general: 'አጠቃላይ መረጃ',
    terms: 'ውሎች እና ሁኔታዎች', faq: 'ተደጋጋሚ ጥያቄዎች', feedback: 'አስተያየትዎን ይጻፉ', rateQ: 'ተሞክሮዎን እንዴት ይገመግሙታል?',
    submit: 'አስገባ', thanks: 'ስለ አስተያየትዎ እናመሰግናለን!', close: 'ዝጋ', active: 'ንቁ ዕቅድ',
    myEntries: 'የእኔ ዕጣ ግቤቶች', tickets: 'ቲኬቶች', failed: 'አልተጠናቀቀም። እንደገና ይሞክሩ።',
    invite: 'ጓደኞችን ይጋብዙ', inviteSub: 'ኮድዎን ያጋሩ — ሁለታችሁም ሳንቲም ታገኛላችሁ!', yourCode: 'የእርስዎ ኮድ',
    copy: 'ቅዳ', copied: 'ተቀድቷል!', share: 'አጋራ', haveCode: 'የጓደኛ ኮድ አለዎት?',
    enterCode: 'ኮድ ያስገቡ', redeem: 'ይቤዡ', refOk: '🎉 +10 ሳንቲም! ጓደኛዎ 20 አግኝቷል።',
    refAlready: 'ኮድ አስቀድመው ተቀብለዋል።', refInvalid: 'ይህ ኮድ ትክክል አይደለም።', refSelf: 'የራስዎን ኮድ መጠቀም አይችሉም።',
  },
};

// Short original Terms / FAQ copy (EN/AM) shown from the account tiles.
const INFO: Record<'terms' | 'faq', { en: string[]; am: string[] }> = {
  terms: {
    en: [
      'By using GoPlay you agree to play responsibly and to follow the operator’s service terms.',
      'Coins and Gold are bought with real money. Points are earned by playing and have no cash value.',
      'Prize draws run on a fixed daily, weekly and monthly schedule. Tickets are bought with Points and entries are final.',
      'Subscriptions renew automatically until cancelled. The one-day free trial applies to first-time subscribers only.',
      'You must be 18 or older to enter prize draws.',
    ],
    am: [
      'GoPlayን በመጠቀም በኃላፊነት ለመጫወት ይስማማሉ።',
      'ሳንቲም እና ወርቅ በገንዘብ ይገዛሉ። ነጥብ በመጫወት ይገኛል፣ የገንዘብ ዋጋ የለውም።',
      'ዕጣዎች በየቀኑ፣ በየሳምንቱ እና በየወሩ ይካሄዳሉ። ቲኬቶች በነጥብ ይገዛሉ።',
      'ምዝገባ እስኪሰረዝ ድረስ ይታደሳል። የነጻ ሙከራ ለመጀመሪያ ተመዝጋቢዎች ብቻ ነው።',
      'ዕጣ ለመግባት 18 ዓመት ወይም በላይ መሆን አለብዎት።',
    ],
  },
  faq: {
    en: [
      'How do I earn Points? Win games — every win adds Points you can spend on draw tickets.',
      'What is Gold for? Gold unlocks premium spins and instant-win games.',
      'How do draws work? Buy tickets with Points; winners are drawn when the daily, weekly or monthly window closes.',
      'How do I subscribe? Open Account → Subscribe now, choose a plan and pay with airtime or TeleBirr.',
      'Need help? Use “Write your feedback” in your Account.',
    ],
    am: [
      'ነጥብ እንዴት አገኛለሁ? ጨዋታ ያሸንፉ — እያንዳንዱ ድል ነጥብ ይጨምራል።',
      'ወርቅ ለምንድነው? ወርቅ ልዩ ስፒኖችን እና ፈጣን ጨዋታዎችን ይከፍታል።',
      'ዕጣዎች እንዴት ይሰራሉ? ቲኬቶችን በነጥብ ይግዙ፤ አሸናፊዎች በወቅቱ መጨረሻ ይመረጣሉ።',
      'እንዴት እመዘገባለሁ? መለያ → አሁን ይመዝገቡ፣ ዕቅድ ይምረጡ እና በአየር ሰዓት ወይም በTeleBirr ይክፈሉ።',
      'እገዛ ይፈልጋሉ? በመለያዎ “አስተያየትዎን ይጻፉ” ይጠቀሙ።',
    ],
  },
};
const t = (k: keyof typeof STR.en): string => (STR[getLang()] ?? STR.en)[k];
const esc = (s: string): string => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));
const periodLabel = (p: SubPeriod): string => t(p);

function shell(inner: string): HTMLElement {
  document.querySelector('.acct-modal')?.remove();
  const m = document.createElement('div');
  m.className = 'acct-modal';
  m.innerHTML = `
    <div class="acct-brand"><span class="acct-brand-icon">🎮</span><span>GoPlay</span></div>
    <button class="acct-back" aria-label="${t('back')}">✕</button>
    <div class="acct-stack">${inner}</div>`;
  document.body.appendChild(m);
  m.querySelector('.acct-back')!.addEventListener('click', () => m.remove());
  return m;
}

export async function openAccount(): Promise<void> {
  injectStyles();
  const user = await currentUser();
  await loadSubscription();
  const sub = currentSub();
  const ref = user ? await fetchReferral() : null;
  shell(`
    <h2 class="acct-title">${t('account')}</h2>
    ${accountCardHtml(user)}
    ${referralHtml(ref)}
    ${subscriptionCardHtml(sub)}
    ${entriesHtml()}
    <div class="acct-sec">${t('general')}</div>
    <div class="acct-tiles">
      <button class="acct-tile" id="aTerms">📄 ${t('terms')}</button>
      <button class="acct-tile" id="aFaq">❓ ${t('faq')}</button>
    </div>
    <button class="acct-card acct-feedback" id="aFeedback">💬 ${t('feedback')}</button>`);
  wireAccount(user);
}

function accountCardHtml(user: AuthUser | null): string {
  if (!user) {
    return `<div class="acct-card">
      <div class="acct-row"><span class="acct-muted">${t('signedOut')}</span>
      <button class="acct-btn" id="aSignIn">${t('signIn')}</button></div></div>`;
  }
  return `<div class="acct-card">
    <div class="acct-row"><span class="acct-user">👤 ${esc(user.name || user.phone)}</span>
    <button class="acct-btn ghost" id="aSignOut">${t('signOut')}</button></div></div>`;
}

// Invite-friends card: the player's own shareable code + (if not yet redeemed)
// a field to enter a friend's code. Hidden entirely when signed out.
function referralHtml(ref: { code: string; redeemed: boolean } | null): string {
  if (!ref || !ref.code) return '';
  const redeemBox = ref.redeemed ? '' : `
    <div class="ref-redeem">
      <span class="acct-muted">${t('haveCode')}</span>
      <div class="ref-redeem-row">
        <input id="refInput" class="ref-input" placeholder="${t('enterCode')}" maxlength="6" autocomplete="off" />
        <button class="acct-btn" id="refRedeem">${t('redeem')}</button>
      </div>
      <p class="ref-msg" id="refMsg"></p>
    </div>`;
  return `<div class="acct-card ref-card">
    <div class="ref-head"><span class="ref-gift">🎁</span>
      <div><strong>${t('invite')}</strong><div class="acct-muted">${t('inviteSub')}</div></div></div>
    <div class="ref-code-row">
      <span class="acct-muted">${t('yourCode')}</span>
      <code class="ref-code" id="refCode">${esc(ref.code)}</code>
      <button class="acct-btn ghost" id="refCopy">${t('copy')}</button>
      <button class="acct-btn" id="refShare">${t('share')}</button>
    </div>
    ${redeemBox}
  </div>`;
}

function wireReferral(): void {
  const codeEl = document.querySelector('#refCode');
  const code = codeEl?.textContent ?? '';
  const link = `${location.origin}${location.pathname}?ref=${encodeURIComponent(code)}`;
  document.querySelector('#refCopy')?.addEventListener('click', () => {
    void navigator.clipboard?.writeText(code);
    const b = document.querySelector('#refCopy')!; const o = b.textContent; b.textContent = t('copied');
    setTimeout(() => { b.textContent = o; }, 1400);
  });
  document.querySelector('#refShare')?.addEventListener('click', () => {
    const msg = `${t('inviteSub')} ${code}\n${link}`;
    if (navigator.share) void navigator.share({ title: 'GoPlay', text: msg, url: link }).catch(() => {});
    else void navigator.clipboard?.writeText(msg);
  });
  // Prefill the redeem box from a ?ref=CODE invite link.
  const incoming = new URLSearchParams(location.search).get('ref');
  const input0 = document.querySelector<HTMLInputElement>('#refInput');
  if (incoming && input0 && !input0.value) input0.value = incoming.trim().toUpperCase().slice(0, 6);
  const btn = document.querySelector<HTMLButtonElement>('#refRedeem');
  btn?.addEventListener('click', async () => {
    const input = document.querySelector<HTMLInputElement>('#refInput')!;
    const msg = document.querySelector('#refMsg')!;
    const val = input.value.trim().toUpperCase();
    if (!val) return;
    btn.disabled = true;
    try {
      const res = await redeemReferralRemote(val);
      const key = ({ ok: 'refOk', already: 'refAlready', invalid: 'refInvalid', self: 'refSelf' } as const)[res.status] ?? 'failed';
      msg.textContent = t(key);
      msg.className = `ref-msg ${res.status === 'ok' ? 'ok' : 'err'}`;
      if (res.status === 'ok') { void balance(); setTimeout(() => void openAccount(), 1200); }
      else btn.disabled = false;
    } catch { msg.textContent = t('failed'); msg.className = 'ref-msg err'; btn.disabled = false; }
  });
}

function subscriptionCardHtml(sub: Subscription | null): string {
  if (sub) {
    const days = Math.max(0, Math.ceil((sub.expiresAt - Date.now()) / 864e5));
    return `<div class="acct-card sub-on">
      <div class="acct-row">
        <div><div class="sub-badge">⭐ ${t('premium')}</div>
        <div class="acct-muted">${periodLabel(sub.period)} · ${t('expiresIn')} ${days} ${t('daysLeft')}</div></div>
        <button class="acct-btn ghost" id="aCancel">${t('cancel')}</button>
      </div></div>`;
  }
  return `<button class="acct-card sub-off" id="aSubscribe">
    <span class="sub-cart">🛒</span>
    <span><span class="acct-muted">${t('notSub')}</span><strong class="sub-cta">${t('subscribeNow')}</strong></span>
  </button>`;
}

function wireAccount(user: AuthUser | null): void {
  document.querySelector('#aSignIn')?.addEventListener('click', () => openSignIn());
  document.querySelector('#aSignOut')?.addEventListener('click', async () => { await signOut(); void openAccount(); });
  document.querySelector('#aSubscribe')?.addEventListener('click', () => openPlans());
  document.querySelector('#aCancel')?.addEventListener('click', () => { void cancelSub().then(() => openAccount()); });
  document.querySelector('#aFeedback')?.addEventListener('click', () => openFeedback());
  document.querySelector('#aTerms')?.addEventListener('click', () => openInfo('terms'));
  document.querySelector('#aFaq')?.addEventListener('click', () => openInfo('faq'));
  wireReferral();
  void user;
}

const SUB_KEY: Record<SubPeriod, keyof typeof STR.en> = { daily: 'perDay', weekly: 'perWeek', monthly: 'perMonth' };

function openPlans(): void {
  let chosen: SubPeriod = 'daily';
  const m = shell(`
    <h2 class="acct-title">${t('choosePlan')}</h2>
    <div class="plan-list">
      ${SUB_PLANS.map((p, i) => `
        <button class="plan${i === 0 ? ' sel' : ''}" data-p="${p.period}">
          <span class="plan-name">${periodLabel(p.period)}</span>
          <span class="plan-price">ETB ${p.priceEtb}</span>
          <span class="plan-sub">${t(SUB_KEY[p.period])}</span>
          <span class="plan-radio"></span>
        </button>`).join('')}
    </div>
    ${trialAvailable() ? `<p class="plan-trial">🎁 ${t('freeTrial')}</p>` : ''}
    <button class="acct-primary" id="planNext">${t('subscribeNow')}</button>`);
  m.querySelectorAll<HTMLButtonElement>('.plan').forEach((b) => {
    b.addEventListener('click', () => {
      m.querySelectorAll('.plan').forEach((x) => x.classList.remove('sel'));
      b.classList.add('sel');
      chosen = b.dataset.p as SubPeriod;
    });
  });
  m.querySelector('#planNext')!.addEventListener('click', () => openSubPay(chosen));
}

function openSubPay(period: SubPeriod): void {
  const methods = paymentMethodsEnabled();
  const avail = (['telebirr', 'topup'] as PayMethod[]).filter((mth) => methods[mth]);
  let chosen: PayMethod = avail[0] ?? 'telebirr';
  const plan = SUB_PLANS.find((p) => p.period === period)!;
  const m = shell(`
    <h2 class="acct-title">${t('payVia')}</h2>
    <div class="acct-card"><div class="acct-row"><span>${periodLabel(period)}</span><strong>ETB ${plan.priceEtb}</strong></div></div>
    <div class="method-list">
      ${avail.map((mth, i) => {
        const lab = PAY_METHOD_LABEL[mth];
        return `<button class="method${i === 0 ? ' sel' : ''}" data-m="${mth}"><span class="m-icon">${lab.icon}</span><span>${getLang() === 'am' ? lab.am : lab.en}</span></button>`;
      }).join('')}
    </div>
    <button class="acct-primary" id="subPay">${t('subWith')} ${getLang() === 'am' ? PAY_METHOD_LABEL[chosen].am : PAY_METHOD_LABEL[chosen].en}</button>`);
  const payBtn = m.querySelector<HTMLButtonElement>('#subPay')!;
  m.querySelectorAll<HTMLButtonElement>('.method').forEach((b) => {
    b.addEventListener('click', () => {
      m.querySelectorAll('.method').forEach((x) => x.classList.remove('sel'));
      b.classList.add('sel');
      chosen = b.dataset.m as PayMethod;
      payBtn.textContent = `${t('subWith')} ${getLang() === 'am' ? PAY_METHOD_LABEL[chosen].am : PAY_METHOD_LABEL[chosen].en}`;
    });
  });
  payBtn.addEventListener('click', async () => {
    payBtn.disabled = true;
    try {
      await subscribe(period, chosen);
    } catch {
      payBtn.disabled = false;
      payBtn.textContent = t('failed');
      return;
    }
    m.querySelector('.acct-stack')!.innerHTML = `
      <div class="acct-success"><div class="as-burst">🎉</div><h2 class="acct-title">${t('subbed')}</h2>
      <button class="acct-primary" id="subDone">${t('close')}</button></div>`;
    m.querySelector('#subDone')!.addEventListener('click', () => { m.remove(); void openAccount(); });
  });
}

function openFeedback(): void {
  let rating = 0;
  const m = shell(`
    <h2 class="acct-title">${t('feedback')}</h2>
    <p class="acct-muted">${t('rateQ')}</p>
    <div class="rate-row" id="rateRow">${[1, 2, 3, 4, 5].map((n) => `<button class="rate-star" data-n="${n}">★</button>`).join('')}</div>
    <button class="acct-primary" id="fbSubmit">${t('submit')}</button>`);
  m.querySelectorAll<HTMLButtonElement>('.rate-star').forEach((b) => {
    b.addEventListener('click', () => {
      rating = Number(b.dataset.n);
      m.querySelectorAll<HTMLButtonElement>('.rate-star').forEach((x) => x.classList.toggle('on', Number(x.dataset.n) <= rating));
    });
  });
  m.querySelector('#fbSubmit')!.addEventListener('click', () => {
    try { localStorage.setItem('innoarcade.feedback.v1', JSON.stringify({ rating, at: Date.now() })); } catch { /* ignore */ }
    m.querySelector('.acct-stack')!.innerHTML = `
      <div class="acct-success"><div class="as-burst">🙏</div><h2 class="acct-title">${t('thanks')}</h2>
      <button class="acct-primary" id="fbDone">${t('close')}</button></div>`;
    m.querySelector('#fbDone')!.addEventListener('click', () => m.remove());
  });
}

function openInfo(kind: 'terms' | 'faq'): void {
  const title = kind === 'terms' ? t('terms') : t('faq');
  const lines = INFO[kind][getLang() === 'am' ? 'am' : 'en'];
  const m = shell(`<h2 class="acct-title">${esc(title)}</h2>
    <div class="acct-card info-body">${lines.map((l) => `<p>${esc(l)}</p>`).join('')}</div>
    <button class="acct-primary" id="infoDone">${t('close')}</button>`);
  m.querySelector('#infoDone')!.addEventListener('click', () => m.remove());
}

// The player's current draw entries (tickets bought in active windows).
function entriesHtml(): string {
  const mine = activeDraws().map((d) => ({ d, n: myTickets(d.id) })).filter((x) => x.n > 0);
  if (!mine.length) return '';
  return `<div class="acct-sec">${t('myEntries')}</div>
    <div class="acct-card"><div class="entry-rows">
      ${mine.map(({ d, n }) => `<div class="acct-row"><span>${periodLabel(d.period)} · ${d.prizeEtb.toLocaleString()} ETB</span><strong>${n} 🎟️</strong></div>`).join('')}
    </div></div>`;
}

function injectStyles(): void {
  if (document.getElementById('acct-styles')) return;
  const s = document.createElement('style');
  s.id = 'acct-styles';
  s.textContent = `
    .acct-modal { position: fixed; inset: 0; z-index: 9992; display: flex; flex-direction: column; align-items: center;
      justify-content: flex-start; padding: 4rem 1.2rem 2rem; overflow-y: auto;
      background: var(--grad-hero, linear-gradient(160deg,#3f9112,#2a6e0a)); }
    .acct-brand { position: absolute; top: 1.25rem; left: 1.4rem; display: flex; align-items: center; gap: .5rem; color: #fff; font-weight: 800; }
    .acct-brand-icon { width: 1.9rem; height: 1.9rem; display: grid; place-items: center; background: var(--accent); border-radius: 9px; }
    .acct-back { position: absolute; top: 1.1rem; right: 1.3rem; width: 2.3rem; height: 2.3rem; border-radius: 999px;
      border: 1px solid rgba(255,255,255,.3); background: rgba(255,255,255,.14); color: #fff; font-size: 1rem; cursor: pointer; }
    .acct-stack { width: min(440px, 96vw); display: flex; flex-direction: column; gap: 14px; }
    .acct-title { color: #fff; font-size: 1.4rem; }
    .acct-card { background: #fff; color: var(--text); border-radius: 16px; padding: 1rem 1.1rem; box-shadow: 0 14px 36px rgba(8,12,34,.3);
      border: none; font: inherit; text-align: left; width: 100%; }
    .acct-row { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
    .acct-muted { color: var(--muted); font-size: .88rem; }
    .acct-user { font-weight: 800; }
    .acct-btn { border: 1px solid var(--accent); background: var(--accent); color: #fff; border-radius: 999px; padding: .42rem 1rem; font: inherit; font-weight: 800; cursor: pointer; }
    .acct-btn.ghost { background: #fff; color: var(--muted); border-color: var(--line); }
    .sub-off { display: flex; align-items: center; gap: 12px; cursor: pointer; }
    .sub-cart { width: 2.4rem; height: 2.4rem; display: grid; place-items: center; background: var(--accent); color: #fff; border-radius: 50%; font-size: 1.1rem; }
    .sub-cta { display: block; font-size: 1.05rem; color: var(--accent); }
    .sub-on .sub-badge { display: inline-block; background: var(--gold); color: #5a3d00; font-weight: 900; font-size: .8rem; padding: .12rem .6rem; border-radius: 999px; margin-bottom: 4px; }
    .acct-sec { color: rgba(255,255,255,.92); font-weight: 800; font-size: .82rem; text-transform: uppercase; letter-spacing: .08em; margin-top: 4px; }
    .acct-tiles { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .acct-tile { background: #fff; border: none; border-radius: 16px; padding: 1.1rem; font: inherit; font-weight: 700; color: var(--text); cursor: pointer; box-shadow: 0 14px 36px rgba(8,12,34,.3); }
    .acct-feedback { cursor: pointer; font-weight: 700; }
    .acct-primary { background: var(--cta, #1f74e0); color: #fff; border: none; border-radius: 12px; padding: .85rem; font: inherit; font-weight: 800; cursor: pointer; }
    .plan-list { display: flex; flex-direction: column; gap: 10px; }
    .plan { position: relative; display: grid; grid-template-columns: 1fr auto; gap: 2px 10px; background: #fff; border: 2px solid var(--line);
      border-radius: 14px; padding: .9rem 2.4rem .9rem 1rem; font: inherit; text-align: left; cursor: pointer; }
    .plan.sel { border-color: var(--accent); }
    .plan-name { font-weight: 800; }
    .plan-price { font-weight: 900; }
    .plan-sub { grid-column: 1 / -1; color: var(--muted); font-size: .82rem; }
    .plan-radio { position: absolute; right: 1rem; top: 50%; transform: translateY(-50%); width: 18px; height: 18px; border-radius: 50%; border: 2px solid var(--line); }
    .plan.sel .plan-radio { border-color: var(--accent); background: radial-gradient(circle, var(--accent) 0 6px, #fff 7px); }
    .plan-trial { color: #fff; font-size: .88rem; text-align: center; margin: 0; }
    .method-list { display: flex; flex-direction: column; gap: 8px; }
    .method { display: flex; align-items: center; gap: 10px; padding: .7rem .8rem; border: 2px solid var(--line); border-radius: 12px; background: #fff; font: inherit; font-weight: 700; cursor: pointer; color: var(--text); }
    .method.sel { border-color: var(--accent); }
    .m-icon { font-size: 1.2rem; }
    .acct-success { display: flex; flex-direction: column; align-items: center; gap: 12px; text-align: center; padding-top: 1rem; }
    .as-burst { font-size: 3rem; }
    .rate-row { display: flex; gap: 8px; justify-content: center; }
    .rate-star { background: none; border: none; font-size: 2.2rem; color: #d8e0cf; cursor: pointer; line-height: 1; }
    .rate-star.on { color: var(--gold); }
    .info-body { display: flex; flex-direction: column; gap: 10px; }
    .info-body p { font-size: .9rem; color: var(--text); line-height: 1.55; margin: 0; }
    .entry-rows { display: flex; flex-direction: column; gap: 8px; }
    .entry-rows .acct-row span { font-size: .88rem; }
    .ref-card { display: flex; flex-direction: column; gap: 12px; }
    .ref-head { display: flex; align-items: center; gap: 10px; }
    .ref-gift { font-size: 1.7rem; }
    .ref-code-row { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
    .ref-code { font-family: ui-monospace, monospace; font-weight: 900; font-size: 1.15rem; letter-spacing: .15em;
      background: var(--soft, #f1f5ea); color: var(--accent); padding: .35rem .7rem; border-radius: 10px; flex: 1; text-align: center; }
    .ref-redeem { border-top: 1px solid var(--line); padding-top: 10px; display: flex; flex-direction: column; gap: 8px; }
    .ref-redeem-row { display: flex; gap: 8px; }
    .ref-input { flex: 1; border: 2px solid var(--line); border-radius: 10px; padding: .55rem .7rem; font: inherit;
      font-weight: 800; text-transform: uppercase; letter-spacing: .12em; }
    .ref-input:focus { outline: none; border-color: var(--accent); }
    .ref-msg { margin: 0; font-size: .85rem; font-weight: 700; }
    .ref-msg.ok { color: var(--accent); }
    .ref-msg.err { color: #c0392b; }`;
  document.head.appendChild(s);
}
