import api from './api';

export const leaderboardService = {
  async top(limit = 10) {
    const res = await api.get(`/leaderboard?limit=${limit}`);
    return res.data;
  },

  async me() {
    const res = await api.get('/leaderboard/me');
    return res.data;
  },
};
