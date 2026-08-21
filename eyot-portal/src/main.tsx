import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router';
import ThemeRoot from '@/components/ThemeRoot';
import { applyTheme, readThemePreference } from '@/lib/theme';
import './i18n';
import router from './router';
import './style.css';

applyTheme(readThemePreference());

const root = document.getElementById('app');
if (!root) throw new Error('Root element not found');
createRoot(root).render(
  <StrictMode>
    <ThemeRoot>
      {/* D1 修复：App.tsx 用 <Outlet />，必须有 RouterProvider 上下文，否则页面静默空白。 */}
      <RouterProvider router={router} />
    </ThemeRoot>
  </StrictMode>,
);
