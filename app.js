let DB = [];

const STORAGE_KEY = 'inventario_state_v1';
const DEFAULT_STATE = { q: '', cat: 'Todas', sk: 'Name_pt', sd: 'asc', pg: 1, all: false };

// ═══════════════════════════ SPLASH ═══════════════════════════
const els = {
  app: document.getElementById('app'),
  banner: document.getElementById('install-banner'),
  bar: document.getElementById('splash-bar'),
  count: document.getElementById('cnt'),
  footer: document.getElementById('pag-footer'),
  installButton: document.getElementById('install-btn'),
  installDismiss: document.getElementById('install-dismiss'),
  search: document.getElementById('search-input'),
  seg: document.getElementById('seg'),
  splash: document.getElementById('splash'),
  tbody: document.getElementById('tbody'),
  viewAll: document.getElementById('vt-all'),
  viewPages: document.getElementById('vt-pages')
};

function showApp() {
  els.bar.style.width = '100%';
  window.setTimeout(() => {
    els.splash.classList.add('hidden');
    els.app.classList.add('visible');
  }, 180);
}

// ═══════════════════════════ STATE ═══════════════════════════
const IPP = 10;
let S = loadState();

const badgeCls = c => ({ Frutas:'bf', Hortalizas:'bh', 'Tubérculos':'bt', 'Proteínas':'bp' }[c] || 'bd');
const cats = () => ['Todas', ...[...new Set(DB.map(d => d.Categoria_Alimentos))].sort()];

function loadState() {
  try {
    return { ...DEFAULT_STATE, ...JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') };
  } catch {
    return { ...DEFAULT_STATE };
  }
}

function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(S));
  } catch {
    // Browsers can disable storage in private or restricted contexts.
  }
}

function esc(value) {
  return String(value).replace(/[&<>"']/g, char => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[char]));
}

function proc() {
  let d = DB.filter(r => {
    const q = S.q.toLowerCase();
    return (r.Name_pt.toLowerCase().includes(q) ||
            String(r.Cod_Fresco).includes(q) ||
            (r.Cod_Mix !== null && String(r.Cod_Mix).includes(q)))
        && (S.cat === 'Todas' || r.Categoria_Alimentos === S.cat);
  });
  d.sort((a,b) => {
    let av = a[S.sk], bv = b[S.sk];
    if (av===null && bv===null) return 0;
    if (av===null) return 1; if (bv===null) return -1;
    if (typeof av==='string') { av=av.toLowerCase(); bv=bv.toLowerCase(); }
    return av<bv ? (S.sd==='asc'?-1:1) : av>bv ? (S.sd==='asc'?1:-1) : 0;
  });
  return d;
}

function render() {
  const data = proc();
  const tp = Math.max(1, Math.ceil(data.length / IPP));
  if (S.pg > tp) S.pg = tp;
  const rows = S.all ? data : data.slice((S.pg-1)*IPP, S.pg*IPP);

  els.count.textContent = data.length;

  if (!rows.length) {
    els.tbody.innerHTML = '<tr class="empty"><td colspan="4">Nenhum resultado encontrado.</td></tr>';
  } else {
    els.tbody.innerHTML = rows.map((r,i) => `
      <tr style="animation-delay:${Math.min(i,25)*20}ms">
        <td><div class="cell-name">
          <div class="avatar">${esc(r.Inicial_Nombre)}</div>
          <span class="pname">${esc(r.Name_pt)}</span>
        </div></td>
        <td><span class="badge ${badgeCls(r.Categoria_Alimentos)}">${esc(r.Categoria_Alimentos)}</span></td>
        <td class="r"><span class="mono mc">${esc(r.Cod_Fresco)}</span></td>
        <td class="r">${r.Cod_Mix!==null ? `<span class="mono ms">${esc(r.Cod_Mix)}</span>` : '<span class="mn">--</span>'}</td>
      </tr>`).join('');
  }

  // Footer
  if (S.all) {
    els.footer.innerHTML = `
      <div class="all-badge"><span class="dot"></span>Mostrando todos os ${data.length} itens</div>
      <span></span>`;
  } else {
    els.footer.innerHTML = `
      <span class="pag-info">Página ${S.pg} de ${tp} &nbsp;·&nbsp; ${data.length} itens</span>
      <div class="pag-btns">
        <button class="pb" id="prev-btn" type="button" aria-label="Página anterior" ${S.pg<=1?'disabled':''}>
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7"/></svg>
        </button>
        <button class="pb" id="next-btn" type="button" aria-label="Próxima página" ${S.pg>=tp?'disabled':''}>
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7"/></svg>
        </button>
      </div>`;
    document.getElementById('prev-btn').addEventListener('click', () => { S.pg--; saveState(); render(); });
    document.getElementById('next-btn').addEventListener('click', () => { S.pg++; saveState(); render(); });
  }

  // Sort headers
  document.querySelectorAll('th[data-k]').forEach(th => {
    const k = th.dataset.k, isR = k==='Cod_Fresco'||k==='Cod_Mix';
    th.className = (isR?'r ':'') + (k===S.sk ? 'sorted '+S.sd : '');
    th.setAttribute('aria-sort', k===S.sk ? (S.sd==='asc' ? 'ascending' : 'descending') : 'none');
    if (!th.querySelector('.si')) th.innerHTML += '<span class="si">▾</span>';
  });
}

function renderSeg() {
  els.seg.innerHTML = cats().map(c =>
    `<button class="seg-btn${c===S.cat?' active':''}" type="button" data-c="${esc(c)}">${esc(c)}</button>`
  ).join('');
}

// Events
els.search.addEventListener('input', e => { S.q=e.target.value; S.pg=1; saveState(); render(); });

els.seg.addEventListener('click', e => {
  const b = e.target.closest('.seg-btn'); if (!b) return;
  S.cat=b.dataset.c; S.pg=1; saveState();
  document.querySelectorAll('.seg-btn').forEach(x => x.classList.toggle('active', x===b));
  render();
});

document.querySelectorAll('th[data-k]').forEach(th => {
  const sort = () => {
    const k=th.dataset.k;
    S.sd = S.sk===k ? (S.sd==='asc'?'desc':'asc') : 'asc';
    S.sk=k; saveState(); render();
  };
  th.addEventListener('click', sort);
  th.addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      sort();
    }
  });
});

els.viewPages.addEventListener('click', () => {
  S.all=false; S.pg=1; saveState();
  els.viewPages.classList.add('active');
  els.viewAll.classList.remove('active');
  render();
});
els.viewAll.addEventListener('click', () => {
  S.all=true; saveState();
  els.viewAll.classList.add('active');
  els.viewPages.classList.remove('active');
  render();
});

// PWA install
let deferredPrompt;
window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); deferredPrompt=e; els.banner.classList.add('visible'); });
els.installButton.addEventListener('click', async () => {
  if (!deferredPrompt) return;
  deferredPrompt.prompt(); await deferredPrompt.userChoice;
  deferredPrompt=null; els.banner.classList.remove('visible');
});
els.installDismiss.addEventListener('click', () => els.banner.classList.remove('visible'));

async function init() {
  try {
    const response = await fetch('data.json');
    if (!response.ok) throw new Error(`Failed to load data.json: ${response.status}`);
    DB = await response.json();
  } catch (error) {
    console.error(error);
    DB = [];
  }

  renderSeg();
  els.search.value = S.q;
  if (!cats().includes(S.cat)) S.cat = 'Todas';
  els.viewAll.classList.toggle('active', S.all);
  els.viewPages.classList.toggle('active', !S.all);
  render();
  showApp();
}

init();
