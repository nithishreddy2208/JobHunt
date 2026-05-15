import { api } from './client';

export const authApi = {
  register: (payload) => api.post('/user/register', payload).then((r) => r.data),
  login: (payload) => api.post('/user/login', payload).then((r) => r.data),
  logout: () => api.get('/user/logout').then((r) => r.data),
  // Used as a session probe; if the user is logged in, returns subscription info.
  me: () => api.get('/user/subscription').then((r) => r.data)
};
