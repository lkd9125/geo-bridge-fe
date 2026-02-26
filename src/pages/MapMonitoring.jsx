import { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { createMonitoringStream } from '../api/monitoring.js';
import { stopSimulator } from '../api/simulator.js';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './MapMonitoring.css';

// Leaflet 마커 아이콘 설정 (기본 아이콘 경로 문제 해결)
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

// 시뮬레이터 아이콘 생성 함수 (heading: 도 단위, 0=북쪽, 시계방향)
function createDroneIcon(color = '#3b82f6', heading = 0) {
  return L.divIcon({
    className: 'drone-marker',
    html: `<div style="
      width: 20px;
      height: 20px;
      display: flex;
      align-items: center;
      justify-content: center;
      transform: rotate(${heading}deg);
    ">
      <div style="
        width: 0;
        height: 0;
        border-left: 6px solid transparent;
        border-right: 6px solid transparent;
        border-bottom: 14px solid ${color};
        filter: drop-shadow(0 1px 2px rgba(0,0,0,0.3));
      "></div>
    </div>`,
    iconSize: [20, 20],
    iconAnchor: [10, 10],
  });
}

export default function MapMonitoring() {
  const [drones, setDrones] = useState(new Map()); // Map<uuid, {uuid, lat, lon, heading?, clientName, lastUpdate}>
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState('');
  const [stoppingUuid, setStoppingUuid] = useState(null);
  const eventSourceRef = useRef(null);
  const defaultCenter = [37.5665, 126.978]; // 서울

  const handleStopSimulator = async (uuid) => {
    if (!uuid) return;
    setStoppingUuid(uuid);
    setError('');
    try {
      await stopSimulator(uuid);
      setDrones((prev) => {
        const next = new Map(prev);
        next.delete(uuid);
        return next;
      });
    } catch (err) {
      // 401/J403이면 auth-required 이벤트로 로그인 이동 처리됨. 그 외만 에러 메시지 표시
      const code = err.response?.data?.code;
      if (code !== 'J403' && err.response?.status !== 401) {
        const message = err.response?.data?.message ?? err.message ?? '시뮬레이션 종료에 실패했습니다.';
        setError(message);
      }
    } finally {
      setStoppingUuid(null);
    }
  };

  useEffect(() => {
    const handleMessage = (event) => {
      try {
        const rawData = event.data;
        console.log('수신된 데이터:', rawData);
        
        const data = JSON.parse(rawData);
        console.log('파싱된 데이터:', data);
        
        // 연결 확인 메시지
        if (data.status === 'connected') {
          console.log('모니터링 스트림 연결됨');
          setIsConnected(true);
          setError('');
          return;
        }

        // 좌표 데이터 처리: { uuid, lat, lon, heading?, clientName? }
        const toDrone = (item) => ({
          uuid: item.uuid,
          lat: item.lat,
          lon: item.lon,
          heading: item.heading,
          clientName: item.clientName ?? item.client_name ?? item.name ?? `Drone ${item.uuid.substring(0, 8)}`,
          lastUpdate: new Date(),
        });
        const hasValidCoords = (item) =>
          item.uuid && item.lat != null && item.lon != null && Number.isFinite(Number(item.lat)) && Number.isFinite(Number(item.lon));
        if (Array.isArray(data)) {
          console.log('배열 형식 데이터 수신:', data.length, '개');
          const newDrones = new Map();
          data.forEach((item) => {
            if (hasValidCoords(item)) {
              newDrones.set(item.uuid, toDrone(item));
            }
          });
          console.log('시뮬레이터 맵 업데이트:', newDrones.size, '개');
          setDrones(newDrones);
        } else if (hasValidCoords(data)) {
          console.log('단일 시뮬레이터 데이터 수신:', data.uuid, data.lat, data.lon);
          setDrones((prev) => {
            const newDrones = new Map(prev);
            newDrones.set(data.uuid, toDrone(data));
            console.log('시뮬레이터 맵 업데이트 후:', newDrones.size, '개');
            return newDrones;
          });
        } else {
          console.warn('알 수 없는 데이터 형식:', data);
        }
      } catch (err) {
        console.error('데이터 파싱 오류:', err, event.data);
      }
    };

    const handleError = (err) => {
      console.error('모니터링 스트림 오류:', err);
      setError('모니터링 연결 오류가 발생했습니다.');
      setIsConnected(false);
    };

    // SSE 연결 시작
    const closeStream = createMonitoringStream(handleMessage, handleError);
    eventSourceRef.current = closeStream;

    // cleanup
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current();
        eventSourceRef.current = null;
      }
      setIsConnected(false);
    };
  }, []);

  const droneList = Array.from(drones.values()).filter(
    (d) => d.lat != null && d.lon != null && Number.isFinite(d.lat) && Number.isFinite(d.lon)
  );

  return (
    <div className="page map-monitoring-page">
      <h1>모니터링</h1>
      <div className="monitoring-header">
        <div className="status-indicator">
          <span className={`status-dot ${isConnected ? 'connected' : 'disconnected'}`}></span>
          <span>{isConnected ? '연결됨' : '연결 끊김'}</span>
        </div>
        <div className="drone-count">
          활성 시뮬레이터: {droneList.length}대
        </div>
      </div>

      {error && <p className="monitoring-error">{error}</p>}

      <div className="monitoring-layout">
        <div className="monitoring-map-container">
          <MapContainer
            center={defaultCenter}
            zoom={13}
            style={{ height: '100%', width: '100%' }}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {droneList.length > 0 ? (
              droneList.map((drone, index) => {
                const colors = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6'];
                const color = colors[index % colors.length];
                const heading = drone.heading != null ? drone.heading : 0;
                const lat = Number(drone.lat);
                const lon = Number(drone.lon);
                if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
                return (
                  <Marker
                    key={drone.uuid}
                    position={[lat, lon]}
                    icon={createDroneIcon(color, heading)}
                  >
                    <Popup>
                      <div className="drone-popup">
                        <div className="drone-popup-title">
                          <strong>{drone.clientName}</strong>
                          <span className="drone-uuid-small">{drone.uuid}</span>
                        </div>
                        <div>위도: {drone.lat != null ? Number(drone.lat).toFixed(6) : '—'}</div>
                        <div>경도: {drone.lon != null ? Number(drone.lon).toFixed(6) : '—'}</div>
                        {drone.heading != null && (
                          <div>방위각: {Number(drone.heading).toFixed(1)}°</div>
                        )}
                        <div className="last-update">
                          업데이트: {drone.lastUpdate?.toLocaleTimeString() ?? '—'}
                        </div>
                      </div>
                    </Popup>
                  </Marker>
                );
              })
            ) : (
              <div style={{ position: 'absolute', top: '10px', left: '10px', background: 'white', padding: '10px', zIndex: 1000 }}>
                시뮬레이터 데이터 대기 중... (콘솔 확인)
              </div>
            )}
          </MapContainer>
        </div>

        <div className="monitoring-sidebar">
          <h3>시뮬레이터 목록</h3>
          {droneList.length === 0 ? (
            <p className="no-drones">활성 시뮬레이터가 없습니다.</p>
          ) : (
            <div className="drone-list">
              {droneList.map((drone, index) => {
                const colors = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6'];
                const color = colors[index % colors.length];
                return (
                  <div key={drone.uuid} className="drone-item">
                    <div className="drone-item-header">
                      <span 
                        className="drone-color-dot" 
                        style={{ backgroundColor: color }}
                      ></span>
                      <div className="drone-item-title">
                        <strong>{drone.clientName}</strong>
                        <span className="drone-uuid-small">{drone.uuid}</span>
                      </div>
                    </div>
                    <div className="drone-item-details">
                      <div>위도: {drone.lat != null ? Number(drone.lat).toFixed(6) : '—'}</div>
                      <div>경도: {drone.lon != null ? Number(drone.lon).toFixed(6) : '—'}</div>
                      {drone.heading != null && (
                        <div>방위각: {Number(drone.heading).toFixed(1)}°</div>
                      )}
                      <div className="last-update-small">
                        {drone.lastUpdate?.toLocaleTimeString() ?? '—'}
                      </div>
                    </div>
                    <button
                      type="button"
                      className="drone-stop-btn"
                      onClick={() => handleStopSimulator(drone.uuid)}
                      disabled={stoppingUuid === drone.uuid}
                    >
                      {stoppingUuid === drone.uuid ? '종료 중...' : '시뮬레이션 종료'}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
