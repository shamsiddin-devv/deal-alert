import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { navGroups } from '@/pages/app/nav';
import { useAuth } from '@/contexts/AuthContext';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { initials } from '@/lib/format';

export default function Sidebar({
  collapsed,
  onToggleCollapse,
  mobileOpen,
  onCloseMobile,
}: {
  collapsed: boolean;
  onToggleCollapse: () => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}) {
  const { user, signOut } = useAuth();
  const { unread, perform } = useWorkspace();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const onClick = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [menuOpen]);

  const handleSignOut = async () => {
    setMenuOpen(false);
    if (await perform(signOut)) navigate('/login', { replace: true });
  };

  const isCollapsed = collapsed && !mobileOpen;

  return (
    <>
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-foreground-950/45 backdrop-blur-[2px] lg:hidden anim-fade"
          onClick={onCloseMobile}
          aria-hidden="true"
        ></div>
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-[272px] flex-col border-r border-background-200 bg-background-50 transition-all duration-200 ease-out lg:sticky lg:inset-y-auto lg:top-0 lg:z-auto lg:h-screen lg:translate-x-0 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        } ${isCollapsed ? 'lg:w-[72px]' : 'lg:w-[248px]'}`}
        aria-label="Main navigation"
      >
        <div className={`flex h-14 shrink-0 items-center gap-2 border-b border-background-200 px-3 ${isCollapsed ? 'lg:justify-center' : ''}`}>
          <Link to="/app" className="flex min-w-0 items-center gap-2.5 cursor-pointer" onClick={onCloseMobile}>
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-foreground-950 text-background-50">
              <i aria-hidden="true" className="ri-price-tag-3-line text-[15px]"></i>
            </span>
            {!isCollapsed && (
              <span className="truncate font-heading text-[15px] font-semibold tracking-tight text-foreground-950">
                Deal Alert
              </span>
            )}
          </Link>
          {!isCollapsed && (
            <button
              type="button"
              onClick={onToggleCollapse}
              aria-label="Collapse sidebar"
              className="ml-auto hidden h-7 w-7 items-center justify-center rounded-md text-foreground-400 hover:bg-background-100 hover:text-foreground-800 lg:flex cursor-pointer"
            >
              <i aria-hidden="true" className="ri-sidebar-fold-line text-base"></i>
            </button>
          )}
          <button
            type="button"
            onClick={onCloseMobile}
            aria-label="Close menu"
            className="ml-auto flex h-7 w-7 items-center justify-center rounded-md text-foreground-500 hover:bg-background-100 lg:hidden cursor-pointer"
          >
            <i aria-hidden="true" className="ri-close-line text-lg"></i>
          </button>
        </div>

        {isCollapsed && (
          <button
            type="button"
            onClick={onToggleCollapse}
            aria-label="Expand sidebar"
            className="mx-auto mt-2 hidden h-7 w-7 items-center justify-center rounded-md text-foreground-400 hover:bg-background-100 hover:text-foreground-800 lg:flex cursor-pointer"
          >
            <i aria-hidden="true" className="ri-sidebar-unfold-line text-base"></i>
          </button>
        )}

        <nav className="hide-scrollbar flex-1 overflow-y-auto px-2 py-3">
          {navGroups.map((group) => (
            <div key={group.title} className="mb-3 last:mb-0">
              {!isCollapsed && (
                <p className="px-2 pb-1.5 pt-1 text-[9.5px] font-semibold uppercase tracking-[0.16em] text-foreground-400">
                  {group.title}
                </p>
              )}
              {isCollapsed && <div className="mx-auto mb-2 h-px w-6 bg-background-200"></div>}
              <ul className="space-y-0.5">
                {group.items.map((item) => (
                  <li key={item.to}>
                    <NavLink
                      to={item.to}
                      end={item.end}
                      onClick={onCloseMobile}
                      title={isCollapsed ? item.label : undefined}
                      aria-label={isCollapsed ? item.label : undefined}
                      className={({ isActive }) =>
                        `group flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[12.5px] font-medium transition-colors duration-150 ${
                          isActive
                            ? 'bg-background-950/[0.06] text-foreground-950 dark:bg-background-50/10'
                            : 'text-foreground-600 hover:bg-background-100 hover:text-foreground-900'
                        } ${isCollapsed ? 'lg:justify-center lg:px-0' : ''}`
                      }
                    >
                      {({ isActive }) => (
                        <>
                          <span className="relative flex w-4 shrink-0 items-center justify-center">
                            <i aria-hidden="true" className={`${item.icon} text-[16px] ${isActive ? 'text-primary-600 dark:text-primary-400' : ''}`}></i>
                            {item.to === '/app/alerts' && unread > 0 && (
                              <span className="absolute -right-1.5 -top-1 h-1.5 w-1.5 rounded-full bg-accent-500"></span>
                            )}
                          </span>
                          {!isCollapsed && <span className="truncate">{item.label}</span>}
                          {!isCollapsed && item.to === '/app/alerts' && unread > 0 && (
                            <span className="ml-auto rounded-full bg-accent-500/15 px-1.5 py-0.5 font-label text-[10px] font-semibold text-accent-800 dark:text-accent-400">
                              {unread}
                            </span>
                          )}
                        </>
                      )}
                    </NavLink>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>

        <div className="relative shrink-0 border-t border-background-200 p-2" ref={menuRef}>
          {menuOpen && (
            <div className="absolute bottom-[calc(100%-4px)] left-2 right-2 z-50 overflow-hidden rounded-xl border border-background-200 bg-background-50 p-1 shadow-pop anim-pop">
              <div className="px-2.5 py-2">
                <p className="truncate text-[12px] font-medium text-foreground-900">{user?.name ?? 'Guest'}</p>
                <p className="truncate text-[11px] text-foreground-500">{user?.email}</p>
              </div>
              <div className="my-1 h-px bg-background-200"></div>
              {[
                { label: 'Account settings', icon: 'ri-user-settings-line', to: '/app/settings' },
                { label: 'Help & support', icon: 'ri-question-line', to: '/app/help' },
              ].map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={() => {
                    setMenuOpen(false);
                    onCloseMobile();
                  }}
                  className="flex items-center gap-2 rounded-md px-2.5 py-1.5 text-[12px] text-foreground-700 hover:bg-background-100 cursor-pointer"
                >
                  <i aria-hidden="true" className={`${item.icon} text-[14px] text-foreground-400`}></i>
                  {item.label}
                </Link>
              ))}
              <div className="my-1 h-px bg-background-200"></div>
              <button
                type="button"
                onClick={handleSignOut}
                className="flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-[12px] text-foreground-700 hover:bg-background-100 cursor-pointer"
              >
                <i aria-hidden="true" className="ri-logout-box-r-line text-[14px] text-foreground-400"></i>
                Log out
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={() => setMenuOpen((current) => !current)}
            aria-expanded={menuOpen}
            className={`flex w-full items-center gap-2.5 rounded-lg px-1.5 py-1.5 text-left transition-colors hover:bg-background-100 cursor-pointer ${
              isCollapsed ? 'lg:justify-center lg:px-0' : ''
            }`}
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-600/12 font-label text-[11px] font-semibold text-primary-700 dark:text-primary-400">
              {initials(user?.name ?? 'Deal Alert')}
            </span>
            {!isCollapsed && (
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[12px] font-medium text-foreground-900">{user?.name}</span>
                <span className="block truncate text-[10.5px] text-foreground-500">{user?.plan ?? 'Starter plan'}</span>
              </span>
            )}
            {!isCollapsed && <i aria-hidden="true" className="ri-more-2-line text-foreground-400"></i>}
          </button>
        </div>
      </aside>
    </>
  );
}