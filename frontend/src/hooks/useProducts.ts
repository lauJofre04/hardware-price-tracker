import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { apiFetch, leerError, type AuthFetch } from '../api';
import type { Budget, NewProduct, Product, ProductsPage, Shop } from '../types';

const POR_PAGINA = 12;

type Params = {
  token: string | null;
  authFetch: AuthFetch;
};

export function useProducts({ token, authFetch }: Params) {
  const [products, setProducts] = useState<Product[]>([]);
  const [shops, setShops] = useState<Shop[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [search, setSearchState] = useState('');
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [budget, setBudget] = useState<Budget>({ count: 0, total: 0 });

  // Solo se aplica la respuesta de la última petición (escribir rápido dispara varias a la vez)
  const ultimaPeticion = useRef(0);

  const refresh = useCallback(async () => {
    const id = ++ultimaPeticion.current;
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(POR_PAGINA), q: search });
      const res = await apiFetch(`/api/products?${params}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as ProductsPage;
      if (id !== ultimaPeticion.current) return;

      setProducts(data.items);
      setTotalPages(data.totalPages);
      setTotal(data.total);
      setBudget(data.budget);
      setError(null);
      // Si la página pedida ya no existe (se borró el último producto), el backend devuelve la última
      if (data.page !== page) setPage(data.page);
    } catch (e) {
      if (id !== ultimaPeticion.current) return;
      console.error('Error conectando a la API:', e);
      setError('No se pudo conectar con la API. Si el servidor estaba dormido, probá de nuevo en unos segundos.');
    } finally {
      if (id === ultimaPeticion.current) setLoading(false);
    }
  }, [page, search]);

  // Cambiar el filtro vuelve a la primera página
  const setSearch = useCallback((texto: string) => {
    setSearchState(texto);
    setPage(1);
  }, []);

  useEffect(() => {
    let cancelado = false;

    const cargarTiendas = async () => {
      try {
        const res = await apiFetch('/api/shops');
        if (res.ok && !cancelado) setShops((await res.json()) as Shop[]);
      } catch (e) {
        console.error('Error cargando tiendas:', e);
      }
    };

    void refresh();
    void cargarTiendas();
    return () => {
      cancelado = true;
    };
  }, [refresh]);

  // Cada acción devuelve true si salió bien, para que el componente decida qué cerrar o limpiar.
  const crear = useCallback(
    async (producto: NewProduct): Promise<boolean> => {
      try {
        const res = await authFetch('/api/products', { method: 'POST', body: producto });
        if (!res.ok) {
          toast.error(await leerError(res, 'No se pudo agregar el producto.'));
          return false;
        }
        await refresh();
        return true;
      } catch (e) {
        console.error('Error al agregar producto:', e);
        toast.error('Error de conexión. Revisá si el servidor está encendido.');
        return false;
      }
    },
    [authFetch, refresh]
  );

  const eliminar = useCallback(
    async (id: number): Promise<boolean> => {
      try {
        const res = await authFetch(`/api/products/${id}`, { method: 'DELETE' });
        if (!res.ok) {
          toast.error(await leerError(res, 'No se pudo eliminar el producto.'));
          return false;
        }
        await refresh();
        return true;
      } catch (e) {
        console.error('Error al eliminar:', e);
        toast.error('Error de conexión al eliminar el producto.');
        return false;
      }
    },
    [authFetch, refresh]
  );

  const actualizarUrl = useCallback(
    async (id: number, url: string): Promise<boolean> => {
      try {
        const res = await authFetch(`/api/products/${id}`, { method: 'PUT', body: { product_url: url } });
        if (!res.ok) {
          toast.error(await leerError(res, 'No se pudo actualizar el enlace.'));
          return false;
        }
        await refresh();
        return true;
      } catch (e) {
        console.error('Error al actualizar el enlace:', e);
        toast.error('Error de conexión al actualizar el enlace.');
        return false;
      }
    },
    [authFetch, refresh]
  );

  const alternarSeleccion = useCallback(
    async (id: number): Promise<void> => {
      if (!token) {
        toast.error('Iniciá sesión para seleccionar productos en el presupuesto.');
        return;
      }
      try {
        const res = await authFetch(`/api/products/${id}/toggle-selection`, { method: 'PUT' });
        if (!res.ok) {
          toast.error(await leerError(res, 'No se pudo actualizar la selección.'));
          return;
        }
        const data = (await res.json()) as { is_selected: boolean };
        const producto = products.find((p) => p.product_id === id);
        const precio = Number(producto?.last_price);
        const delta = data.is_selected ? 1 : -1;
        setProducts((prev) => prev.map((p) => (p.product_id === id ? { ...p, is_selected: data.is_selected } : p)));
        setBudget((b) => ({ count: b.count + delta, total: b.total + (Number.isFinite(precio) ? delta * precio : 0) }));
      } catch (e) {
        console.error('Error al alternar selección:', e);
        toast.error('Error de conexión al actualizar la selección.');
      }
    },
    [token, authFetch, products]
  );

  const scrapeAll = useCallback(async (): Promise<void> => {
    toast.info('Buscando nuevos precios... Esto puede demorar unos segundos.', { duration: 4000 });
    try {
      const res = await authFetch('/api/scrape-all', { method: 'POST' });
      if (!res.ok) {
        // 409: ya hay una actualización en curso
        toast.error(await leerError(res, 'Hubo un problema en el servidor al intentar actualizar.'));
        return;
      }
      await refresh();
      toast.success('¡Todos los precios fueron actualizados con éxito! 🚀');
    } catch (e) {
      console.error('Error al actualizar todos los precios:', e);
      toast.error('Error de conexión. Revisá si el servidor está encendido.');
    }
  }, [authFetch, refresh]);

  return {
    products, shops, loading, error, refresh, crear, eliminar, actualizarUrl, alternarSeleccion, scrapeAll,
    page, setPage, totalPages, total, budget, setSearch
  };
}
