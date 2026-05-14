import { useState, useCallback, useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, useMap, useMapEvents, Polyline, GeoJSON, Marker, Popup } from 'react-leaflet';
import { runSimulator } from '../../api/simulator.js';
import { getHostList } from '../../api/host.js';
import { getFormatList } from '../../api/format.js';
import { createMonitoringStream } from '../../api/monitoring.js';
import SelectionModal from '../../components/SelectionModal.jsx';
import DetailModal from '../../components/DetailModal.jsx';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './MapSimulator.css';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

function createDroneIcon(color = '#1a1a2e', heading = 0) {
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

function MapResizeObserver() {
  const map = useMap();
  useEffect(() => {
    map.invalidateSize();
    const el = map.getContainer();
    const ro = new ResizeObserver(() => {
      map.invalidateSize();
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [map]);
  return null;
}

function MapClickHandler({ onAddPoint, onMouseMove, onDoubleClick, isAddingPoints }) {
  useMapEvents({
    click(e) {
      if (isAddingPoints) {
        onAddPoint(e.latlng.lat, e.latlng.lng);
      }
    },
    mousemove(e) {
      if (isAddingPoints) {
        onMouseMove(e.latlng.lat, e.latlng.lng);
      }
    },
    dblclick() {
      if (isAddingPoints) {
        onDoubleClick();
      }
    },
  });
  return null;
}

function GeoJsonOverlays({ layers, fitLayerId }) {
  const map = useMap();

  useEffect(() => {
    if (!fitLayerId) return;
    const target = layers.find((l) => l.id === fitLayerId)?.geojson;
    if (!target) return;
    try {
      const layer = L.geoJSON(target);
      const bounds = layer.getBounds();
      if (bounds && bounds.isValid()) {
        map.fitBounds(bounds, { padding: [24, 24] });
      }
    } catch {
      // ignore invalid GeoJSON
    }
  }, [fitLayerId, layers, map]);

  if (!layers.length) return null;

  const palette = [
    { stroke: '#2563eb', fill: '#3b82f6' },
    { stroke: '#16a34a', fill: '#22c55e' },
    { stroke: '#7c3aed', fill: '#a78bfa' },
    { stroke: '#ea580c', fill: '#fb923c' },
    { stroke: '#0f766e', fill: '#2dd4bf' },
  ];

  return (
    <>
      {layers.map((l, idx) => {
        const c = palette[idx % palette.length];
        return (
          <GeoJSON
            key={`${l.id}:${l.name}`}
            data={l.geojson}
            onEachFeature={(_, layer) => {
              layer.bindTooltip(l.name || 'GeoJSON', {
                sticky: true,
                direction: 'top',
                opacity: 0.95,
                className: 'geojson-name-tooltip',
              });
            }}
            style={() => ({
              color: c.stroke,
              weight: 2,
              opacity: 0.95,
              fillColor: c.fill,
              fillOpacity: 0.14,
            })}
          />
        );
      })}
    </>
  );
}

// 포맷 문자열에서 변수 추출 (#{변수명} 형식)
const extractVariables = (formatString) => {
  const regex = /#\{([^}]+)\}/g;
  const variables = new Set();
  let match;
  while ((match = regex.exec(formatString)) !== null) {
    variables.add(match[1]);
  }
  return Array.from(variables);
};

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
  const [parameters, setParameters] = useState({});
  const [additionalVariables, setAdditionalVariables] = useState([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [hostModalOpen, setHostModalOpen] = useState(false);
  const [formatModalOpen, setFormatModalOpen] = useState(false);
  const [isAddingPoints, setIsAddingPoints] = useState(true);
  const [mousePosition, setMousePosition] = useState(null);
  const [geoJsonLayers, setGeoJsonLayers] = useState([]); // [{ id, name, source, geojson }]
  const [lastFitGeoJsonLayerId, setLastFitGeoJsonLayerId] = useState('');
  const [isGeoJsonDragging, setIsGeoJsonDragging] = useState(false);
  const [geoJsonManageOpen, setGeoJsonManageOpen] = useState(false);
  const [geoJsonTextDraft, setGeoJsonTextDraft] = useState('');
  const [geoJsonModalNotice, setGeoJsonModalNotice] = useState({ type: '', text: '' });
  const [sseDrones, setSseDrones] = useState(() => new Map());

  const clearRoutePointsOnly = useCallback(() => {
    setPoints([]);
    setMousePosition(null);
    setIsAddingPoints(true);
  }, []);

  const addPoint = useCallback((lat, lon) => {
    setPoints((prev) => [...prev, { lat, lon }]);
    setMousePosition(null); // 좌표 추가 후 마우스 위치 초기화
  }, []);

  const handleMouseMove = useCallback((lat, lon) => {
    setMousePosition({ lat, lon });
  }, []);

  const handleDoubleClick = useCallback(() => {
    setIsAddingPoints(false);
    setMousePosition(null);
  }, []);

  const startAddingPoints = useCallback(() => {
    setIsAddingPoints(true);
  }, []);

  const clearPoints = () => {
    setPoints([]);
    setMousePosition(null);
    setError('');
    setSuccess('');
    setIsAddingPoints(true);
  };

  const handleHostSelect = (host) => {
    setSelectedHost(host);
  };

  const handleFormatSelect = (format) => {
    setSelectedFormat(format);
    // 포맷에서 변수 추출 (lat, lon 제외)
    const variables = extractVariables(format.format);
    const additionalVars = variables.filter(v => v !== 'lat' && v !== 'lon' && v !== 'heading');
    setAdditionalVariables(additionalVars);

    // 기존 파라미터 중 추가 변수에 해당하는 것만 유지
    const newParameters = {};
    additionalVars.forEach(v => {
      if (parameters[v] !== undefined) {
        newParameters[v] = parameters[v];
      }
    });
    setParameters(newParameters);
  };

  const handleParameterChange = (variable, value) => {
    setParameters(prev => ({
      ...prev,
      [variable]: value,
    }));
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
        parameter: parameters,
      };
      await runSimulator(body);
      setSuccess('시뮬레이터가 시작되었습니다.');
      clearRoutePointsOnly();
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

  const activeSseDrones = useMemo(
    () =>
      Array.from(sseDrones.values()).filter(
        (d) =>
          String(d.status).toUpperCase() !== 'END' &&
          d.lat != null &&
          d.lon != null &&
          Number.isFinite(Number(d.lat)) &&
          Number.isFinite(Number(d.lon))
      ),
    [sseDrones]
  );

  useEffect(() => {
    const hasValidCoords = (item) =>
      item.uuid &&
      item.lat != null &&
      item.lon != null &&
      Number.isFinite(Number(item.lat)) &&
      Number.isFinite(Number(item.lon));

    const toDrone = (item) => ({
      uuid: item.uuid,
      lat: Number(item.lat),
      lon: Number(item.lon),
      heading:
        item.heading != null && Number.isFinite(Number(item.heading))
          ? Number(item.heading)
          : null,
      clientName:
        item.clientName ??
        item.client_name ??
        item.name ??
        `Drone ${String(item.uuid).substring(0, 8)}`,
      status: item.status ?? 'PLAYING',
      lastUpdate: new Date(),
    });

    const isEndedDrone = (item) => item?.uuid && String(item.status).toUpperCase() === 'END';

    const handleMessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.status === 'connected') {
          return;
        }

        if (Array.isArray(data)) {
          setSseDrones((prev) => {
            const next = new Map();
            prev.forEach((drone, uuid) => {
              if (String(drone.status).toUpperCase() === 'END') {
                next.set(uuid, drone);
              }
            });
            data.forEach((item) => {
              if (isEndedDrone(item)) {
                const prevDrone = prev.get(item.uuid);
                next.set(item.uuid, {
                  uuid: item.uuid,
                  lat: null,
                  lon: null,
                  heading: null,
                  clientName:
                    item.clientName ??
                    item.client_name ??
                    item.name ??
                    prevDrone?.clientName ??
                    `Drone ${String(item.uuid).substring(0, 8)}`,
                  status: 'END',
                  lastUpdate: new Date(),
                });
                return;
              }
              if (hasValidCoords(item)) {
                next.set(item.uuid, toDrone(item));
              }
            });
            return next;
          });
        } else if (isEndedDrone(data)) {
          setSseDrones((prev) => {
            const next = new Map(prev);
            const prevDrone = next.get(data.uuid);
            next.set(data.uuid, {
              uuid: data.uuid,
              lat: null,
              lon: null,
              heading: null,
              clientName:
                data.clientName ??
                data.client_name ??
                data.name ??
                prevDrone?.clientName ??
                `Drone ${String(data.uuid).substring(0, 8)}`,
              status: 'END',
              lastUpdate: new Date(),
            });
            return next;
          });
        } else if (hasValidCoords(data)) {
          setSseDrones((prev) => {
            const next = new Map(prev);
            next.set(data.uuid, toDrone(data));
            return next;
          });
        }
      } catch {
        // ignore malformed SSE payloads
      }
    };

    let cancelled = false;
    let closeStream = () => {};
    let retryTimer = null;

    const clearRetry = () => {
      if (retryTimer != null) {
        clearTimeout(retryTimer);
        retryTimer = null;
      }
    };

    const handleStreamError = () => {
      if (cancelled) return;
      clearRetry();
      retryTimer = window.setTimeout(() => {
        retryTimer = null;
        if (!cancelled) connect();
      }, 3000);
    };

    const handleStreamEnd = () => {
      if (cancelled) return;
      clearRetry();
      retryTimer = window.setTimeout(() => {
        retryTimer = null;
        if (!cancelled) connect();
      }, 2000);
    };

    const connect = () => {
      closeStream();
      closeStream = createMonitoringStream(handleMessage, handleStreamError, {
        onOpen: clearRetry,
        onStreamEnd: handleStreamEnd,
      });
    };

    connect();

    return () => {
      cancelled = true;
      clearRetry();
      closeStream();
    };
  }, []);

  const geoJsonLayerCount = geoJsonLayers.length;

  const isValidGeoJson = (obj) => {
    if (!obj || typeof obj !== 'object') return false;
    if (obj.type === 'FeatureCollection' && Array.isArray(obj.features)) return true;
    if (obj.type === 'Feature' && obj.geometry) return true;
    if (typeof obj.type === 'string' && /^(Point|MultiPoint|LineString|MultiLineString|Polygon|MultiPolygon|GeometryCollection)$/.test(obj.type)) {
      return true;
    }
    return false;
  };

  const readGeoJsonFile = async (file) => {
    const text = await file.text();
    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch {
      throw new Error('JSON 파싱에 실패했습니다. 올바른 GeoJSON 파일인지 확인해 주세요.');
    }
    if (!isValidGeoJson(parsed)) {
      throw new Error('GeoJSON 형식이 아닙니다. FeatureCollection/Feature/Geometry 타입만 지원합니다.');
    }
    return parsed;
  };

  const newLayerId = () =>
    (globalThis.crypto?.randomUUID?.() ||
      `geojson_${Date.now()}_${Math.random().toString(16).slice(2)}`);

  const addGeoJsonLayer = useCallback((layer) => {
    setGeoJsonLayers((prev) => [...prev, layer]);
    setLastFitGeoJsonLayerId(layer.id);
  }, []);

  const removeGeoJsonLayer = useCallback((id) => {
    setGeoJsonLayers((prev) => prev.filter((l) => l.id !== id));
    setLastFitGeoJsonLayerId((prev) => (prev === id ? '' : prev));
  }, []);

  const renameGeoJsonLayer = useCallback((id, name) => {
    setGeoJsonLayers((prev) => prev.map((l) => (l.id === id ? { ...l, name } : l)));
  }, []);

  const handleGeoJsonFiles = useCallback(async (files) => {
    const file = files?.[0];
    if (!file) return;
    setError('');
    setSuccess('');
    try {
      const geojson = await readGeoJsonFile(file);
      addGeoJsonLayer({
        id: newLayerId(),
        name: file.name || '업로드한 GeoJSON',
        source: 'file',
        geojson,
      });
      setSuccess(`GeoJSON 로드됨: ${file.name}`);
    } catch (e) {
      setError(e?.message || 'GeoJSON 파일을 불러오지 못했습니다.');
    }
  }, [addGeoJsonLayer]);

  const applyGeoJsonText = useCallback(async () => {
    setGeoJsonModalNotice({ type: '', text: '' });
    const raw = String(geoJsonTextDraft || '').trim();
    if (!raw) {
      setGeoJsonModalNotice({ type: 'error', text: 'GeoJSON 내용을 입력해 주세요.' });
      return;
    }
    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch {
      setGeoJsonModalNotice({
        type: 'error',
        text: 'JSON 파싱에 실패했습니다. 중괄호/따옴표가 올바른지 확인해 주세요.',
      });
      return;
    }
    if (!isValidGeoJson(parsed)) {
      setGeoJsonModalNotice({
        type: 'error',
        text: 'GeoJSON 형식이 아닙니다. FeatureCollection/Feature/Geometry 타입만 지원합니다.',
      });
      return;
    }
    addGeoJsonLayer({
      id: newLayerId(),
      name: '직접 입력',
      source: 'text',
      geojson: parsed,
    });
    setGeoJsonModalNotice({ type: 'success', text: 'GeoJSON 레이어가 추가되었습니다.' });
    setGeoJsonTextDraft('');
  }, [addGeoJsonLayer, geoJsonTextDraft]);

  return (
    <div className="page map-page">
      <h1>지도 시뮬레이터</h1>
      <p className="form-desc">
        지도를 클릭해 경로를 찍고, 지도에서 더블클릭하면 점 찍기를 끝낼 수 있어요. 좌표만 비우려면 오른쪽의 좌표 초기화를 누르세요. 호스트·포맷을 고른 뒤 전송하세요.
      </p>

      <div className="map-layout">
        <div
          className={`map-pane ${isGeoJsonDragging ? 'geojson-dragging' : ''}`}
          onDragEnter={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setIsGeoJsonDragging(true);
          }}
          onDragOver={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setIsGeoJsonDragging(true);
          }}
          onDragLeave={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setIsGeoJsonDragging(false);
          }}
          onDrop={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setIsGeoJsonDragging(false);
            const files = Array.from(e.dataTransfer?.files || []).filter((f) =>
              /\.(geojson|json)$/i.test(f.name)
            );
            handleGeoJsonFiles(files);
          }}
        >
          <div className={`geojson-dropzone ${isGeoJsonDragging ? 'active' : ''}`}>
            <div className="geojson-dropzone-inner">
              <div className="geojson-dropzone-icon" aria-hidden="true">⬚</div>
              <div className="geojson-dropzone-title">여기에 GeoJSON 파일을 드롭하세요</div>
              <div className="geojson-dropzone-actions">
                <label className="geojson-file-button">
                  파일 선택
                  <input
                    type="file"
                    accept=".geojson,.json,application/geo+json,application/json"
                    onChange={(e) => handleGeoJsonFiles(Array.from(e.target.files || []))}
                  />
                </label>
                {geoJsonLayers.length > 0 && (
                  <button
                    type="button"
                    className="geojson-clear-button"
                    onClick={() => {
                      setGeoJsonLayers([]);
                      setLastFitGeoJsonLayerId('');
                    }}
                  >
                    업로드 제거
                  </button>
                )}
              </div>
            </div>
          </div>
          <MapContainer
            center={defaultCenter}
            zoom={13}
            style={{ height: '100%', width: '100%' }}
          >
            <MapResizeObserver />
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <MapClickHandler
              onAddPoint={addPoint}
              onMouseMove={handleMouseMove}
              onDoubleClick={handleDoubleClick}
              isAddingPoints={isAddingPoints}
            />
            <GeoJsonOverlays layers={geoJsonLayers} fitLayerId={lastFitGeoJsonLayerId} />
            {points.length >= 2 && (
              <Polyline
                positions={points.map((p) => [p.lat, p.lon])}
                color="#1a1a2e"
                weight={4}
                opacity={0.8}
              />
            )}
            {isAddingPoints && points.length > 0 && mousePosition && (
              <Polyline
                positions={[
                  [points[points.length - 1].lat, points[points.length - 1].lon],
                  [mousePosition.lat, mousePosition.lon]
                ]}
                color="#4a4a5e"
                weight={3}
                opacity={0.6}
                dashArray="5, 5"
              />
            )}
            {activeSseDrones.map((drone, index) => {
              const colors = ['#1a1a2e', '#b91c1c', '#166534', '#b45309', '#6b21a8'];
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
                      <div>위도: {lat.toFixed(6)}</div>
                      <div>경도: {lon.toFixed(6)}</div>
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
            })}
          </MapContainer>
        </div>

        <aside className="map-sidebar">
          <div className="map-sidebar-top">
            <button
              type="button"
              className="map-coords-reset"
              onClick={clearPoints}
              disabled={points.length === 0}
            >
              좌표 초기화
            </button>
            <button
              type="button"
              className="map-geojson-manage"
              onClick={() => setGeoJsonManageOpen(true)}
            >
              GeoJSON{' '}
              {geoJsonLayerCount > 0 ? (
                <span className="geojson-count">{geoJsonLayerCount}</span>
              ) : (
                <span className="geojson-count empty">0</span>
              )}
            </button>
            {!isAddingPoints && (
              <button type="button" className="map-resume-add" onClick={startAddingPoints}>
                점 찍기 시작
              </button>
            )}
          </div>
          <div className="map-form-area">
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
            {additionalVariables.length > 0 && (
              <div className="parameters-section">
                <div className="parameters-label">추가 파라미터</div>
                {additionalVariables.map((variable) => (
                  <label key={variable}>
                    <span className="parameter-name">#{`{${variable}}`}</span>
                    <input
                      type="text"
                      value={parameters[variable] || ''}
                      onChange={(e) => handleParameterChange(variable, e.target.value)}
                      placeholder={`${variable} 값을 입력하세요`}
                    />
                  </label>
                ))}
              </div>
            )}
            {error && <p className="form-error">{error}</p>}
            {success && <p className="form-success">{success}</p>}
            <button type="submit" disabled={loading || points.length < 2}>
              {loading ? '전송 중...' : '시뮬레이터 실행'}
            </button>
          </form>
          </div>
        </aside>
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

      <DetailModal
        isOpen={geoJsonManageOpen}
        onClose={() => setGeoJsonManageOpen(false)}
        title="GeoJSON 적용 항목"
      >
        <div className="geojson-manage-add">
          <div className="geojson-manage-section-title">직접 입력으로 레이어 추가</div>
          {geoJsonModalNotice.text && (
            <div className={`geojson-modal-notice ${geoJsonModalNotice.type}`}>
              {geoJsonModalNotice.text}
            </div>
          )}
          <textarea
            className="geojson-manage-textarea"
            value={geoJsonTextDraft}
            onChange={(e) => setGeoJsonTextDraft(e.target.value)}
            placeholder={`예:\n{\n  \"type\": \"FeatureCollection\",\n  \"features\": []\n}`}
            rows={7}
          />
          <div className="geojson-manage-actions">
            <button
              type="button"
              className="geojson-manage-apply"
              onClick={applyGeoJsonText}
            >
              레이어 추가
            </button>
            <button
              type="button"
              className="geojson-manage-clear-draft"
              onClick={() => setGeoJsonTextDraft('')}
              disabled={!geoJsonTextDraft.trim()}
            >
              입력 지우기
            </button>
          </div>
        </div>

        {geoJsonLayers.length === 0 ? (
          <div className="geojson-manage-empty">
            현재 적용된 GeoJSON이 없습니다. 지도 위에 파일을 드롭하거나 “파일 선택”으로 업로드해 주세요.
          </div>
        ) : (
          <div className="geojson-manage-list">
            {geoJsonLayers.map((layer) => (
              <div key={layer.id} className="geojson-manage-item">
                <div className="geojson-manage-meta">
                  <input
                    className="geojson-manage-name-input"
                    value={layer.name}
                    onChange={(e) => renameGeoJsonLayer(layer.id, e.target.value)}
                    placeholder="레이어 이름"
                  />
                  <div className="geojson-manage-hint">
                    {layer.source === 'file' ? '파일 업로드' : '직접 입력'}로 추가됨 · 지도에 표시 중
                  </div>
                </div>
                <button
                  type="button"
                  className="geojson-manage-remove"
                  onClick={() => removeGeoJsonLayer(layer.id)}
                >
                  적용 해제
                </button>
              </div>
            ))}
          </div>
        )}
      </DetailModal>
    </div>
  );
}
