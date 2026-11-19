import { useState } from 'react';
import type { FormEvent } from 'react';
import type { NewProduct, Shop } from '../types';

type Props = {
  shops: Shop[];
  onSubmit: (producto: NewProduct) => Promise<boolean>;
};

const VACIO: NewProduct = { name: '', category: '', brand: '', shop_id: '', product_url: '' };

export default function ProductForm({ shops, onSubmit }: Props) {
  const [form, setForm] = useState<NewProduct>(VACIO);
  const [submitting, setSubmitting] = useState(false);

  const cambiar = (campo: keyof NewProduct, valor: string) => setForm((f) => ({ ...f, [campo]: valor }));

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const ok = await onSubmit(form);
    setSubmitting(false);
    if (ok) setForm(VACIO);
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white p-6 rounded-xl shadow-md mb-8 border border-gray-200">
      <h2 className="text-xl font-bold mb-4 text-gray-800">Agregar enlace al radar</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <input
          required
          type="text"
          maxLength={255}
          placeholder="Nombre del producto (Ej: Monitor LG 24)"
          aria-label="Nombre del producto"
          className="border p-2 rounded w-full"
          value={form.name}
          onChange={(e) => cambiar('name', e.target.value)}
        />

        <div className="flex gap-4">
          <input
            required
            type="text"
            maxLength={100}
            placeholder="Categoría (Ej: Monitor)"
            aria-label="Categoría"
            className="border p-2 rounded w-1/2"
            value={form.category}
            onChange={(e) => cambiar('category', e.target.value)}
          />
          <input
            required
            type="text"
            maxLength={100}
            placeholder="Marca (Ej: LG)"
            aria-label="Marca"
            className="border p-2 rounded w-1/2"
            value={form.brand}
            onChange={(e) => cambiar('brand', e.target.value)}
          />
        </div>

        <select
          required
          aria-label="Tienda"
          className="border p-2 rounded w-full bg-white"
          value={form.shop_id}
          onChange={(e) => cambiar('shop_id', e.target.value)}
        >
          <option value="">Seleccionar Tienda...</option>
          {shops.map((shop) => (
            <option key={shop.id} value={shop.id}>
              {shop.name}
            </option>
          ))}
        </select>

        <input
          required
          type="url"
          placeholder="URL del producto (https://...)"
          aria-label="URL del producto"
          className="border p-2 rounded w-full"
          value={form.product_url}
          onChange={(e) => cambiar('product_url', e.target.value)}
        />
      </div>

      <button
        type="submit"
        disabled={submitting}
        className={`mt-4 w-full font-bold py-2 px-4 rounded transition-colors text-white ${
          submitting ? 'bg-gray-400 cursor-not-allowed' : 'bg-emerald-600 hover:bg-emerald-700'
        }`}
      >
        {submitting ? '🤖 Scrapeando precio en tiempo real...' : 'Guardar y Scrapear'}
      </button>
    </form>
  );
}
