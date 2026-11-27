import { Suspense, useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Topbar from './components/Topbar';
import AddProductModal from './components/AddProductModal';
import ToastViewport from '@/components/feature/ToastViewport';

export default function AppLayout() {
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem('dealalert.sidebar') === 'collapsed');
  const [mobileOpen, setMobileOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem('dealalert.sidebar', collapsed ? 'collapsed' : 'expanded');
  }, [collapsed]);

  useEffect(() => {
    setMobileOpen(false);
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen w-full bg-background-100">
      <Sidebar
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed((current) => !current)}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar onOpenMenu={() => setMobileOpen(true)} onAddProduct={() => setAddOpen(true)} />
        <main className="flex-1 w-full">
          <div key={location.pathname} className="mx-auto w-full max-w-[1440px] px-4 py-5 md:px-6 md:py-7 anim-fade">
            <Suspense fallback={null}>
              <Outlet context={{ openAddProduct: () => setAddOpen(true) }} />
            </Suspense>
          </div>
        </main>
      </div>

      <AddProductModal open={addOpen} onClose={() => setAddOpen(false)} />
      <ToastViewport />
    </div>
  );
}
