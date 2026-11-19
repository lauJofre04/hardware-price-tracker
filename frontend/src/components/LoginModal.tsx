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
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="login-titulo"
    >
      <div className="bg-white p-8 rounded-xl shadow-2xl w-full max-w-sm relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
          title="Cerrar"
          aria-label="Cerrar"
        >
          <CloseIcon />
        </button>

        <h2 id="login-titulo" className="text-2xl font-bold mb-2 text-gray-800 text-center">Modo Administrador</h2>
        <p className="text-sm text-gray-500 text-center mb-6">Ingresá para gestionar el radar.</p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <input
            required
            autoFocus
            type="text"
            autoComplete="username"
            placeholder="Usuario"
            aria-label="Usuario"
            className="border border-gray-300 p-3 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
          <input
            required
            type="password"
            autoComplete="current-password"
            placeholder="Contraseña"
            aria-label="Contraseña"
            className="border border-gray-300 p-3 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button
            type="submit"
            disabled={submitting}
            className="mt-2 w-full bg-gray-900 hover:bg-black disabled:bg-gray-500 text-white font-bold py-3 px-4 rounded-lg transition-colors"
          >
            {submitting ? 'Ingresando...' : 'Ingresar'}
          </button>
        </form>
      </div>
    </div>
  );
}
