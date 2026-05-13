export const ITEMS_PER_PAGE = 10;

export const DEFAULT_STATE = {
  q: '',
  cat: 'Todas',
  sk: 'Name_pt',
  sd: 'asc',
  pg: 1,
  all: false,
  tema: 'claro'
};

const SORT_KEYS = new Set(['Name_pt', 'Categoria_Alimentos', 'Cod_Fresco', 'Cod_Mix']);

export function foldText(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim();
}

function cleanString(value) {
  return String(value ?? '').trim();
}

function cleanCode(value) {
  if (value === null || value === undefined || value === '') return null;
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : cleanString(value);
}

export function normalizeProducts(rawProducts) {
  if (!Array.isArray(rawProducts)) return [];

  return rawProducts.reduce((products, item, index) => {
    if (!item || typeof item !== 'object') return products;

    const name = cleanString(item.Name_pt);
    const category = cleanString(item.Categoria_Alimentos);
    if (!name || !category) return products;

    const initial = cleanString(item.Inicial_Nome ?? name[0]).slice(0, 2).toUpperCase();

    products.push({
      id: item.id ?? index + 1,
      Name_pt: name,
      Cod_Fresco: cleanCode(item.Cod_Fresco),
      Cod_Mix: cleanCode(item.Cod_Mix),
      Inicial_Nome: initial || name[0].toUpperCase(),
      Categoria_Alimentos: category
    });

    return products;
  }, []);
}

export function categories(products) {
  return ['Todas', ...[...new Set(products.map(product => product.Categoria_Alimentos))].sort()];
}

export function categoryCounts(products) {
  return products.reduce((counts, product) => {
    counts.Todas += 1;
    counts[product.Categoria_Alimentos] = (counts[product.Categoria_Alimentos] || 0) + 1;
    return counts;
  }, { Todas: 0 });
}

export function sanitizeState(value, validCategories = ['Todas']) {
  const next = { ...DEFAULT_STATE, ...(value && typeof value === 'object' ? value : {}) };
  next.q = cleanString(next.q);
  next.cat = validCategories.includes(next.cat) ? next.cat : DEFAULT_STATE.cat;
  next.sk = SORT_KEYS.has(next.sk) ? next.sk : DEFAULT_STATE.sk;
  next.sd = next.sd === 'desc' ? 'desc' : 'asc';
  next.pg = Number.isInteger(next.pg) && next.pg > 0 ? next.pg : DEFAULT_STATE.pg;
  next.all = Boolean(next.all);
  next.tema = next.tema === 'escuro' ? 'escuro' : 'claro';
  return next;
}

export function processProducts(products, state) {
  const query = foldText(state.q);

  const filtered = products.filter(product => {
    const matchesQuery = !query ||
      foldText(product.Name_pt).includes(query) ||
      foldText(product.Categoria_Alimentos).includes(query) ||
      String(product.Cod_Fresco ?? '').includes(query) ||
      String(product.Cod_Mix ?? '').includes(query);

    return matchesQuery && (state.cat === 'Todas' || product.Categoria_Alimentos === state.cat);
  });

  return filtered.sort((a, b) => compareValues(a[state.sk], b[state.sk], state.sd));
}

export function pageProducts(products, state) {
  const totalPages = Math.max(1, Math.ceil(products.length / ITEMS_PER_PAGE));
  const currentPage = Math.min(state.pg, totalPages);
  const rows = state.all
    ? products
    : products.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  return { currentPage, rows, totalPages };
}

function compareValues(a, b, direction) {
  if (a === null && b === null) return 0;
  if (a === null) return 1;
  if (b === null) return -1;

  const av = typeof a === 'string' ? foldText(a) : a;
  const bv = typeof b === 'string' ? foldText(b) : b;

  if (av < bv) return direction === 'asc' ? -1 : 1;
  if (av > bv) return direction === 'asc' ? 1 : -1;
  return 0;
}
