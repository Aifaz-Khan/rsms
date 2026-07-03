import api from './axios';

export const authApi = {
  login: (data: { email: string; password: string }) => api.post('/auth/login', data),
  register: (data: { email: string; password: string; firstName: string; lastName: string; organization?: string }) => api.post('/auth/register', data),
  logout: () => api.post('/auth/logout'),
  refreshToken: () => api.post('/auth/refresh-token'),
  forgotPassword: (email: string) => api.post('/auth/forgot-password', { email }),
  resetPassword: (data: { token: string; password: string }) => api.post('/auth/reset-password', data),
  getMe: () => api.get('/auth/me'),
  updateProfile: (data: { firstName: string; lastName: string; phone?: string; organization?: string }) => api.put('/auth/profile', data),
  changePassword: (data: { currentPassword: string; newPassword: string }) => api.put('/auth/change-password', data),
};

export const surveyApi = {
  getAll: (params?: Record<string, unknown>) => api.get('/surveys', { params }),
  getById: (id: string) => api.get(`/surveys/${id}`),
  getBySlug: (slug: string) => api.get(`/surveys/slug/${slug}`),
  create: (data: Record<string, unknown>) => api.post('/surveys', data),
  update: (id: string, data: Record<string, unknown>) => api.put(`/surveys/${id}`, data),
  delete: (id: string) => api.delete(`/surveys/${id}`),
  duplicate: (id: string) => api.post(`/surveys/${id}/duplicate`),
  getQRCode: (id: string) => api.get(`/surveys/${id}/qrcode`),
  publish: (id: string) => api.patch(`/surveys/${id}/publish`),
  archive: (id: string) => api.patch(`/surveys/${id}/archive`),
};

export const sectionApi = {
  getAll: (surveyId: string) => api.get(`/sections`, { params: { surveyId } }),
  create: (surveyId: string, data: Record<string, unknown>) => api.post(`/sections`, { ...data, surveyId }),
  update: (id: string, data: Record<string, unknown>) => api.put(`/sections/${id}`, data),
  delete: (id: string) => api.delete(`/sections/${id}`),
  reorder: (surveyId: string, sections: { id: string; order: number }[]) => api.post(`/sections/reorder`, { surveyId, sections }),
};

export const questionApi = {
  getAll: (sectionId: string) => api.get(`/questions`, { params: { sectionId } }),
  create: (sectionId: string, data: Record<string, unknown>) => api.post(`/questions`, { ...data, sectionId }),
  update: (id: string, data: Record<string, unknown>) => api.put(`/questions/${id}`, data),
  delete: (id: string) => api.delete(`/questions/${id}`),
  reorder: (sectionId: string, questions: { id: string; order: number }[]) => api.post(`/questions/reorder`, { sectionId, questions }),
  addOption: (questionId: string, data: Record<string, unknown>) => api.post(`/questions/${questionId}/options`, data),
  updateOption: (questionId: string, optionId: string, data: Record<string, unknown>) => api.put(`/questions/${questionId}/options/${optionId}`, data),
  deleteOption: (questionId: string, optionId: string) => api.delete(`/questions/${questionId}/options/${optionId}`),
  setSurveyLogic: (data: Record<string, unknown>) => api.post(`/questions/logic`, data),
  deleteSurveyLogic: (id: string) => api.delete(`/questions/logic/${id}`),
};

export const responseApi = {
  getToken: (surveyId: string, email?: string) => api.post('/responses/token', { surveyId, email }),
  start: (surveyId: string) => api.post('/responses/start', { surveyId }),
  save: (data: { responseId: string; answers: { questionId: string; value: unknown }[]; currentSectionId?: string; currentQuestionOrder?: number }) =>
    api.post('/responses/save', data),
  submit: (data: { responseId: string; answers: { questionId: string; value: unknown }[] }) => api.post('/responses/submit', data),
  getAll: (params?: Record<string, unknown>) => api.get('/responses', { params }),
  getById: (id: string) => api.get(`/responses/${id}`),
  delete: (id: string) => api.delete(`/responses/${id}`),
};

export const analyticsApi = {
  getSurveyAnalytics: (surveyId: string) => api.get(`/analytics/surveys/${surveyId}`),
};

export const exportApi = {
  csv: (surveyId: string) => api.get(`/export/surveys/${surveyId}/csv`, { responseType: 'blob' }),
  excel: (surveyId: string) => api.get(`/export/surveys/${surveyId}/excel`, { responseType: 'blob' }),
};

export const dashboardApi = {
  getStats: () => api.get('/dashboard/stats'),
};

export const userApi = {
  getAll: (params?: Record<string, unknown>) => api.get('/users', { params }),
  create: (data: Record<string, unknown>) => api.post('/users', data),
  update: (id: string, data: Record<string, unknown>) => api.put(`/users/${id}`, data),
  delete: (id: string) => api.delete(`/users/${id}`),
  toggleStatus: (id: string) => api.patch(`/users/${id}/toggle-status`),
};

export const questionBankApi = {
  getAll: (params?: Record<string, unknown>) => api.get('/question-bank', { params }),
  add: (data: Record<string, unknown>) => api.post('/question-bank', data),
  delete: (id: string) => api.delete(`/question-bank/${id}`),
};
