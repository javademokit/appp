import { useCallback, useEffect, useState } from 'react';
import { Check, ClipboardPlus, FileUp, FlaskConical, RefreshCw } from 'lucide-react';
import { apiFetch } from '../API/api';
import './Operations.css';

const testTypes = ['CBC', 'BLOOD_CHEMISTRY', 'LIPID_PROFILE', 'BLOOD_CULTURE', 'COAGULATION_TEST', 'URINALYSIS', 'URINE_CULTURE', 'XRAY', 'ULTRASOUND', 'CT_SCAN', 'MRI', 'ECG', 'THYROID_FUNCTION', 'PCR_TEST'];
const testLabel = (value) => String(value || '').replaceAll('_', ' ').toLowerCase().replace(/\b\w/g, (character) => character.toUpperCase());

async function readResponse(response) {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || 'Request failed');
  return data;
}

export default function LabsDiagnosticsPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showOrderForm, setShowOrderForm] = useState(false);
  const [resultOrder, setResultOrder] = useState(null);
  const [reviewOrder, setReviewOrder] = useState(null);
  const [orderForm, setOrderForm] = useState({ patientName: '', age: '', gender: 'Female', referredBy: '', testType: 'CBC', labTechnician: '', remarks: '' });
  const [resultSummary, setResultSummary] = useState('');
  const [reportFile, setReportFile] = useState(null);
  const [reviewNotes, setReviewNotes] = useState('');

  const refresh = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const response = await apiFetch('/medical-tests');
      setOrders(await readResponse(response));
    } catch (requestError) { setError(requestError.message || 'Could not load diagnostic orders'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const createOrder = async (event) => {
    event.preventDefault(); setError(''); setSuccess(''); setBusyId('new');
    try {
      await readResponse(await apiFetch('/medical-tests', {
        method: 'POST',
        body: JSON.stringify({ ...orderForm, age: Number(orderForm.age) }),
      }));
      setShowOrderForm(false);
      setOrderForm({ patientName: '', age: '', gender: 'Female', referredBy: '', testType: 'CBC', labTechnician: '', remarks: '' });
      setSuccess('Diagnostic order created.'); await refresh();
    } catch (requestError) { setError(requestError.message); }
    finally { setBusyId(''); }
  };

  const collectSample = async (order) => {
    setError(''); setSuccess(''); setBusyId(order.id);
    try {
      await readResponse(await apiFetch(`/medical-tests/${order.id}/sample`, { method: 'POST' }));
      setSuccess(`Sample collected for ${order.patientName}.`); await refresh();
    } catch (requestError) { setError(requestError.message); }
    finally { setBusyId(''); }
  };

  const recordResult = async (event) => {
    event.preventDefault();
    if (!resultOrder) return;
    setError(''); setSuccess(''); setBusyId(resultOrder.id);
    try {
      await readResponse(await apiFetch(`/medical-tests/${resultOrder.id}/result`, {
        method: 'POST', body: JSON.stringify({ resultSummary }),
      }));
      if (reportFile) {
        const formData = new FormData();
        formData.append('file', reportFile);
        await readResponse(await apiFetch(`/medical-tests/${resultOrder.id}/report`, { method: 'POST', body: formData }));
      }
      setResultOrder(null); setResultSummary(''); setReportFile(null);
      setSuccess('Result recorded and sent for doctor review.'); await refresh();
    } catch (requestError) { setError(requestError.message); }
    finally { setBusyId(''); }
  };

  const approveResult = async (event) => {
    event.preventDefault();
    setError(''); setSuccess(''); setBusyId(reviewOrder.id);
    try {
      await readResponse(await apiFetch(`/medical-tests/${reviewOrder.id}/review`, {
        method: 'POST', body: JSON.stringify({ reviewNotes }),
      }));
      setReviewOrder(null); setReviewNotes(''); setSuccess('Result reviewed and approved.'); await refresh();
    } catch (requestError) { setError(requestError.message); }
    finally { setBusyId(''); }
  };

  const openReport = async (order) => {
    setError(''); setBusyId(order.id);
    try {
      const response = await apiFetch(`/medical-tests/${order.id}/report`);
      if (!response.ok) throw new Error('Report could not be opened');
      const url = URL.createObjectURL(await response.blob());
      const link = document.createElement('a');
      link.href = url; link.target = '_blank'; link.rel = 'noopener noreferrer';
      link.click(); URL.revokeObjectURL(url);
    } catch (requestError) { setError(requestError.message); }
    finally { setBusyId(''); }
  };

  const counts = {
    ordered: orders.filter((order) => order.status === 'ORDERED').length,
    processing: orders.filter((order) => order.status === 'IN_PROGRESS').length,
    review: orders.filter((order) => order.status === 'RESULT_READY').length,
    reviewed: orders.filter((order) => order.status === 'REVIEWED').length,
  };

  return (
    <section className="workflow-page" aria-labelledby="lab-title">
      <header className="workflow-header">
        <div><p className="workflow-eyebrow">Diagnostics operations</p><h1 id="lab-title">Lab &amp; diagnostics</h1><p>Order tests, track samples, upload reports, and review results.</p></div>
        <button className="workflow-button primary" type="button" onClick={() => { setError(''); setShowOrderForm((shown) => !shown); }}><ClipboardPlus size={16} /> New test order</button>
      </header>

      {error && <div className="workflow-alert error" role="alert">{error}</div>}
      {success && <div className="workflow-alert success" role="status">{success}</div>}

      <div className="workflow-kpis">
        <article><span>Awaiting sample</span><strong>{counts.ordered}</strong><ClipboardPlus size={18} /></article>
        <article><span>In progress</span><strong>{counts.processing}</strong><FlaskConical size={18} /></article>
        <article className={counts.review ? 'attention' : ''}><span>Needs review</span><strong>{counts.review}</strong><FileUp size={18} /></article>
        <article><span>Reviewed</span><strong>{counts.reviewed}</strong><Check size={18} /></article>
      </div>

      {showOrderForm && <form className="workflow-form-panel" onSubmit={createOrder}>
        <div className="workflow-panel-heading"><div><h2>New diagnostic order</h2><p>Capture the patient and requested investigation.</p></div><button className="workflow-button subtle" type="button" onClick={() => setShowOrderForm(false)}>Cancel</button></div>
        <div className="workflow-form-grid">
          <label>Patient name<input required value={orderForm.patientName} onChange={(e) => setOrderForm({ ...orderForm, patientName: e.target.value })} /></label>
          <label>Age<input required min="0" type="number" value={orderForm.age} onChange={(e) => setOrderForm({ ...orderForm, age: e.target.value })} /></label>
          <label>Gender<select value={orderForm.gender} onChange={(e) => setOrderForm({ ...orderForm, gender: e.target.value })}><option>Female</option><option>Male</option><option>Other</option></select></label>
          <label>Test type<select value={orderForm.testType} onChange={(e) => setOrderForm({ ...orderForm, testType: e.target.value })}>{testTypes.map((type) => <option key={type} value={type}>{testLabel(type)}</option>)}</select></label>
          <label>Referred by<input value={orderForm.referredBy} onChange={(e) => setOrderForm({ ...orderForm, referredBy: e.target.value })} /></label>
          <label>Lab technician<input value={orderForm.labTechnician} onChange={(e) => setOrderForm({ ...orderForm, labTechnician: e.target.value })} /></label>
          <label className="workflow-form-wide">Notes<textarea rows="2" value={orderForm.remarks} onChange={(e) => setOrderForm({ ...orderForm, remarks: e.target.value })} /></label>
        </div>
        <div className="workflow-form-actions"><button className="workflow-button primary" disabled={busyId === 'new'} type="submit">Create test order</button></div>
      </form>}

      {resultOrder && <form className="workflow-form-panel" onSubmit={recordResult}>
        <div className="workflow-panel-heading"><div><h2>Record result · {resultOrder.patientName}</h2><p>{testLabel(resultOrder.testType)}</p></div><button className="workflow-button subtle" type="button" onClick={() => setResultOrder(null)}>Cancel</button></div>
        <div className="workflow-form-grid"><label className="workflow-form-wide">Result summary<textarea required rows="3" value={resultSummary} onChange={(e) => setResultSummary(e.target.value)} /></label><label className="workflow-form-wide">Attach report (PDF, PNG, JPEG; max 10 MB)<input type="file" accept="application/pdf,image/png,image/jpeg" onChange={(e) => setReportFile(e.target.files?.[0] || null)} /></label></div>
        <div className="workflow-form-actions"><button className="workflow-button primary" disabled={busyId === resultOrder.id} type="submit">Save result</button></div>
      </form>}

      {reviewOrder && <form className="workflow-form-panel" onSubmit={approveResult}>
        <div className="workflow-panel-heading"><div><h2>Doctor review · {reviewOrder.patientName}</h2><p>{reviewOrder.resultSummary}</p></div><button className="workflow-button subtle" type="button" onClick={() => setReviewOrder(null)}>Cancel</button></div>
        <label>Review notes<textarea rows="3" value={reviewNotes} onChange={(e) => setReviewNotes(e.target.value)} /></label>
        <div className="workflow-form-actions"><button className="workflow-button primary" disabled={busyId === reviewOrder.id} type="submit">Approve result</button></div>
      </form>}

      <section className="workflow-panel">
        <div className="workflow-panel-heading"><div><h2>Diagnostic worklist</h2><p>Orders move from sample collection to result review.</p></div><button className="workflow-button subtle" type="button" onClick={refresh}><RefreshCw size={15} /> Refresh</button></div>
        {loading ? <div className="workflow-empty">Loading diagnostic orders…</div> : !orders.length ? <div className="workflow-empty">No diagnostic orders yet.</div> : <div className="workflow-table-wrap"><table className="workflow-table"><thead><tr><th>Order</th><th>Patient</th><th>Test</th><th>Ordered</th><th>Status</th><th>Actions</th></tr></thead><tbody>{orders.map((order) => <tr key={order.id}><td>#{order.id?.slice(-6)}</td><td><strong>{order.patientName}</strong><small>{order.age} · {order.gender}</small></td><td>{testLabel(order.testType)}</td><td>{order.orderDate ? new Date(order.orderDate).toLocaleDateString() : '—'}</td><td><span className={`workflow-status ${order.status === 'REVIEWED' ? 'ready' : order.status === 'RESULT_READY' ? 'warning' : 'neutral'}`}>{testLabel(order.status)}</span></td><td><div className="workflow-row-actions">{order.status === 'ORDERED' && <button className="workflow-button subtle" disabled={busyId === order.id} type="button" onClick={() => collectSample(order)}>Collect sample</button>}{order.status === 'IN_PROGRESS' && <button className="workflow-button subtle" type="button" onClick={() => { setResultOrder(order); setResultSummary(''); setReportFile(null); }}>Record result</button>}{order.status === 'RESULT_READY' && <button className="workflow-button primary" type="button" onClick={() => { setReviewOrder(order); setReviewNotes(''); }}>Review</button>}{order.reportFileId && <button className="workflow-button subtle" disabled={busyId === order.id} type="button" onClick={() => openReport(order)}>View report</button>}</div></td></tr>)}</tbody></table></div>}
      </section>
    </section>
  );
}
