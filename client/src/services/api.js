import axios from 'axios';

// Event listener mechanism for waking up server notification
let wakingUpListeners = [];
let pendingRequestsCount = 0;
let wakingUpTimer = null;

export const onWakingUpChange = (listener) => {
  wakingUpListeners.push(listener);
  return () => {
    wakingUpListeners = wakingUpListeners.filter((l) => l !== listener);
  };
};

const notifyWakingUp = (isWakingUp) => {
  wakingUpListeners.forEach((fn) => fn(isWakingUp));
};

const startWakingUpTimer = () => {
  pendingRequestsCount++;
  if (!wakingUpTimer) {
    wakingUpTimer = setTimeout(() => {
      if (pendingRequestsCount > 0) {
        notifyWakingUp(true);
      }
    }, 4000);
  }
};

const stopWakingUpTimer = () => {
  pendingRequestsCount = Math.max(0, pendingRequestsCount - 1);
  if (pendingRequestsCount === 0) {
    if (wakingUpTimer) {
      clearTimeout(wakingUpTimer);
      wakingUpTimer = null;
    }
    notifyWakingUp(false);
  }
};

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000,
});

// Request Interceptor: Attach Bearer token from localStorage
api.interceptors.request.use(
  (config) => {
    startWakingUpTimer();

    const token = localStorage.getItem('happy_drop_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Initialize retry counter for GET requests
    if (!config._retryCount) {
      config._retryCount = 0;
    }

    return config;
  },
  (error) => {
    stopWakingUpTimer();
    return Promise.reject(error);
  }
);

// Response Interceptor: Format errors and handle 401 auth expiration & GET retries
api.interceptors.response.use(
  (response) => {
    stopWakingUpTimer();
    return response;
  },
  async (error) => {
    stopWakingUpTimer();

    const config = error.config;

    // Retry network errors or 5xx up to 2 times for GET requests only
    const isGet = config?.method?.toLowerCase() === 'get';
    const isNetworkError = !error.response || error.code === 'ECONNABORTED' || error.response.status >= 500;

    if (isGet && isNetworkError && config && config._retryCount < 2) {
      config._retryCount += 1;
      const backoffDelay = config._retryCount * 1000;
      await new Promise((resolve) => setTimeout(resolve, backoffDelay));
      return api(config);
    }

    const responseData = error.response?.data || {};
    const status = error.response?.status || 500;
    const code = responseData.code || error.code || 'UNKNOWN_ERROR';
    const message = responseData.message || error.message || 'An unexpected error occurred';

    // On 401 with token invalidity: clear token and redirect to /login
    const authErrorCodes = ['NO_TOKEN', 'INVALID_TOKEN', 'TOKEN_EXPIRED'];
    if (status === 401 && authErrorCodes.includes(code)) {
      localStorage.removeItem('happy_drop_token');
      localStorage.removeItem('happy_drop_user');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }

    return Promise.reject({
      message,
      code,
      status,
    });
  }
);

export default api;
