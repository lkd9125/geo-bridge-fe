/**
 * 모니터링 좌표 스트림 연결 (SSE)
 * fetch API를 사용하여 Authorization 헤더를 포함한 스트림을 받습니다.
 * @param {Function} onMessage - 메시지 수신 콜백
 * @param {Function} onError - 에러 콜백
 * @returns {Function} 연결 종료 함수
 */
export function createMonitoringStream(onMessage, onError) {
  const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';
  const token = localStorage.getItem('accessToken');
  const url = `${API_BASE}/api/v1/emitter/simulator/monitoring/coords`;
  
  let abortController = new AbortController();
  let isClosed = false;

  console.log('모니터링 스트림 연결 시작:', url);
  
  fetch(url, {
    method: 'GET',
    headers: {
      'Authorization': token ? `Bearer ${token}` : '',
      'Accept': 'text/event-stream',
    },
    signal: abortController.signal,
  })
    .then(async (response) => {
      console.log('응답 상태:', response.status, response.statusText);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      console.log('스트림 읽기 시작');

      while (true) {
        const { done, value } = await reader.read();
        
        if (done) {
          break;
        }

        buffer += decoder.decode(value, { stream: true });

        // SSE: 이벤트는 빈 줄(\n\n)로 구분. 완전한 이벤트만 처리
        const eventBlocks = buffer.split(/\n\n+/);
        buffer = eventBlocks.pop() || '';

        const processLine = (line) => {
          const trimmed = line.replace(/\r$/, '').trim();
          let dataStr = null;
          if (trimmed.startsWith('data: ')) {
            dataStr = trimmed.substring(6).trim();
          } else if (trimmed.startsWith('data:')) {
            dataStr = trimmed.substring(5).trim();
          } else if (trimmed.startsWith('{')) {
            dataStr = trimmed;
          }
          if (dataStr) {
            try {
              onMessage({ data: dataStr });
            } catch (err) {
              console.error('메시지 처리 오류:', err);
            }
          }
        };

        for (const block of eventBlocks) {
          block.split(/\n/).forEach(processLine);
        }

        // \n\n 없이 한 줄씩 올 때: 남은 버퍼에서 \n으로 나눈 완전한 줄만 처리
        const lines = buffer.split(/\n/);
        buffer = lines.pop() || '';
        lines.forEach(processLine);
      }
    })
    .catch((err) => {
      if (!isClosed && err.name !== 'AbortError') {
        onError(err);
      }
    });

  // 연결 종료 함수 반환
  return () => {
    isClosed = true;
    abortController.abort();
  };
}
