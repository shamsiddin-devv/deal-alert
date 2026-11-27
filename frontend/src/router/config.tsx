import { lazy } from 'react';
import type { RouteObject } from 'react-router-dom';
import Login from '@/pages/auth/login/page';
import Signup from '@/pages/auth/signup/page';
import { ForgotPassword, ResetPassword } from '@/pages/auth/recovery/page';
import VerifyEmail from '@/pages/auth/verify-email/page';
import NotFound from '@/pages/NotFound';
import { RequireAuth } from '@/contexts/AuthContext';

const Home = lazy(() => import('@/pages/home/page'));
const AppLayout = lazy(() => import('@/pages/app/AppLayout'));
const Overview = lazy(() => import('@/pages/app/overview/page'));
const ExploreDeals = lazy(() => import('@/pages/app/deals/page'));
const MyProducts = lazy(() => import('@/pages/app/products/page'));
const ProductDetail = lazy(() => import('@/pages/app/product-detail/page'));
const ComparePage = lazy(() => import('@/pages/app/compare/page'));
const CollectionsPage = lazy(() => import('@/pages/app/collections/page'));
const HistoryPage = lazy(() => import('@/pages/app/history/page'));
const AlertsPage = lazy(() => import('@/pages/app/alerts/page'));
const InsightsPage = lazy(() => import('@/pages/app/insights/page'));
const SettingsPage = lazy(() => import('@/pages/app/settings/page'));
const HelpPage = lazy(() => import('@/pages/app/help/page'));

const routes: RouteObject[] = [
  { path: '/', element: <Home /> },
  { path: '/login', element: <Login /> },
  { path: '/signup', element: <Signup /> },
  { path: '/forgot-password', element: <ForgotPassword /> },
  { path: '/reset-password', element: <ResetPassword /> },
  { path: '/verify-email', element: <VerifyEmail /> },
  {
    path: '/app',
    element: (
      <RequireAuth>
        <AppLayout />
      </RequireAuth>
    ),
    children: [
      { index: true, element: <Overview /> },
      { path: 'deals', element: <ExploreDeals /> },
      { path: 'products', element: <MyProducts /> },
      { path: 'products/:id', element: <ProductDetail /> },
      { path: 'compare', element: <ComparePage /> },
      { path: 'collections', element: <CollectionsPage /> },
      { path: 'history', element: <HistoryPage /> },
      { path: 'alerts', element: <AlertsPage /> },
      { path: 'insights', element: <InsightsPage /> },
      { path: 'settings', element: <SettingsPage /> },
      { path: 'help', element: <HelpPage /> },
    ],
  },
  { path: '*', element: <NotFound /> },
];

export default routes;
