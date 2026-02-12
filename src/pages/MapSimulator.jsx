import { useState, useCallback } from 'react';
import { MapContainer, TileLayer, useMapEvents, Polyline } from 'react-leaflet';
import { runSimulator } from '../api/simulator.js';
import { getHostList } from '../api/host.js';
import { getFormatList } from '../api/format.js';
import SelectionModal from '../components/SelectionModal.jsx';
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
  const [selectedHost, setSelectedHost] = useState(null);
  const [selectedFormat, setSelectedFormat] = useState(null);
  const [form, setForm] = useState({
    name: '',
    speed: 10,
    speedUnit: 'M_S',
    cycle: 1,
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [hostModalOpen, setHostModalOpen] = useState(false);
  const [formatModalOpen, setFormatModalOpen] = useState(false);

  const addPoint = useCallback((lat, lon) => {
    setPoints((prev) => [...prev, { lat, lon }]);
  }, []);

  const removeLastPoint = () => {
    setPoints((prev) => prev.slice(0, -1));
  };

  const clearPoints = () => {
    setPoints([]);
    setError('');
    setSuccess('');
  };

  const handleHostSelect = (host) => {
    setSelectedHost(host);
  };

  const handleFormatSelect = (format) => {
    setSelectedFormat(format);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (points.length < 2) {
      setError('최소 2개 이상의 좌표를 지정해 주세요.');
      return;
    }
    if (!selectedHost) {
      setError('호스트를 선택해 주세요.');
      return;
    }
    if (!selectedFormat) {
      setError('전송 포맷을 선택해 주세요.');
      return;
    }
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      const body = {
        type: selectedHost.type,
        host: selectedHost.host,
        name: form.name || selectedHost.name,
        topic: selectedHost.topic,
        hostId: selectedHost.hostId,
        password: selectedHost.password,
        pointList: points.map((p) => ({ lat: p.lat, lon: p.lon })),
        speed: Number(form.speed),
        speedUnit: form.speedUnit,
        cycle: Number(form.cycle) || 1,
        format: selectedFormat.format,
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
          <div className="points-header">
            <p className="points-count">선택된 좌표: {points.length}개</p>
            <button 
              type="button" 
              onClick={clearPoints} 
              disabled={points.length === 0}
              className="clear-points-btn"
            >
              좌표 초기화
            </button>
          </div>
          <form onSubmit={handleSubmit} className="form">
            <label>
              호스트 선택
              <button
                type="button"
                onClick={() => setHostModalOpen(true)}
                className={`select-button ${selectedHost ? 'selected' : ''}`}
              >
                {selectedHost ? `${selectedHost.name} (${selectedHost.type})` : '호스트 선택'}
              </button>
            </label>
            <label>
              전송 포맷
              <button
                type="button"
                onClick={() => setFormatModalOpen(true)}
                className={`select-button ${selectedFormat ? 'selected' : ''}`}
              >
                {selectedFormat ? selectedFormat.name : '포맷 선택'}
              </button>
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
            {error && <p className="form-error">{error}</p>}
            {success && <p className="form-success">{success}</p>}
            <button type="submit" disabled={loading || points.length < 2}>
              {loading ? '전송 중...' : '시뮬레이터 실행'}
            </button>
          </form>
        </div>
      </div>

      <SelectionModal
        isOpen={hostModalOpen}
        onClose={() => setHostModalOpen(false)}
        onSelect={handleHostSelect}
        title="호스트 선택"
        fetchData={getHostList}
        getItemLabel={(host) => `${host.name} (${host.type})`}
        selectedValue={selectedHost ? String(selectedHost.idx) : ''}
      />

      <SelectionModal
        isOpen={formatModalOpen}
        onClose={() => setFormatModalOpen(false)}
        onSelect={handleFormatSelect}
        title="전송 포맷 선택"
        fetchData={getFormatList}
        getItemLabel={(format) => format.name}
        selectedValue={selectedFormat ? String(selectedFormat.idx) : ''}
      />
    </div>
  );
}
