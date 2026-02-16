import { apiClient } from './client.js';

/**
 * 시뮬레이터 실행
 * @param {Object} body - { type, host, name, pointList, speed, speedUnit, cycle, format, topic?, hostId?, password? }
 * @returns {Promise<string>} UUID
 */
export async function runSimulator(body) {
  const { data } = await apiClient.post('/emitter/simulator', body);
  return data;
}

/**
 * 시뮬레이터 종료
 * @param {string} uuid - 시뮬레이터 UUID
 */
export async function stopSimulator(uuid) {
  await apiClient.delete('/emitter/simulator', {
    params: { uuid },
  });
}
