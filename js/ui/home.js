import { SAMPLES, sampleFields } from '../data/samples.js';
import { formatDate } from '../engine/dates.js';
import { esc } from './dom.js';

const SRC = {
  cdc: 'https://chadd.org/about-adhd/general-prevalence-adults/',
  tax: 'https://add.org/adhd-tax/',
};

// Low estimate of the yearly ADHD tax: 15.5M adults × $1,200 (CDC, ADDA) ≈ $590 every second.
const TAX_PER_SECOND = (15.5e6 * 1200) / (365 * 24 * 3600);

const ENVELOPES = [
  { who: 'Brightline Wireless', what: 'Your bill is ready', x: 0, y: 40, r: 6 },
  { who: 'Lone Star Power', what: 'Statement enclosed', x: 230, y: 10, r: -7 },
  { who: 'Riverside Medical', what: 'Patient balance', x: 20, y: 250, r: -8 },
  { who: 'StreamMax', what: 'Your plan renews soon', x: 250, y: 230, r: 5 },
  { who: 'City of Riverside', what: 'Parking violation', x: 130, y: 130, r: -3, hot: true },
];

function drawerHtml() {
  const ticket = SAMPLES.find((s) => s.key === 'ticket');
  const f = sampleFields(ticket);
  return `
  <div class="drawer" id="drawer" aria-label="Animated example: five unopened bills become one step">
    ${ENVELOPES.map((e, i) => `
      <button class="env ${e.hot ? 'hot' : ''}" style="--x:${e.x}px;--y:${e.y}px;--r:${e.r}deg;--i:${i}" aria-label="Open ${esc(e.who)}">
        <span class="flap"></span>
        <span class="to"><b>${esc(e.who)}</b>${esc(e.what)}</span>
        ${e.hot ? '<span class="stamp">FINAL NOTICE</span>' : ''}
      </button>`).join('')}
    <div class="dbill" aria-hidden="true">
      <span class="scanline"></span>
      <div class="org">${esc(f.payee)}</div><div class="sub">Notice of parking violation</div>
      <div class="row"><span>Expired meter · 412 Main St</span><span>$65.00</span></div>
      <div class="row"><span>Penalty if unpaid after due date</span><span class="hlx">+$65.00<i class="box" style="--d:2"><em>LATE FEE ✓</em></i></span></div>
      <div class="total"><span>Amount due</span><b class="hlx">$65.00<i class="box" style="--d:0"><em>AMOUNT ✓</em></i></b></div>
      <div class="due"><span class="hlx">Due by ${esc(formatDate(f.dueDate))}<i class="box" style="--d:1"><em>3 DAYS LATE</em></i></span></div>
    </div>
    <div class="dstep" aria-hidden="true"><span class="ck"></span><div><small>Today · 5 min · words included</small><b>Pay $65 now and ask to drop the late fee</b></div></div>
    <div class="drawer-foot">
      <span class="drawer-label" id="drawer-label">Your drawer · 5 unopened · tap one</span>
      <span class="drawer-actions"><a class="btn btn-primary btn-sm" href="#/scan/ticket">Read it with AI →</a><button class="btn btn-quiet btn-sm" id="replay">↻ Replay</button></span>
    </div>
  </div>`;
}

export function renderHome() {
  return `
  <div class="ticker" role="note">
    <span>Since you opened this page, adults with ADHD in the U.S. lost</span>
    <span class="ticker-num" id="tax-num">$0</span>
    <span>to late fees, forgotten subscriptions &amp; overdrafts.</span>
    <a class="ticker-src" href="${SRC.tax}" target="_blank" rel="noopener">Low estimate: 15.5M adults × $1,200/yr</a>
  </div>
  <section class="hero">
    <div class="wrap hero-grid">
      <div>
        <span class="tag">For ADHD brains · free · no sign-up</span>
        <h1>Snap a bill.<br>Get <span class="hl">one tiny step.</span></h1>
        <p class="lede">Billo turns the bill you’ve been avoiding into 1–3 two-minute steps, reminds you on the right day, and celebrates every win. No budgets. No spreadsheets.</p>
        <div class="cta-row">
          <a class="btn btn-primary btn-lg" href="#/scan">📸 Snap a bill</a>
          <a class="btn btn-ghost btn-lg" href="#/quiz">Find my money leaks</a>
        </div>
        <p class="fine mt-16">Works in your browser. Bills stay on your device.</p>
      </div>
      ${drawerHtml()}
    </div>
  </section>

  <section class="block" style="padding-top:12px">
    <div class="wrap">
      <div class="stats">
        <div class="stat"><b>15.5M</b><span>U.S. adults live with ADHD — over half diagnosed as adults</span><br><a href="${SRC.cdc}" target="_blank" rel="noopener">CDC, 2024</a></div>
        <div class="stat"><b>$1,200–3,000</b><span>a year lost to the “ADHD tax”: late fees, forgotten subscriptions, impulse buys</span><br><a href="${SRC.tax}" target="_blank" rel="noopener">ADDA</a></div>
        <div class="stat"><b>40% vs 18%</b><span>of adults with ADHD paid overdraft fees in a year, vs. the general public</span><br><a href="${SRC.tax}" target="_blank" rel="noopener">Financial Health Network</a></div>
      </div>
    </div>
  </section>

  <section class="block">
    <div class="wrap">
      <div class="section-head"><h2>Budgets ask for discipline. Billo asks for one tap.</h2>
        <p>Budget apps fail ADHD brains because they need daily effort. Billo starts from the moment you freeze — a bill in your hand — and makes the next move obvious.</p></div>
      <div class="cards">
        <div class="card"><div class="num-badge">1</div><h3>Snap it</h3><p>Photo, PDF or screenshot. AI reads who, how much and when — you can fix anything it gets wrong.</p></div>
        <div class="card"><div class="num-badge">2</div><h3>Do one tiny step</h3><p>1–3 steps, each under 5 minutes, with the exact words to say when you need to call.</p></div>
        <div class="card"><div class="num-badge">3</div><h3>Come back to “Today”</h3><p>One thing a day, a streak, and a running total of late fees you didn’t pay.</p></div>
      </div>
    </div>
  </section>

  <section class="block">
    <div class="wrap">
      <div class="section-head"><h2>Try it on a real-looking bill</h2><p>Each sample goes through the same AI reading and step engine as your own bills.</p></div>
      <div class="samples">${SAMPLES.map((s) => `
        <a class="sample" href="#/scan/${esc(s.key)}" style="text-decoration:none;color:inherit"><span class="em">${s.emoji}</span><b>${esc(s.label)}</b><span>${esc(s.fields.payee)}</span></a>`).join('')}</div>
    </div>
  </section>

  <section class="block">
    <div class="wrap narrow center">
      <h2 style="font-size:clamp(28px,4vw,40px)">How much is your ADHD tax?</h2>
      <p class="muted" style="font-size:18px">Six taps. Your personal money-leak map in 60 seconds.</p>
      <a class="btn btn-primary btn-lg mt-16" href="#/quiz">Find my money leaks</a>
    </div>
  </section>

  <section class="block">
    <div class="wrap narrow faq">
      <div class="section-head"><h2>Questions</h2></div>
      <details><summary>Do I need an ADHD diagnosis?</summary><p>No. Billo is built for brains that freeze in front of bills — diagnosed, self-identified or just overwhelmed.</p></details>
      <details><summary>Does Billo connect to my bank?</summary><p>No, on purpose. No passwords, no bank links. You snap what lands in your mailbox or inbox, and Billo handles the rest.</p></details>
      <details><summary>What if the AI reads my bill wrong?</summary><p>Every number is editable, and Billo tells you when it isn’t sure. The AI only reads; the steps come from fixed rules, so the advice is consistent.</p></details>
      <details><summary>Is my data private?</summary><p>There’s no account. The photo is sent once to Google Gemini to read the text; your bills and progress are stored only in this browser.</p></details>
    </div>
  </section>`;
}

/** Starts the live counter and the drawer animation. Stops itself when the page changes. */
export function mountHome(root) {
  root.innerHTML = renderHome();
  const started = performance.now();
  const num = root.querySelector('#tax-num');
  const drawer = root.querySelector('#drawer');
  const label = root.querySelector('#drawer-label');
  const timers = [];
  const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  (function tick() {
    if (!num.isConnected) { timers.forEach(clearTimeout); return; }
    num.textContent = `$${Math.floor(((performance.now() - started) / 1000) * TAX_PER_SECOND).toLocaleString('en-US')}`;
    requestAnimationFrame(tick);
  }());

  const later = (fn, ms) => timers.push(setTimeout(() => { if (drawer.isConnected) fn(); }, ms));
  function play() {
    timers.splice(0).forEach(clearTimeout);
    drawer.className = 'drawer';
    if (reduce) { drawer.classList.add('s-done'); label.textContent = '1 bill · 1 tiny step'; return; }
    drawer.classList.add('s-stack');
    label.textContent = 'Picking the one that matters…';
    later(() => drawer.classList.add('s-open'), 750);
    later(() => { drawer.classList.add('s-bill'); label.textContent = 'AI reading the bill…'; }, 1400);
    later(() => drawer.classList.add('s-scan'), 1900);
    later(() => { drawer.classList.add('s-done'); label.textContent = '5 unopened bills → 1 tiny step'; }, 3600);
  }
  drawer.addEventListener('click', (e) => {
    if (e.target.closest('.env')) play();
    if (e.target.closest('#replay')) { drawer.className = 'drawer'; label.textContent = 'Your drawer · 5 unopened · tap one'; later(play, 900); }
  });
  later(play, 1800);
}
