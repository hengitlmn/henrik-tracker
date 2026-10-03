import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import 'virtual:pwa-register';
import App from './App';
import './styles.css';

// Zoom blockieren (iOS-Gesten), siehe CLAUDE.md
['gesturestart', 'gesturechange', 'gestureend'].forEach((t) => {
  document.addEventListener(t, (e) => e.preventDefault(), { passive: false });
});
document.addEventListener(
  'touchmove',
  (e) => {
    if (e.touches && e.touches.length > 1) e.preventDefault();
  },
  { passive: false },
);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
