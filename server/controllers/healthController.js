const healthService = require('../services/healthService');

const getHealth = (req, res) => {
  const data = healthService.getHealthStatus();
  res.status(200).json(data);
};

module.exports = {
  getHealth,
};
