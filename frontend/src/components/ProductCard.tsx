import { useState } from 'react';
import type { Product } from '../types';
import { formatPrice } from '../utils/format';
import PriceChart from './PriceChart';
import { EditIcon, TrashIcon } from './icons';

type Props = {
  product: Product;
  isAdmin: boolean;
  onToggleSelection: (id: number) => void;
  onDelete: (id: number, nombre: string) => void;
  onUpdateUrl: (id: number, url: string) => Promise<boolean>;
};

export default function ProductCard({ product, isAdmin, onToggleSelection, onDelete, onUpdateUrl }: Props) {
  const [editing, setEditing] = useState(false);
  const [newUrl, setNewUrl] = useState('');

  const startEditing = () => {
    setNewUrl(product.product_url);
    setEditing(true);
  };

  const saveUrl = async () => {
    if (!newUrl) return;
    if (await onUpdateUrl(product.product_id, newUrl)) setEditing(false);
  };

  return (
    <div className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-300 border border-gray-100 relative">
      {isAdmin && (
        <div className="absolute top-4 right-4 flex gap-2">
          <button
            onClick={startEditing}
            className="text-gray-400 hover:text-blue-500 transition-colors bg-white/80 rounded-full p-1"
            title="Editar enlace"
            aria-label={`Editar enlace de ${product.product_name}`}
          >
            <EditIcon />
          </button>
          <button
            onClick={() => onDelete(product.product_id, product.product_name)}
            className="text-gray-400 hover:text-red-500 transition-colors bg-white/80 rounded-full p-1"
            title="Eliminar producto"
            aria-label={`Eliminar ${product.product_name}`}
          >
            <TrashIcon />
          </button>
        </div>
      )}

      <div className="p-6">
        <div className="flex justify-between items-start mb-4 pr-6">
          {product.category ? (
            <span className="bg-blue-100 text-blue-800 text-xs font-semibold px-2.5 py-0.5 rounded uppercase">{product.category}</span>
          ) : (
            <span />
          )}
          <span className="text-xs text-gray-400 font-medium">{product.brand}</span>
        </div>

        <label className="mb-3 flex items-center gap-2 text-sm text-gray-600 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={product.is_selected}
            onChange={() => onToggleSelection(product.product_id)}
            disabled={!isAdmin}
            className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
          />
          <span>Agregar al presupuesto</span>
        </label>

        <h2 className="text-lg font-bold text-gray-800 mb-2 line-clamp-2" title={product.product_name}>
          {product.product_name}
        </h2>

        <div className="mt-4 flex items-end justify-between">
          <div>
            <p className="text-sm text-gray-500">Mejor precio en</p>
            <p className="font-semibold text-gray-700">{product.shop_name}</p>
          </div>
          <div className="text-right">
            {product.last_price ? (
              <p className="text-2xl font-black text-emerald-600">{formatPrice(product.last_price)}</p>
            ) : (
              <p className="text-sm font-bold text-orange-500">Esperando Scraper...</p>
            )}
          </div>
        </div>

        {product.last_price && <PriceChart productId={product.product_id} />}

        {editing ? (
          <div className="mt-6 flex flex-col gap-2 bg-gray-50 p-3 rounded-lg border border-gray-200">
            <label className="text-xs font-bold text-gray-600" htmlFor={`url-${product.product_id}`}>
              Nuevo enlace del producto:
            </label>
            <input
              id={`url-${product.product_id}`}
              type="url"
              value={newUrl}
              onChange={(e) => setNewUrl(e.target.value)}
              className="w-full border p-2 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <div className="flex gap-2 mt-2">
              <button onClick={saveUrl} className="w-1/2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-1.5 rounded text-sm transition-colors">
                Guardar
              </button>
              <button onClick={() => setEditing(false)} className="w-1/2 bg-gray-400 hover:bg-gray-500 text-white font-bold py-1.5 rounded text-sm transition-colors">
                Cancelar
              </button>
            </div>
          </div>
        ) : (
          <a
            href={product.product_url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-6 block w-full text-center bg-gray-900 hover:bg-gray-800 text-white font-medium py-2 px-4 rounded transition-colors"
          >
            Ver en la tienda
          </a>
        )}
      </div>
    </div>
  );
}
