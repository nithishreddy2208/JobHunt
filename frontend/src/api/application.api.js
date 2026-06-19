import { api } from './client';

export const applicationApi = {
  // `screening` is the optional pre-screening profile from the AI Application
  // Assistant. Omitted for legacy/direct applies.
  apply: (jobId, screening) =>
    api.post(`/application/apply/${jobId}`, screening ? { screening } : {}).then((r) => r.data),
  mine: (params) => api.get('/application/get', { params }).then((r) => r.data),
  applicants: (jobId, params) =>
    api.get(`/application/${jobId}/applicants`, { params }).then((r) => r.data),
  updateStatus: (applicationId, status) =>
    api.put(`/application/status/${applicationId}/update`, { status }).then((r) => r.data)
};
