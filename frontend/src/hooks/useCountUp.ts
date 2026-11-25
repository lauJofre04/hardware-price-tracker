import { useEffect, useRef, useState } from 'react';

// Anima un número desde 0 (o desde el valor anterior) hasta `objetivo`.
// Respeta prefers-reduced-motion: en ese caso muestra el valor final directo.
export function useCountUp(objetivo: number, duracionMs = 900): number {
  const [valor, setValor] = useState(0);
  const anterior = useRef(0);

  useEffect(() => {
    const reducido = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reducido || duracionMs <= 0) {
      anterior.current = objetivo;
      const id = requestAnimationFrame(() => setValor(objetivo));
      return () => cancelAnimationFrame(id);
    }

    const desde = anterior.current;
    const inicio = performance.now();
    let frame = 0;

    const paso = (ahora: number) => {
      const t = Math.min((ahora - inicio) / duracionMs, 1);
      const suave = 1 - Math.pow(1 - t, 3); // ease-out cúbico
      const actual = desde + (objetivo - desde) * suave;
      anterior.current = actual;
      setValor(actual);
      if (t < 1) frame = requestAnimationFrame(paso);
    };
    frame = requestAnimationFrame(paso);
    return () => cancelAnimationFrame(frame);
  }, [objetivo, duracionMs]);

  return Math.round(valor);
}
