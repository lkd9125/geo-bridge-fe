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

// 401/J403 시: storage 정리 + 커스텀 이벤트만 (window.location 사용 금지 — file://에서 file:///C:/ 등으로 이탈)
// 실제 이동은 App.jsx AuthRequiredListener의 navigate('/')가 담당
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const code = error.response?.data?.code;
    const isUnauthorized = error.response?.status === 401;
    const isJwtExpired = code === 'J403';

    if (isUnauthorized || isJwtExpired) {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      window.dispatchEvent(new CustomEvent('auth-required'));
    }
    return Promise.reject(error);
  }
);
