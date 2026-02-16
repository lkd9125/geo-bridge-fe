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

// 드론 아이콘 생성 함수 (heading: 도 단위, 0=북쪽, 시계방향)
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
  const [drones, setDrones] = useState(new Map()); // Map<uuid, {uuid, lat, lon, heading?, name, lastUpdate}>
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState('');
  const [stoppingUuid, setStoppingUuid] = useState(null);
  const eventSourceRef = useRef(null);
  const defaultCenter = [37.5665, 126.978]; // 서울

  const handleStopSimulator = async (uuid) => {
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
      setError(err.response?.data?.message || '시뮬레이션 종료에 실패했습니다.');
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

        // 좌표 데이터 처리: { uuid, lat, lon, heading? }
        if (Array.isArray(data)) {
          console.log('배열 형식 데이터 수신:', data.length, '개');
          const newDrones = new Map();
          data.forEach((item) => {
            if (item.uuid && item.lat !== undefined && item.lon !== undefined) {
              newDrones.set(item.uuid, {
                uuid: item.uuid,
                lat: item.lat,
                lon: item.lon,
                heading: item.heading,
                name: item.name || `Drone ${item.uuid.substring(0, 8)}`,
                lastUpdate: new Date(),
              });
            }
          });
          console.log('드론 맵 업데이트:', newDrones.size, '개');
          setDrones(newDrones);
        } else if (data.uuid && data.lat !== undefined && data.lon !== undefined) {
          console.log('단일 드론 데이터 수신:', data.uuid, data.lat, data.lon);
          setDrones((prev) => {
            const newDrones = new Map(prev);
            newDrones.set(data.uuid, {
              uuid: data.uuid,
              lat: data.lat,
              lon: data.lon,
              heading: data.heading,
              name: data.name || `Drone ${data.uuid.substring(0, 8)}`,
              lastUpdate: new Date(),
            });
            console.log('드론 맵 업데이트 후:', newDrones.size, '개');
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

  const droneList = Array.from(drones.values());
  
  console.log('현재 드론 목록:', droneList.length, '개', droneList);

  return (
    <div className="page map-monitoring-page">
      <h1>드론 모니터링</h1>
      <div className="monitoring-header">
        <div className="status-indicator">
          <span className={`status-dot ${isConnected ? 'connected' : 'disconnected'}`}></span>
          <span>{isConnected ? '연결됨' : '연결 끊김'}</span>
        </div>
        <div className="drone-count">
          활성 드론: {droneList.length}대
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
                console.log('마커 렌더링:', drone.uuid, drone.lat, drone.lon, heading);
                return (
                  <Marker
                    key={drone.uuid}
                    position={[drone.lat, drone.lon]}
                    icon={createDroneIcon(color, heading)}
                  >
                    <Popup>
                      <div className="drone-popup">
                        <strong>{drone.name}</strong>
                        <div>위도: {drone.lat.toFixed(6)}</div>
                        <div>경도: {drone.lon.toFixed(6)}</div>
                        {drone.heading != null && (
                          <div>방위각: {drone.heading.toFixed(1)}°</div>
                        )}
                        <div className="last-update">
                          업데이트: {drone.lastUpdate.toLocaleTimeString()}
                        </div>
                      </div>
                    </Popup>
                  </Marker>
                );
              })
            ) : (
              <div style={{ position: 'absolute', top: '10px', left: '10px', background: 'white', padding: '10px', zIndex: 1000 }}>
                드론 데이터 대기 중... (콘솔 확인)
              </div>
            )}
          </MapContainer>
        </div>

        <div className="monitoring-sidebar">
          <h3>드론 목록</h3>
          {droneList.length === 0 ? (
            <p className="no-drones">활성 드론이 없습니다.</p>
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
                      <strong>{drone.name}</strong>
                    </div>
                    <div className="drone-item-details">
                      <div>위도: {drone.lat.toFixed(6)}</div>
                      <div>경도: {drone.lon.toFixed(6)}</div>
                      {drone.heading != null && (
                        <div>방위각: {drone.heading.toFixed(1)}°</div>
                      )}
                      <div className="last-update-small">
                        {drone.lastUpdate.toLocaleTimeString()}
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
