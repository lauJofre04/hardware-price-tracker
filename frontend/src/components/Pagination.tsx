type Props = {
  page: number;
  totalPages: number;
  total: number;
  onChange: (page: number) => void;
};

export default function Pagination({ page, totalPages, total, onChange }: Props) {
  if (totalPages <= 1) return null;

  return (
    <nav className="mt-10 flex items-center justify-center gap-4" aria-label="Paginación">
      <button className="btn btn-suave" disabled={page <= 1} onClick={() => onChange(page - 1)}>
        Anterior
      </button>
      <span className="text-sm text-ink-400" aria-live="polite">
        Página {page} de {totalPages} ({total} productos)
      </span>
      <button className="btn btn-suave" disabled={page >= totalPages} onClick={() => onChange(page + 1)}>
        Siguiente
      </button>
    </nav>
  );
}
