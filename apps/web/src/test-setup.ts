import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// RTL auto-cleanup relies on vitest globals, which this workspace keeps off;
// register it explicitly so components unmount between tests.
afterEach(() => {
  cleanup();
});
