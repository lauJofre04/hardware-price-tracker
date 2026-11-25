import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { CloseIcon } from './icons';

type Props = {
  onClose: () => void;
  onLogin: (username: string, password: string) => Promise<boolean>;
};

export default function LoginModal({ onClose, onLogin }: Props) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const alTeclear = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', alTeclear);
    return () => document.removeEventListener('keydown', alTeclear);
  }, [onClose]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const ok = await onLogin(username, password);
    setSubmitting(false);
    if (ok) onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex animate-aparecer items-center justify-center bg-ink-950/80 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="login-titulo"
    >
      <div className="relative w-full max-w-sm animate-modal rounded-3xl border border-ink-700 bg-ink-900 p-8 shadow-2xl">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-ink-500 transition-colors hover:text-ink-100"
          title="Cerrar"
          aria-label="Cerrar"
        >
          <CloseIcon />
        </button>

        <h2 id="login-titulo" className="font-display text-2xl font-extrabold mb-2 text-center">Modo administrador</h2>
        <p className="text-sm text-ink-400 text-center mb-6">Ingresá para gestionar tu radar.</p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <input
            required
            autoFocus
            type="text"
            autoComplete="username"
            placeholder="Usuario"
            aria-label="Usuario"
            className="campo"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
          <input
            required
            type="password"
            autoComplete="current-password"
            placeholder="Contraseña"
            aria-label="Contraseña"
            className="campo"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button
            type="submit"
            disabled={submitting}
            className="btn btn-primario mt-2 w-full !py-3"
          >
            {submitting ? 'Ingresando…' : 'Ingresar'}
          </button>
        </form>
      </div>
    </div>
  );
}
