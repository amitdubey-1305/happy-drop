import api from './api';

export const progressService = {
  async progress() {
    const res = await api.get('/progress');
    return res.data;
  },

  async progressByLevel(levelId) {
    const res = await api.get(`/progress/${levelId}`);
    return res.data;
  },

  async stats() {
    const res = await api.get('/stats/me');
    return res.data;
  },
};
