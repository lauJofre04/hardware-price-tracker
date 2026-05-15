import { useState, useEffect, useRef } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

interface HistoryRecord {
  price: string | number;
  recorded_at: string;
}

interface CleanData {
  fecha: string;
  precio: number;
}

export default function PriceChart({ productId }: { productId: number }) {
  const [data, setData] = useState<CleanData[]>([]);
  
  // 🔥 PASO 1: Creamos la referencia tipada para TypeScript
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
        const res = await fetch(`${apiUrl}/api/products/${productId}/history`);
        const history: HistoryRecord[] = await res.json();
        
        const groupedData = history.reduce((acc: Record<string, CleanData>, current) => {
          const dateKey = format(parseISO(current.recorded_at), "dd MMM", { locale: es });
          acc[dateKey] = { fecha: dateKey, precio: Number(current.price) };
          return acc;
        }, {});

        setData(Object.values(groupedData));
      } catch (error) {
        console.error("Error cargando historial:", error);
      }
    };
    fetchHistory();
  }, [productId]);

  // 🔥 PASO 2: Le decimos que scrollee a la derecha apenas la data cambie
  useEffect(() => {
    if (scrollContainerRef.current) {
      // Le damos un respiro de 50ms a React para que termine de dibujar el ancho dinámico
      setTimeout(() => {
        if (scrollContainerRef.current) {
          scrollContainerRef.current.scrollLeft = scrollContainerRef.current.scrollWidth;
        }
      }, 50);
    }
  }, [data]);

  if (data.length === 0) return <p className="text-center text-gray-400 text-sm mt-4">Cargando gráfico...</p>;

  // Calculamos el ancho del gráfico
  const anchoPorDia = 50; 
  const anchoTotalCalculado = Math.max(100, data.length * anchoPorDia);

  return (
    <div className="mt-6 mb-4">
      <h3 className="text-sm font-semibold text-gray-500 mb-2">Historial de Precio</h3>
      
      {/* 🔥 PASO 3: Le enchufamos el 'ref' al div que tiene el overflow-x-auto */}
      <div 
        ref={scrollContainerRef} 
        className="w-full overflow-x-auto border border-gray-100 rounded-lg bg-white p-2 scrollbar-thin scrollbar-thumb-gray-200 scrollbar-track-transparent scroll-smooth"
      >
        <div style={{ width: `${anchoTotalCalculado}%`, minWidth: '100%' }} className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 10, right: 10, left: -30, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
              <XAxis 
                dataKey="fecha" 
                tick={{ fontSize: 11, fill: '#9ca3af' }} 
                axisLine={false} 
                tickLine={false} 
                interval={0}
              />
              <YAxis hide domain={['dataMin - 3000', 'dataMax + 3000']} />
              
              <Tooltip 
                formatter={(value: any) => [`$${Number(value).toLocaleString('es-AR')}`, 'Precio']}
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