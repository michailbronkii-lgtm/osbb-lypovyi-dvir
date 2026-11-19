'use strict';
const find = selector => document.querySelector(selector);
const all = selector => Array.from(document.querySelectorAll(selector));
const page = document.body.dataset.page;
const theme = find('#theme');
theme.value = localStorage.getItem('dvir-theme') || 'auto';
function updateTheme() {
  document.documentElement.dataset.theme = theme.value;
  localStorage.setItem('dvir-theme', theme.value);
}
updateTheme();
theme.addEventListener('change', updateTheme);

const filters = all('[data-filter]');
function filterNews(value) {
  const chosen = filters.find(button => button.dataset.filter === value);
  if (!chosen) return;
  filters.forEach(button => button.setAttribute('aria-pressed', String(button === chosen)));
  all('.door').forEach(door => door.classList.toggle('selected', door.classList.contains('door' + value)));
  let count = 0;
  all('[data-entry]').forEach(entry => {
    entry.hidden = !['0', value].includes(entry.dataset.entry) && value !== '0';
    if (!entry.hidden) count++;
  });
  find('.filter-result').textContent = chosen.textContent + ' · ' + count + (count === 1 ? ' оголошення' : ' оголошення');
}
filters.forEach(button => button.addEventListener('click', () => filterNews(button.dataset.filter)));
if (filters.length) filterNews('0');

const play = find('#play');
if (play) {
  const scene = find('.scene');
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const month = new Date().getMonth();
  scene.style.setProperty('--leaves', ['#a2afa2','#a2afa2','#a6b887','#a6b887','#97b46f','#81965b','#81965b','#81965b','#ac9b56','#b6924c','#ae955d','#a2afa2'][month]);
  let timer;
  function stopScene() {
    clearTimeout(timer);
    scene.classList.remove('playing');
    play.disabled = motion.matches;
    play.textContent = motion.matches ? 'Статичне подвір’я' : '▷ Оживити двір';
  }
  play.addEventListener('click', () => {
    if (scene.classList.contains('playing') || motion.matches) return stopScene();
    scene.classList.add('playing');
    play.textContent = '□ Зупинити';
    timer = setTimeout(stopScene, 15000);
  });
  motion.addEventListener('change', stopScene);
  stopScene();
}
const session = sessionStorage;
const gate = find('.gate');
function showDemo() {
  if (!gate) return;
  const signedIn = session.getItem('dvir-demo') === 'open';
  gate.hidden = signedIn;
  find('.demo-content').hidden = !signedIn;
  document.body.classList.toggle('form-page', signedIn && ['request','meters','pay'].includes(page));
}
if (gate) {
  showDemo();
  find('#login').addEventListener('click', () => {
    session.setItem('dvir-demo','open');
    showDemo();
    find('main').focus();
  });
}
function makeLink(text, path) {
  const link = document.createElement('a');
  link.textContent = text;
  link.href = path;
  return link;
}
function receipt(month) {
  const content = 'Демо · Тестова квитанція\nОСББ «Липовий двір»\n' + month + ' 2026\nВнесок: 480,00 грн\nПлатіж отримано';
  const link = makeLink('Завантажити квитанцію', 'data:text/plain;charset=utf-8,' + encodeURIComponent(content));
  link.download = 'Демо-квитанція-' + month + '.txt';
  return link;
}
const paymentKey = 'dvir-payment';
if (page === 'pay') {
  const box = find('#payment-state');
  function showPayment() {
    const state = session.getItem(paymentKey);
    find('#pay-summary').hidden = Boolean(state);
    if (!state) return;
    box.replaceChildren();
    const title = document.createElement('h2');
    title.textContent = state === 'pending' ? 'Перевіряємо платіж. Повторно сплачувати не потрібно' : 'Платіж отримано';
    box.append(title);
    if (state === 'paid') {
      box.append(receipt('Жовтень'));
    } else {
      const check = document.createElement('button');
      check.textContent = 'Перевірити стан';
      check.onclick = () => { session.setItem(paymentKey, 'paid'); showPayment(); };
      box.append(check);
    }
  }
  find('#pay').onclick = () => {session.setItem(paymentKey,'pending'); showPayment();};
  find('#copy').onclick = async event => {
    const button = event.currentTarget;
    try { await navigator.clipboard.writeText('Демо · ОСББ «Липовий двір» · [реквізити уточнюються]'); button.textContent = 'Реквізити скопійовано'; }
    catch { button.textContent = 'Виділіть і скопіюйте реквізити вище'; }
  };
  showPayment();
}
if (page === 'account' && session.getItem(paymentKey) === 'paid') {
  find('#balance-title').textContent = 'Усе сплачено';
  find('#balance').textContent = '0,00 грн';
  find('a[href="pay.html"]').hidden = true;
}
if (page === 'receipts') setTimeout(() => {
  const box = find('#receipts');
  box.replaceChildren();
  const months = session.getItem(paymentKey) === 'paid' ? ['Жовтень','Вересень'] : ['Вересень'];
  for (const month of months) {
    const row = document.createElement('article');
    const title = document.createElement('h2');
    title.textContent = month + ' 2026 · 480,00 грн';
    row.append(title,receipt(month));
    box.append(row);
  }
}, 650);
const ticketsKey = 'dvir-tickets';
const tickets = () => JSON.parse(session.getItem(ticketsKey) || '[]');
if (page === 'request') {
  const form = find('#request');
  const {place, entrance, description} = form.elements;
  place.onchange = () => { find('#entrance-field').hidden = place.value !== 'Під’їзд'; };
  form.onsubmit = event => {
    event.preventDefault();
    const error = find('#request-error');
    error.hidden = true;
    const missingEntrance = place.value === 'Під’їзд' && !entrance.value;
    if (missingEntrance || !description.value.trim() || !navigator.onLine) {
      error.textContent = missingEntrance ? 'Вкажіть, у якому під’їзді виникла проблема' : !description.value.trim() ? 'Опишіть, що сталося.' : 'Зв’язок перервався. Текст заявки залишився у формі';
      error.hidden = false;
      (missingEntrance ? entrance : description).focus();
      if (!navigator.onLine) form.querySelector('button').textContent = 'Спробувати ще раз';
      return;
    }
    const list = tickets();
    const id = 104 + list.length;
    list.push({id,place:place.value + (place.value === 'Під’їзд' ? ' ' + entrance.value : ''),description:description.value.trim(),date:new Date().toLocaleDateString('uk-UA')});
    session.setItem(ticketsKey, JSON.stringify(list));
    form.hidden = true;
    const result = find('#request-state');
    result.textContent = 'Заявку № ' + id + ' прийнято. Відповідь правління з’явиться тут. ';
    result.append(makeLink('Переглянути заявку','requests.html'));
    result.tabIndex = -1;
    result.focus();
  };
}
if (page === 'requests' && tickets().length) {
  const box = find('#tickets');
  box.replaceChildren(makeLink('Подати заявку','request.html'));
  for (const item of tickets().reverse()) {
    const row = document.createElement('article');
    row.className = 'row';
    const title = document.createElement('h2');
    title.textContent = 'Заявку № ' + item.id + ' прийнято';
    const text = document.createElement('p');
    text.textContent = item.description;
    const date = document.createElement('small');
    date.textContent = item.date + ' · ' + item.place + ' · Відповідь правління з’явиться тут';
    row.append(title,text,date);
    box.append(row);
  }
}
if (page === 'meters') {
  const meter = find('#meter');
  const reading = meter.elements.reading;
  function updateReading(value) {reading.min = value; find('#previous').textContent = value;}
  updateReading(session.getItem('dvir-meter') || '120');
  meter.onsubmit = event => {
    event.preventDefault();
    session.setItem('dvir-meter',reading.value);
    updateReading(reading.value);
    find('#meter-result').textContent = 'Показання передано · ' + reading.value + ' м³';
    reading.value = '';
  };
}
