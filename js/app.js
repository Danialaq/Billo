// App shell: hash router.

import { mountHome } from './ui/home.js';
import { mountScan, mountBillPage } from './ui/scan.js';
import { mountToday } from './ui/today.js';
import { mountQuiz, mountLeaks, mountPlus } from './ui/quiz.js';
import { todayQueue } from './engine/steps.js';
import { todayISO } from './engine/dates.js';
import { refreshSteps } from './ui/bill-view.js';
import * as store from './store.js';

const root = document.getElementById('app');

function go(hash) {
  if (window.location.hash === hash) route();
  else window.location.hash = hash;
}

function updateNav(name) {
  document.querySelectorAll('.nav a').forEach((a) => a.classList.toggle('active', a.dataset.nav === name));
  const s = store.state();
  s.bills.forEach((r) => refreshSteps(r));
  const count = todayQueue(s.bills, todayISO()).length;
  const dot = document.getElementById('today-count');
  dot.textContent = String(count);
  dot.classList.toggle('hide', !count);
}

function route() {
  root.onclick = null;
  root.onchange = null;
  root.oninput = null;
  const [, page = '', param] = window.location.hash.split('/');
  let nav = '';
  if (page === 'scan') { mountScan(root, { go, sampleKey: param }); nav = 'scan'; }
  else if (page === 'bill') { mountBillPage(root, { id: param, go }); nav = 'today'; }
  else if (page === 'today') { mountToday(root); nav = 'today'; }
  else if (page === 'quiz') { mountQuiz(root, { go }); nav = 'quiz'; }
  else if (page === 'leaks') { mountLeaks(root); nav = 'quiz'; }
  else if (page === 'plus') { mountPlus(root, { go }); nav = 'plus'; }
  else { mountHome(root); nav = 'home'; }
  updateNav(nav);
  window.scrollTo(0, 0);
}

window.addEventListener('hashchange', route);
route();
