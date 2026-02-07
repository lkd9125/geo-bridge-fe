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
