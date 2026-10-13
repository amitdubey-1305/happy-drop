const getHealthStatus = () => {
  return {
    status: 'ok',
    time: new Date().toISOString(),
  };
};

module.exports = {
  getHealthStatus,
};
