// Phone-OTP sign-in widget for the hub topbar. Self-contained: injects its own
// button, modal and styles, and speaks to the auth layer (Supabase phone OTP).
// When Supabase isn't configured it renders nothing and the platform stays in
// anonymous local-play mode. Strings are inline EN/AM so it needs no shared i18n.

import {
  authAvailable, requestOtp, verifyOtp, currentUser, signOut, setDisplayName,
  onAuthChange, devOtpEcho, fetchDevOtp, type AuthUser,
} from '../platform/auth';
import { getLang } from '../i18n';

const STR = {
  en: {
    signIn: 'Sign in', title: 'Sign in to compete', phone: 'Phone number',
    send: 'Send code', sending: 'Sending…', code: 'Enter the 6-digit code',
    verify: 'Verify', verifying: 'Verifying…', resend: 'Resend code',
    name: 'Display name', save: 'Save', signOut: 'Sign out',
    sent: 'Code sent. Check your SMS.',
    errSend: "Couldn't send the code. Check the number and try again.",
    errVerify: 'Wrong or expired code.', close: 'Close',
    demoCode: 'Demo mode — your code is',
  },
  am: {
    signIn: 'ግባ', title: 'ለመወዳደር ይግቡ', phone: 'ስልክ ቁጥር',
    send: 'ኮድ ላክ', sending: 'በመላክ ላይ…', code: '6-አሃዝ ኮድ ያስገቡ',
    verify: 'አረጋግጥ', verifying: 'በማረጋገጥ ላይ…', resend: 'ኮድ እንደገና ላክ',
    name: 'የሚታይ ስም', save: 'አስቀምጥ', signOut: 'ውጣ',
    sent: 'ኮድ ተልኳል። SMS ይመልከቱ (ወይም በፈተና ሁነታ የ function logs)።',
    errSend: 'ኮዱን መላክ አልተቻለም። ቁጥሩን አረጋግጠው እንደገና ይሞክሩ።',
    errVerify: 'የተሳሳተ ወይም ጊዜው ያለፈበት ኮድ።', close: 'ዝጋ',
    demoCode: 'የማሳያ ሁነታ — ኮድዎ',
  },
};
const t = (k: keyof typeof STR.en): string => (STR[getLang()] ?? STR.en)[k];
const esc = (s: string): string => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));

let user: AuthUser | null = null;
let slot: HTMLElement;
let phone = '';

export function mountSignIn(): void {
  if (!authAvailable()) return;
  injectStyles();
  const bar = document.querySelector('.topbar');
  if (!bar) return;
  slot = document.createElement('div');
  slot.className = 'auth-slot';
  bar.insertBefore(slot, bar.querySelector('.lang-switch'));
  render();
  void currentUser().then((u) => { user = u; render(); });
  onAuthChange((u) => { user = u; render(); });
}

function render(): void {
  if (!slot) return;
  const label = user ? `👤 ${esc(user.name || user.phone)}` : t('signIn');
  slot.innerHTML = `<button class="auth-btn">${label}</button>`;
  slot.querySelector('button')!.addEventListener('click', user ? openProfile : openModal);
}

// --- modal -----------------------------------------------------------------

function shell(inner: string): HTMLElement {
  document.querySelector('.auth-modal')?.remove();
  const m = document.createElement('div');
  m.className = 'auth-modal';
  m.innerHTML = `<div class="auth-scrim"></div><div class="auth-card">${inner}</div>`;
  document.body.appendChild(m);
  m.querySelector('.auth-scrim')!.addEventListener('click', () => m.remove());
  return m;
}

// Open the sign-in flow from elsewhere (e.g. the coin store / paid-entry gate).
export function openSignIn(): void {
  if (!authAvailable()) return;
  injectStyles();
  openModal();
}

function openModal(): void {
  const m = shell(`
    <h3>${t('title')}</h3>
    <label>${t('phone')}</label>
    <input class="auth-input" id="phone" type="tel" inputmode="tel" placeholder="09… / +2519…" value="${esc(phone)}" />
    <p class="auth-err" id="err"></p>
    <button class="auth-primary" id="go">${t('send')}</button>`);
  const input = m.querySelector<HTMLInputElement>('#phone')!;
  const go = m.querySelector<HTMLButtonElement>('#go')!;
  input.focus();
  go.addEventListener('click', async () => {
    phone = input.value.trim();
    if (!phone) return;
    go.disabled = true; go.textContent = t('sending');
    try {
      await requestOtp(phone);
      openCode();
    } catch {
      m.querySelector('#err')!.textContent = t('errSend');
      go.disabled = false; go.textContent = t('send');
    }
  });
}

function openCode(): void {
  const m = shell(`
    <h3>${t('code')}</h3>
    <p class="auth-hint">${t('sent')}</p>
    <p class="auth-demo" id="demo" hidden></p>
    <input class="auth-input" id="code" type="text" inputmode="numeric" maxlength="6" placeholder="123456" />
    <p class="auth-err" id="err"></p>
    <button class="auth-primary" id="go">${t('verify')}</button>
    <button class="auth-link" id="resend">${t('resend')}</button>`);
  const input = m.querySelector<HTMLInputElement>('#code')!;
  const go = m.querySelector<HTMLButtonElement>('#go')!;
  input.focus();
  void showDemoCode(m, input);
  go.addEventListener('click', async () => {
    const code = input.value.trim();
    if (code.length < 4) return;
    go.disabled = true; go.textContent = t('verifying');
    try {
      user = await verifyOtp(phone, code);
      m.remove(); render();
      if (!user.name) openProfile();
    } catch {
      m.querySelector('#err')!.textContent = t('errVerify');
      go.disabled = false; go.textContent = t('verify');
    }
  });
  m.querySelector('#resend')!.addEventListener('click', () => {
    void requestOtp(phone).then(() => showDemoCode(m, input));
  });
}

// DEMO ONLY: surface the OTP the send-sms mock stashed, so a no-SMS-gateway demo
// still signs in with any phone. Shows the code and prefills it. Inert in prod.
async function showDemoCode(m: HTMLElement, input: HTMLInputElement): Promise<void> {
  if (!devOtpEcho()) return;
  const code = await fetchDevOtp(phone);
  if (!code) return;
  const banner = m.querySelector<HTMLElement>('#demo');
  if (banner) { banner.hidden = false; banner.innerHTML = `${t('demoCode')} <strong>${esc(code)}</strong>`; }
  if (!input.value) input.value = code;
}

function openProfile(): void {
  const m = shell(`
    <h3>👤 ${esc(user?.phone ?? '')}</h3>
    <label>${t('name')}</label>
    <input class="auth-input" id="name" type="text" maxlength="24" value="${esc(user?.name ?? '')}" placeholder="${t('name')}" />
    <button class="auth-primary" id="save">${t('save')}</button>
    <button class="auth-link danger" id="out">${t('signOut')}</button>`);
  const input = m.querySelector<HTMLInputElement>('#name')!;
  input.focus();
  m.querySelector('#save')!.addEventListener('click', async () => {
    const name = input.value.trim();
    if (name) { await setDisplayName(name); if (user) user.name = name; }
    m.remove(); render();
  });
  m.querySelector('#out')!.addEventListener('click', async () => {
    await signOut(); user = null; m.remove(); render();
  });
}

function injectStyles(): void {
  if (document.getElementById('auth-styles')) return;
  const s = document.createElement('style');
  s.id = 'auth-styles';
  s.textContent = `
    .auth-slot { display: inline-flex; }
    .auth-btn { border: 1px solid var(--accent); background: var(--accent); color: #fff;
      font: inherit; font-weight: 700; font-size: 0.9rem; padding: 0.4rem 1rem; border-radius: 999px; cursor: pointer; }
    .auth-btn:hover { filter: brightness(1.05); }
    .auth-modal { position: fixed; inset: 0; z-index: 9990; display: flex; align-items: center; justify-content: center; }
    .auth-scrim { position: absolute; inset: 0; background: rgba(12,16,30,.5); backdrop-filter: blur(3px); }
    .auth-card { position: relative; width: min(340px, 92vw); background: #fff; color: var(--text);
      border-radius: 16px; padding: 22px; box-shadow: 0 20px 50px rgba(20,30,60,.3); display: flex; flex-direction: column; gap: 10px; }
    .auth-card h3 { font-size: 1.15rem; }
    .auth-card label { font-size: 0.8rem; color: var(--muted); }
    .auth-input { width: 100%; padding: 0.7rem 0.8rem; border: 1px solid var(--line); border-radius: 10px; font: inherit; font-size: 1rem; }
    .auth-input:focus { outline: 2px solid var(--accent); border-color: var(--accent); }
    .auth-primary { margin-top: 4px; background: var(--accent); color: #fff; border: none; border-radius: 10px;
      padding: 0.7rem; font: inherit; font-weight: 700; cursor: pointer; }
    .auth-primary:disabled { opacity: .6; cursor: default; }
    .auth-link { background: none; border: none; color: var(--muted); font: inherit; cursor: pointer; padding: 4px; }
    .auth-link.danger { color: var(--accent-2); }
    .auth-hint { font-size: 0.82rem; color: var(--muted); }
    .auth-demo { font-size: 0.86rem; color: #1f6f43; background: #e9f8ef; border: 1px solid #bce8cf;
      border-radius: 8px; padding: 6px 10px; margin: 0; }
    .auth-demo strong { font-size: 1.05rem; letter-spacing: 2px; }
    .auth-err { font-size: 0.82rem; color: #d64545; min-height: 1em; margin: 0; }`;
  document.head.appendChild(s);
}
