import { useCallback, useEffect, useMemo, useState } from 'react';
import { Ambulance, MapPin, Plus, RefreshCw, Truck } from 'lucide-react';
import { CircleMarker, MapContainer, Popup, TileLayer, useMap } from 'react-leaflet';
import { apiFetch } from '../API/api';
import { startAmbulanceCheckout } from '../PaymentPage/paymentGatewayCheckout';
import 'leaflet/dist/leaflet.css';
import './Operations.css';

const emptyBooking = {
  patientId: '', branchId: '', pickupAddress: '', dropAddress: '', distanceKm: '', paymentMethod: 'CASH',
};
const emptyVehicle = { registrationNumber: '', branchId: '', vehicleType: 'BASIC', driverName: '', driverPhone: '' };
const transitions = {
  DISPATCHED: ['EN_ROUTE'],
  EN_ROUTE: ['ARRIVED'],
  ARRIVED: ['COMPLETED'],
};
const pretty = (value) => String(value || '').replaceAll('_', ' ').toLowerCase()
  .replace(/\b\w/g, (character) => character.toUpperCase());
const money = (amount) => new Intl.NumberFormat('en-IN', {
  style: 'currency', currency: 'INR', maximumFractionDigits: 2,
}).format(Number(amount) || 0);

function FleetMapViewport({ center }) {
  const map = useMap();
  const latitude = center[0];
  const longitude = center[1];
  useEffect(() => {
    map.setView([latitude, longitude], Math.max(map.getZoom(), 11));
  }, [latitude, longitude, map]);
  return null;
}

async function readResponse(response) {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || data.detail || `Request failed (${response.status})`);
  return data;
}

export default function AmbulancePage() {
  const [bookings, setBookings] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [branches, setBranches] = useState([]);
  const [patients, setPatients] = useState([]);
  const [selectedBranchId, setSelectedBranchId] = useState('');
  const [configuration, setConfiguration] = useState({ ratePerKilometer: 100, onlinePaymentAvailable: false });
  const [bookingForm, setBookingForm] = useState(emptyBooking);
  const [vehicleForm, setVehicleForm] = useState(emptyVehicle);
  const [dispatchVehicles, setDispatchVehicles] = useState({});
  const [trackingUpdates, setTrackingUpdates] = useState({});
  const [showBookingForm, setShowBookingForm] = useState(false);
  const [showVehicleForm, setShowVehicleForm] = useState(false);
  const [showBranchForm, setShowBranchForm] = useState(false);
  const [branchForm, setBranchForm] = useState({ name: '', address: '' });
  const [pairingCodes, setPairingCodes] = useState({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [sessionExpired, setSessionExpired] = useState(false);
  const reportRequestError = useCallback((requestError, fallback) => {
    if (requestError.message?.includes('(401)')) {
      setSessionExpired(true);
      setError('Your CRM session expired or is no longer valid. Sign out and sign back in, then reload ambulance operations.');
      return;
    }
    setError(requestError.message || fallback);
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [configResponse, patientResponse, vehicleResponse, bookingResponse, branchResponse] = await Promise.all([
        apiFetch('/ambulance/configuration'),
        apiFetch('/ambulance/patients'),
        apiFetch('/ambulance/vehicles'),
        apiFetch('/ambulance/bookings'),
        apiFetch('/ambulance/branches'),
      ]);
      const [config, patientData, vehicleData, bookingData, branchData] = await Promise.all([
        readResponse(configResponse), readResponse(patientResponse),
        readResponse(vehicleResponse), readResponse(bookingResponse),
        readResponse(branchResponse),
      ]);
      setConfiguration(config);
      setPatients(patientData);
      setVehicles(vehicleData);
      setBookings(bookingData);
      setBranches(branchData);
    } catch (requestError) {
      reportRequestError(requestError, 'Could not load ambulance operations');
    } finally {
      setLoading(false);
    }
  }, [reportRequestError]);

  useEffect(() => { void refresh(); }, [refresh]);

  const refreshLiveLocations = useCallback(async () => {
    try {
      const [vehicleResponse, bookingResponse] = await Promise.all([
        apiFetch('/ambulance/vehicles'),
        apiFetch('/ambulance/bookings'),
      ]);
      const [vehicleData, bookingData] = await Promise.all([
        readResponse(vehicleResponse), readResponse(bookingResponse),
      ]);
      setVehicles(vehicleData);
      setBookings(bookingData);
    } catch (requestError) {
      reportRequestError(requestError, `Live fleet refresh failed: ${requestError.message || 'request failed'}`);
    }
  }, [reportRequestError]);

  useEffect(() => {
    if (sessionExpired) return undefined;
    const timer = window.setInterval(() => { void refreshLiveLocations(); }, 10000);
    return () => window.clearInterval(timer);
  }, [refreshLiveLocations, sessionExpired]);

  const selectedPatient = patients.find((patient) => patient.patientId === bookingForm.patientId);
  const estimatedFare = useMemo(() => {
    const distance = Number(bookingForm.distanceKm);
    return distance > 0 ? distance * Number(configuration.ratePerKilometer || 0) : 0;
  }, [bookingForm.distanceKm, configuration.ratePerKilometer]);
  const branchVehicles = vehicles.filter((vehicle) => !selectedBranchId || vehicle.branchId === selectedBranchId);
  const branchBookings = bookings.filter((booking) => !selectedBranchId || booking.branchId === selectedBranchId);
  const availableVehicles = branchVehicles.filter((vehicle) => vehicle.status === 'AVAILABLE');
  const activeBookings = branchBookings.filter((booking) => !['COMPLETED', 'CANCELLED'].includes(booking.status));
  const activeVehicleIds = new Set(activeBookings.map((booking) => booking.vehicleId).filter(Boolean));
  const locatedVehicles = branchVehicles.filter((vehicle) => Number.isFinite(Number(vehicle.latitude))
    && Number.isFinite(Number(vehicle.longitude)) && vehicle.locationUpdatedAt);
  const mapCenter = locatedVehicles.length
    ? [Number(locatedVehicles[0].latitude), Number(locatedVehicles[0].longitude)]
    : [20.5937, 78.9629];
  const treeBranches = selectedBranchId ? branches.filter((branch) => branch.id === selectedBranchId) : branches;
  const locationFreshness = (vehicle) => vehicle.locationUpdatedAt
    && Date.now() - new Date(vehicle.locationUpdatedAt).getTime() < 60000;

  const createBranch = async (event) => {
    event.preventDefault();
    setBusy('branch');
    setError('');
    setSuccess('');
    try {
      const branch = await readResponse(await apiFetch('/ambulance/branches', {
        method: 'POST',
        body: JSON.stringify(branchForm),
      }));
      setBranchForm({ name: '', address: '' });
      setShowBranchForm(false);
      setSelectedBranchId(branch.id);
      setVehicleForm((current) => ({ ...current, branchId: branch.id }));
      setBookingForm((current) => ({ ...current, branchId: branch.id }));
      setSuccess(`${branch.name} added as an ambulance branch.`);
      await refresh();
    } catch (requestError) {
      reportRequestError(requestError, 'Could not create branch');
    } finally {
      setBusy('');
    }
  };

  const createPairingCode = async (vehicle) => {
    setBusy(vehicle.id);
    setError('');
    try {
      const result = await readResponse(await apiFetch(
        `/ambulance/vehicles/${encodeURIComponent(vehicle.id)}/pairing-code`, { method: 'POST' },
      ));
      setPairingCodes({ ...pairingCodes, [vehicle.id]: result });
      setSuccess(`One-time phone pairing code created for ${vehicle.registrationNumber}.`);
    } catch (requestError) {
      setError(requestError.message || 'Could not generate a phone pairing code');
    } finally {
      setBusy('');
    }
  };

  const createBooking = async (event) => {
    event.preventDefault();
    setBusy('booking');
    setError('');
    setSuccess('');
    try {
      const booking = await readResponse(await apiFetch('/ambulance/bookings', {
        method: 'POST',
        body: JSON.stringify({
          ...bookingForm,
          distanceKm: Number(bookingForm.distanceKm),
        }),
      }));
      setBookingForm(emptyBooking);
      setShowBookingForm(false);
      await refresh();
      if (booking.paymentMethod === 'RAZORPAY') {
        await startAmbulanceCheckout(booking.id, async () => {
          setSuccess(`Online payment verified for ${booking.bookingNumber}.`);
          await refresh();
        });
      } else {
        setSuccess(`Ambulance ${booking.bookingNumber} booked. Cash payment of ${money(booking.amount)} is awaiting billing confirmation before dispatch.`);
      }
    } catch (requestError) {
      setError(requestError.message || 'Could not create ambulance booking');
    } finally {
      setBusy('');
    }
  };

  const createVehicle = async (event) => {
    event.preventDefault();
    setBusy('vehicle');
    setError('');
    setSuccess('');
    try {
      await readResponse(await apiFetch('/ambulance/vehicles', {
        method: 'POST',
        body: JSON.stringify(vehicleForm),
      }));
      setVehicleForm(emptyVehicle);
      setShowVehicleForm(false);
      setSuccess('Ambulance vehicle added to the fleet.');
      await refresh();
    } catch (requestError) {
      reportRequestError(requestError, 'Could not add ambulance vehicle');
    } finally {
      setBusy('');
    }
  };

  const updateBooking = async (id, action, body, message) => {
    setBusy(id);
    setError('');
    setSuccess('');
    try {
      await readResponse(await apiFetch(`/ambulance/bookings/${encodeURIComponent(id)}${action}`, {
        method: action === '/tracking' || action === '/dispatch' ? 'PUT' : 'POST',
        ...(body ? { body: JSON.stringify(body) } : {}),
      }));
      setSuccess(message);
      await refresh();
    } catch (requestError) {
      setError(requestError.message || 'Could not update ambulance booking');
    } finally {
      setBusy('');
    }
  };

  const updateVehicle = async (vehicle, status) => {
    setBusy(vehicle.id);
    setError('');
    setSuccess('');
    try {
      await readResponse(await apiFetch(`/ambulance/vehicles/${encodeURIComponent(vehicle.id)}`, {
        method: 'PUT',
        body: JSON.stringify({
          registrationNumber: vehicle.registrationNumber,
          branchId: vehicle.branchId,
          vehicleType: vehicle.vehicleType,
          driverName: vehicle.driverName,
          driverPhone: vehicle.driverPhone,
          status,
        }),
      }));
      setSuccess(`${vehicle.registrationNumber} marked ${pretty(status).toLowerCase()}.`);
      await refresh();
    } catch (requestError) {
      setError(requestError.message || 'Could not update vehicle status');
    } finally {
      setBusy('');
    }
  };

  const cancelBooking = (booking) => {
    const warning = booking.paymentMethod === 'CASH' && Number(booking.paidAmount) > 0
      ? 'Cancel this booking? The fare will be marked as due for a cash refund.'
      : 'Cancel this ambulance booking?';
    if (window.confirm(warning)) {
      void updateBooking(booking.id, '/cancel', null, 'Ambulance booking cancelled.');
    }
  };

  return (
    <section className="workflow-page" aria-labelledby="ambulance-title">
      <header className="workflow-header">
        <div>
          <p className="workflow-eyebrow">Patient transport operations</p>
          <h1 id="ambulance-title">Ambulance booking &amp; fleet</h1>
          <p>Book transport for an existing patient, collect the fare, and follow the assigned vehicle.</p>
        </div>
        <div className="workflow-toolbar-actions">
        <label className="ambulance-branch-filter">Branch
          <select aria-label="Dashboard branch" value={selectedBranchId}
            onChange={(event) => {
              const branchId = event.target.value;
              setSelectedBranchId(branchId);
              setBookingForm((current) => ({ ...current, branchId }));
              setVehicleForm((current) => ({ ...current, branchId }));
            }}>
            <option value="">All branches</option>
            {branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
          </select>
        </label>
        <button className="workflow-button subtle" type="button" onClick={() => { setError(''); setShowBranchForm(true); }}>
          <Plus size={15} /> Add branch
        </button>
        <button className="workflow-button subtle" type="button" onClick={() => { setError(''); setShowVehicleForm(true); }}>
            <Truck size={15} /> Add vehicle
          </button>
          <button className="workflow-button primary" type="button" onClick={() => { setError(''); setShowBookingForm(true); }}>
            <Plus size={16} /> Book ambulance
          </button>
        </div>
      </header>

      {error && <div className="workflow-alert error" role="alert">{error}</div>}
      {success && <div className="workflow-alert success" role="status">{success}</div>}

      {showBranchForm && (
        <form className="workflow-form-panel" onSubmit={createBranch}>
          <div className="workflow-panel-heading">
            <div><h2>Add ambulance branch</h2><p>Branches organize vehicles into the dispatch and live-location tree.</p></div>
            <button className="workflow-button subtle" type="button" onClick={() => setShowBranchForm(false)}>Cancel</button>
          </div>
          <div className="workflow-form-grid">
            <label>Branch name<input required value={branchForm.name}
              onChange={(event) => setBranchForm({ ...branchForm, name: event.target.value })} /></label>
            <label className="workflow-form-wide">Branch address<input value={branchForm.address}
              onChange={(event) => setBranchForm({ ...branchForm, address: event.target.value })} /></label>
          </div>
          <div className="workflow-form-actions"><button className="workflow-button primary" disabled={busy === 'branch'} type="submit">Save branch</button></div>
        </form>
      )}

      <div className="workflow-kpis">
        <article><span>Active bookings</span><strong>{activeBookings.length}</strong><Ambulance size={18} /></article>
        <article><span>Fleet vehicles</span><strong>{vehicles.length}</strong><Truck size={18} /></article>
        <article><span>Available vehicles</span><strong>{availableVehicles.length}</strong><MapPin size={18} /></article>
        <article><span>Fare per km</span><strong>{money(configuration.ratePerKilometer)}</strong><MapPin size={18} /></article>
      </div>

      {showBookingForm && (
        <form className="workflow-form-panel" onSubmit={createBooking}>
          <div className="workflow-panel-heading">
            <div><h2>Book patient ambulance</h2><p>Choose an existing patient. Fare is calculated from distance at {money(configuration.ratePerKilometer)} per km.</p></div>
            <button className="workflow-button subtle" type="button" onClick={() => setShowBookingForm(false)}>Cancel</button>
          </div>
          <div className="workflow-form-grid">
            <label>Existing patient<select required value={bookingForm.patientId} onChange={(event) => {
              const patientId = event.target.value;
              const patient = patients.find((item) => item.patientId === patientId);
              setBookingForm((current) => ({
                ...current,
                patientId,
                pickupAddress: current.pickupAddress || patient?.address || '',
              }));
            }}><option value="">Select patient</option>{patients.map((patient) => <option key={patient.patientId} value={patient.patientId}>
              {patient.patientName} · {patient.patientId}{patient.mobile ? ` · ${patient.mobile}` : ''}
            </option>)}</select></label>
            <label>Patient phone<input readOnly value={selectedPatient?.mobile || ''} placeholder="From patient record" /></label>
            <label>Ambulance branch<select required value={bookingForm.branchId} onChange={(event) => setBookingForm({
              ...bookingForm, branchId: event.target.value,
            })}><option value="">Select branch</option>{branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}</select></label>
            <label className="workflow-form-wide">Pickup address<input required value={bookingForm.pickupAddress}
              onChange={(event) => setBookingForm({ ...bookingForm, pickupAddress: event.target.value })} /></label>
            <label className="workflow-form-wide">Drop-off address<input required value={bookingForm.dropAddress}
              onChange={(event) => setBookingForm({ ...bookingForm, dropAddress: event.target.value })} /></label>
            <label>Distance (km)<input required type="number" min="0.1" step="0.1" value={bookingForm.distanceKm}
              onChange={(event) => setBookingForm({ ...bookingForm, distanceKm: event.target.value })} /></label>
            <label>Estimated fare<input readOnly value={money(estimatedFare)} aria-label="Estimated ambulance fare" /></label>
            <label>Payment method<select value={bookingForm.paymentMethod} onChange={(event) => setBookingForm({
              ...bookingForm, paymentMethod: event.target.value,
            })}>
              <option value="CASH">Cash</option>
              {configuration.onlinePaymentAvailable && <option value="RAZORPAY">Online (Razorpay)</option>}
            </select></label>
          </div>
          {!configuration.onlinePaymentAvailable && <p className="workflow-empty">
            Online payment is unavailable; use cash or configure Razorpay credentials.
          </p>}
          <div className="workflow-form-actions"><button className="workflow-button primary" disabled={busy === 'booking'} type="submit">
            {bookingForm.paymentMethod === 'CASH' ? 'Book & collect cash' : 'Continue to online payment'}
          </button></div>
        </form>
      )}

      {showVehicleForm && (
        <form className="workflow-form-panel" onSubmit={createVehicle}>
          <div className="workflow-panel-heading">
            <div><h2>Add ambulance vehicle</h2><p>Register vehicle and driver details for dispatcher assignment.</p></div>
            <button className="workflow-button subtle" type="button" onClick={() => setShowVehicleForm(false)}>Cancel</button>
          </div>
          <div className="workflow-form-grid">
            <label>Registration number<input required value={vehicleForm.registrationNumber}
              onChange={(event) => setVehicleForm({ ...vehicleForm, registrationNumber: event.target.value })} /></label>
            <label>Branch<select required value={vehicleForm.branchId} onChange={(event) => setVehicleForm({
              ...vehicleForm, branchId: event.target.value,
            })}><option value="">Select branch</option>{branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}</select></label>
            <label>Vehicle type<select value={vehicleForm.vehicleType} onChange={(event) => setVehicleForm({
              ...vehicleForm, vehicleType: event.target.value,
            })}><option value="BASIC">Basic life support</option><option value="ADVANCED">Advanced life support</option><option value="PATIENT_TRANSPORT">Patient transport</option></select></label>
            <label>Driver name<input required value={vehicleForm.driverName}
              onChange={(event) => setVehicleForm({ ...vehicleForm, driverName: event.target.value })} /></label>
            <label>Driver phone<input required type="tel" value={vehicleForm.driverPhone}
              onChange={(event) => setVehicleForm({ ...vehicleForm, driverPhone: event.target.value })} /></label>
          </div>
          <div className="workflow-form-actions"><button className="workflow-button primary" disabled={busy === 'vehicle'} type="submit">Save vehicle</button></div>
        </form>
      )}

      <section className="workflow-panel ambulance-topology">
        <div className="workflow-panel-heading">
          <div><h2>Branch ambulance topology</h2>
            <p>GPS refreshes every 10 seconds. A location is marked stale after 60 seconds without a phone update.</p></div>
          <span className="workflow-status ready">{locatedVehicles.length} live GPS</span>
        </div>
        <div className="ambulance-live-map" aria-label="Live ambulance map">
          <MapContainer center={mapCenter} zoom={locatedVehicles.length ? 11 : 5} scrollWheelZoom>
            <FleetMapViewport center={mapCenter} />
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {locatedVehicles.map((vehicle) => (
              <CircleMarker key={vehicle.id} center={[Number(vehicle.latitude), Number(vehicle.longitude)]}
                radius={9} pathOptions={{ color: locationFreshness(vehicle) ? '#15803d' : '#b45309', fillOpacity: 0.85 }}>
                <Popup><strong>{vehicle.registrationNumber}</strong><br />{vehicle.branchName || 'Unassigned branch'}<br />
                  {vehicle.driverName}<br />{vehicle.currentLocation}<br />
                  Updated {new Date(vehicle.locationUpdatedAt).toLocaleTimeString()}</Popup>
              </CircleMarker>
            ))}
          </MapContainer>
        </div>
        <div className="ambulance-topology-tree" aria-label="Branches and ambulances">
          {treeBranches.map((branch) => {
            const branchFleet = branchVehicles.filter((vehicle) => vehicle.branchId === branch.id);
            return <section className="ambulance-branch-node" key={branch.id}>
              <h3>{branch.name}<span>{branchFleet.length} ambulances</span></h3>
              <div>{branchFleet.map((vehicle) => (
                <article className="ambulance-vehicle-node" key={vehicle.id}>
                  <div><strong>{vehicle.registrationNumber}</strong><span>{vehicle.driverName} · {pretty(vehicle.status)}</span></div>
                  <div className="ambulance-location-node">
                    {vehicle.locationUpdatedAt ? <>
                      <span className={`workflow-status ${locationFreshness(vehicle) ? 'ready' : 'neutral'}`}>
                        {locationFreshness(vehicle) ? 'GPS live' : 'GPS stale'}
                      </span>
                      <span>{vehicle.currentLocation} {vehicle.locationAccuracyMeters ? `· ±${Math.round(vehicle.locationAccuracyMeters)} m` : ''}</span>
                      <time dateTime={vehicle.locationUpdatedAt}>{new Date(vehicle.locationUpdatedAt).toLocaleString()}</time>
                    </> : <span>No GPS location received yet</span>}
                  </div>
                </article>
              ))}{branchFleet.length === 0 && <p className="workflow-empty">No vehicles assigned to this branch.</p>}</div>
            </section>;
          })}
          {branchVehicles.some((vehicle) => !vehicle.branchId) && (
            <section className="ambulance-branch-node">
              <h3>Unassigned branch<span>{branchVehicles.filter((vehicle) => !vehicle.branchId).length} ambulances</span></h3>
              <div>{branchVehicles.filter((vehicle) => !vehicle.branchId).map((vehicle) => (
                <article className="ambulance-vehicle-node" key={vehicle.id}>
                  <div><strong>{vehicle.registrationNumber}</strong><span>{vehicle.driverName} · {pretty(vehicle.status)}</span></div>
                  <div className="ambulance-location-node">{vehicle.currentLocation || 'No GPS location received yet'}</div>
                </article>
              ))}</div>
            </section>
          )}
        </div>
      </section>

      <section className="workflow-panel">
        <div className="workflow-panel-heading"><div><h2>Ambulance bookings</h2><p>Track payment, pickup, assigned vehicle, driver, and current reported location.</p></div>
          <button className="workflow-button subtle" type="button" onClick={() => void refresh()} disabled={loading}><RefreshCw size={15} /> Refresh</button></div>
        {loading ? <div className="workflow-empty">Loading ambulance bookings…</div> : !branchBookings.length
          ? <div className="workflow-empty">No ambulance bookings yet.</div>
          : <div className="emergency-case-list">{branchBookings.map((booking) => {
            const availableForBooking = vehicles.filter((vehicle) => vehicle.status === 'AVAILABLE'
              && !activeVehicleIds.has(vehicle.id)
              && (!booking.branchId || vehicle.branchId === booking.branchId));
            const nextStatus = transitions[booking.status]?.[0];
            const update = trackingUpdates[booking.id] || { currentLocation: '', trackingNote: '' };
            const vehicleNumber = booking.vehicleRegistration
              || vehicles.find((vehicle) => vehicle.id === booking.vehicleId)?.registrationNumber;
            return <article className="emergency-case" key={booking.id}>
              <div className="emergency-case-main">
                <div className="emergency-case-title"><span className={`workflow-status ${booking.status === 'COMPLETED' ? 'ready' : 'neutral'}`}>{pretty(booking.status)}</span>
                  <span className="ambulance-registration-badge" aria-label={`Vehicle number ${vehicleNumber || 'not assigned'}`}>
                    Vehicle No: <strong>{vehicleNumber || 'Not assigned'}</strong>
                  </span>
                  <strong>{booking.patientName}</strong><span className="emergency-case-id">{booking.bookingNumber}</span></div>
                <div className="emergency-case-meta"><span>{booking.patientId} · {booking.patientMobile || 'No phone on record'}</span>
                  <span>Fare {money(booking.amount)} · Paid {money(booking.paidAmount)} · {pretty(booking.paymentStatus)}</span></div>
                <p><strong>Pickup:</strong> {booking.pickupAddress}</p><p><strong>Drop:</strong> {booking.dropAddress}</p>
                <div className="emergency-case-meta"><span>{booking.distanceKm} km × {money(booking.ratePerKm)}/km</span>
                  {booking.branchName && <span>Branch {booking.branchName}</span>}
                  {booking.driverName && <span>Driver {booking.driverName} · {booking.driverPhone}</span>}
                  {booking.currentLocation && <span>Current location: {booking.currentLocation}</span>}
                </div>
                {booking.trackingNote && <p>Update: {booking.trackingNote}</p>}
                {booking.status === 'CANCELLED' && <p><strong>Refund:</strong> {pretty(booking.refundStatus)} · {money(booking.refundAmount)}
                  {booking.refundedAt && ` · confirmed ${new Date(booking.refundedAt).toLocaleString()}`}
                </p>}
              </div>
              <div className="emergency-case-controls">
                {booking.status === 'BOOKED' && <div className="workflow-row-actions">
                  <select aria-label={`Vehicle for ${booking.bookingNumber}`} value={dispatchVehicles[booking.id] || ''}
                    onChange={(event) => setDispatchVehicles({ ...dispatchVehicles, [booking.id]: event.target.value })}>
                    <option value="">Assign available vehicle</option>
                    {availableForBooking.map((vehicle) => <option key={vehicle.id} value={vehicle.id}>
                      {vehicle.registrationNumber} · {vehicle.driverName}
                    </option>)}
                  </select>
                  <button className="workflow-button primary" type="button" disabled={busy === booking.id
                    || !dispatchVehicles[booking.id] || booking.paymentStatus !== 'PAID'}
                    onClick={() => void updateBooking(booking.id, '/dispatch', {
                      vehicleId: dispatchVehicles[booking.id], trackingNote: '',
                    }, 'Ambulance dispatched.')}>Dispatch</button>
                  {booking.paymentMethod === 'CASH' && booking.paymentStatus === 'PENDING'
                    && <span className="workflow-status neutral">Cash awaiting billing confirmation</span>}
                </div>}
                {nextStatus && <>
                  <label>Current location<input aria-label={`Current location for ${booking.bookingNumber}`}
                    value={update.currentLocation} onChange={(event) => setTrackingUpdates({
                      ...trackingUpdates, [booking.id]: { ...update, currentLocation: event.target.value },
                    })} placeholder="Enter location update" /></label>
                  <label>Tracking note<input aria-label={`Tracking note for ${booking.bookingNumber}`}
                    value={update.trackingNote} onChange={(event) => setTrackingUpdates({
                      ...trackingUpdates, [booking.id]: { ...update, trackingNote: event.target.value },
                    })} placeholder="Optional update" /></label>
                  <button className="workflow-button primary" type="button" disabled={busy === booking.id}
                    onClick={() => void updateBooking(booking.id, '/tracking', {
                      status: nextStatus,
                      currentLocation: update.currentLocation,
                      trackingNote: update.trackingNote,
                    }, `Ambulance status updated to ${pretty(nextStatus)}.`)}>Mark {pretty(nextStatus)}</button>
                </>}
                {['AWAITING_PAYMENT', 'BOOKED'].includes(booking.status) && <button className="workflow-button subtle"
                  type="button" disabled={busy === booking.id} onClick={() => cancelBooking(booking)}>Cancel booking</button>}
                {booking.refundStatus === 'REFUND_DUE' && <button className="workflow-button primary"
                  type="button" disabled={busy === booking.id} onClick={() => void updateBooking(
                    booking.id, '/cash-refund', null, 'Cash refund recorded as returned to patient.',
                  )}>Confirm cash refund</button>}
              </div>
            </article>;
          })}</div>}
      </section>

      <section className="workflow-panel">
        <div className="workflow-panel-heading"><div><h2>Ambulance fleet</h2><p>Vehicle availability follows active dispatches and completed trips.</p></div></div>
        {loading ? <div className="workflow-empty">Loading fleet…</div> : !vehicles.length
          ? <div className="workflow-empty">No vehicles registered. Add an ambulance to start dispatching.</div>
          : <div className="workflow-table-wrap"><table className="workflow-table">
            <thead><tr><th>Registration</th><th>Branch</th><th>Type</th><th>Driver</th><th>Phone</th><th>Current GPS</th><th>Availability / phone pairing</th></tr></thead>
            <tbody>{branchVehicles.map((vehicle) => <tr key={vehicle.id}>
              <td><strong>{vehicle.registrationNumber}</strong></td><td>{vehicle.branchName || 'Unassigned'}</td><td>{pretty(vehicle.vehicleType)}</td>
              <td>{vehicle.driverName}</td><td>{vehicle.driverPhone}</td><td>{vehicle.currentLocation || '—'}</td>
              <td><span className={`workflow-status ${vehicle.status === 'AVAILABLE' ? 'ready' : 'neutral'}`}>{pretty(vehicle.status)}</span>
                {vehicle.status === 'AVAILABLE' && <button className="workflow-button subtle" type="button" disabled={busy === vehicle.id}
                  onClick={() => void updateVehicle(vehicle, 'OUT_OF_SERVICE')}>Set out of service</button>}
                {vehicle.status === 'OUT_OF_SERVICE' && <button className="workflow-button subtle" type="button" disabled={busy === vehicle.id}
                  onClick={() => void updateVehicle(vehicle, 'AVAILABLE')}>Set available</button>}
                <button className="workflow-button subtle" type="button" disabled={busy === vehicle.id}
                  onClick={() => void createPairingCode(vehicle)}>Pair driver phone</button>
                {pairingCodes[vehicle.id] && <div className="ambulance-pairing-code">
                  <strong>{pairingCodes[vehicle.id].code}</strong>
                  <span>Single use · expires {new Date(pairingCodes[vehicle.id].expiresAt).toLocaleTimeString()}.
                    Driver page: <a href="/AmbulanceDriver">Open phone pairing</a></span>
                </div>}</td>
            </tr>)}</tbody>
          </table></div>}
      </section>
    </section>
  );
}
