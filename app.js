import {
  categories,
  categoryCounts,
  DEFAULT_STATE,
  normalizeProducts,
  pageProducts,
  processProducts,
  sanitizeState
} from './app-core.mjs';

let DB = [];

const STORAGE_KEY = 'inventario_state_v2';
const STORE_KEYS = ['Name_pt', 'Categoria_Alimentos', 'Cod_Fresco', 'Cod_Mix'];

const els = {
  alert: document.getElementById('app-alert'),
  app: document.getElementById('app'),
  banner: document.getElementById('install-banner'),
  bar: document.getElementById('splash-bar'),
  clearSearch: document.getElementById('search-clear'),
  count: document.getElementById('cnt'),
  footer: document.getElementById('pag-footer'),
  installButton: document.getElementById('install-btn'),
  installDismiss: document.getElementById('install-dismiss'),
  search: document.getElementById('search-input'),
  seg: document.getElementById('seg'),
  splash: document.getElementById('splash'),
  themeLabel: document.getElementById('theme-label'),
  themeToggle: document.getElementById('theme-toggle'),
  tbody: document.getElementById('tbody'),
  viewAll: document.getElementById('vt-all'),
  viewPages: document.getElementById('vt-pages')
};

let S = loadState();

const badgeCls = category => ({
  Frutas: 'bf',
  'Hortaliças': 'bh',
  'Tubérculos': 'bt',
  'Proteínas': 'bp'
}[category] || 'bd');

function loadState() {
  try {
    const storedState = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    const storedTheme = localStorage.getItem('inventario_tema');
    return sanitizeState({ ...storedState, tema: storedState.tema || storedTheme });
  } catch {
    return { ...DEFAULT_STATE };
  }
}

function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(S));
    localStorage.setItem('inventario_tema', S.tema);
  } catch {
    // Storage can be disabled in private or restricted browser contexts.
  }
}

function debounce(fn, wait) {
  let timer;
  return (...args) => {
    window.clearTimeout(timer);
    timer = window.setTimeout(() => fn(...args), wait);
  };
}

const saveAndRenderSoon = debounce(() => {
  saveState();
  render();
}, 120);

function showApp() {
  els.bar.style.width = '100%';
  window.setTimeout(() => {
    els.splash.classList.add('hidden');
    els.app.classList.add('visible');
  }, 180);
}

function setAlert(message = '') {
  els.alert.textContent = message;
  els.alert.hidden = !message;
}

function updateSearchClear() {
  els.clearSearch.hidden = !S.q;
}

function updateViewButtons() {
  els.viewAll.classList.toggle('active', S.all);
  els.viewPages.classList.toggle('active', !S.all);
  els.viewAll.setAttribute('aria-pressed', String(S.all));
  els.viewPages.setAttribute('aria-pressed', String(!S.all));
}

function updateTheme() {
  document.documentElement.dataset.theme = S.tema;
  const isDark = S.tema === 'escuro';
  els.themeToggle.setAttribute('aria-pressed', String(isDark));
  els.themeToggle.setAttribute('aria-label', isDark ? 'Ativar modo claro' : 'Ativar modo escuro');
  els.themeLabel.textContent = isDark ? 'Claro' : 'Escuro';
}

function textNode(value) {
  return document.createTextNode(String(value));
}

function createSvgButton(className, id, label, pathD, disabled = false) {
  const button = document.createElement('button');
  button.className = className;
  button.id = id;
  button.type = 'button';
  button.disabled = disabled;
  button.setAttribute('aria-label', label);
  button.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.2">
      <path stroke-linecap="round" stroke-linejoin="round" d="${pathD}"></path>
    </svg>`;
  return button;
}

function codeCellValue(value) {
  return value === null || value === undefined || value === '' ? '--' : value;
}

function renderRows(rows) {
  if (!rows.length) {
    const row = document.createElement('tr');
    row.className = 'empty';
    const cell = document.createElement('td');
    cell.colSpan = 4;
    cell.textContent = 'Nenhum resultado encontrado.';
    row.append(cell);
    els.tbody.replaceChildren(row);
    return;
  }

  const fragment = document.createDocumentFragment();

  rows.forEach((product, index) => {
    const row = document.createElement('tr');
    row.style.animationDelay = `${Math.min(index, 25) * 20}ms`;

    const nameCell = document.createElement('td');
    nameCell.className = 'col-product';
    const cellName = document.createElement('div');
    cellName.className = 'cell-name';

    const avatar = document.createElement('div');
    avatar.className = 'avatar';
    avatar.textContent = product.Inicial_Nome;

    const name = document.createElement('span');
    name.className = 'pname';
    name.textContent = product.Name_pt;

    cellName.append(avatar, name);
    nameCell.append(cellName);

    const categoryCell = document.createElement('td');
    categoryCell.className = 'col-category';
    const badge = document.createElement('span');
    badge.className = `badge ${badgeCls(product.Categoria_Alimentos)}`;
    badge.textContent = product.Categoria_Alimentos;
    categoryCell.append(badge);

    const frescoCell = document.createElement('td');
    frescoCell.className = 'col-code r';
    const frescoCode = document.createElement('span');
    frescoCode.className = product.Cod_Fresco === null ? 'mn' : 'mono mc';
    frescoCode.textContent = codeCellValue(product.Cod_Fresco);
    frescoCell.append(frescoCode);

    const mixCell = document.createElement('td');
    mixCell.className = 'col-code col-mix r';
    const mixCode = document.createElement('span');
    mixCode.className = product.Cod_Mix === null ? 'mn' : 'mono ms mix-code';
    mixCode.textContent = codeCellValue(product.Cod_Mix);
    mixCell.append(mixCode);

    row.append(nameCell, categoryCell, frescoCell, mixCell);
    fragment.append(row);
  });

  els.tbody.replaceChildren(fragment);
}

function renderFooter(data, totalPages) {
  if (S.all) {
    const badge = document.createElement('div');
    badge.className = 'all-badge';
    const dot = document.createElement('span');
    dot.className = 'dot';
    badge.append(dot, textNode(`Mostrando todos os ${data.length} itens`));
    els.footer.replaceChildren(badge, document.createElement('span'));
    return;
  }

  const info = document.createElement('span');
  info.className = 'pag-info';
  info.textContent = `Página ${S.pg} de ${totalPages} · ${data.length} itens`;

  const buttons = document.createElement('div');
  buttons.className = 'pag-btns';

  const prev = createSvgButton('pb', 'prev-btn', 'Página anterior', 'M15 19l-7-7 7-7', S.pg <= 1);
  const next = createSvgButton('pb', 'next-btn', 'Próxima página', 'M9 5l7 7-7 7', S.pg >= totalPages);

  prev.addEventListener('click', () => {
    S.pg -= 1;
    saveState();
    render();
  });

  next.addEventListener('click', () => {
    S.pg += 1;
    saveState();
    render();
  });

  buttons.append(prev, next);
  els.footer.replaceChildren(info, buttons);
}

function renderSortHeaders() {
  document.querySelectorAll('th[data-k]').forEach(th => {
    const key = th.dataset.k;
    const isRightAligned = key === 'Cod_Fresco' || key === 'Cod_Mix';
    const baseClass = {
      Name_pt: 'col-product',
      Categoria_Alimentos: 'col-category',
      Cod_Fresco: 'col-code',
      Cod_Mix: 'col-code col-mix'
    }[key] || '';
    th.className = `${baseClass} ${isRightAligned ? 'r' : ''} ${key === S.sk ? `sorted ${S.sd}` : ''}`.trim();
    th.setAttribute('aria-sort', key === S.sk ? (S.sd === 'asc' ? 'ascending' : 'descending') : 'none');
  });
}

function renderSeg() {
  const counts = categoryCounts(DB);
  const fragment = document.createDocumentFragment();

  categories(DB).forEach(category => {
    const button = document.createElement('button');
    button.className = `seg-btn${category === S.cat ? ' active' : ''}`;
    button.type = 'button';
    button.dataset.c = category;
    button.setAttribute('aria-pressed', String(category === S.cat));

    const label = document.createElement('span');
    label.textContent = category;

    const count = document.createElement('span');
    count.className = 'seg-count';
    count.textContent = counts[category] ?? 0;

    button.append(label, count);
    fragment.append(button);
  });

  els.seg.replaceChildren(fragment);
}

function render() {
  S = sanitizeState(S, categories(DB));
  const data = processProducts(DB, S);
  const page = pageProducts(data, S);
  S.pg = page.currentPage;

  els.count.textContent = data.length;
  renderRows(page.rows);
  renderFooter(data, page.totalPages);
  renderSortHeaders();
  updateSearchClear();
  updateViewButtons();
  updateTheme();
}

function bindEvents() {
  els.search.addEventListener('input', event => {
    S.q = event.target.value;
    S.pg = 1;
    updateSearchClear();
    saveAndRenderSoon();
  });

  els.clearSearch.addEventListener('click', () => {
    S.q = '';
    S.pg = 1;
    els.search.value = '';
    updateSearchClear();
    saveState();
    render();
    els.search.focus();
  });

  els.seg.addEventListener('click', event => {
    const button = event.target.closest('.seg-btn');
    if (!button) return;
    S.cat = button.dataset.c;
    S.pg = 1;
    saveState();
    renderSeg();
    render();
  });

  document.querySelectorAll('th[data-k]').forEach(th => {
    const sort = () => {
      const key = th.dataset.k;
      if (!STORE_KEYS.includes(key)) return;
      S.sd = S.sk === key ? (S.sd === 'asc' ? 'desc' : 'asc') : 'asc';
      S.sk = key;
      saveState();
      render();
    };

    th.addEventListener('click', sort);
    th.addEventListener('keydown', event => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        sort();
      }
    });
  });

  els.viewPages.addEventListener('click', () => {
    S.all = false;
    S.pg = 1;
    saveState();
    render();
  });

  els.viewAll.addEventListener('click', () => {
    S.all = true;
    saveState();
    render();
  });

  els.themeToggle.addEventListener('click', () => {
    S.tema = S.tema === 'escuro' ? 'claro' : 'escuro';
    saveState();
    updateTheme();
  });

  window.addEventListener('beforeinstallprompt', event => {
    event.preventDefault();
    window.deferredInstallPrompt = event;
    els.banner.classList.add('visible');
  });

  els.installButton.addEventListener('click', async () => {
    if (!window.deferredInstallPrompt) return;
    window.deferredInstallPrompt.prompt();
    await window.deferredInstallPrompt.userChoice;
    window.deferredInstallPrompt = null;
    els.banner.classList.remove('visible');
  });

  els.installDismiss.addEventListener('click', () => els.banner.classList.remove('visible'));
}

async function loadProducts() {
  const response = await fetch('data.json', { cache: 'no-cache' });
  if (!response.ok) throw new Error(`Falha ao carregar data.json: ${response.status}`);
  const rawProducts = await response.json();
  const products = normalizeProducts(rawProducts);
  if (!products.length) throw new Error('data.json não contém produtos válidos');
  return products;
}

function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;

  navigator.serviceWorker.register('service-worker.js').catch(error => {
    console.warn('Falha ao registrar o service worker:', error);
  });
}

async function init() {
  bindEvents();
  updateTheme();

  try {
    DB = await loadProducts();
    S = sanitizeState(S, categories(DB));
  } catch (error) {
    console.error(error);
    DB = [];
    S = sanitizeState(S);
    setAlert('Não foi possível carregar os produtos. Verifique o arquivo data.json e tente novamente.');
  }

  renderSeg();
  els.search.value = S.q;
  render();
  registerServiceWorker();
  showApp();
}

init();
