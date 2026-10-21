import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactElement } from 'react';
import { vi } from 'vitest';

/** A canned reply for one API call: the status and JSON body `fetch` should answer with. */
export interface Reply {
  status?: number;
  body?: unknown;
}

/** Replaces `fetch` so no request leaves the test. Returns the requests made, as method, path and parsed body. */
export function mockApi(reply: (method: string, path: string) => Reply = () => ({ body: {} })) {
  const requests: { method: string; path: string; body: unknown }[] = [];
  globalThis.fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const path = new URL(String(input)).pathname;
    const method = init?.method ?? 'GET';
    requests.push({ method, path, body: init?.body ? JSON.parse(String(init.body)) : undefined });
    const { status = 200, body = {} } = reply(method, path);
    return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
  }) as typeof fetch;
  return requests;
}

export function renderWithQuery(ui: ReactElement) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return { user: userEvent.setup(), ...render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>) };
}
