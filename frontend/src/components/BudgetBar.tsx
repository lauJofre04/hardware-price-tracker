import type { Budget } from '../types';
import { formatCurrency } from '../utils/format';

// Barra fija con el total de los productos marcados "para el presupuesto" (de todas las páginas).
export default function BudgetBar({ budget }: { budget: Budget }) {
  if (budget.count === 0) return null;

  const plural = budget.count === 1 ? '' : 's';

  return (
    <div className="fixed bottom-0 left-0 w-full bg-gray-900 text-white p-4 shadow-lg z-40">
      <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
        <p className="font-semibold">
          {budget.count} producto{plural} seleccionado{plural} para el presupuesto
        </p>
        <p className="text-lg font-bold">Total: {formatCurrency(budget.total)}</p>
      </div>
    </div>
  );
}
