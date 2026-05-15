import { api } from './client';

export const jobApi = {
  list: (params) => api.get('/job/get', { params }).then((r) => r.data),
  byId: (id) => api.get(`/job/get/${id}`).then((r) => r.data),
  suggest: (prefix, limit = 8) =>
    api.get('/job/suggest', { params: { prefix, limit } }).then((r) => r.data),
  // recruiter
  myJobs: () => api.get('/job/getadminjobs').then((r) => r.data),
  create: (payload) => api.post('/job/post', payload).then((r) => r.data)
};
