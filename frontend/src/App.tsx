import { useEffect, useState } from 'react';
import { Toaster, toast } from 'sonner';
import { useAuth } from './hooks/useAuth';
import { useProducts } from './hooks/useProducts';
import type { LiveResult } from './types';
import Header from './components/Header';
import LoginModal from './components/LoginModal';
import LiveSearch from './components/LiveSearch';
import ProductForm from './components/ProductForm';
import ProductCard from './components/ProductCard';
import SearchFilter from './components/SearchFilter';
import BudgetBar from './components/BudgetBar';
import Pagination from './components/Pagination';

function App() {
  const { token, login, logout, authFetch } = useAuth();
  const {
    products, shops, loading, error, refresh, crear, eliminar, actualizarUrl, alternarSeleccion, scrapeAll,
    page, setPage, totalPages, total, budget, setSearch
  } = useProducts({ token, authFetch });

  const [showForm, setShowForm] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [isScrapingAll, setIsScrapingAll] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // El filtro se aplica en el servidor: se espera a que termine de escribir
  useEffect(() => {
    const espera = setTimeout(() => setSearch(searchTerm.trim()), 300);
    return () => clearTimeout(espera);
  }, [searchTerm, setSearch]);

  const isAdmin = token !== null;

  const handleScrapeAll = async () => {
    setIsScrapingAll(true);
    try {
      await scrapeAll();
    } finally {
      setIsScrapingAll(false);
    }
  };

  const handleCreate = async (...args: Parameters<typeof crear>) => {
    const ok = await crear(...args);
    if (ok) setShowForm(false);
    return ok;
  };

  const handleDelete = (id: number, nombre: string) => {
    if (window.confirm(`¿Estás seguro de que querés dejar de rastrear el "${nombre}"?`)) void eliminar(id);
  };

  // Convierte el resultado del buscador en un producto rastreado de Mercado Libre
  const handleTrackLiveResult = async (resultado: LiveResult): Promise<boolean> => {
    const tienda = shops.find((s) => s.name === 'Mercado Libre');
    if (!tienda) {
      toast.error('Error: No se encontró la tienda Mercado Libre en la base de datos.');
      return false;
    }
    return crear({
      name: resultado.title.slice(0, 255),
      category: 'Búsqueda en Vivo',
      brand: 'A clasificar',
      shop_id: tienda.id,
      product_url: resultado.link
    });
  };

  return (
    <div className="relative min-h-screen overflow-x-clip px-4 pb-28 pt-10 sm:px-8 sm:pt-16">
      {/* Resplandores de fondo que derivan lentamente */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -left-40 -top-40 h-[34rem] w-[34rem] animate-deriva rounded-full bg-amber/10 blur-3xl" />
        <div className="absolute -right-32 top-1/3 h-[30rem] w-[30rem] animate-deriva rounded-full bg-drop/[0.07] blur-3xl [animation-delay:-9s]" />
      </div>

      <Toaster theme="dark" richColors position="top-right" />
      <div className="mx-auto max-w-6xl">
        <Header
          isAdmin={isAdmin}
          isScrapingAll={isScrapingAll}
          showForm={showForm}
          total={total}
          onScrapeAll={handleScrapeAll}
          onToggleForm={() => setShowForm((v) => !v)}
          onLogout={logout}
          onShowLogin={() => setShowLogin(true)}
        />

        {isAdmin && <LiveSearch authFetch={authFetch} onTrack={handleTrackLiveResult} />}

        {showLogin && <LoginModal onClose={() => setShowLogin(false)} onLogin={login} />}

        {isAdmin && showForm && <ProductForm shops={shops} onSubmit={handleCreate} />}

        <SearchFilter value={searchTerm} onChange={setSearchTerm} />

        {loading ? (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3" aria-label="Cargando componentes">
            {Array.from({ length: 6 }, (_, i) => (
              <div key={i} className="esqueleto h-80" />
            ))}
          </div>
        ) : error ? (
          <div className="animate-entrada rounded-2xl border border-dashed border-rise/40 bg-ink-900 py-16 text-center">
            <p className="mb-4 text-rise">{error}</p>
            <button onClick={() => void refresh()} className="btn btn-primario">
              Reintentar
            </button>
          </div>
        ) : products.length === 0 ? (
          <div className="animate-entrada rounded-2xl border border-dashed border-ink-700 bg-ink-900 py-16 text-center">
            {searchTerm.trim() ? (
              <>
                <p className="mb-2 text-lg text-ink-100">No encontramos nada con "{searchTerm}"</p>
                <p className="text-sm text-ink-400">Probá con otras palabras o agregalo a tu radar.</p>
              </>
            ) : (
              <p className="text-lg text-ink-400">Todavía no hay productos en el radar.</p>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {products.map((product, i) => (
              <ProductCard
                key={product.product_id}
                product={product}
                index={i}
                isAdmin={isAdmin}
                onToggleSelection={(id) => void alternarSeleccion(id)}
                onDelete={handleDelete}
                onUpdateUrl={actualizarUrl}
              />
            ))}
          </div>
        )}

        <Pagination page={page} totalPages={totalPages} total={total} onChange={setPage} />

        {/* El total del presupuesto cuenta todos los productos marcados, de cualquier página o filtro */}
        <BudgetBar budget={budget} />
      </div>
    </div>
  );
}

export default App;
