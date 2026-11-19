import type { Product } from '../types';
import { formatCurrency } from '../utils/format';

// Barra fija con el total de los productos marcados "para el presupuesto".
export default function BudgetBar({ products }: { products: Product[] }) {
  const seleccionados = products.filter((p) => p.is_selected);
  if (seleccionados.length === 0) return null;

  const total = seleccionados.reduce((suma, p) => {
    const valor = Number(p.last_price);
    return suma + (Number.isFinite(valor) ? valor : 0);
  }, 0);
  const plural = seleccionados.length === 1 ? '' : 's';

  return (
    <div className="fixed bottom-0 left-0 w-full bg-gray-900 text-white p-4 shadow-lg z-40">
      <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
        <p className="font-semibold">
          {seleccionados.length} producto{plural} seleccionado{plural} para el presupuesto
        </p>
        <p className="text-lg font-bold">Total: {formatCurrency(total)}</p>
      </div>
    </div>
  );
}
