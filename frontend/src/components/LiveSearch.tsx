import { useState } from 'react';
import type { FormEvent } from 'react';
import { toast } from 'sonner';
import { leerError, type AuthFetch } from '../api';
import type { LiveResult } from '../types';
import { formatPrice } from '../utils/format';

type Props = {
  authFetch: AuthFetch;
  onTrack: (resultado: LiveResult) => Promise<boolean>;
};

// "Cazador de Ofertas": busca en Mercado Libre y permite empezar a rastrear el primer resultado.
export default function LiveSearch({ authFetch, onTrack }: Props) {
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<LiveResult | null>(null);

  const handleSearch = async (e: FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setSearching(true);
    setResult(null);
    try {
      const res = await authFetch(`/api/search/ml?q=${encodeURIComponent(query.trim())}`);
      if (!res.ok) {
        // 400: consulta inválida, 429: demasiadas búsquedas, 500: falló el scraping
        toast.error(await leerError(res, 'No se pudo realizar la búsqueda.'));
        return;
      }
      const data = (await res.json()) as { found: boolean; product?: LiveResult };
      if (data.found && data.product) setResult(data.product);
      else toast.error('No se encontraron resultados relevantes.');
    } catch (error) {
      console.error('Error en la búsqueda en vivo:', error);
      toast.error('Error de conexión con el servidor.');
    } finally {
      setSearching(false);
    }
  };

  const handleTrack = async () => {
    if (!result) return;
    setSaving(true);
    const ok = await onTrack(result);
    setSaving(false);
    if (ok) {
      toast.success('¡Oferta guardada en tu radar!');
      setResult(null);
      setQuery('');
    }
  };

  return (
    <div className="mb-8 bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-xl border border-blue-100 shadow-sm">
      <h2 className="text-lg font-bold text-indigo-900 mb-3 flex items-center gap-2">
        <span aria-hidden="true">⚡</span> Búsqueda Rápida en Mercado Libre
      </h2>

      <form onSubmit={handleSearch} className="flex gap-2">
        <input
          type="text"
          placeholder="Ej: Teclado Mecánico Aula F75..."
          aria-label="Buscar en Mercado Libre"
          maxLength={100}
          className="flex-1 border border-indigo-200 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <button
          type="submit"
          disabled={searching}
          className={`font-bold py-3 px-6 rounded-lg transition-colors text-white ${
            searching ? 'bg-indigo-300 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700'
          }`}
        >
          {searching ? 'Buscando...' : 'Cazar Oferta'}
        </button>
      </form>

      {result && (
        <div className="mt-4 bg-white p-4 rounded-lg border-2 border-dashed border-indigo-300 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4 flex-1">
            {result.thumbnail && <img src={result.thumbnail} alt="Miniatura" className="w-16 h-16 object-contain rounded" />}
            <div>
              <p className="text-xs font-bold text-indigo-600 uppercase mb-1">Mejor coincidencia</p>
              <h3 className="text-sm font-semibold text-gray-800 line-clamp-2" title={result.title}>
                {result.title}
              </h3>
              <p className="text-2xl font-black text-emerald-600 mt-1">{formatPrice(result.price)}</p>
            </div>
          </div>

          <div className="flex gap-2 w-full md:w-auto">
            <button
              onClick={() => setResult(null)}
              className="flex-1 md:flex-none px-4 py-2 border border-gray-300 text-gray-600 font-bold rounded-lg hover:bg-gray-100 transition-colors"
            >
              Descartar
            </button>
            <button
              onClick={handleTrack}
              disabled={saving}
              className="flex-1 md:flex-none px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-400 text-white font-bold rounded-lg transition-colors"
            >
              {saving ? 'Guardando...' : '👀 Seguir Precio'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
