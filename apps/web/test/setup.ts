import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

afterEach(() => cleanup());

// jsdom has no layout engine, which the select popup and its focus handling ask about.
globalThis.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
};
Element.prototype.scrollIntoView = () => {};

vi.mock('next/navigation', async () => {
  const { router } = await import('./router');
  return { useRouter: () => router, useParams: () => ({}) };
});
