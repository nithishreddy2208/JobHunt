import { api } from './client';

export const recruiterAiApi = {
  matchScores: (jobId) =>
    api.get(`/ai/recruiter/match-score/${jobId}`).then((r) => r.data),

  candidateSummary: (applicationId) =>
    api.post(`/ai/recruiter/candidate-summary/${applicationId}`).then((r) => r.data),

  shortlist: (jobId, top = 5) =>
    api.get(`/ai/recruiter/shortlist/${jobId}`, { params: { top } }).then((r) => r.data),

  analytics: (jobId) =>
    api.get(`/ai/recruiter/analytics/${jobId}`).then((r) => r.data),

  optimizeJd: ({ title, description, requirements }) =>
    api
      .post(`/ai/recruiter/optimize-jd`, { title, description, requirements })
      .then((r) => r.data),

  generateEmail: (payload) =>
    api.post(`/ai/recruiter/generate-email`, payload).then((r) => r.data)
};
