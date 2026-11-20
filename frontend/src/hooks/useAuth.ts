import { useCallback, useState } from 'react';
import { toast } from 'sonner';
import { apiFetch, type AuthFetch } from '../api';

const CLAVE_TOKEN = 'token';

// localStorage puede no estar disponible (modo privado, datos bloqueados): nunca debe romper la app.
function leerToken(): string | null {
  try {
    return localStorage.getItem(CLAVE_TOKEN);
  } catch {
    return null;
  }
}

function guardarToken(token: string | null) {
  try {
    if (token) localStorage.setItem(CLAVE_TOKEN, token);
    else localStorage.removeItem(CLAVE_TOKEN);
  } catch {
    // sin almacenamiento: la sesión dura hasta recargar la página
  }
}

export function useAuth() {
  const [token, setToken] = useState<string | null>(leerToken);

  const logout = useCallback(() => {
    guardarToken(null);
    setToken(null);
  }, []);

  const login = useCallback(async (username: string, password: string): Promise<boolean> => {
    // El backend gratuito "duerme": la primera petición puede tardar, así que se avisa
    toast.loading('Despertando al servidor y validando...', { id: 'login-toast' });
    try {
      const res = await apiFetch('/api/auth/login', { method: 'POST', body: { username, password } });
      const data = (await res.json().catch(() => null)) as { token?: string; error?: string } | null;

      if (res.ok && data?.token) {
        guardarToken(data.token);
        setToken(data.token);
        toast.success('¡Sesión iniciada!', { id: 'login-toast' });
        return true;
      }
      toast.error(data?.error || 'Credenciales incorrectas', { id: 'login-toast' });
      return false;
    } catch (error) {
      console.error('Error al iniciar sesión:', error);
      toast.error('Error de conexión con el servidor.', { id: 'login-toast' });
      return false;
    }
  }, []);

  // fetch con el token. Si el backend lo rechaza (vencido a las 24 h o inválido), cierra la sesión.
  const authFetch = useCallback<AuthFetch>(
    async (path, options = {}) => {
      const res = await apiFetch(path, { ...options, token });
      if (res.status === 401 || res.status === 403) {
        logout();
        toast.error('Tu sesión expiró. Volvé a iniciar sesión.');
      }
      return res;
    },
    [token, logout]
  );

  return { token, login, logout, authFetch };
}
