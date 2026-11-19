type Props = {
  isAdmin: boolean;
  isScrapingAll: boolean;
  showForm: boolean;
  onScrapeAll: () => void;
  onToggleForm: () => void;
  onLogout: () => void;
  onShowLogin: () => void;
};

export default function Header({ isAdmin, isScrapingAll, showForm, onScrapeAll, onToggleForm, onLogout, onShowLogin }: Props) {
  return (
    <header className="mb-8 flex flex-col md:flex-row md:justify-between md:items-center gap-4">
      <div>
        <h1 className="text-3xl font-bold text-gray-800">Monitor de Hardware 🚀</h1>
        <p className="text-gray-500 mt-2">Rastreando precios en tiempo real para tu próximo setup.</p>
      </div>

      <div className="flex gap-3 items-center">
        {isAdmin ? (
          <>
            <button
              onClick={onScrapeAll}
              disabled={isScrapingAll}
              className={`font-bold py-2 px-4 rounded-lg transition-colors text-white ${isScrapingAll ? 'bg-indigo-400' : 'bg-indigo-600 hover:bg-indigo-700'}`}
            >
              {isScrapingAll ? '⏳...' : '🔄 Forzar Actualización'}
            </button>
            <button onClick={onToggleForm} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg">
              {showForm ? 'Cancelar' : '+ Rastrear'}
            </button>
            <button onClick={onLogout} className="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded-lg text-sm">
              Salir
            </button>
          </>
        ) : (
          <button onClick={onShowLogin} className="bg-gray-800 hover:bg-gray-900 text-white font-bold py-2 px-4 rounded-lg">
            Iniciar Sesión (Admin)
          </button>
        )}
      </div>
    </header>
  );
}
