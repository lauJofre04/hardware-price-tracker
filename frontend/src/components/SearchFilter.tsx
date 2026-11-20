import { SearchIcon } from './icons';

type Props = {
  value: string;
  onChange: (valor: string) => void;
};

export default function SearchFilter({ value, onChange }: Props) {
  return (
    <div className="mb-6 relative max-w-2xl mx-auto">
      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
        <SearchIcon />
      </div>
      <input
        type="text"
        placeholder="Buscar producto en mi radar (ej: Aula F75, Monitor...)"
        aria-label="Filtrar productos del radar"
        className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm transition-all text-gray-700 bg-white"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
