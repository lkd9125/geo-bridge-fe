import { useState, useCallback } from 'react';
import { MapContainer, TileLayer, useMapEvents, Polyline } from 'react-leaflet';
import { runSimulator } from '../api/simulator.js';
import { getHostList } from '../api/host.js';
import { useEffect } from 'react';
import 'leaflet/dist/leaflet.css';
import './MapSimulator.css';

function MapClickHandler({ onAddPoint, points }) {
  useMapEvents({
    click(e) {
      onAddPoint(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

export default function MapSimulator() {
  const [points, setPoints] = useState([]);
  const [hosts, setHosts] = useState([]);
  const [form, setForm] = useState({
    hostIdx: '',
    name: '',
    speed: 10,
    speedUnit: 'M_S',
    cycle: 1,
    format: '{"lat":#{lat},"lon":#{lon}}',
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const addPoint = useCallback((lat, lon) => {
    setPoints((prev) => [...prev, { lat, lon }]);
  }, []);

  const removeLastPoint = () => {
    setPoints((prev) => prev.slice(0, -1));
  };

  const clearPoints = () => {
    setPoints([]);
  };

  useEffect(() => {
    getHostList()
      .then((res) => setHosts(res.list || []))
      .catch(() => setHosts([]));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (points.length < 2) {
      setError('최소 2개 이상의 좌표를 지정해 주세요.');
      return;
    }
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      const host = hosts.find((h) => String(h.idx) === form.hostIdx);
      if (!host) {
        setError('호스트를 선택해 주세요.');
        return;
      }
      const body = {
        type: host.type,
        host: host.host,
        name: form.name || host.name,
        topic: host.topic,
        hostId: host.hostId,
        password: host.password,
        pointList: points.map((p) => ({ lat: p.lat, lon: p.lon })),
        speed: Number(form.speed),
        speedUnit: form.speedUnit,
        cycle: Number(form.cycle) || 1,
        format: form.format,
      };
      const uuid = await runSimulator(body);
      setSuccess(`시뮬레이터가 시작되었습니다. (UUID: ${uuid})`);
    } catch (err) {
      setError(err.response?.data?.message || '실행에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const defaultCenter = [37.5665, 126.978]; // 서울

  return (
    <div className="page map-page">
      <h1>지도 시뮬레이터</h1>
      <p className="form-desc">
        지도를 클릭해 좌표를 순서대로 찍은 뒤, 호스트와 포맷을 선택해 전송하세요.
      </p>

      <div className="map-layout">
        <div className="map-container">
          <MapContainer
            center={defaultCenter}
            zoom={13}
            style={{ height: '100%', width: '100%' }}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <MapClickHandler onAddPoint={addPoint} points={points} />
            {points.length >= 2 && (
              <Polyline
                positions={points.map((p) => [p.lat, p.lon])}
                color="#3b82f6"
                weight={4}
              />
            )}
          </MapContainer>
          <div className="map-controls">
            <button type="button" onClick={removeLastPoint} disabled={points.length === 0}>
              마지막 점 제거
            </button>
            <button type="button" onClick={clearPoints} disabled={points.length === 0}>
              전체 초기화
            </button>
          </div>
        </div>

        <div className="map-form-area">
          <p className="points-count">선택된 좌표: {points.length}개</p>
          <form onSubmit={handleSubmit} className="form">
            <label>
              호스트 선택
              <select name="hostIdx" value={form.hostIdx} onChange={handleChange} required>
                <option value="">선택하세요</option>
                {hosts.map((h) => (
                  <option key={h.idx} value={h.idx}>
                    {h.name} ({h.type})
                  </option>
                ))}
              </select>
            </label>
            <label>
              클라이언트 이름 (선택)
              <input
                type="text"
                name="name"
                value={form.name}
                onChange={handleChange}
                placeholder="기본: 호스트 이름 사용"
              />
            </label>
            <label>
              속도
              <input
                type="number"
                name="speed"
                value={form.speed}
                onChange={handleChange}
                min="0.1"
                step="0.1"
              />
            </label>
            <label>
              속도 단위
              <select name="speedUnit" value={form.speedUnit} onChange={handleChange}>
                <option value="M_S">m/s</option>
                <option value="KM_H">km/h</option>
              </select>
            </label>
            <label>
              반복 횟수
              <input
                type="number"
                name="cycle"
                value={form.cycle}
                onChange={handleChange}
                min="1"
              />
            </label>
            <label>
              전송 포맷
              <textarea
                name="format"
                value={form.format}
                onChange={handleChange}
                rows={4}
                placeholder='{"lat":#{lat},"lon":#{lon}}'
                required
              />
            </label>
            {error && <p className="form-error">{error}</p>}
            {success && <p className="form-success">{success}</p>}
            <button type="submit" disabled={loading || points.length < 2}>
              {loading ? '전송 중...' : '시뮬레이터 실행'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
