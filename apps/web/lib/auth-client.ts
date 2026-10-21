import { createAuthClient } from 'better-auth/react';
import { API_URL, getToken, setToken } from './api';

/** Sessions travel as bearer tokens because the web app and API are on different origins. */
export const authClient = createAuthClient({
  baseURL: API_URL,
  fetchOptions: {
    // Better Auth defaults to sending cookies, which a cross-origin API only accepts with credentialed CORS. Bearer needs none.
    credentials: 'omit',
    auth: { type: 'Bearer', token: () => getToken() ?? '' },
    onSuccess: (context) => {
      const token = context.response.headers.get('set-auth-token');
      if (token) setToken(token);
    },
  },
});
