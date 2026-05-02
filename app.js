let DB = [];
const IPP = 10;
const STORAGE_KEY = 'inventario_state_v1';
let S = loadState();

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { q: '', cat: 'Todas', sk: 'Name_pt', sd: 'asc', pg: 1, all: false };
    return { q: '', cat: 'Todas', sk: 'Name_pt', sd: 'asc', pg: 1, all: false, ...JSON.parse(raw) };
  } catch {
    return { q: '', cat: 'Todas', sk: 'Name_pt', sd: 'asc', pg: 1, all: false };
  }
}

function saveState() { localStorage.setItem(STORAGE_KEY, JSON.stringify(S)); }

const badgeCls = c => ({ Frutas:'bf', Hortalizas:'bh', 'Tubérculos':'bt', 'Proteínas':'bp' }[c] || 'bd');
const cats = () => ['Todas', ...[...new Set(DB.map(d => d.Categoria_Alimentos))].sort()];

function normalizeState() {
  const validCats = new Set(cats());
  if (!validCats.has(S.cat)) S.cat = 'Todas';
  if (!['Name_pt', 'Categoria_Alimentos', 'Cod_Fresco', 'Cod_Mix'].includes(S.sk)) S.sk = 'Name_pt';
  if (!['asc', 'desc'].includes(S.sd)) S.sd = 'asc';
  if (!Number.isInteger(S.pg) || S.pg < 1) S.pg = 1;
  S.all = Boolean(S.all);
}

function proc() {
  let d = DB.filter(r => {
    const q = S.q.toLowerCase();
    return (r.Name_pt.toLowerCase().includes(q) || String(r.Cod_Fresco).includes(q) || (r.Cod_Mix !== null && String(r.Cod_Mix).includes(q)))
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
  document.getElementById('cnt').textContent = data.length;

  const tb = document.getElementById('tbody');
  if (!rows.length) tb.innerHTML = '<tr class="empty"><td colspan="4">Nenhum resultado encontrado.</td></tr>';
  else tb.innerHTML = rows.map((r,i) => `<tr style="animation-delay:${Math.min(i,25)*20}ms"><td><div class="cell-name"><div class="avatar">${r.Inicial_Nombre}</div><span class="pname">${r.Name_pt}</span></div></td><td><span class="badge ${badgeCls(r.Categoria_Alimentos)}">${r.Categoria_Alimentos}</span></td><td class="r"><span class="mono mc">${r.Cod_Fresco}</span></td><td class="r">${r.Cod_Mix!==null ? `<span class="mono ms">${r.Cod_Mix}</span>` : '<span class="mn">--</span>'}</td></tr>`).join('');

  const footer = document.getElementById('pag-footer');
  if (S.all) {
    footer.innerHTML = `<div class="all-badge"><span class="dot"></span>Mostrando todos os ${data.length} itens</div><span></span>`;
  } else {
    footer.innerHTML = `<span class="pag-info">Página ${S.pg} de ${tp} &nbsp;·&nbsp; ${data.length} itens</span><div class="pag-btns"><button class="pb" id="prev-btn" ${S.pg<=1?'disabled':''}><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.2"><path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7"/></svg></button><button class="pb" id="next-btn" ${S.pg>=tp?'disabled':''}><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7"/></svg></button></div>`;
    document.getElementById('prev-btn').addEventListener('click', () => { S.pg--; saveState(); render(); });
    document.getElementById('next-btn').addEventListener('click', () => { S.pg++; saveState(); render(); });
  }

  document.querySelectorAll('th[data-k]').forEach(th => {
    const k = th.dataset.k, isR = k==='Cod_Fresco'||k==='Cod_Mix';
    th.className = (isR?'r ':'') + (k===S.sk ? 'sorted '+S.sd : '');
    th.setAttribute('aria-sort', k===S.sk ? (S.sd==='asc'?'ascending':'descending') : 'none');
    if (!th.querySelector('.si')) th.innerHTML += '<span class="si">▾</span>';
  });
}

function renderSeg() {
  document.getElementById('seg').innerHTML = cats().map(c => `<button class="seg-btn${c===S.cat?' active':''}" data-c="${c}">${c}</button>`).join('');
}

function bindEvents() {
  document.getElementById('search-input').value = S.q;
  document.getElementById('search-input').addEventListener('input', e => { S.q=e.target.value; S.pg=1; saveState(); render(); });
  document.getElementById('seg').addEventListener('click', e => {
    const b = e.target.closest('.seg-btn'); if (!b) return;
    S.cat=b.dataset.c; S.pg=1; saveState();
    document.querySelectorAll('.seg-btn').forEach(x => x.classList.toggle('active', x===b));
    render();
  });
  document.querySelectorAll('th[data-k]').forEach(th => {
    const act = () => { const k=th.dataset.k; S.sd = S.sk===k ? (S.sd==='asc'?'desc':'asc') : 'asc'; S.sk=k; saveState(); render(); };
    th.addEventListener('click', act);
    th.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); act(); } });
  });
  document.getElementById('vt-pages').addEventListener('click', () => { S.all=false; S.pg=1; saveState(); document.getElementById('vt-pages').classList.add('active'); document.getElementById('vt-all').classList.remove('active'); render(); });
  document.getElementById('vt-all').addEventListener('click', () => { S.all=true; saveState(); document.getElementById('vt-all').classList.add('active'); document.getElementById('vt-pages').classList.remove('active'); render(); });

  let deferredPrompt;
  const banner = document.getElementById('install-banner');
  window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); deferredPrompt=e; banner.classList.add('visible'); });
  document.getElementById('install-btn').addEventListener('click', async () => { if (!deferredPrompt) return; deferredPrompt.prompt(); await deferredPrompt.userChoice; deferredPrompt=null; banner.classList.remove('visible'); });
  document.getElementById('install-dismiss').addEventListener('click', () => banner.classList.remove('visible'));
}

(async function init(){
  try {
    const res = await fetch('data.json', { cache: 'no-store' });
    if (!res.ok) throw new Error(`No se pudo cargar data.json: ${res.status}`);
    DB = await res.json();
  } catch (err) {
    console.error(err);
    document.getElementById('tbody').innerHTML = '<tr class="empty"><td colspan="4">Error al cargar inventario.</td></tr>';
    return;
  }

  normalizeState();
  renderSeg();
  bindEvents();
  if (S.all) {
    document.getElementById('vt-all').classList.add('active');
    document.getElementById('vt-pages').classList.remove('active');
  }
  saveState();
  render();
})();
