type Props = {
  page: number;
  totalPages: number;
  total: number;
  onChange: (page: number) => void;
};

export default function Pagination({ page, totalPages, total, onChange }: Props) {
  if (totalPages <= 1) return null;

  const boton = 'px-4 py-2 rounded-lg font-semibold border border-gray-300 bg-white text-gray-700 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors';

  return (
    <nav className="mt-8 flex items-center justify-center gap-4" aria-label="Paginación">
      <button className={boton} disabled={page <= 1} onClick={() => onChange(page - 1)}>
        ← Anterior
      </button>
      <span className="text-sm text-gray-600" aria-live="polite">
        Página {page} de {totalPages} · {total} productos
      </span>
      <button className={boton} disabled={page >= totalPages} onClick={() => onChange(page + 1)}>
        Siguiente →
      </button>
    </nav>
  );
}
