import { apiClient } from './client.js';

/** 호스트 저장 */
export async function createHost(body) {
  await apiClient.post('/user/host', body);
}

/** 호스트 목록 조회 */
export async function getHostList(params = {}) {
  const { data } = await apiClient.get('/user/host/plist', { params });
  return data;
}

/** 호스트 삭제 */
export async function deleteHost(idx) {
  await apiClient.delete('/user/host', { params: { idx } });
}
