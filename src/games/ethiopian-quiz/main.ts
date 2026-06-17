// Ethiopian Quiz — a knowledge/trivia game built for GoPlay (tournament mode).
//
// A round is 5 random multiple-choice questions about Ethiopia (EN + AM). The
// score is the number answered correctly × 20 (so a perfect round = 100); a
// "win" (≥ 3 correct) mints the configured points. Economy + leaderboard run
// through the shared GameHost exactly like the ported chance games, so flipping
// the catalog mode to 'free' removes the entry fee / leaderboard with no edit
// here. Outcomes are decided locally — there is no server "is_correct" hook.

import '../../styles/base.css';
import './style.css';
import { applyTranslations, getLang, setLang, type Lang } from '../../i18n';
import { sfx } from '../../engine/audio';
import { createHost } from '../../platform/gameHost';

const host = createHost('ethiopian-quiz');
const $ = <T extends HTMLElement>(sel: string): T => document.querySelector<T>(sel)!;

// `d` = difficulty tier: 1 easy, 2 medium, 3 hard. Tournament rounds draw from
// the harder tiers; free play stays gentle. `answer` is the correct option index.
interface Q { en: string; am: string; opts: [string, string][]; answer: number; d: 1 | 2 | 3 }

// [English, Amharic] option pairs.
const BANK: Q[] = [
  // --- Tier 1 (easy) ---
  { en: 'What is the capital city of Ethiopia?', am: 'የኢትዮጵያ ዋና ከተማ ማን ናት?',
    opts: [['Addis Ababa', 'አዲስ አበባ'], ['Adama', 'አዳማ'], ['Bahir Dar', 'ባህር ዳር'], ['Mekelle', 'መቀለ']], answer: 0, d: 1 },
  { en: 'Which river is known as the source of the Blue Nile?', am: 'የጥቁር ዓባይ ምንጭ የሚባለው የትኛው ነው?',
    opts: [['Lake Tana', 'ጣና ሐይቅ'], ['Lake Abaya', 'አባያ ሐይቅ'], ['Awash', 'አዋሽ'], ['Omo', 'ኦሞ']], answer: 0, d: 1 },
  { en: 'How many days are in the Ethiopian month of Pagumē?', am: 'ጳጉሜ ስንት ቀናት አሉት?',
    opts: [['5 or 6', '5 ወይም 6'], ['7', '7'], ['10', '10'], ['30', '30']], answer: 0, d: 1 },
  { en: 'Which Ethiopian runner is famous for winning a marathon barefoot?', am: 'ባዶ እግሩን ማራቶን በማሸነፍ የሚታወቀው ኢትዮጵያዊ ሯጭ ማን ነው?',
    opts: [['Abebe Bikila', 'አበበ ቢቂላ'], ['Haile Gebrselassie', 'ኃይሌ ገብረሥላሴ'], ['Kenenisa Bekele', 'ቀነኒሳ በቀለ'], ['Derartu Tulu', 'ደራርቱ ቱሉ']], answer: 0, d: 1 },
  { en: 'What is the staple flatbread of Ethiopian cuisine?', am: 'የኢትዮጵያ ምግብ ዋና ዳቦ ምንድን ነው?',
    opts: [['Injera', 'እንጀራ'], ['Dabo', 'ዳቦ'], ['Kita', 'ቂጣ'], ['Ambasha', 'አምባሻ']], answer: 0, d: 1 },
  { en: 'What is the name of Ethiopia’s currency?', am: 'የኢትዮጵያ ገንዘብ ስም ምንድን ነው?',
    opts: [['Birr', 'ብር'], ['Shilling', 'ሺሊንግ'], ['Nakfa', 'ናቕፋ'], ['Dinar', 'ዲናር']], answer: 0, d: 1 },
  // --- Tier 2 (medium) ---
  { en: 'Which ancient city is home to the famous rock-hewn churches?', am: 'ታዋቂዎቹ ከአለት የተፈለፈሉ አብያተ ክርስቲያናት የት ይገኛሉ?',
    opts: [['Lalibela', 'ላሊበላ'], ['Axum', 'አክሱም'], ['Gondar', 'ጎንደር'], ['Harar', 'ሐረር']], answer: 0, d: 2 },
  { en: 'Coffee is believed to have originated in which Ethiopian region?', am: 'ቡና የመነጨው ከየትኛው የኢትዮጵያ አካባቢ ነው ተብሎ ይታመናል?',
    opts: [['Kaffa', 'ካፋ'], ['Wollo', 'ወሎ'], ['Sidama', 'ሲዳማ'], ['Gojjam', 'ጎጃም']], answer: 0, d: 2 },
  { en: 'Which empire/queen is linked to Ethiopia in ancient tradition?', am: 'በጥንታዊ ወግ ከኢትዮጵያ ጋር የሚገናኘው ንግሥት ማን ናት?',
    opts: [['Queen of Sheba', 'ንግሥተ ሳባ'], ['Cleopatra', 'ክሊዮፓትራ'], ['Nefertiti', 'ኔፈርቲቲ'], ['Boudica', 'ቡዲካ']], answer: 0, d: 2 },
  { en: 'Which mountain is the highest peak in Ethiopia?', am: 'በኢትዮጵያ ከፍተኛው ተራራ የትኛው ነው?',
    opts: [['Ras Dashen', 'ራስ ዳሸን'], ['Mount Bale', 'ባሌ ተራራ'], ['Mount Choke', 'ጮቄ ተራራ'], ['Mount Guna', 'ጉና ተራራ']], answer: 0, d: 2 },
  { en: 'In which year (Gregorian) did the Battle of Adwa take place?', am: 'የዓድዋ ጦርነት በየትኛው ዓመት (እ.አ.አ.) ተካሄደ?',
    opts: [['1896', '1896'], ['1886', '1886'], ['1900', '1900'], ['1935', '1935']], answer: 0, d: 2 },
  { en: 'What is the largest lake in Ethiopia?', am: 'በኢትዮጵያ ትልቁ ሐይቅ የትኛው ነው?',
    opts: [['Lake Tana', 'ጣና ሐይቅ'], ['Lake Abaya', 'አባያ ሐይቅ'], ['Lake Ziway', 'ዝዋይ ሐይቅ'], ['Lake Langano', 'ላንጋኖ ሐይቅ']], answer: 0, d: 2 },
  // --- Tier 3 (hard) ---
  { en: 'Which script is used to write Amharic?', am: 'አማርኛ የሚጻፍበት ፊደል የትኛው ነው?',
    opts: [['Ge’ez (Fidäl)', 'ግዕዝ (ፊደል)'], ['Latin', 'ላቲን'], ['Arabic', 'ዓረብኛ'], ['Coptic', 'ቅብጢ']], answer: 0, d: 3 },
  { en: 'The Danakil Depression, one of Earth’s hottest places, lies in which region?', am: 'ከምድር ሙቅ ቦታዎች አንዱ የሆነው የዳናክል ቆላ የት ይገኛል?',
    opts: [['Afar', 'አፋር'], ['Tigray', 'ትግራይ'], ['Somali', 'ሶማሌ'], ['Oromia', 'ኦሮሚያ']], answer: 0, d: 3 },
  { en: 'Which Ethiopian emperor moved the capital to Addis Ababa in the 1880s?', am: 'በ1880ዎቹ ዋና ከተማን ወደ አዲስ አበባ ያዛወረው ንጉሠ ነገሥት ማን ነው?',
    opts: [['Menelik II', 'ዳግማዊ ምኒልክ'], ['Haile Selassie I', 'ቀዳማዊ ኃይለ ሥላሴ'], ['Tewodros II', 'ዳግማዊ ቴዎድሮስ'], ['Yohannes IV', 'ራብዓዊ ዮሐንስ']], answer: 0, d: 3 },
  { en: '“Lucy” (Dinkinesh), the famous hominid fossil, belongs to which species?', am: '“ሉሲ” (ድንቅነሽ) የተባለው ታዋቂ ቅሪተ አካል የየትኛው ዝርያ ነው?',
    opts: [['Australopithecus afarensis', 'አውስትራሎፒተከስ አፋረንሲስ'], ['Homo erectus', 'ሆሞ ኤሬክተስ'], ['Homo habilis', 'ሆሞ ሃቢሊስ'], ['Paranthropus', 'ፓራንትሮፐስ']], answer: 0, d: 3 },
  { en: 'How many years behind the Gregorian calendar is the Ethiopian calendar (roughly)?', am: 'የኢትዮጵያ ዘመን አቆጣጠር ከግሪጎሪያን በግምት ስንት ዓመት ወደ ኋላ ነው?',
    opts: [['7–8 years', '7–8 ዓመት'], ['5 years', '5 ዓመት'], ['10 years', '10 ዓመት'], ['3 years', '3 ዓመት']], answer: 0, d: 3 },
];

const STR = {
  en: { title: 'Ethiopian Quiz', start: 'Start', next: 'Next', again: 'Play again',
    correct: 'Correct! 🎉', wrong: 'Not quite.', q: 'Question', result: 'You scored',
    of: 'of', timeup: '⏱ Time up!', needCoins: 'Not enough coins — tap “All games” to top up.', signIn: 'Sign in from “All games” to compete.' },
  am: { title: 'የኢትዮጵያ ጥያቄ', start: 'ጀምር', next: 'ቀጣይ', again: 'እንደገና ይጫወቱ',
    correct: 'ትክክል! 🎉', wrong: 'አልተሳካም።', q: 'ጥያቄ', result: 'ያስመዘገቡት',
    of: 'ከ', timeup: '⏱ ጊዜው አለቀ!', needCoins: 'በቂ ሳንቲም የለም — ለመሙላት “ሁሉም ጨዋታዎች” ይጫኑ።', signIn: 'ለመወዳደር ከ“ሁሉም ጨዋታዎች” ይግቡ።' },
};
const lang = (): 'en' | 'am' => (getLang() === 'am' ? 'am' : 'en');
const s = (k: keyof typeof STR.en): string => STR[lang()][k];

const ROUND = 5;
const PER_Q_SECONDS = 10; // per-question time limit (anti-cheat / anti-share)
let round: Q[] = [];
let idx = 0;
let correct = 0;
let locked = false;
let roundStart = 0;            // for the server time-bonus
let qTimer: ReturnType<typeof setInterval> | undefined;
let qLeft = 0;

const elQ = $('#eq-question');
const elOpts = $('#eq-options');
const elMsg = $('#eq-message');
const elProg = $('#eq-progress');
const startBtn = $('#eq-start') as HTMLButtonElement;

// Build a round, then ramp it easy→hard. Tournaments lean on the harder tiers
// (mostly d2/d3) for integrity; free play stays mostly easy/medium.
function pickRound(): Q[] {
  const byTier = (d: 1 | 2 | 3): Q[] => shuffle(BANK.filter((q) => q.d === d));
  const want: (1 | 2 | 3)[] = host.isTournament
    ? [2, 2, 3, 3, 3]   // tournament: harder
    : [1, 1, 2, 2, 3];  // free: gentle ramp
  const pool = { 1: byTier(1), 2: byTier(2), 3: byTier(3) };
  const picked: Q[] = [];
  for (const d of want) {
    // Fall back to an adjacent tier if a tier runs dry.
    const q = pool[d].pop() ?? pool[3].pop() ?? pool[2].pop() ?? pool[1].pop();
    if (q && !picked.includes(q)) picked.push(q);
  }
  // Top up to ROUND if anything was short, then order easy → hard.
  for (const q of shuffle(BANK)) { if (picked.length >= ROUND) break; if (!picked.includes(q)) picked.push(q); }
  return picked.slice(0, ROUND).sort((a, b) => a.d - b.d);
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

function setHUD(): void {
  $('#eq-cost').textContent = host.costCoins > 0 ? `${host.costCoins} 🪙` : '🆓';
  $('#eq-win').textContent = `+${host.winPoints}`;
  for (const id of ['eq-title', 'eq-title2']) $(`#${id}`).textContent = s('title');
}

function renderTournament(): void {
  const strip = $('#eq-tourney');
  if (!host.isTournament || !host.tournament) { strip.style.display = 'none'; return; }
  const title = getLang() === 'am' ? host.tournament.titleAm : host.tournament.titleEn;
  $('#eq-t-name').textContent = `${title}`;
  const standing = host.standing();
  $('#eq-rank').textContent = standing ? `#${standing.rank}` : '#—';
}

async function startRound(): Promise<void> {
  const begin = await host.begin();
  if (!begin.ok) {
    elMsg.textContent = begin.reason === 'auth' ? s('signIn') : s('needCoins');
    return;
  }
  setHUD();
  round = pickRound();
  idx = 0; correct = 0; locked = false; roundStart = Date.now();
  startBtn.style.display = 'none';
  showQuestion();
}

function clearQTimer(): void { if (qTimer) { clearInterval(qTimer); qTimer = undefined; } }
function startQTimer(): void {
  qLeft = PER_Q_SECONDS;
  renderProg();
  qTimer = setInterval(() => { qLeft--; renderProg(); if (qLeft <= 0) timeUp(); }, 1000);
}
function renderProg(): void {
  elProg.textContent = `${s('q')} ${idx + 1} / ${round.length}  ·  ⏱ ${Math.max(0, qLeft)}s`;
}
function timeUp(): void {
  if (locked) return;
  locked = true;
  clearQTimer();
  elMsg.textContent = s('timeup'); // no answer reveal — anti-cheat
  setTimeout(() => { idx++; if (idx < round.length) showQuestion(); else finishRound(); }, 900);
}

function showQuestion(): void {
  locked = false;
  elMsg.textContent = '';
  const q = round[idx];
  elQ.textContent = lang() === 'am' ? q.am : q.en;
  // present options in shuffled order, remembering which is correct
  const order = shuffle(q.opts.map((_, i) => i));
  elOpts.innerHTML = order.map((oi) =>
    `<button class="eq-opt" data-i="${oi}">${lang() === 'am' ? q.opts[oi][1] : q.opts[oi][0]}</button>`).join('');
  elOpts.querySelectorAll<HTMLButtonElement>('.eq-opt').forEach((b) =>
    b.addEventListener('click', () => answer(Number(b.dataset.i), b)));
  startQTimer();
}

function answer(choice: number, btn: HTMLButtonElement): void {
  if (locked) return;
  locked = true;
  clearQTimer();
  const q = round[idx];
  const right = choice === q.answer;
  if (right) { correct++; btn.classList.add('ok'); sfx.coin(); }
  else {
    btn.classList.add('bad'); sfx.click();
    // Tournament integrity: do NOT reveal the correct answer (replay/share-proof).
    if (!host.isTournament) {
      const correctBtn = elOpts.querySelector<HTMLButtonElement>(`.eq-opt[data-i="${q.answer}"]`);
      correctBtn?.classList.add('ok');
    }
  }
  elMsg.textContent = right ? s('correct') : s('wrong');
  setTimeout(() => {
    idx++;
    if (idx < round.length) showQuestion();
    else finishRound();
  }, 1100);
}

function finishRound(): void {
  const score = correct * 20;
  const isWin = correct >= 3;
  elProg.textContent = '';
  elQ.textContent = `${s('result')} ${correct} ${s('of')} ${round.length}`;
  elOpts.innerHTML = '';
  elMsg.textContent = isWin ? `🎉 +${host.winPoints} ⭐` : '';
  startBtn.textContent = s('again');
  startBtn.style.display = '';
  const timeMs = Date.now() - roundStart;
  void host.finish(score, isWin, timeMs).then((res) => {
      if (host.isTournament && res.rank) $('#eq-rank').textContent = `#${res.rank}`;
    });
}

function applyLang(): void {
  applyTranslations();
  setHUD();
  renderTournament();
  void host.refreshBoard().then(renderTournament); // real server standing, no simulation
  startBtn.textContent = s('start');
}

function pick(l: Lang): void { setLang(l); document.documentElement.lang = l; applyLang(); syncLang(); }
function syncLang(): void {
  $('#langEn').classList.toggle('active', getLang() === 'en');
  $('#langAm').classList.toggle('active', getLang() === 'am');
}

$('#langEn').addEventListener('click', () => pick('en'));
$('#langAm').addEventListener('click', () => pick('am'));
startBtn.addEventListener('click', () => { void startRound(); });

applyLang();
syncLang();
