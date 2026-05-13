import assert from 'node:assert/strict';
import {
  categoryCounts,
  normalizeProducts,
  pageProducts,
  processProducts,
  sanitizeState
} from '../app-core.mjs';

const products = normalizeProducts([
  {
    id: 1,
    Name_pt: 'Maçã Gala',
    Cod_Fresco: '3',
    Cod_Mix: 399,
    Categoria_Alimentos: 'Frutas'
  },
  {
    id: 2,
    Name_pt: 'Alface hidropônica',
    Cod_Fresco: 4564,
    Cod_Mix: null,
    Inicial_Nome: 'A',
    Categoria_Alimentos: 'Hortaliças'
  },
  {
    id: 3,
    Name_pt: '',
    Cod_Fresco: 10,
    Cod_Mix: 11,
    Categoria_Alimentos: 'Frutas'
  }
]);

assert.equal(products.length, 2);
assert.equal(products[0].Inicial_Nome, 'M');
assert.equal(products[0].Cod_Fresco, 3);
assert.equal(products[1].Inicial_Nome, 'A');

assert.deepEqual(categoryCounts(products), {
  Todas: 2,
  Frutas: 1,
  Hortaliças: 1
});

const sanitized = sanitizeState(
  { q: ' hidroponico ', cat: 'Inexistente', sk: 'bad', sd: 'sideways', pg: -5, all: 1 },
  ['Todas', 'Frutas']
);

assert.deepEqual(sanitized, {
  q: 'hidroponico',
  cat: 'Todas',
  sk: 'Name_pt',
  sd: 'asc',
  pg: 1,
  all: true,
  tema: 'claro'
});

const searchResults = processProducts(products, {
  q: 'hidroponica',
  cat: 'Todas',
  sk: 'Name_pt',
  sd: 'asc'
});

assert.equal(searchResults.length, 1);
assert.equal(searchResults[0].Name_pt, 'Alface hidropônica');

const descByCode = processProducts(products, {
  q: '',
  cat: 'Todas',
  sk: 'Cod_Fresco',
  sd: 'desc'
});

assert.equal(descByCode[0].Cod_Fresco, 4564);
assert.equal(descByCode[1].Cod_Fresco, 3);

const page = pageProducts(products, { pg: 99, all: false });
assert.equal(page.currentPage, 1);
assert.equal(page.totalPages, 1);
assert.equal(page.rows.length, 2);

console.log('app-core tests passed');
