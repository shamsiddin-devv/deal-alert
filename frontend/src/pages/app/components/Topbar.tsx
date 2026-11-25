import ProductImage from '@/components/base/ProductImage';
import { apiPath } from '@/lib/api';
import { productView, type ApiProduct, type Page } from '@/lib/contracts';
import { useApiResource } from '@/hooks/useApiResource';
import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useAuth } from '@/contexts/AuthContext';
import { initials, money, relTime } from '@/lib/format';
import { resolveTitle } from '@/pages/app/nav';

const alertVisual: Record<string, { icon: string; className: string }> = {
  'price-drop': { icon: 'ri-arrow-down-line', className: 'text-primary-600 dark:text-primary-400 bg-primary-500/10' },
  target: { icon: 'ri-focus-3-line', className: 'text-accent-700 dark:text-accent-400 bg-accent-500/12' },
  'historic-low': { icon: 'ri-award-line', className: 'text-primary-600 dark:text-primary-400 bg-primary-500/10' },
  'back-in-stock': { icon: 'ri-store-2-line', className: 'text-secondary-600 dark:text-secondary-400 bg-secondary-500/10' },
  'price-increase': { icon: 'ri-arrow-up-line', className: 'text-danger-600 bg-danger-500/10' },
  unavailable: { icon: 'ri-forbid-2-line', className: 'text-danger-600 bg-danger-500/10' },
  'better-offer': { icon: 'ri-arrow-left-right-line', className: 'text-secondary-600 dark:text-secondary-400 bg-secondary-500/10' },
};

export default function Topbar({
  onOpenMenu,
  onAddProduct,
}: {
  onOpenMenu: () => void;
  onAddProduct: () => void;
}) {
  const location = useLocation();
  const navigate = useNavigate();
  const { products, alerts, unread: unreadCount, markAllRead, perform, revision } = useWorkspace();
  const { user, signOut } = useAuth();
  const [query, setQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [bellOpen, setBellOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [mobileSearch, setMobileSearch] = useState(false);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  
  const title = resolveTitle(location.pathname);
  const search=useApiResource<Page<ApiProduct>>(query.trim() && (searchOpen||mobileSearch)?apiPath('/search',{query:query.trim(),pageSize:5}):null,revision,180);
  const results=query.trim() ? (search.data?.items.map(productView) ?? []) : products.slice(0,4);

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(event.target as Node)) {
        setSearchOpen(false);
        setBellOpen(false);
        setProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  useEffect(() => {
    setSearchOpen(false);
    setBellOpen(false);
    setProfileOpen(false);
    setMobileSearch(false);
    setQuery('');
  }, [location.pathname]);

  const goToProduct = (id: string) => {
    setSearchOpen(false);
    setQuery('');
    navigate(`/app/products/${id}`);
  };

  return (
    <header className="sticky top-0 z-30 flex h-14 w-full items-center gap-2 border-b border-background-200 bg-background-100/85 px-3 backdrop-blur-md md:px-5">
      {mobileSearch && (
        <div className="absolute left-0 right-0 top-full z-40 border-b border-background-200 bg-background-50 p-2.5 shadow-card md:hidden anim-fade">
          <div className="relative">
            <i aria-hidden="true" className="ri-search-line pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[15px] text-foreground-400"></i>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search products, brands, stores"
              aria-label="Search products"
              autoFocus
              className="h-9 w-full rounded-lg border border-background-200 bg-background-50 pl-8 pr-3 text-[12.5px] text-foreground-950 outline-none placeholder:text-foreground-400 focus:border-primary-500"
            />
          </div>
          <div className="mt-1.5 max-h-[60vh] overflow-y-auto">
            {results.length === 0 ? (
              <p className="px-2 py-4 text-center text-[11.5px] text-foreground-500">
                No products found. Try a brand or model name.
              </p>
            ) : (
              results.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setMobileSearch(false);
                    goToProduct(item.id);
                  }}
                  className="flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left hover:bg-background-100 cursor-pointer"
                >
                  <ProductImage
                    src={item.image || undefined}
                    alt=""
                    width={30}
                    height={30}
                    className="h-8 w-8 shrink-0 rounded-md border border-background-200 object-cover object-top"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[11.5px] font-medium text-foreground-900">{item.title}</span>
                    <span className="block text-[10px] text-foreground-500">
                      {item.marketplace} · {money(item.price)}
                    </span>
                  </span>
                  <i aria-hidden="true" className="ri-arrow-right-up-line text-sm text-foreground-300"></i>
                </button>
              ))
            )}
          </div>
        </div>
      )}
      <button
        type="button"
        onClick={onOpenMenu}
        aria-label="Open navigation"
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-foreground-700 hover:bg-background-200 lg:hidden cursor-pointer"
      >
        <i aria-hidden="true" className="ri-menu-3-line text-lg"></i>
      </button>

      <div className="flex min-w-0 items-center gap-1.5">
        <span className="hidden text-[11.5px] text-foreground-400 sm:inline">Workspace</span>
        <i aria-hidden="true" className="ri-arrow-right-s-line hidden text-foreground-300 sm:block"></i>
        <span className="truncate text-[12.5px] font-medium text-foreground-900">{title}</span>
      </div>

      <div className="ml-auto flex items-center gap-1.5" ref={wrapRef}>
        <div className="relative hidden md:block">
          <i aria-hidden="true" className="ri-search-line pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[15px] text-foreground-400"></i>
          <input
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setSearchOpen(true);
            }}
            onFocus={() => setSearchOpen(true)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && results[0]) goToProduct(results[0].id);
              if (event.key === 'Escape') setSearchOpen(false);
            }}
            placeholder="Search products, brands, stores"
            aria-label="Global search"
            className="h-8 w-56 rounded-lg border border-background-200 bg-background-50 pl-8 pr-14 text-[12px] text-foreground-900 outline-none transition-all duration-200 placeholder:text-foreground-400 focus:w-72 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/15 xl:w-64"
          />
          <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 rounded border border-background-200 bg-background-100 px-1 py-0.5 font-label text-[9.5px] text-foreground-400">
            ⏎
          </span>

          {searchOpen && (
            <div className="absolute right-0 top-[calc(100%+6px)] w-80 overflow-hidden rounded-xl border border-background-200 bg-background-50 p-1 shadow-pop anim-pop">
              <p className="px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-foreground-400">
                {query.trim() ? 'Results' : 'Tracked products'}
              </p>
              {results.length === 0 && (
                <div className="px-2.5 py-5 text-center">
                  <p className="text-[12px] font-medium text-foreground-800">No products found</p>
                  <p className="mt-0.5 text-[11px] text-foreground-500">Try a brand, model or marketplace name.</p>
                  <button
                    type="button"
                    onClick={() => {
                      setSearchOpen(false);
                      onAddProduct();
                    }}
                    className="mt-2 text-[11.5px] font-medium text-primary-700 dark:text-primary-400 cursor-pointer"
                  >
                    Add a product instead
                  </button>
                </div>
              )}
              {results.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => goToProduct(item.id)}
                  className="flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left hover:bg-background-100 cursor-pointer"
                >
                  <ProductImage
                    src={item.image || undefined}
                    alt=""
                    width={32}
                    height={32}
                    className="h-8 w-8 shrink-0 rounded-md border border-background-200 object-cover object-top"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[12px] font-medium text-foreground-900">{item.title}</span>
                    <span className="block truncate text-[10.5px] text-foreground-500">{item.marketplace}</span>
                  </span>
                  <i aria-hidden="true" className="ri-arrow-right-up-line text-sm text-foreground-300"></i>
                </button>
              ))}
            </div>
          )}
        </div>

        <button
          type="button"
          aria-label="Search"
          aria-expanded={mobileSearch}
          onClick={() => {
            setMobileSearch((current) => !current);
            setBellOpen(false);
            setProfileOpen(false);
          }}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-foreground-600 hover:bg-background-200 md:hidden cursor-pointer"
        >
          <i aria-hidden="true" className={`${mobileSearch ? 'ri-close-line' : 'ri-search-line'} text-[16px]`}></i>
        </button>

        <button
          type="button"
          onClick={onAddProduct}
          aria-label="Add product"
          className="inline-flex h-8 items-center gap-1.5 whitespace-nowrap rounded-lg bg-primary-600 px-2.5 text-[12px] font-medium text-background-50 transition-colors hover:bg-primary-700 dark:bg-primary-500 dark:text-background-950 dark:hover:bg-primary-400 cursor-pointer"
        >
          <i aria-hidden="true" className="ri-add-line text-[15px]"></i>
          <span className="hidden sm:inline">Add product</span>
        </button>

        <div className="relative">
          <button
            type="button"
            onClick={() => {
              setBellOpen((current) => !current);
              setProfileOpen(false);
            }}
            aria-label="Notifications"
            aria-expanded={bellOpen}
            className="relative flex h-8 w-8 items-center justify-center rounded-lg text-foreground-600 hover:bg-background-200 cursor-pointer"
          >
            <i aria-hidden="true" className="ri-notification-3-line text-[16px]"></i>
            {unreadCount > 0 && (
              <span className="absolute right-1 top-1 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-accent-500 px-1 font-label text-[9px] font-bold text-foreground-950">
                {unreadCount}
              </span>
            )}
          </button>

          {bellOpen && (
            <div className="absolute right-0 top-[calc(100%+6px)] w-[330px] overflow-hidden rounded-xl border border-background-200 bg-background-50 shadow-pop anim-pop">
              <div className="flex items-center justify-between border-b border-background-200 px-3 py-2">
                <p className="text-[12px] font-semibold text-foreground-950">Notifications</p>
                <button
                  type="button"
                  onClick={markAllRead}
                  className="text-[11px] font-medium text-primary-700 dark:text-primary-400 cursor-pointer"
                >
                  Mark all read
                </button>
              </div>
              <div className="max-h-[320px] overflow-y-auto p-1">
                {alerts.slice(0, 4).map((item) => {
                  const visual = alertVisual[item.type];
                  return (
                    <Link
                      key={item.id}
                      to="/app/alerts"
                      onClick={() => setBellOpen(false)}
                      className="flex gap-2.5 rounded-lg px-2 py-2 hover:bg-background-100 cursor-pointer"
                    >
                      <span className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md ${visual.className}`}>
                        <i aria-hidden="true" className={`${visual.icon} text-[13px]`}></i>
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[11.5px] font-medium text-foreground-900">{item.title}</span>
                        <span className="block truncate text-[10.5px] text-foreground-500">{item.message}</span>
                        <span className="mt-0.5 block text-[9.5px] text-foreground-400">{relTime(item.createdAt)}</span>
                      </span>
                      {!item.read && <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-accent-500"></span>}
                    </Link>
                  );
                })}
              </div>
              <Link
                to="/app/alerts"
                onClick={() => setBellOpen(false)}
                className="flex items-center justify-center gap-1 border-t border-background-200 py-2 text-[11.5px] font-medium text-foreground-700 hover:bg-background-100 cursor-pointer"
              >
                View all alerts
                <i aria-hidden="true" className="ri-arrow-right-line text-xs"></i>
              </Link>
            </div>
          )}
        </div>

        <div className="relative">
          <button
            type="button"
            onClick={() => {
              setProfileOpen((current) => !current);
              setBellOpen(false);
            }}
            aria-label="Account menu"
            aria-expanded={profileOpen}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-600/12 font-label text-[10.5px] font-semibold text-primary-700 transition-colors hover:bg-primary-600/20 dark:text-primary-400 cursor-pointer"
          >
            {initials(user?.name ?? 'DA')}
          </button>

          {profileOpen && (
            <div className="absolute right-0 top-[calc(100%+6px)] w-60 overflow-hidden rounded-xl border border-background-200 bg-background-50 p-1 shadow-pop anim-pop">
              <div className="px-2.5 py-2">
                <p className="truncate text-[12px] font-medium text-foreground-900">{user?.name}</p>
                <p className="truncate text-[11px] text-foreground-500">{user?.email}</p>
                <span className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-background-100 px-2 py-0.5 text-[10px] font-medium text-foreground-600">
                  <i aria-hidden="true" className="ri-vip-crown-line text-[10px]"></i>
                  {user?.plan}
                </span>
              </div>
              <div className="my-1 h-px bg-background-200"></div>
              {[
                { label: 'Settings', icon: 'ri-settings-3-line', to: '/app/settings' },
                { label: 'Help & support', icon: 'ri-question-line', to: '/app/help' },
              ].map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={() => setProfileOpen(false)}
                  className="flex items-center gap-2 rounded-md px-2.5 py-1.5 text-[12px] text-foreground-700 hover:bg-background-100 cursor-pointer"
                >
                  <i aria-hidden="true" className={`${item.icon} text-[14px] text-foreground-400`}></i>
                  {item.label}
                </Link>
              ))}
              <div className="my-1 h-px bg-background-200"></div>
              <button
                type="button"
                onClick={async () => {
                  setProfileOpen(false);
                  if (await perform(signOut)) navigate('/login', { replace: true });
                }}
                className="flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-[12px] text-foreground-700 hover:bg-background-100 cursor-pointer"
              >
                <i aria-hidden="true" className="ri-logout-box-r-line text-[14px] text-foreground-400"></i>
                Log out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
