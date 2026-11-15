import { SAMPLES, sampleSvg } from '../data/samples.js';
import { esc } from './dom.js';

const SRC = {
  cdc: 'https://chadd.org/about-adhd/general-prevalence-adults/',
  tax: 'https://add.org/adhd-tax/',
};

export function renderHome() {
  const demo = SAMPLES[0];
  return `
  <section class="hero">
    <div class="wrap hero-grid">
      <div>
        <span class="tag">For ADHD brains · free · no sign-up</span>
        <h1>Snap a bill.<br>Get <span class="hl">one tiny step.</span></h1>
        <p class="lede">Billo turns the bill you’ve been avoiding into 1–3 two-minute steps, reminds you on the right day, and celebrates every win. No budgets. No spreadsheets.</p>
        <div class="cta-row">
          <a class="btn btn-primary btn-lg" href="#/scan">📸 Snap a bill</a>
          <a class="btn btn-ghost btn-lg" href="#/scan/power">Try a sample</a>
        </div>
        <p class="fine mt-16">Works in your browser. Bills stay on your device.</p>
      </div>
      <div class="phone" aria-label="Example">
        <div class="mini-bill"><img src="${esc(sampleSvg(demo))}" alt="Sample power bill"></div>
        <div class="arrow">↓</div>
        <div class="step first" style="grid-template-columns:36px 1fr;padding:12px">
          <span class="check" style="width:32px;height:32px;cursor:default"></span>
          <div><h3 style="font-size:16px">Pay $142.37 today</h3><p style="font-size:14px">Due in 2 days. Takes 2 minutes and avoids a late fee.</p></div>
        </div>
      </div>
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
