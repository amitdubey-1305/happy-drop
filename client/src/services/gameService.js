import api from './api';

export const gameService = {
  async start(levelId) {
    const res = await api.post('/games/start', { levelId });
    return res.data;
  },

  async complete(payload) {
    // payload: { sessionId, levelId, inkUsed, completionTime }
    const res = await api.post('/games/complete', payload);
    return res.data;
  },
};
