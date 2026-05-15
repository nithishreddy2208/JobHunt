import { api } from './client';

export const userApi = {
  /**
   * Update profile. Pass FormData when uploading a resume; otherwise plain object.
   * Backend route: PUT /api/user/profile/update (auth + multer singleUpload "file")
   */
  updateProfile: (data) => {
    const isFormData = typeof FormData !== 'undefined' && data instanceof FormData;
    return api
      .put('/user/profile/update', data, isFormData ? { headers: { 'Content-Type': 'multipart/form-data' } } : undefined)
      .then((r) => r.data);
  },

  upgradeToPro: (paymentRef) =>
    api.post('/user/upgrade', { paymentRef }).then((r) => r.data),

  subscription: () => api.get('/user/subscription').then((r) => r.data)
};
