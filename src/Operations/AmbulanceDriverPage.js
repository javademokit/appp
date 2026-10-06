import { useEffect, useRef, useState } from 'react';
import { apiFetch } from '../API/api';
import './Operations.css';

const storageKey = 'ambulance-driver-pairing';

async function readResponse(response) {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || data.detail || `Request failed (${response.status})`);
  return data;
}

export default function AmbulanceDriverPage() {
  const [pairing, setPairing] = useState(() => {
    try { return JSON.parse(localStorage.getItem(storageKey)) || null; } catch { return null; }
  });
  const [code, setCode] = useState('');
  const [sharing, setSharing] = useState(false);
  const [location, setLocation] = useState(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const watchId = useRef(null);
  const lastSentAt = useRef(0);

  useEffect(() => () => {
    if (watchId.current !== null) navigator.geolocation?.clearWatch(watchId.current);
  }, []);

  const pairPhone = async (event) => {
    event.preventDefault();
    setError('');
    setMessage('');
    try {
      const result = await readResponse(await apiFetch('/ambulance/tracking/pair', {
        method: 'POST',
        body: JSON.stringify({ code }),
      }));
      const nextPairing = {
        vehicleId: result.vehicleId,
        registrationNumber: result.registrationNumber,
        driverName: result.driverName,
        locationToken: result.locationToken,
      };
      localStorage.setItem(storageKey, JSON.stringify(nextPairing));
      setPairing(nextPairing);
      setCode('');
      setMessage(`Phone paired with ${result.registrationNumber}. Start sharing to send GPS location.`);
    } catch (requestError) {
      setError(requestError.message || 'Could not pair this phone');
    }
  };

  const stopSharing = () => {
    if (watchId.current !== null) navigator.geolocation?.clearWatch(watchId.current);
    watchId.current = null;
    setSharing(false);
  };

  const startSharing = () => {
    if (!navigator.geolocation) {
      setError('This browser does not support GPS location sharing.');
      return;
    }
    if (!window.isSecureContext) {
      setError('GPS sharing requires a secure HTTPS connection (localhost is supported for testing).');
      return;
    }
    setError('');
    setMessage('Waiting for GPS location permission…');
    setSharing(true);
    watchId.current = navigator.geolocation.watchPosition(async (position) => {
      const { latitude, longitude, accuracy } = position.coords;
      setLocation({ latitude, longitude, accuracy, updatedAt: new Date() });
      if (Date.now() - lastSentAt.current < 10000) return;
      lastSentAt.current = Date.now();
      try {
        await readResponse(await apiFetch('/ambulance/tracking/location', {
          method: 'POST',
          headers: { Authorization: `Bearer ${pairing.locationToken}` },
          body: JSON.stringify({
            latitude,
            longitude,
            accuracyMeters: accuracy,
          }),
        }));
        setMessage(`Location shared at ${new Date().toLocaleTimeString()}. Keep this page open while driving.`);
      } catch (requestError) {
        setError(requestError.message || 'Could not share GPS location');
        stopSharing();
      }
    }, (geoError) => {
      setError(geoError.message || 'Could not read GPS location. Check location permission for this browser.');
      stopSharing();
    }, { enableHighAccuracy: true, maximumAge: 5000, timeout: 20000 });
  };

  const unpair = () => {
    stopSharing();
    localStorage.removeItem(storageKey);
    setPairing(null);
    setLocation(null);
    setMessage('This phone is no longer paired. Ask the dispatcher for a new one-time code to reconnect.');
  };

  return (
    <main className="workflow-page ambulance-driver-page" aria-labelledby="ambulance-driver-title">
      <header className="workflow-header">
        <div>
          <p className="workflow-eyebrow">Ambulance GPS</p>
          <h1 id="ambulance-driver-title">Driver location sharing</h1>
          <p>Pair this phone with the ambulance, then share its location with dispatch.</p>
        </div>
      </header>
      {error && <div className="workflow-alert error" role="alert">{error}</div>}
      {message && <div className="workflow-alert success" role="status">{message}</div>}

      {!pairing ? (
        <form className="workflow-form-panel ambulance-driver-card" onSubmit={pairPhone}>
          <h2>Pair phone to a vehicle</h2>
          <p>Enter the one-time pairing code created by the dispatcher. The code expires after 10 minutes.</p>
          <label>One-time pairing code<input required autoComplete="one-time-code" value={code}
            onChange={(event) => setCode(event.target.value.toUpperCase())} maxLength={24} /></label>
          <button className="workflow-button primary" type="submit">Pair this phone</button>
        </form>
      ) : (
        <section className="workflow-panel ambulance-driver-card">
          <div className="workflow-panel-heading">
            <div><h2>{pairing.registrationNumber}</h2><p>{pairing.driverName || 'Ambulance driver'} · this phone is paired to this vehicle.</p></div>
            <span className={`workflow-status ${sharing ? 'ready' : 'neutral'}`}>{sharing ? 'Sharing GPS' : 'GPS paused'}</span>
          </div>
          {location && <p>Phone fix: {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
            {' · '}±{Math.round(location.accuracy)} m · {location.updatedAt.toLocaleTimeString()}</p>}
          <p>Allow location access and keep this page open for live updates. Browser background restrictions may pause sharing if this page is closed or suspended.</p>
          <div className="workflow-row-actions">
            {!sharing ? <button className="workflow-button primary" type="button" onClick={startSharing}>Start sharing location</button>
              : <button className="workflow-button subtle" type="button" onClick={stopSharing}>Stop sharing</button>}
            <button className="workflow-button subtle" type="button" onClick={unpair}>Unpair this phone</button>
          </div>
        </section>
      )}
    </main>
  );
}
