import { vi } from 'vitest';

/** The router every component under test receives, so a test can see where a page sent the Member. */
export const router = {
  push: vi.fn<(href: string) => void>(),
  replace: vi.fn<(href: string) => void>(),
};
