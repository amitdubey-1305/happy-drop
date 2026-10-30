import api from './api';

export const levelService = {
  async list() {
    const res = await api.get('/levels');
    return res.data;
  },

  async byId(id) {
    const res = await api.get(`/levels/${id}`);
    return res.data;
  },

  async generated(seed) {
    const res = await api.get(`/levels/generated/${seed}`);
    return res.data;
  },
};
