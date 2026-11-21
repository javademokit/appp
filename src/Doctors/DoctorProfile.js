import { useCallback, useEffect, useState } from 'react';
import { Clock3, MapPin, Phone, RefreshCw, Stethoscope } from 'lucide-react';
import { apiFetch } from '../API/api';
import './DoctorProfile.css';

function doctorInitials(name) {
  return String(name || 'Doctor')
    .replace(/^Dr\.?\s*/i, '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('');
}

const DoctorProfile = () => {
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadDoctors = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await apiFetch('/doctors');
      const result = await response.json().catch(() => null);
      if (!response.ok) throw new Error(result?.message || 'Could not load doctors.');
      if (!Array.isArray(result)) throw new Error('The doctors response was invalid.');
      setDoctors(result);
    } catch (requestError) {
      setError(requestError.message || 'Could not load doctors.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDoctors();
  }, [loadDoctors]);

  return (
    <section className="doctor-directory" aria-labelledby="doctor-directory-title" aria-busy={loading}>
      <header className="doctor-directory-header">
        <div>
          <p className="doctor-directory-eyebrow"><Stethoscope size={15} aria-hidden="true" /> Care team</p>
          <h1 id="doctor-directory-title">Our doctors</h1>
          <p className="doctor-directory-intro">Meet the clinicians on your hospital team and explore their specialties.</p>
        </div>
        <div className="doctor-directory-actions">
          {!loading && !error && <span className="doctor-directory-count">{doctors.length} {doctors.length === 1 ? 'doctor' : 'doctors'}</span>}
          <button className="doctor-directory-refresh" type="button" onClick={loadDoctors} disabled={loading}>
            <RefreshCw size={15} aria-hidden="true" /> {loading ? 'Loading…' : 'Refresh'}
          </button>
        </div>
      </header>

      {error && <div className="doctor-directory-message error" role="alert">{error}</div>}
      {loading ? (
        <div className="doctor-directory-message" role="status">Loading doctors from the hospital directory…</div>
      ) : error ? null : doctors.length === 0 ? (
        <div className="doctor-directory-message" role="status">No doctors have been added to the directory yet.</div>
      ) : (
        <div className="doctor-directory-grid">
          {doctors.map((doctor, index) => {
            const name = doctor.doctorName || 'Doctor';
            const availableTimes = Array.isArray(doctor.doctorAvailabletime)
              ? doctor.doctorAvailabletime.filter(Boolean)
              : [];
            return (
              <article className="doctor-directory-card" key={doctor.id || doctor.employeeId || `${name}-${index}`}>
                <div className="doctor-directory-card-heading">
                  <span className="doctor-directory-avatar" aria-hidden="true">{doctorInitials(name)}</span>
                  <div>
                    <h2>{name}</h2>
                    <p className="doctor-directory-specialty">{doctor.doctorSpecialistName || 'Specialty not listed'}</p>
                  </div>
                </div>
                <div className="doctor-directory-details">
                  {doctor.doctorDestination && (
                    <p><MapPin size={15} aria-hidden="true" /><span>{doctor.doctorDestination}</span></p>
                  )}
                  {doctor.doctorMobileNo && (
                    <p><Phone size={15} aria-hidden="true" /><a href={`tel:${doctor.doctorMobileNo}`}>{doctor.doctorMobileNo}</a></p>
                  )}
                  <p>
                    <Clock3 size={15} aria-hidden="true" />
                    <span>{availableTimes.length ? availableTimes.join(' · ') : 'Schedule not listed'}</span>
                  </p>
                </div>
                <div className="doctor-directory-card-footer">
                  {doctor.employeeId && <span>{doctor.employeeId}</span>}
                  <strong>{Number.isFinite(Number(doctor.doctorfee))
                    ? `₹${Number(doctor.doctorfee).toLocaleString('en-IN')} consultation`
                    : 'Consultation fee not listed'}</strong>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
};

export default DoctorProfile;
