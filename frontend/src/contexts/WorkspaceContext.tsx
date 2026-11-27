import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { api, errorMessage, send } from '@/lib/api';
import { productView, type AlertPage, type ApiProduct, type Dashboard, type Page, type Watch } from '@/lib/contracts';
import type { AlertItem, Collection, Product } from '@/lib/types';
import { useApiResource } from '@/hooks/useApiResource';

type ToastTone = 'success' | 'info' | 'error';
export type ToastItem = { id: number; message: string; tone: ToastTone };
type ProductInput = Partial<Watch> & { listingId: string };
type BulkAction = 'pause' | 'resume' | 'remove';

type WorkspaceValue = {
  products: Product[];
  alerts: AlertItem[];
  unread: number;
  collections: Collection[];
  dashboard?: Dashboard;
  revision: number;
  pending: boolean;
  error?: string;
  refresh: () => void;
  toasts: ToastItem[];
  perform: (operation: () => Promise<unknown>, success?: string) => Promise<boolean>;
  previewProduct: (url: string) => Promise<Product>;
  addProduct: (product: ProductInput) => Promise<Product>;
  removeProduct: (id: string) => Promise<boolean>;
  setStatus: (id: string, status: 'active' | 'paused') => Promise<boolean>;
  setTarget: (id: string, target: number, watchStock: boolean) => Promise<boolean>;
  setTracked: (id: string, tracked: boolean) => Promise<boolean>;
  bulk: (ids: string[], action: BulkAction) => Promise<boolean>;
  markRead: (id: string, read?: boolean) => Promise<boolean>;
  markAllRead: () => Promise<boolean>;
  removeAlert: (id: string) => Promise<boolean>;
  createCollection: (name: string, description: string) => Promise<boolean>;
  renameCollection: (id: string, name: string) => Promise<boolean>;
  deleteCollection: (id: string) => Promise<boolean>;
  addToCollection: (collectionId: string, productId: string) => Promise<boolean>;
  removeFromCollection: (collectionId: string, productId: string) => Promise<boolean>;
  pushToast: (message: string, tone?: ToastTone) => void;
  dismissToast: (id: number) => void;
};

const WorkspaceContext = createContext<WorkspaceValue | null>(null);

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const owner = user?.id;
  const [revision, setRevision] = useState(0);
  const [snapshot, setSnapshot] = useState<{ owner: string; revision: number; products: Product[]; error?: string }>();
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const refresh = useCallback(() => setRevision((value) => value + 1), []);
  const productError = snapshot?.owner === owner ? snapshot?.error : undefined;
  const products = owner && snapshot?.owner === owner ? snapshot.products : [];
  const contextPath = (path: string) => (owner ? path : null);
  const collections = useApiResource<Collection[]>(contextPath('/collections'), revision);
  const alerts = useApiResource<AlertPage>(contextPath('/alerts?pageSize=10'), revision);
  const dashboard = useApiResource<Dashboard>(contextPath('/dashboard'), revision);
  const dismissToast = useCallback((id: number) => setToasts((items) => items.filter((item) => item.id !== id)), []);
  const pushToast = useCallback(
    (message: string, tone: ToastTone = 'success') => {
      const id = Date.now() + Math.random();
      setToasts((items) => [...items.slice(-4), { id, message, tone }]);
      window.setTimeout(() => dismissToast(id), 4500);
    },
    [dismissToast],
  );

  useEffect(() => {
    if (!owner) return;
    const controller = new AbortController();
    const load = async () => {
      try {
        const first = await api<Page<ApiProduct>>('/products?pageSize=100', { signal: controller.signal });
        const items = [...first.items];
        for (let page = 2; page <= first.totalPages; page++) {
          const response = await api<Page<ApiProduct>>('/products?pageSize=100&page=' + page, {
            signal: controller.signal,
          });
          items.push(...response.items);
        }
        if (!controller.signal.aborted) setSnapshot({ owner, revision, products: items.map(productView) });
      } catch (error) {
        if (!controller.signal.aborted)
          setSnapshot((current) => ({
            owner,
            revision,
            products: current?.owner === owner ? current.products : [],
            error: errorMessage(error),
          }));
      }
    };
    void load();
    return () => controller.abort();
  }, [owner, revision]);

  useEffect(() => {
    if (!owner) return;
    const timer = window.setInterval(() => {
      if (!document.hidden) refresh();
    }, 30000);
    return () => window.clearInterval(timer);
  }, [owner, refresh]);

  const perform = async (operation: () => Promise<unknown>, success?: string) => {
    try {
      await operation();
      refresh();
      if (success) pushToast(success);
      return true;
    } catch (error) {
      pushToast(errorMessage(error), 'error');
      return false;
    }
  };
  const addProduct = async (input: ProductInput) => {
    const product = productView(await send<ApiProduct>('POST', '/products', input));
    refresh();
    return product;
  };
  const collectionItem = (method: 'PUT' | 'DELETE', id: string, productId: string) =>
    perform(() => send(method, '/collections/' + id + '/products/' + productId));
  const value: WorkspaceValue = {
    products,
    alerts: owner ? (alerts.data?.items ?? []) : [],
    unread: owner ? (alerts.data?.unread ?? 0) : 0,
    collections: owner ? (collections.data ?? []) : [],
    dashboard: owner ? dashboard.data : undefined,
    revision,
    pending: Boolean(owner && snapshot?.owner !== owner),
    error: productError ?? collections.error ?? alerts.error ?? dashboard.error,
    refresh,
    toasts,
    pushToast,
    dismissToast,
    perform,
    addProduct,
    previewProduct: async (url) => productView(await send<ApiProduct>('POST', '/products/preview', { url })),
    removeProduct: (id) => perform(() => send('DELETE', '/products/' + id)),
    setStatus: (id, status) => perform(() => send('PATCH', '/products/' + id, { status })),
    setTarget: (id, targetPrice, watchStock) =>
      perform(() => send('PATCH', '/products/' + id, { targetPrice, watchStock })),
    setTracked: (id, tracked) =>
      perform(() => (tracked ? addProduct({ listingId: id }) : send('DELETE', '/products/' + id))),
    bulk: (ids, action) => perform(() => send('POST', '/products/bulk', { ids, action })),
    markRead: (id, read = true) => perform(() => send('PATCH', '/alerts/' + id, { read })),
    markAllRead: () => perform(() => send('POST', '/alerts/read-all')),
    removeAlert: (id) => perform(() => send('DELETE', '/alerts/' + id)),
    createCollection: (name, description) => perform(() => send('POST', '/collections', { name, description })),
    renameCollection: (id, name) => perform(() => send('PATCH', '/collections/' + id, { name })),
    deleteCollection: (id) => perform(() => send('DELETE', '/collections/' + id)),
    addToCollection: (id, productId) => collectionItem('PUT', id, productId),
    removeFromCollection: (id, productId) => collectionItem('DELETE', id, productId),
  };
  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}
export function useWorkspace() {
  const context = useContext(WorkspaceContext);
  if (!context) throw new Error('useWorkspace must be used inside WorkspaceProvider');
  return context;
}
