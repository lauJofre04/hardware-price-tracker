import type { Budget } from '../types';
import { formatCurrency } from '../utils/format';

// Barra fija con el total de los productos marcados "para el presupuesto" (de todas las páginas).
export default function BudgetBar({ budget }: { budget: Budget }) {
  if (budget.count === 0) return null;

  const plural = budget.count === 1 ? '' : 's';

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 animate-subir border-t border-amber/30 bg-ink-900/85 p-4 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-1 sm:flex-row">
        <p className="text-ink-400">
          {budget.count} producto{plural} en tu presupuesto
        </p>
        <p className="font-display text-2xl font-extrabold tabular-nums text-amber">{formatCurrency(budget.total)}</p>
      </div>
    </div>
  );
}
