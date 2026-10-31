import { useCallback } from 'react';
import { api } from '../lib/admin-config';

export function useAdminRequest(token: string) {
  return useCallback(async (path: string, init: RequestInit = {}) => {
    if (!api) throw new Error('Configura VITE_API_URL para conectar la administración.');
    const response = await fetch(`${api}/api${path}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(init.headers || {}),
      },
    });
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      throw new Error(body.error || 'No se pudo completar la operación.');
    }
    return response.status === 204 ? null : response.json();
  }, [token]);
}
