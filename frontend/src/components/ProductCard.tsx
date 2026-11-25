import { useState } from 'react';
import type { CSSProperties } from 'react';
import type { Product } from '../types';
import { useCountUp } from '../hooks/useCountUp';
import { formatPrice } from '../utils/format';
import PriceChart from './PriceChart';
import { EditIcon, TrashIcon } from './icons';

type Props = {
  product: Product;
  isAdmin: boolean;
  index: number;
  onToggleSelection: (id: number) => void;
  onDelete: (id: number, nombre: string) => void;
  onUpdateUrl: (id: number, url: string) => Promise<boolean>;
};

const botonIcono =
  'rounded-full border border-ink-700 bg-ink-900/80 p-1.5 text-ink-400 backdrop-blur transition hover:scale-110 active:scale-95';

export default function ProductCard({ product, isAdmin, index, onToggleSelection, onDelete, onUpdateUrl }: Props) {
  const [editing, setEditing] = useState(false);
  const [newUrl, setNewUrl] = useState('');
  const precio = useCountUp(Number(product.last_price) || 0);

  const startEditing = () => {
    setNewUrl(product.product_url);
    setEditing(true);
  };

  const saveUrl = async () => {
    if (!newUrl) return;
    if (await onUpdateUrl(product.product_id, newUrl)) setEditing(false);
  };

  // Entrada escalonada: cada tarjeta aparece un poco después de la anterior
  const retraso = { animationDelay: `${Math.min(index, 8) * 70}ms` } satisfies CSSProperties;

  return (
    <article className="tarjeta animate-entrada" style={retraso}>
      {isAdmin && (
        <div className="absolute right-4 top-4 z-10 flex gap-2">
          <button
            onClick={startEditing}
            className={`${botonIcono} hover:border-amber hover:text-amber`}
            title="Editar enlace"
            aria-label={`Editar enlace de ${product.product_name}`}
          >
            <EditIcon />
          </button>
          <button
            onClick={() => onDelete(product.product_id, product.product_name)}
            className={`${botonIcono} hover:border-rise hover:text-rise`}
            title="Eliminar producto"
            aria-label={`Eliminar ${product.product_name}`}
          >
            <TrashIcon />
          </button>
        </div>
      )}

      <div className="p-6">
        <div className={`mb-4 flex items-start justify-between ${isAdmin ? 'pr-20' : ''}`}>
          {product.category ? (
            <span className="rounded-full border border-amber/30 bg-amber/10 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-amber">
              {product.category}
            </span>
          ) : (
            <span />
          )}
          <span className="text-xs font-medium text-ink-500">{product.brand}</span>
        </div>

        <h2 className="mb-3 line-clamp-2 font-display text-lg font-bold leading-snug text-ink-100" title={product.product_name}>
          {product.product_name}
        </h2>

        <label className="mb-4 flex cursor-pointer select-none items-center gap-2 text-sm text-ink-400 transition-colors hover:text-ink-100">
          <input
            type="checkbox"
            checked={product.is_selected}
            onChange={() => onToggleSelection(product.product_id)}
            disabled={!isAdmin}
            className="h-4 w-4 cursor-pointer rounded border-ink-700 bg-ink-900 accent-amber disabled:cursor-not-allowed"
          />
          <span>Agregar al presupuesto</span>
        </label>

        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-wider text-ink-500">Mejor precio en</p>
            <p className="font-semibold text-ink-100">{product.shop_name}</p>
          </div>
          {product.last_price ? (
            <p className="font-display text-3xl font-extrabold tabular-nums text-amber">{formatPrice(precio)}</p>
          ) : (
            <p className="animate-pulse text-sm font-bold text-ink-400">Esperando precio…</p>
          )}
        </div>

        {product.last_price && <PriceChart productId={product.product_id} />}

        {editing ? (
          <div className="mt-6 flex animate-aparecer flex-col gap-2 rounded-xl border border-ink-700 bg-ink-950/60 p-3">
            <label className="text-xs font-bold text-ink-400" htmlFor={`url-${product.product_id}`}>
              Nuevo enlace del producto
            </label>
            <input id={`url-${product.product_id}`} type="url" value={newUrl} onChange={(e) => setNewUrl(e.target.value)} className="campo !py-2 text-sm" />
            <div className="mt-1 flex gap-2">
              <button onClick={saveUrl} className="btn btn-primario flex-1 !py-1.5 text-sm">
                Guardar
              </button>
              <button onClick={() => setEditing(false)} className="btn btn-suave flex-1 !py-1.5 text-sm">
                Cancelar
              </button>
            </div>
          </div>
        ) : (
          <a
            href={product.product_url}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-suave group mt-6 flex w-full items-center justify-center gap-2 text-center hover:!border-amber hover:!text-amber"
          >
            Ver en la tienda
            <span aria-hidden="true" className="transition-transform duration-300 group-hover:translate-x-1">→</span>
          </a>
        )}
      </div>
    </article>
  );
}
