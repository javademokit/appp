import React, { Component } from 'react';
import './Doctor.css';

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
      successMessage: '', // ✅ success message state
    };
  }

  componentDidMount() {
    this.fetchDoctors();
  }

  fetchDoctors = async () => {
    try {
      const response = await fetch('http://localhost:7771/api/doctors');
      const data = await response.json();
      this.setState({ doctors: data });
    } catch (error) {
      console.error('Error fetching doctors:', error);
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
      alert('Please add at least one time slot.');
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
      const response = await fetch('http://localhost:7771/api/doctors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
          successMessage: 'Doctor added successfully!', // ✅ Show success
        });

        // ✅ Remove message after 3 seconds
        setTimeout(() => this.setState({ successMessage: '' }), 3000);
      } else {
        throw new Error('Failed to save doctor');
      }
    } catch (error) {
      console.error('Error saving doctor:', error);
      alert('Error saving doctor');
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
    } = this.state;

    return (
      <div className="container my-5 doctor-container">
        <div className="doctor-header d-flex justify-content-between align-items-center mb-4">
          <h2 className="text-center">
            <i className="bi bi-person-badge-fill doctor-icon"></i> Doctor List
          </h2>
          <button className="btn btn-primary create-btn" onClick={() => this.setState({ showModal: true })}>
            <i className="bi bi-plus-circle me-2"></i> Create
          </button>
        </div>

        {/* ✅ Success alert */}
        {successMessage && (
          <div className="alert alert-success d-flex align-items-center" role="alert">
            <i className="bi bi-check-circle-fill me-2 fs-4"></i>
            <div>{successMessage}</div>
          </div>
        )}

        <div className="table-responsive">
          <table className="table custom-table" border="1" cellPadding="8" cellSpacing="0" style={{ width: '100%' }}>
            <thead>
              <tr>
                <th>Name</th>
                <th>Specialization</th>
                <th>Mobile No</th>
                <th>Destination</th>
                <th>Available Time</th>
                <th>Slots</th>
                <th>Fee</th>
              </tr>
            </thead>
            <tbody>
              {doctors.map((doc, index) => (
                <tr key={index}>
                  <td>{doc.doctorName}</td>
                  <td>{doc.doctorSpecialistName}</td>
                  <td>{doc.doctorMobileNo}</td>
                  <td>{doc.doctorDestination}</td>
                  <td>{doc.doctorAvailabletime.join(', ')}</td>
                  <td>{doc.doctorslot}</td>
                  <td>₹{doc.doctorfee}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {showModal && (
          <div className="modal-overlay">
            <div className="modal-content">
              <h4 className="mb-3">Add New Doctor</h4>

              <div className="mb-3">
                <label>Doctor Name</label>
                <input
                  type="text"
                  className="form-control"
                  name="doctorName"
                  value={newDoctor.doctorName}
                  onChange={this.handleInputChange}
                />
              </div>

              <div className="mb-3">
                <label>Specialization</label>
                <input
                  type="text"
                  className="form-control"
                  name="doctorSpecialistName"
                  value={newDoctor.doctorSpecialistName}
                  onChange={this.handleInputChange}
                />
              </div>

              <div className="mb-3">
                <label>Mobile Number</label>
                <input
                  type="text"
                  className="form-control"
                  name="doctorMobileNo"
                  value={newDoctor.doctorMobileNo}
                  onChange={this.handleInputChange}
                />
              </div>

              <div className="mb-3">
                <label>Destination (Ward)</label>
                <input
                  type="text"
                  className="form-control"
                  name="doctorDestination"
                  value={newDoctor.doctorDestination}
                  onChange={this.handleInputChange}
                />
              </div>

              <div className="mb-3">
                <label>Add Available Time Slot</label>
                <div className="d-flex align-items-center gap-2">
                  <input
                    type="time"
                    className="form-control"
                    value={slotInput}
                    onChange={(e) => this.setState({ slotInput: e.target.value })}
                  />
                  <button className="btn btn-success" onClick={this.handleAddSlot}>
                    Add Slot
                  </button>
                </div>
                <ul className="mt-3 list-group">
                  {availableSlots.map((slot, index) => (
                    <li key={index} className="list-group-item d-flex justify-content-between align-items-center">
                      {slot}
                      <button className="btn btn-sm btn-danger" onClick={() => this.handleRemoveSlot(index)}>
                        Remove
                      </button>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mb-3">
                <label>Consultation Fee</label>
                <input
                  type="number"
                  className="form-control"
                  name="doctorfee"
                  value={newDoctor.doctorfee}
                  onChange={this.handleInputChange}
                />
              </div>

              <div className="modal-actions">
                <button className="btn btn-secondary" onClick={() => this.setState({ showModal: false })}>
                  Close
                </button>
                <button className="btn btn-primary" onClick={this.handleCreateDoctor}>
                  Create Doctor
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }
}

export default Doctors;
