import { apiClient } from './client.js';

/** 로그인 */
export async function login(username, password) {
  const { data } = await apiClient.post('/user/login', { username, password });
  return data;
}

/** 회원가입 */
export async function register(username, password) {
  await apiClient.post('/user/info', { username, password });
}
