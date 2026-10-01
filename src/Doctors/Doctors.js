import React, { Component } from 'react';
import { apiFetch } from '../API/api';
import { CalendarDays, Clock3, Plus, Search, Stethoscope, Trash2, X } from 'lucide-react';
import './DoctorSchedule.css';

class Doctors extends Component {
  constructor(props) {
    super(props);
    this.state = {
      doctors: [],
      showModal: false,
      newDoctor: {
        doctorName: '',
        doctorSpecialistName: '',
        doctorMobileNo: '',
        doctorDestination: '',
        doctorfee: '',
      },
      availableSlots: [],
      slotInput: '',
      successMessage: '',
      searchQuery: '',
      isLoading: true,
      errorMessage: '',
    };
  }

  componentDidMount() {
    this.fetchDoctors();
  }

  fetchDoctors = async () => {
    try {
      const response = await apiFetch('/doctors');
      if (!response.ok) throw new Error('Could not load doctors');
      const data = await response.json();
      this.setState({ doctors: data, errorMessage: '' });
    } catch (error) {
      this.setState({ errorMessage: error.message || 'Could not load doctors' });
    } finally {
      this.setState({ isLoading: false });
    }
  };

  handleInputChange = (e) => {
    this.setState({
      newDoctor: {
        ...this.state.newDoctor,
        [e.target.name]: e.target.value,
      },
    });
  };

  handleAddSlot = () => {
    const { slotInput, availableSlots } = this.state;
    if (slotInput.trim()) {
      this.setState({
        availableSlots: [...availableSlots, slotInput.trim()],
        slotInput: '',
      });
    }
  };

  handleRemoveSlot = (index) => {
    const updatedSlots = this.state.availableSlots.filter((_, i) => i !== index);
    this.setState({ availableSlots: updatedSlots });
  };

  handleCreateDoctor = async () => {
    const { newDoctor, availableSlots } = this.state;

    if (!availableSlots.length) {
      this.setState({ errorMessage: 'Add at least one available time slot.' });
      return;
    }
    if (!newDoctor.doctorName.trim() || !newDoctor.doctorSpecialistName.trim()) {
      this.setState({ errorMessage: 'Enter a doctor name and specialty.' });
      return;
    }

    const newEntry = {
      doctorName: newDoctor.doctorName,
      doctorMobileNo: newDoctor.doctorMobileNo,
      doctorDestination: newDoctor.doctorDestination,
      doctorSpecialistName: newDoctor.doctorSpecialistName,
      doctorAvailabletime: availableSlots,
      doctorslot: availableSlots.length,
      doctorfee: newDoctor.doctorfee,
    };

    try {
      const response = await apiFetch('/doctors', {
        method: 'POST',
        body: JSON.stringify(newEntry),
      });

      if (response.ok) {
        const savedDoctor = await response.json();
        this.setState({
          doctors: [...this.state.doctors, savedDoctor],
          showModal: false,
          newDoctor: {
            doctorName: '',
            doctorSpecialistName: '',
            doctorMobileNo: '',
            doctorDestination: '',
            doctorfee: '',
          },
          availableSlots: [],
          slotInput: '',
          successMessage: 'Doctor added successfully!',
          errorMessage: '',
        });

        setTimeout(() => this.setState({ successMessage: '' }), 3000);
      } else {
        throw new Error('Failed to save doctor');
      }
    } catch (error) {
      this.setState({ errorMessage: error.message || 'Could not save doctor' });
    }
  };

  render() {
    const {
      doctors,
      showModal,
      newDoctor,
      availableSlots,
      slotInput,
      successMessage,
      searchQuery,
      isLoading,
      errorMessage,
    } = this.state;
    const filteredDoctors = doctors.filter((doctor) =>
      `${doctor.doctorName || ''} ${doctor.doctorSpecialistName || ''} ${doctor.doctorDestination || ''}`
        .toLowerCase()
        .includes(searchQuery.toLowerCase())
    );
    const totalSlots = doctors.reduce((total, doctor) => {
      const slots = Array.isArray(doctor.doctorAvailabletime)
        ? doctor.doctorAvailabletime
        : String(doctor.doctorAvailabletime || '').split(',').filter(Boolean);
      return total + slots.length;
    }, 0);

    return (
      <section className="doctor-schedule" aria-labelledby="doctor-schedule-title">
        <header className="doctor-schedule-header">
          <div>
            <p className="doctor-schedule-eyebrow">Staff &amp; scheduling</p>
            <h1 id="doctor-schedule-title">Doctor availability</h1>
            <p className="doctor-schedule-description">Manage clinician details and appointment hours.</p>
          </div>
          <button className="doctor-add-button" type="button" onClick={() => this.setState({ showModal: true, errorMessage: '' })}>
            <Plus size={17} aria-hidden="true" /> Add doctor
          </button>
        </header>

        {successMessage && <div className="doctor-notice success" role="status">{successMessage}</div>}
        {errorMessage && !showModal && <div className="doctor-notice error" role="alert">{errorMessage}</div>}

        <div className="doctor-summary-grid">
          <article className="doctor-summary-item">
            <span>Listed doctors</span>
            <strong>{doctors.length}</strong>
          </article>
          <article className="doctor-summary-item">
            <span>Scheduled time slots</span>
            <strong>{totalSlots}</strong>
          </article>
          <article className="doctor-summary-item">
            <span>Specialties</span>
            <strong>{new Set(doctors.map((doctor) => doctor.doctorSpecialistName).filter(Boolean)).size}</strong>
          </article>
        </div>

        <div className="doctor-roster-panel">
          <div className="doctor-roster-toolbar">
            <div>
              <h2>Clinician roster</h2>
              <p>{filteredDoctors.length} of {doctors.length} doctors</p>
            </div>
            <label className="doctor-search">
              <Search size={16} aria-hidden="true" />
              <input
                type="search"
                value={searchQuery}
                onChange={(event) => this.setState({ searchQuery: event.target.value })}
                placeholder="Search doctors"
                aria-label="Search doctors"
              />
            </label>
          </div>

          {isLoading ? (
            <div className="doctor-empty-state" role="status">Loading doctor schedule…</div>
          ) : errorMessage && !doctors.length ? (
            <div className="doctor-empty-state" role="alert">{errorMessage}</div>
          ) : !filteredDoctors.length ? (
            <div className="doctor-empty-state">No doctors match this search.</div>
          ) : (
            <>
              <div className="doctor-table-wrap">
                <table className="doctor-table">
                  <thead>
                    <tr>
                      <th>Doctor</th>
                      <th>Department</th>
                      <th>Location</th>
                      <th>Available times</th>
                      <th>Fee</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredDoctors.map((doctor, index) => {
                      const slots = Array.isArray(doctor.doctorAvailabletime)
                        ? doctor.doctorAvailabletime
                        : String(doctor.doctorAvailabletime || '').split(',').filter(Boolean);
                      return (
                        <tr key={doctor.id || `${doctor.doctorName}-${index}`}>
                          <td>
                            <div className="doctor-person">
                              <span className="doctor-avatar"><Stethoscope size={17} /></span>
                              <span><strong>{doctor.doctorName || 'Doctor'}</strong><small>{doctor.doctorMobileNo || 'Contact not provided'}</small></span>
                            </div>
                          </td>
                          <td>{doctor.doctorSpecialistName || 'General medicine'}</td>
                          <td>{doctor.doctorDestination || 'Not assigned'}</td>
                          <td><div className="doctor-slot-list">{slots.length ? slots.map((slot, slotIndex) => <span key={`${slot}-${slotIndex}`} className="doctor-slot-chip">{slot}</span>) : <span className="doctor-no-slots">No hours set</span>}</div></td>
                          <td>{doctor.doctorfee ? `₹${doctor.doctorfee}` : '—'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="doctor-mobile-list">
                {filteredDoctors.map((doctor, index) => {
                  const slots = Array.isArray(doctor.doctorAvailabletime)
                    ? doctor.doctorAvailabletime
                    : String(doctor.doctorAvailabletime || '').split(',').filter(Boolean);
                  return (
                    <article className="doctor-mobile-card" key={doctor.id || `${doctor.doctorName}-${index}`}>
                      <div className="doctor-mobile-card-header">
                        <span className="doctor-avatar"><Stethoscope size={17} /></span>
                        <div><strong>{doctor.doctorName || 'Doctor'}</strong><span>{doctor.doctorSpecialistName || 'General medicine'}</span></div>
                        <strong className="doctor-mobile-fee">{doctor.doctorfee ? `₹${doctor.doctorfee}` : '—'}</strong>
                      </div>
                      <div className="doctor-mobile-meta"><span><CalendarDays size={14} />{doctor.doctorDestination || 'Location not assigned'}</span><span><Clock3 size={14} />{slots.length} slots</span></div>
                      <div className="doctor-slot-list">{slots.length ? slots.map((slot, slotIndex) => <span key={`${slot}-${slotIndex}`} className="doctor-slot-chip">{slot}</span>) : <span className="doctor-no-slots">No hours set</span>}</div>
                    </article>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {showModal && (
          <div className="doctor-dialog-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) this.setState({ showModal: false }); }}>
            <section className="doctor-dialog" role="dialog" aria-modal="true" aria-labelledby="doctor-dialog-title">
              <header className="doctor-dialog-header">
                <div><p className="doctor-schedule-eyebrow">New clinician</p><h2 id="doctor-dialog-title">Add doctor</h2></div>
                <button className="doctor-icon-button" type="button" aria-label="Close dialog" onClick={() => this.setState({ showModal: false })}><X size={19} /></button>
              </header>
              {errorMessage && <div className="doctor-notice error" role="alert">{errorMessage}</div>}
              <form onSubmit={(event) => { event.preventDefault(); this.handleCreateDoctor(); }}>
                <div className="doctor-form-grid">
                  <label>Full name<input required name="doctorName" value={newDoctor.doctorName} onChange={this.handleInputChange} /></label>
                  <label>Specialty<input required name="doctorSpecialistName" value={newDoctor.doctorSpecialistName} onChange={this.handleInputChange} /></label>
                  <label>Phone<input name="doctorMobileNo" type="tel" value={newDoctor.doctorMobileNo} onChange={this.handleInputChange} /></label>
                  <label>Department / ward<input name="doctorDestination" value={newDoctor.doctorDestination} onChange={this.handleInputChange} /></label>
                  <label>Consultation fee<input min="0" name="doctorfee" type="number" value={newDoctor.doctorfee} onChange={this.handleInputChange} /></label>
                </div>
                <div className="doctor-slot-editor">
                  <label htmlFor="doctor-slot-time">Available time slots</label>
                  <div className="doctor-slot-entry">
                    <input id="doctor-slot-time" type="time" value={slotInput} onChange={(event) => this.setState({ slotInput: event.target.value })} />
                    <button type="button" className="doctor-add-slot" onClick={this.handleAddSlot}><Plus size={16} /> Add time</button>
                  </div>
                  <div className="doctor-slot-list">
                    {availableSlots.map((slot, index) => (
                      <span key={`${slot}-${index}`} className="doctor-slot-chip editable">
                        {slot}
                        <button type="button" aria-label={`Remove ${slot}`} onClick={() => this.handleRemoveSlot(index)}><Trash2 size={13} /></button>
                      </span>
                    ))}
                    {!availableSlots.length && <span className="doctor-no-slots">Add at least one time before saving.</span>}
                  </div>
                </div>
                <footer className="doctor-dialog-actions">
                  <button type="button" className="doctor-cancel-button" onClick={() => this.setState({ showModal: false })}>Cancel</button>
                  <button type="submit" className="doctor-add-button"><Plus size={16} /> Save doctor</button>
                </footer>
              </form>
            </section>
          </div>
        )}
      </section>
    );
  }
}

export default Doctors;
