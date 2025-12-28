import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000/api',
  withCredentials: true // include HTTP-only cookies (Refresh token)
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

let isRefreshing = false;
let failedQueue = [];

/**
 * Queue for simultaneous failed requests
 * @param {*} error 
 * @param {*} token 
 */
const processQueue = (error, token = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  })

  isRefreshing = false;
  failedQueue = [];
}

/**
 * Handles auto token refresh when access token expires
 */
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise(function (resolve, reject) {
          failedQueue.push({ resolve, reject })
        }).then(token => { // New token received
          originalRequest.headers['Authorization'] = 'Bearer ' + token;
          return api(originalRequest);
        })
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try { // First request to retry, others will go into queue
        const res = await api.post('/auth/refresh');
        const { accessToken } = res.data;
        localStorage.setItem('accessToken', accessToken);
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        processQueue(null, accessToken); // Retry all failed requests
        return api(originalRequest); 
      } catch (err) {
        processQueue(err, null);
        localStorage.removeItem('accessToken');
        window.location.href = '/login';
        return Promise.reject(err);
      }
    }
    return Promise.reject(error);
  }
);

export default api;