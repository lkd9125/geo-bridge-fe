import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';

export const apiClient = axios.create({
  baseURL: `${API_BASE}/api/v1`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 요청 시 JWT 토큰 자동 첨부
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// 401 또는 JWT 만료(J403) 응답 시 로그아웃 후 로그인 화면으로
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const code = error.response?.data?.code;
    const isUnauthorized = error.response?.status === 401;
    const isJwtExpired = code === 'J403';

    if (isUnauthorized || isJwtExpired) {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);
