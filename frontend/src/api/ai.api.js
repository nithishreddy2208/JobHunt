import { api } from './client';

export const aiApi = {
  recommendJobs: () => api.post('/ai/recommend-jobs', {}).then((r) => r.data),

  analyzeResume: () => api.post('/ai/analyze-resume', {}).then((r) => r.data),

  interviewPrep: ({ jobId, role } = {}) =>
    api.post('/ai/interview-prep', { jobId, role }).then((r) => r.data),

  generateCoverLetter: ({ jobId, jobDescription } = {}) =>
    api.post('/ai/generate-cover-letter', { jobId, jobDescription }).then((r) => r.data),

  semanticSearch: (query) => api.post('/ai/search', { query }).then((r) => r.data),

  evaluateMockInterview: ({ role, qa }) =>
    api.post('/ai/mock-interview/evaluate', { role, qa }).then((r) => r.data)
};
