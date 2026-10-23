import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { api } from './api';
import { categories as bundledCategories, products as bundledProducts } from './data';

const CatalogContext = createContext(null);

async function fetchAllProducts() {
  const items = [];
  for (let page = 1; ; page += 1) {
    const result = await api(`/products?limit=200&page=${page}`);
    items.push(...result.items);
    if (page >= result.pages) return items;
  }
}

// Renders instantly from the bundled catalogue, then swaps in live prices and
// stock from the API. If the API is unreachable the bundled data stays in place.
// `ready` turns true once the API has answered (or failed), so pages can tell
// "not loaded yet" apart from "does not exist".
export function CatalogProvider({ children }) {
  const [catalog, setCatalog] = useState({ products: bundledProducts, categories: bundledCategories, live: false, ready: false });

  useEffect(() => {
    let cancelled = false;
    Promise.all([api('/categories'), fetchAllProducts()])
      .then(([categories, products]) => {
        if (!cancelled) setCatalog(products.length ? { products, categories: categories.items, live: true, ready: true } : (c) => ({ ...c, ready: true }));
      })
      .catch(() => { if (!cancelled) setCatalog((current) => ({ ...current, ready: true })); });
    return () => { cancelled = true; };
  }, []);

  const value = useMemo(() => {
    const byId = new Map(catalog.products.map((product) => [product.id, product]));
    return {
      ...catalog,
      getProduct: (id) => byId.get(Number(id)),
      getCategory: (slug) => catalog.categories.find((category) => category.slug === slug),
    };
  }, [catalog]);

  return <CatalogContext.Provider value={value}>{children}</CatalogContext.Provider>;
}

export const useCatalog = () => useContext(CatalogContext);
