import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

afterEach(() => {
  cleanup();
  localStorage.clear();
});

// jsdom hat kein scrollTo und keine Layout-Werte
window.scrollTo = () => {};
