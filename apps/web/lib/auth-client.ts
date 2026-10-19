import { createAuthClient } from 'better-auth/react';
import { API_URL, getToken, setToken } from './api';

/** Sessions travel as bearer tokens because the web app and API are on different origins. */
export const authClient = createAuthClient({
  baseURL: API_URL,
  fetchOptions: {
    auth: { type: 'Bearer', token: () => getToken() ?? '' },
    onSuccess: (context) => {
      const token = context.response.headers.get('set-auth-token');
      if (token) setToken(token);
    },
  },
});
