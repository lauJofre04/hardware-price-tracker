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
    <form onSubmit={handleSubmit} className="mb-8 animate-entrada rounded-2xl border border-ink-700 bg-ink-900 p-6">
      <h2 className="font-display text-xl font-extrabold mb-4">Agregar producto al radar</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <input
          required
          type="text"
          maxLength={255}
          placeholder="Nombre del producto (ej: Monitor LG 24)"
          aria-label="Nombre del producto"
          className="campo"
          value={form.name}
          onChange={(e) => cambiar('name', e.target.value)}
        />

        <div className="flex gap-4">
          <input
            required
            type="text"
            maxLength={100}
            placeholder="Categoría (ej: Monitor)"
            aria-label="Categoría"
            className="campo w-1/2"
            value={form.category}
            onChange={(e) => cambiar('category', e.target.value)}
          />
          <input
            required
            type="text"
            maxLength={100}
            placeholder="Marca (ej: LG)"
            aria-label="Marca"
            className="campo w-1/2"
            value={form.brand}
            onChange={(e) => cambiar('brand', e.target.value)}
          />
        </div>

        <select
          required
          aria-label="Tienda"
          className="campo"
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
          className="campo"
          value={form.product_url}
          onChange={(e) => cambiar('product_url', e.target.value)}
        />
      </div>

      <button
        type="submit"
        disabled={submitting}
        className="btn btn-primario mt-4 w-full"
      >
        {submitting ? 'Buscando el precio…' : 'Guardar y buscar precio'}
      </button>
    </form>
  );
}
