import { useEffect, useMemo, useRef, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { apiFetch } from '../api';

type HistoryRecord = {
  price: string | number;
  recorded_at: string;
};

type CleanData = {
  fecha: string;
  precio: number;
};

const ANCHO_POR_DIA = 50;

// Un punto por día (el último precio registrado ese día)
function agruparPorDia(history: HistoryRecord[]): CleanData[] {
  const porDia = new Map<string, CleanData>();
  for (const registro of history) {
    const fecha = format(parseISO(registro.recorded_at), 'dd MMM', { locale: es });
    porDia.set(fecha, { fecha, precio: Number(registro.price) });
  }
  return [...porDia.values()];
}

export default function PriceChart({ productId }: { productId: number }) {
  const [data, setData] = useState<CleanData[]>([]);
  const [error, setError] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelado = false;

    const cargarHistorial = async () => {
      try {
        const res = await apiFetch(`/api/products/${productId}/history`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const history = (await res.json()) as HistoryRecord[];
        if (!cancelado) setData(agruparPorDia(history));
      } catch (e) {
        console.error('Error cargando historial:', e);
        if (!cancelado) setError(true);
      }
    };

    void cargarHistorial();
    return () => {
      cancelado = true;
    };
  }, [productId]);

  // Muestra siempre los días más recientes (el final del scroll horizontal)
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      const el = scrollContainerRef.current;
      if (el) el.scrollLeft = el.scrollWidth;
    });
    return () => cancelAnimationFrame(frame);
  }, [data]);

  // Margen del eje Y proporcional al rango de precios (antes era un ±3000 fijo)
  const dominioY = useMemo((): [number, number] => {
    const precios = data.map((d) => d.precio);
    const min = Math.min(...precios);
    const max = Math.max(...precios);
    const margen = Math.max((max - min) * 0.2, max * 0.02);
    return [Math.floor(min - margen), Math.ceil(max + margen)];
  }, [data]);

  if (error) return <p className="text-center text-gray-400 text-sm mt-4">No se pudo cargar el historial.</p>;
  if (data.length === 0) return <p className="text-center text-gray-400 text-sm mt-4">Cargando gráfico...</p>;

  const anchoTotal = Math.max(100, data.length * ANCHO_POR_DIA);

  return (
    <div className="mt-6 mb-4">
      <h3 className="text-sm font-semibold text-gray-500 mb-2">Historial de Precio</h3>

      <div
        ref={scrollContainerRef}
        className="w-full overflow-x-auto border border-gray-100 rounded-lg bg-white p-2 scroll-smooth"
      >
        <div style={{ width: `${anchoTotal}%`, minWidth: '100%', minHeight: 192 }} className="h-48">
          <ResponsiveContainer width="100%" height={192} minWidth={0} minHeight={192}>
            <LineChart data={data} margin={{ top: 10, right: 10, left: -30, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
              <XAxis dataKey="fecha" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} interval={0} />
              <YAxis hide domain={dominioY} />
              <Tooltip
                formatter={(value) => [`$${Number(value).toLocaleString('es-AR')}`, 'Precio']}
                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                labelStyle={{ color: '#374151', fontWeight: 'bold' }}
              />
              <Line
                type="monotone"
                dataKey="precio"
                stroke="#10b981"
                strokeWidth={2}
                dot={{ r: 3, fill: '#10b981', strokeWidth: 2, stroke: '#fff' }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
