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
    <section className="mb-8 animate-entrada rounded-2xl border border-ink-700 bg-gradient-to-br from-ink-800 to-ink-900 p-6">
      <h2 className="mb-3 flex items-center gap-2 font-display text-lg font-bold text-ink-100">
        <span aria-hidden="true" className="text-amber">⚡</span> Búsqueda rápida en Mercado Libre
      </h2>

      <form onSubmit={handleSearch} className="flex flex-col gap-2 sm:flex-row">
        <input
          type="text"
          placeholder="Ej: Teclado mecánico Aula F75…"
          aria-label="Buscar en Mercado Libre"
          maxLength={100}
          className="campo flex-1"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <button type="submit" disabled={searching} className="btn btn-primario">
          {searching ? 'Buscando…' : 'Cazar oferta'}
        </button>
      </form>

      {searching && <div className="esqueleto mt-4 h-24" aria-hidden="true" />}

      {result && (
        <div className="mt-4 flex animate-modal flex-col items-center justify-between gap-4 rounded-xl border border-dashed border-amber/50 bg-ink-950/50 p-4 md:flex-row">
          <div className="flex flex-1 items-center gap-4">
            {result.thumbnail && <img src={result.thumbnail} alt="Miniatura" className="h-16 w-16 rounded-lg bg-white object-contain p-1" />}
            <div>
              <p className="mb-1 text-xs font-bold uppercase tracking-wider text-amber">Mejor coincidencia</p>
              <h3 className="line-clamp-2 text-sm font-semibold text-ink-100" title={result.title}>
                {result.title}
              </h3>
              <p className="mt-1 font-display text-2xl font-extrabold tabular-nums text-drop">{formatPrice(result.price)}</p>
            </div>
          </div>

          <div className="flex w-full gap-2 md:w-auto">
            <button onClick={() => setResult(null)} className="btn btn-suave flex-1 md:flex-none">
              Descartar
            </button>
            <button onClick={handleTrack} disabled={saving} className="btn btn-primario flex-1 md:flex-none">
              {saving ? 'Guardando…' : 'Seguir precio'}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
