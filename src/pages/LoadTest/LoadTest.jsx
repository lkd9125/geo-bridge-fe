import { useState } from 'react';
import { runSimulator } from '../../api/simulator.js';
import { getHostList } from '../../api/host.js';
import { getFormatList } from '../../api/format.js';
import SelectionModal from '../../components/SelectionModal.jsx';
import '../Pages.css';
import './LoadTest.css';

const extractVariables = (formatString) => {
  const regex = /#\{([^}]+)\}/g;
  const variables = new Set();
  let match;
  while ((match = regex.exec(formatString)) !== null) {
    variables.add(match[1]);
  }
  return Array.from(variables);
};

const randomString = (len = 8) => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let out = '';
  for (let i = 0; i < len; i += 1) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  return out;
};

const buildPrefixedRandomValue = (prefix, len = 12) => {
  const trimmedPrefix = prefix.trim();
  const randomValue = randomString(len);
  return trimmedPrefix ? `${trimmedPrefix}-${randomValue}` : randomValue;
};

const KR_BOUNDS = {
  minLat: 33.0,
  maxLat: 38.7,
  minLon: 124.5,
  maxLon: 131.9,
};

const KR_CENTERS = [
  { lat: 37.5665, lon: 126.978 }, // 서울
  { lat: 37.4563, lon: 126.7052 }, // 인천
  { lat: 36.3504, lon: 127.3845 }, // 대전
  { lat: 35.1796, lon: 129.0756 }, // 부산
  { lat: 35.8714, lon: 128.6014 }, // 대구
  { lat: 35.1595, lon: 126.8526 }, // 광주
];

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const METERS_PER_LAT = 111320;

const toRadians = (deg) => (deg * Math.PI) / 180;

const metersToLat = (meters) => meters / METERS_PER_LAT;

const metersToLon = (meters, lat) => meters / (METERS_PER_LAT * Math.cos(toRadians(lat)));

const movePointByMeters = (point, northMeters, eastMeters) => {
  const nextLat = clamp(point.lat + metersToLat(northMeters), KR_BOUNDS.minLat, KR_BOUNDS.maxLat);
  const nextLon = clamp(point.lon + metersToLon(eastMeters, point.lat), KR_BOUNDS.minLon, KR_BOUNDS.maxLon);

  return {
    lat: nextLat,
    lon: nextLon,
  };
};

const randomPointNear = (point, maxDistanceMeters) => {
  const angle = Math.random() * Math.PI * 2;
  const distance = Math.random() * maxDistanceMeters;
  const northMeters = Math.cos(angle) * distance;
  const eastMeters = Math.sin(angle) * distance;

  return movePointByMeters(point, northMeters, eastMeters);
};

const approximateDistanceMeters = (a, b) => {
  const latMeters = (a.lat - b.lat) * METERS_PER_LAT;
  const lonMeters = (a.lon - b.lon) * METERS_PER_LAT * Math.cos(toRadians((a.lat + b.lat) / 2));
  return Math.sqrt(latMeters ** 2 + lonMeters ** 2);
};

const generateKoreanNearbyPointList = (size = 5) => {
  const routeCenter = KR_CENTERS[Math.floor(Math.random() * KR_CENTERS.length)];
  const maxRadiusMeters = 500;
  const maxStepMeters = 220;
  const points = [randomPointNear(routeCenter, 180)];

  while (points.length < size) {
    const prevPoint = points[points.length - 1];
    let nextPoint = randomPointNear(routeCenter, maxRadiusMeters);

    for (let attempt = 0; attempt < 12; attempt += 1) {
      const candidate = randomPointNear(prevPoint, maxStepMeters);
      if (approximateDistanceMeters(candidate, routeCenter) <= maxRadiusMeters) {
        nextPoint = candidate;
        break;
      }
    }

    points.push(nextPoint);
  }

  return points.map((point) => ({
    lat: Number(point.lat.toFixed(6)),
    lon: Number(point.lon.toFixed(6)),
  }));
};

export default function LoadTest() {
  const [selectedHost, setSelectedHost] = useState(null);
  const [selectedFormat, setSelectedFormat] = useState(null);
  const [hostModalOpen, setHostModalOpen] = useState(false);
  const [formatModalOpen, setFormatModalOpen] = useState(false);

  const [form, setForm] = useState({
    namePrefix: 'LOAD-UAV',
    count: 100,
    speed: 10,
    speedUnit: 'M_S',
    cycle: 1,
  });
  const [parameters, setParameters] = useState({});
  const [additionalVariables, setAdditionalVariables] = useState([]);
  const [randomTargetVars, setRandomTargetVars] = useState([]);

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0, failed: 0 });

  const handleFormatSelect = (format) => {
    setSelectedFormat(format);
    const variables = extractVariables(format.format);
    const additionalVars = variables.filter(
      (v) => v !== 'lat' && v !== 'lon' && v !== 'heading'
    );
    setAdditionalVariables(additionalVars);

    const nextParameters = {};
    additionalVars.forEach((v) => {
      if (parameters[v] !== undefined) nextParameters[v] = parameters[v];
    });
    setParameters(nextParameters);
    setRandomTargetVars((prev) => prev.filter((variable) => additionalVars.includes(variable)));
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleParameterChange = (variable, value) => {
    setParameters((prev) => ({ ...prev, [variable]: value }));
  };

  const handleRandomVariableToggle = (variable) => {
    setRandomTargetVars((prev) =>
      prev.includes(variable) ? prev.filter((item) => item !== variable) : [...prev, variable]
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const count = Number(form.count);

    if (!selectedHost) {
      setError('호스트를 선택해 주세요.');
      return;
    }
    if (!selectedFormat) {
      setError('전송 포맷을 선택해 주세요.');
      return;
    }
    if (!Number.isInteger(count) || count < 1 || count > 1000) {
      setError('실행 개수는 1~1000 사이 정수로 입력해 주세요.');
      return;
    }

    setError('');
    setSuccess('');
    setLoading(true);
    setProgress({ done: 0, total: count, failed: 0 });

    let failed = 0;
    try {
      for (let i = 0; i < count; i += 1) {
        try {
          // 선택한 컬럼들은 실행 시마다 랜덤값으로 치환
          const parameterForRun = { ...parameters };
          randomTargetVars.forEach((variable) => {
            parameterForRun[variable] = buildPrefixedRandomValue(form.namePrefix, 12);
          });

          // 시뮬레이터마다 별도의 근접 경로 5개를 생성
          const pointList = generateKoreanNearbyPointList(5);

          const body = {
            type: selectedHost.type,
            host: selectedHost.host,
            name: `${form.namePrefix}-${String(i + 1).padStart(3, '0')}`,
            topic: selectedHost.topic,
            hostId: selectedHost.hostId,
            password: selectedHost.password,
            pointList,
            speed: Number(form.speed),
            speedUnit: form.speedUnit,
            cycle: Number(form.cycle) || 1,
            format: selectedFormat.format,
            parameter: parameterForRun,
          };

          await runSimulator(body);
        } catch (err) {
          failed += 1;
          console.error('부하테스트 시뮬레이터 실행 실패:', err);
        } finally {
          setProgress((prev) => ({ ...prev, done: i + 1, failed }));
        }
      }

      if (failed > 0) {
        setSuccess(
          `부하테스트 완료: 총 ${count}개 중 ${count - failed}개 성공, ${failed}개 실패`
        );
      } else {
        setSuccess(`부하테스트 완료: 총 ${count}개 모두 성공`);
      }
    } catch (err) {
      setError(err.response?.data?.message || '부하테스트 실행 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page form-page load-test-page">
      <h1>부하테스트</h1>
      <p className="form-desc">
        동일 조건으로 시뮬레이터를 여러 개 순차 실행합니다. (현재: for문 순차 호출)
        <br />
        좌표는 실행 시 시뮬레이터마다 대한민국 내 약 1km 범위의 근접한 5개 경로로 자동 생성됩니다.
      </p>

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
          이름 Prefix
          <input
            type="text"
            name="namePrefix"
            value={form.namePrefix}
            onChange={handleChange}
            placeholder="예: LOAD-UAV"
          />
        </label>

        <label>
          실행 개수
          <input
            type="number"
            name="count"
            value={form.count}
            onChange={handleChange}
            min="1"
            max="1000"
            step="1"
          />
        </label>

        <div className="inline-3">
          <label>
            속도
            <input type="number" name="speed" value={form.speed} onChange={handleChange} min="0.1" step="0.1" />
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
            <input type="number" name="cycle" value={form.cycle} onChange={handleChange} min="1" />
          </label>
        </div>

        {additionalVariables.length > 0 && (
          <div className="parameters-section">
            <div className="parameters-top">
              <div className="parameters-heading">
                <span className="parameters-label">추가 파라미터</span>
                <span className="parameters-random-note">
                  자동 생성할 컬럼을 선택하면 해당 입력값 대신 랜덤값이 사용됩니다.
                  {randomTargetVars.length > 0 && (
                    <span className="selection-summary-wrap">
                      <br />
                      <span className="selection-summary">
                        현재 {randomTargetVars.length}개 선택됨
                      </span>
                    </span>
                  )}
                </span>
              </div>
            </div>
            {additionalVariables.map((variable) => (
              <div
                key={variable}
                className={`parameter-row ${randomTargetVars.includes(variable) ? 'is-random-target' : ''}`}
              >
                <div className="parameter-name-wrap">
                  <label className="parameter-toggle" aria-label={`${variable} 랜덤 생성 선택`}>
                    <span className="parameter-meta">
                      <input
                        type="checkbox"
                        className="checkbox-ui"
                        checked={randomTargetVars.includes(variable)}
                        onChange={() => handleRandomVariableToggle(variable)}
                      />
                      <span className="checkbox-box" aria-hidden="true">
                        <span className="checkbox-mark" />
                      </span>
                      <span className="parameter-name">#{`{${variable}}`}</span>
                    </span>
                  </label>
                </div>
                <input
                  type="text"
                  className="parameter-input"
                  value={parameters[variable] || ''}
                  onChange={(e) => handleParameterChange(variable, e.target.value)}
                  placeholder={`${variable} 값을 입력하세요`}
                  disabled={randomTargetVars.includes(variable)}
                />
              </div>
            ))}
          </div>
        )}

        {loading && (
          <p className="load-progress">
            진행중... {progress.done}/{progress.total} (실패 {progress.failed})
          </p>
        )}
        {error && <p className="form-error">{error}</p>}
        {success && <p className="form-success">{success}</p>}

        <button type="submit" disabled={loading}>
          {loading ? '부하테스트 실행 중...' : '부하테스트 실행'}
        </button>
      </form>

      <SelectionModal
        isOpen={hostModalOpen}
        onClose={() => setHostModalOpen(false)}
        onSelect={setSelectedHost}
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
