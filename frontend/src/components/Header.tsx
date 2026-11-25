type Props = {
  isAdmin: boolean;
  isScrapingAll: boolean;
  showForm: boolean;
  total: number;
  onScrapeAll: () => void;
  onToggleForm: () => void;
  onLogout: () => void;
  onShowLogin: () => void;
};

export default function Header({ isAdmin, isScrapingAll, showForm, total, onScrapeAll, onToggleForm, onLogout, onShowLogin }: Props) {
  return (
    <header className="relative mb-10 animate-entrada">
      <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-ink-700 bg-ink-900/70 px-3 py-1 text-sm text-ink-400">
            <span className="h-2 w-2 animate-pulso rounded-full bg-drop" aria-hidden="true" />
            Precios actualizados dos veces por día
          </p>
          <h1 className="font-display text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-6xl">
            Comprá hardware
            <br />
            <span className="text-amber">cuando está barato.</span>
          </h1>
          <p className="mt-4 max-w-xl text-lg text-ink-400">
            Seguimos el precio de {total > 0 ? `${total} productos` : 'tus productos'} en Mercado Libre y Compra Gamer, guardamos el historial y te avisamos por Telegram cuando bajan.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {isAdmin ? (
            <>
              <button onClick={onScrapeAll} disabled={isScrapingAll} className="btn btn-suave">
                {isScrapingAll ? 'Actualizando…' : 'Actualizar precios'}
              </button>
              <button onClick={onToggleForm} className="btn btn-primario">
                {showForm ? 'Cerrar' : 'Rastrear producto'}
              </button>
              <button onClick={onLogout} className="btn btn-peligro">
                Salir
              </button>
            </>
          ) : (
            <button onClick={onShowLogin} className="btn btn-suave">
              Entrar como admin
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
