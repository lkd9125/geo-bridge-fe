import { apiClient } from './client.js';

/** 데이터 포맷 저장 */
export async function createFormat(body) {
  await apiClient.post('/user/format', body);
}
