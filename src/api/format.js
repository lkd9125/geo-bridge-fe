import { apiClient } from './client.js';

/** 데이터 포맷 저장 */
export async function createFormat(body) {
  await apiClient.post('/user/format', body);
}

/** 포맷 목록 조회 */
export async function getFormatList(params = {}) {
  const { data } = await apiClient.get('/user/format/plist', { params });
  return data;
}
