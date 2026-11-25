import { SearchIcon } from './icons';

type Props = {
  value: string;
  onChange: (valor: string) => void;
};

export default function SearchFilter({ value, onChange }: Props) {
  return (
    <div className="group relative mb-8 max-w-2xl animate-entrada [animation-delay:120ms]">
      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-ink-500 transition-colors group-focus-within:text-amber">
        <SearchIcon />
      </div>
      <input
        type="text"
        placeholder="Buscar en tu radar: Aula F75, monitor, SSD…"
        aria-label="Filtrar productos del radar"
        className="campo !rounded-2xl !py-3.5 !pl-11"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
