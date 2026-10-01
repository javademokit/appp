import { useCallback, useEffect, useState } from 'react';
import { BadgeCheck, Banknote, ClipboardCheck, FileText, HeartPulse, Plus, ShieldCheck, Wallet } from 'lucide-react';
import { apiFetch } from '../API/api';
import './Operations.css';
import './DischargePage.css';

async function readResponse(response) {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || 'Request failed');
  return data;
}

const rupees = (value) => `₹${Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
const pretty = (value) => String(value || '').replaceAll('_', ' ').toLowerCase().replace(/\b\w/g, (character) => character.toUpperCase());

export default function DischargePage() {
  const [cases, setCases] = useState([]);
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [openClaimFor, setOpenClaimFor] = useState('');
  const [openDecisionFor, setOpenDecisionFor] = useState('');
  const [openPaymentFor, setOpenPaymentFor] = useState('');
  const [createForm, setCreateForm] = useState({ patientId: '', diagnosis: '', dischargeSummary: '', attendingDoctor: '', invoiceTotal: '' });
  const [claimForms, setClaimForms] = useState({});
  const [decisionForms, setDecisionForms] = useState({});
  const [paymentForms, setPaymentForms] = useState({});

  const refresh = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const [caseResponse, patientResponse] = await Promise.all([
        apiFetch('/discharges'),
        apiFetch('/patients'),
      ]);
      const [caseData, patientData] = await Promise.all([readResponse(caseResponse), readResponse(patientResponse)]);
      setCases(caseData);
      setPatients(patientData.filter((patient) => patient.patientAdmitdate && !patient.patientDischargedate));
    } catch (requestError) { setError(requestError.message || 'Could not load discharge workflow'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const updateState = (setter, state, caseId, key, value) => {
    setter({ ...state, [caseId]: { ...(state[caseId] || {}), [key]: value } });
  };

  const createCase = async (event) => {
    event.preventDefault(); setError(''); setSuccess(''); setBusyId('new');
    try {
      await readResponse(await apiFetch('/discharges', {
        method: 'POST', body: JSON.stringify({ ...createForm, invoiceTotal: Number(createForm.invoiceTotal) }),
      }));
      setCreateForm({ patientId: '', diagnosis: '', dischargeSummary: '', attendingDoctor: '', invoiceTotal: '' });
      setShowCreate(false); setSuccess('Discharge plan started. Clinical and financial clearances are pending.'); await refresh();
    } catch (requestError) { setError(requestError.message); }
    finally { setBusyId(''); }
  };

  const approveClinical = async (dischargeCase) => {
    setError(''); setSuccess(''); setBusyId(dischargeCase.id);
    try {
      await readResponse(await apiFetch(`/discharges/${dischargeCase.id}/clinical-approval`, { method: 'POST' }));
      setSuccess('Clinical discharge clearance recorded.'); await refresh();
    } catch (requestError) { setError(requestError.message); }
    finally { setBusyId(''); }
  };

  const submitClaim = async (event, dischargeCase) => {
    event.preventDefault(); setError(''); setSuccess(''); setBusyId(dischargeCase.id);
    try {
      const form = claimForms[dischargeCase.id] || {};
      await readResponse(await apiFetch(`/discharges/${dischargeCase.id}/insurance-claims`, {
        method: 'POST', body: JSON.stringify({ ...form, requestedAmount: Number(form.requestedAmount) }),
      }));
      setOpenClaimFor(''); setSuccess('Insurance claim submitted for payer review.'); await refresh();
    } catch (requestError) { setError(requestError.message); }
    finally { setBusyId(''); }
  };

  const recordDecision = async (event, dischargeCase) => {
    event.preventDefault(); setError(''); setSuccess(''); setBusyId(dischargeCase.id);
    try {
      const form = decisionForms[dischargeCase.id] || {};
      await readResponse(await apiFetch(`/discharges/${dischargeCase.id}/insurance-claims/decision`, {
        method: 'PATCH', body: JSON.stringify({ ...form, approvedAmount: Number(form.approvedAmount || 0) }),
      }));
      setOpenDecisionFor(''); setSuccess('Insurance decision recorded. Patient balance has been recalculated.'); await refresh();
    } catch (requestError) { setError(requestError.message); }
    finally { setBusyId(''); }
  };

  const recordPayment = async (event, dischargeCase) => {
    event.preventDefault(); setError(''); setSuccess(''); setBusyId(dischargeCase.id);
    try {
      const form = paymentForms[dischargeCase.id] || {};
      await readResponse(await apiFetch(`/discharges/${dischargeCase.id}/payments`, {
        method: 'POST', body: JSON.stringify({ ...form, amount: Number(form.amount) }),
      }));
      setOpenPaymentFor('');
      setSuccess(form.method === 'ONLINE'
        ? 'Online payment is pending gateway confirmation; it is not counted as paid yet.'
        : 'Cash payment recorded as received.');
      await refresh();
    } catch (requestError) { setError(requestError.message); }
    finally { setBusyId(''); }
  };

  const completeDischarge = async (dischargeCase) => {
    setError(''); setSuccess(''); setBusyId(dischargeCase.id);
    try {
      await readResponse(await apiFetch(`/discharges/${dischargeCase.id}/complete`, { method: 'POST' }));
      setSuccess(`${dischargeCase.patientName} discharged. Patient record updated.`); await refresh();
    } catch (requestError) { setError(requestError.message); }
    finally { setBusyId(''); }
  };

  const activeCases = cases.filter((item) => item.status !== 'DISCHARGED');
  const waitingForClinical = activeCases.filter((item) => item.clinicalStatus !== 'APPROVED').length;
  const awaitingInsurance = activeCases.filter((item) => item.insuranceClaim?.status === 'SUBMITTED').length;
  const balanceDue = activeCases.reduce((sum, item) => sum + Number(item.balanceDue || 0), 0);

  return (
    <section className="workflow-page discharge-page" aria-labelledby="discharge-title">
      <header className="workflow-header">
        <div><p className="workflow-eyebrow">Patient transition</p><h1 id="discharge-title">Discharge &amp; claims</h1><p>Coordinate clinical clearance, payer decisions, and final payment before discharge.</p></div>
        <button className="workflow-button primary" type="button" onClick={() => { setError(''); setShowCreate((shown) => !shown); }}><Plus size={16} /> Start discharge</button>
      </header>

      {error && <div className="workflow-alert error" role="alert">{error}</div>}
      {success && <div className="workflow-alert success" role="status">{success}</div>}

      <div className="workflow-kpis">
        <article><span>Active discharge cases</span><strong>{activeCases.length}</strong><HeartPulse size={18} /></article>
        <article className={waitingForClinical ? 'attention' : ''}><span>Clinical clearance pending</span><strong>{waitingForClinical}</strong><ClipboardCheck size={18} /></article>
        <article className={awaitingInsurance ? 'attention' : ''}><span>Claims awaiting decision</span><strong>{awaitingInsurance}</strong><ShieldCheck size={18} /></article>
        <article><span>Patient balance due</span><strong>{rupees(balanceDue)}</strong><Wallet size={18} /></article>
      </div>

      {showCreate && <form className="workflow-form-panel" onSubmit={createCase}>
        <div className="workflow-panel-heading"><div><h2>Start discharge plan</h2><p>Only currently admitted patients can enter this workflow.</p></div><button type="button" className="workflow-button subtle" onClick={() => setShowCreate(false)}>Cancel</button></div>
        <div className="workflow-form-grid">
          <label>Admitted patient<select required value={createForm.patientId} onChange={(event) => setCreateForm({ ...createForm, patientId: event.target.value })}><option value="">{patients.length ? 'Select patient' : 'No active inpatient admissions'}</option>{patients.filter((patient) => patient.patientId).map((patient) => <option key={patient.id} value={patient.patientId}>{patient.patientName} · {patient.patientId}</option>)}</select></label>
          <label>Attending doctor<input value={createForm.attendingDoctor} onChange={(event) => setCreateForm({ ...createForm, attendingDoctor: event.target.value })} /></label>
          <label>Final invoice total<input required type="number" min="0" step="0.01" value={createForm.invoiceTotal} onChange={(event) => setCreateForm({ ...createForm, invoiceTotal: event.target.value })} /></label>
          <label className="workflow-form-wide">Final diagnosis<input required value={createForm.diagnosis} onChange={(event) => setCreateForm({ ...createForm, diagnosis: event.target.value })} /></label>
          <label className="workflow-form-wide">Discharge summary<textarea rows="2" value={createForm.dischargeSummary} onChange={(event) => setCreateForm({ ...createForm, dischargeSummary: event.target.value })} /></label>
        </div>
        <div className="workflow-form-actions"><button type="submit" className="workflow-button primary" disabled={busyId === 'new'}>Create discharge plan</button></div>
      </form>}

      <div className="discharge-note"><ShieldCheck size={16} /><span>Final discharge is locked until clinical approval, insurer decision, and cleared balance are complete.</span></div>

      <section className="discharge-case-list">
        {loading ? <div className="workflow-panel workflow-empty">Loading discharge cases…</div> : !activeCases.length ? <div className="workflow-panel workflow-empty">No active discharge plans. Start one for an admitted patient when discharge is planned.</div> : activeCases.map((dischargeCase) => {
          const claimForm = claimForms[dischargeCase.id] || { provider: '', policyLastFour: '', requestedAmount: '' };
          const decisionForm = decisionForms[dischargeCase.id] || { status: 'APPROVED', approvedAmount: '', claimReference: '', decisionNotes: '' };
          const paymentForm = paymentForms[dischargeCase.id] || { method: 'CASH', amount: '', transactionReference: '' };
          return <article className="discharge-case-card" key={dischargeCase.id}>
            <header className="discharge-case-header">
              <div><div className="discharge-patient-line"><h2>{dischargeCase.patientName}</h2><span>{dischargeCase.patientId}</span><span className={`workflow-status ${dischargeCase.status === 'READY_FOR_DISCHARGE' ? 'ready' : 'neutral'}`}>{pretty(dischargeCase.status)}</span></div><p>{dischargeCase.diagnosis} · Admitted {dischargeCase.admissionDate || 'date unavailable'}</p></div>
              <div className="discharge-balance"><span>Balance due</span><strong>{rupees(dischargeCase.balanceDue)}</strong></div>
            </header>

            <div className="discharge-clearance-grid">
              <div className="clearance-step"><span className={`clearance-icon ${dischargeCase.clinicalStatus === 'APPROVED' ? 'complete' : ''}`}><HeartPulse size={16} /></span><div><strong>Clinical</strong><small>{dischargeCase.clinicalStatus === 'APPROVED' ? `Approved by ${dischargeCase.clinicalApprovedBy || 'clinician'}` : 'Approval required'}</small></div></div>
              <div className="clearance-step"><span className={`clearance-icon ${!dischargeCase.insuranceClaim || dischargeCase.insuranceClaim.status !== 'SUBMITTED' ? 'complete' : ''}`}><ShieldCheck size={16} /></span><div><strong>Insurance</strong><small>{dischargeCase.insuranceClaim ? `${pretty(dischargeCase.insuranceClaim.status)} · ${dischargeCase.insuranceClaim.provider}` : 'No claim submitted'}</small></div></div>
              <div className="clearance-step"><span className={`clearance-icon ${Number(dischargeCase.balanceDue) === 0 ? 'complete' : ''}`}><Banknote size={16} /></span><div><strong>Payment</strong><small>{Number(dischargeCase.balanceDue) === 0 ? 'Balance cleared' : 'Payment required'}</small></div></div>
            </div>

            <div className="discharge-finance-summary"><span>Invoice <strong>{rupees(dischargeCase.invoiceTotal)}</strong></span><span>Insurance approved <strong>{rupees(dischargeCase.insuranceCoveredAmount)}</strong></span><span>Patient paid <strong>{rupees(dischargeCase.patientPaidAmount)}</strong></span></div>
            {dischargeCase.insuranceClaim?.status === 'SUBMITTED' && <p className="discharge-pending-note">Claim {dischargeCase.insuranceClaim.claimReference || 'submitted'} is awaiting an insurer decision. Record the payer response to continue.</p>}
            {dischargeCase.payments?.some((payment) => payment.status === 'PENDING_PROVIDER') && <p className="discharge-pending-note">Online payment is pending provider confirmation. It is not counted toward discharge clearance.</p>}

            <div className="discharge-actions">
              {dischargeCase.clinicalStatus !== 'APPROVED' && <button className="workflow-button subtle" disabled={busyId === dischargeCase.id} type="button" onClick={() => approveClinical(dischargeCase)}><ClipboardCheck size={15} /> Approve clinically</button>}
              {(!dischargeCase.insuranceClaim || dischargeCase.insuranceClaim.status === 'DENIED') && <button className="workflow-button subtle" type="button" onClick={() => setOpenClaimFor(openClaimFor === dischargeCase.id ? '' : dischargeCase.id)}><FileText size={15} /> Submit claim</button>}
              {dischargeCase.insuranceClaim?.status === 'SUBMITTED' && <button className="workflow-button subtle" type="button" onClick={() => setOpenDecisionFor(openDecisionFor === dischargeCase.id ? '' : dischargeCase.id)}>Record insurer decision</button>}
              {Number(dischargeCase.balanceDue) > 0 && <button className="workflow-button subtle" type="button" onClick={() => setOpenPaymentFor(openPaymentFor === dischargeCase.id ? '' : dischargeCase.id)}><Wallet size={15} /> Record payment</button>}
              <button className="workflow-button primary" disabled={!dischargeCase.clearanceReady || busyId === dischargeCase.id} type="button" onClick={() => completeDischarge(dischargeCase)}><BadgeCheck size={15} /> Complete discharge</button>
            </div>

            {openClaimFor === dischargeCase.id && <form className="discharge-inline-form" onSubmit={(event) => submitClaim(event, dischargeCase)}><h3>Submit insurance claim</h3><div className="workflow-form-grid"><label>Insurance provider<input required value={claimForm.provider} onChange={(e) => updateState(setClaimForms, claimForms, dischargeCase.id, 'provider', e.target.value)} /></label><label>Policy last four digits<input required inputMode="numeric" pattern="[0-9]{4}" maxLength="4" value={claimForm.policyLastFour} onChange={(e) => updateState(setClaimForms, claimForms, dischargeCase.id, 'policyLastFour', e.target.value)} /></label><label>Claim amount<input required type="number" min="0" max={dischargeCase.invoiceTotal} step="0.01" value={claimForm.requestedAmount} onChange={(e) => updateState(setClaimForms, claimForms, dischargeCase.id, 'requestedAmount', e.target.value)} /></label></div><div className="workflow-form-actions"><button className="workflow-button primary" disabled={busyId === dischargeCase.id} type="submit">Submit claim</button></div></form>}

            {openDecisionFor === dischargeCase.id && <form className="discharge-inline-form" onSubmit={(event) => recordDecision(event, dischargeCase)}><h3>Record insurer decision</h3><div className="workflow-form-grid"><label>Decision<select value={decisionForm.status} onChange={(e) => updateState(setDecisionForms, decisionForms, dischargeCase.id, 'status', e.target.value)}><option value="APPROVED">Approved</option><option value="PARTIALLY_APPROVED">Partially approved</option><option value="DENIED">Denied</option></select></label><label>Approved amount<input required type="number" min="0" max={dischargeCase.insuranceClaim?.requestedAmount || 0} step="0.01" value={decisionForm.approvedAmount} onChange={(e) => updateState(setDecisionForms, decisionForms, dischargeCase.id, 'approvedAmount', e.target.value)} /></label><label>Claim reference<input value={decisionForm.claimReference} onChange={(e) => updateState(setDecisionForms, decisionForms, dischargeCase.id, 'claimReference', e.target.value)} /></label><label>Decision notes<input value={decisionForm.decisionNotes} onChange={(e) => updateState(setDecisionForms, decisionForms, dischargeCase.id, 'decisionNotes', e.target.value)} /></label></div><div className="workflow-form-actions"><button className="workflow-button primary" disabled={busyId === dischargeCase.id} type="submit">Save insurer decision</button></div></form>}

            {openPaymentFor === dischargeCase.id && <form className="discharge-inline-form" onSubmit={(event) => recordPayment(event, dischargeCase)}><h3>Record patient payment</h3><div className="workflow-form-grid"><label>Payment method<select value={paymentForm.method} onChange={(e) => updateState(setPaymentForms, paymentForms, dischargeCase.id, 'method', e.target.value)}><option value="CASH">Cash received</option><option value="ONLINE">Online / UPI</option></select></label><label>Amount<input required type="number" min="0.01" max={dischargeCase.balanceDue} step="0.01" value={paymentForm.amount} onChange={(e) => updateState(setPaymentForms, paymentForms, dischargeCase.id, 'amount', e.target.value)} /></label><label>Receipt / transaction reference<input value={paymentForm.transactionReference} onChange={(e) => updateState(setPaymentForms, paymentForms, dischargeCase.id, 'transactionReference', e.target.value)} /></label></div>{paymentForm.method === 'ONLINE' && <p className="discharge-pending-note">No payment gateway is configured yet. Online entries remain pending and will not clear the balance until a verified gateway callback is connected.</p>}<div className="workflow-form-actions"><button className="workflow-button primary" disabled={busyId === dischargeCase.id} type="submit">{paymentForm.method === 'CASH' ? 'Record cash received' : 'Create online payment request'}</button></div></form>}
          </article>;
        })}
      </section>
    </section>
  );
}
