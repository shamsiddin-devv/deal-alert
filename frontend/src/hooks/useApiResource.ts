import { useEffect, useState } from 'react';
import { api, errorMessage } from '@/lib/api';

export function useApiResource<T>(path: string | null, revision = 0, debounce = 0) {
  const [state, setState] = useState<{ path: string; revision: number; data?: T; error?: string }>();
  useEffect(() => {
    if (!path) return;
    const controller = new AbortController();
    const load = async () => {
      try {
        const data = await api<T>(path, { signal: controller.signal });
        if (!controller.signal.aborted) setState({ path, revision, data });
      } catch (error) {
        if (!controller.signal.aborted) {
          setState((previous) => ({
            path,
            revision,
            data: previous?.path === path ? previous.data : undefined,
            error: errorMessage(error),
          }));
        }
      }
    };
    const handle = window.setTimeout(() => void load(), debounce);
    return () => {
      window.clearTimeout(handle);
      controller.abort();
    };
  }, [path, revision, debounce]);
  const current = state?.path === path ? state : undefined;
  return { data: current?.data, error: current?.error, loading: Boolean(path && current?.revision !== revision) };
}
