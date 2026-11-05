import { apiClient } from './client.js';

/** 실행 이력 목록 조회 */
export async function getHistoryList(params = {}) {
  const { data } = await apiClient.get('/emitter/history/plist', { params });
  return data;
}

/** 실행 이력 즐겨찾기 상태 변경 */
export async function toggleHistoryFavorite(sn, title) {
  const { data } = await apiClient.patch('/emitter/history/favorite', null, {
    params: { sn, ...(title ? { title } : {}) },
  });
  return data;
}

/** 실행 이력 삭제 */
export async function deleteHistory(sn) {
  await apiClient.delete('/emitter/history', { params: { sn } });
}
