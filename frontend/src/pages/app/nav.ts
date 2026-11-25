export type NavItem = { label: string; to: string; icon: string; end?: boolean };

export const navGroups: { title: string; items: NavItem[] }[] = [
  {
    title: 'Main',
    items: [
      { label: 'Overview', to: '/app', icon: 'ri-layout-grid-line', end: true },
      { label: 'Explore Deals', to: '/app/deals', icon: 'ri-compass-3-line' },
    ],
  },
  {
    title: 'Product management',
    items: [
      { label: 'My Products', to: '/app/products', icon: 'ri-inbox-archive-line' },
      { label: 'Price Comparison', to: '/app/compare', icon: 'ri-arrow-left-right-line' },
      { label: 'Collections', to: '/app/collections', icon: 'ri-folder-3-line' },
    ],
  },
  {
    title: 'Monitoring',
    items: [
      { label: 'Price History', to: '/app/history', icon: 'ri-line-chart-line' },
      { label: 'Alerts', to: '/app/alerts', icon: 'ri-notification-3-line' },
    ],
  },
  {
    title: 'Analytics',
    items: [{ label: 'Insights & Savings', to: '/app/insights', icon: 'ri-pie-chart-2-line' }],
  },
  {
    title: 'Preferences',
    items: [
      { label: 'Settings', to: '/app/settings', icon: 'ri-settings-3-line' },
      { label: 'Help & Support', to: '/app/help', icon: 'ri-question-line' },
    ],
  },
];

export const pageTitles: Record<string, string> = {
  '/app': 'Overview',
  '/app/deals': 'Explore Deals',
  '/app/products': 'My Products',
  '/app/compare': 'Price Comparison',
  '/app/collections': 'Collections',
  '/app/history': 'Price History',
  '/app/alerts': 'Alerts',
  '/app/insights': 'Insights & Savings',
  '/app/settings': 'Settings',
  '/app/help': 'Help & Support',
};

export const resolveTitle = (pathname: string): string => {
  if (pageTitles[pathname]) return pageTitles[pathname];
  if (pathname.startsWith('/app/products/')) return 'Product details';
  return 'Workspace';
};