import { api } from './client';

export const companyApi = {
  list: () => api.get('/company/get').then((r) => r.data),
  byId: (id) => api.get(`/company/get/${id}`).then((r) => r.data),
  create: (payload) => api.post('/company/register', payload).then((r) => r.data),
  update: (id, payload) => api.put(`/company/update/${id}`, payload).then((r) => r.data)
};
