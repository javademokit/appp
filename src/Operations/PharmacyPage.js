import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Boxes, ClipboardList, Pill, Plus, Printer, RefreshCw } from 'lucide-react';
import { apiFetch } from '../API/api';
import { startPharmacyCheckout } from '../PaymentPage/paymentGatewayCheckout';
import BrandLogo from '../components/BrandLogo';
import './Operations.css';

const medicineDepartments = [
  'General Medicine', 'Pediatrics', 'Surgery / Operations', 'Nephrology / Kidney',
  'Cardiology', 'Orthopedics', 'Neurology', 'Maternity / Obstetrics', 'Emergency',
];
const emptyMedication = {
  name: '', department: 'General Medicine', strength: '', dosageForm: 'Tablet', batchNumber: '', quantityOnHand: '',
  reorderLevel: '', unitPrice: '', supplier: '', location: '', expiryDate: '',
};

async function readResponse(response) {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || 'Request failed');
  return data;
}

const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (character) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
})[character]);

export default function PharmacyPage() {
  const [activeTab, setActiveTab] = useState('inventory');
  const [inventory, setInventory] = useState([]);
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [issues, setIssues] = useState([]);
  const [doctorPrescriptions, setDoctorPrescriptions] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [paymentGateways, setPaymentGateways] = useState({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [search, setSearch] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('All departments');
  const [printablePrescription, setPrintablePrescription] = useState(null);
  const [showMedicationForm, setShowMedicationForm] = useState(false);
  const [showOrderForm, setShowOrderForm] = useState(false);
  const [showIssueForm, setShowIssueForm] = useState(false);
  const [medicationForm, setMedicationForm] = useState(emptyMedication);
  const [orderForm, setOrderForm] = useState({ medicationId: '', quantity: '', supplier: '', expectedDeliveryDate: '' });
  const [issueForm, setIssueForm] = useState({ prescriptionId: '', patientId: '', medicationId: '', dosage: '', quantity: '' });

  const refresh = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [inventoryResponse, ordersResponse, issuesResponse, prescriptionsResponse] = await Promise.all([
        apiFetch('/pharmacy/medications'),
        apiFetch('/pharmacy/purchase-orders'),
        apiFetch('/pharmacy/prescription-issues'),
        apiFetch('/pharmacy/prescriptions'),
      ]);
      const [inventoryData, ordersData, issuesData, prescriptionData] = await Promise.all([
        readResponse(inventoryResponse), readResponse(ordersResponse), readResponse(issuesResponse),
        readResponse(prescriptionsResponse),
      ]);
      const [invoiceResponse, gatewaysResponse] = await Promise.all([
        apiFetch('/pharmacy/invoices'),
        apiFetch('/pharmacy/invoices/gateways'),
      ]);
      const [invoiceData, gatewaysData] = await Promise.all([
        readResponse(invoiceResponse), readResponse(gatewaysResponse),
      ]);
      setInventory(inventoryData);
      setPurchaseOrders(ordersData);
      setIssues(issuesData);
      setDoctorPrescriptions(prescriptionData);
      setInvoices(invoiceData);
      setPaymentGateways(gatewaysData);
    } catch (requestError) {
      setError(requestError.message || 'Could not load pharmacy data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const lowStockItems = inventory.filter((item) => item.quantityOnHand <= item.reorderLevel);
  const nearExpiryItems = inventory.filter((item) => {
    if (!item.expiryDate) return false;
    const daysLeft = (new Date(item.expiryDate) - new Date()) / 86400000;
    return daysLeft >= 0 && daysLeft <= 90;
  });
  const pendingOrders = purchaseOrders.filter((order) => order.status !== 'RECEIVED');
  const invoicesByReference = useMemo(
    () => new Map(invoices.map((invoice) => [invoice.referenceKey, invoice])),
    [invoices],
  );
  const filteredInventory = useMemo(() => inventory.filter((item) =>
    (departmentFilter === 'All departments' || (item.department || 'General Medicine') === departmentFilter)
      && `${item.name} ${item.department || ''} ${item.strength || ''} ${item.batchNumber || ''} ${item.supplier || ''}`
        .toLowerCase().includes(search.toLowerCase())
  ), [inventory, search, departmentFilter]);

  const submitMedication = async (event) => {
    event.preventDefault();
    setBusy(true); setError(''); setSuccess('');
    const payload = {
      ...medicationForm,
      quantityOnHand: Number(medicationForm.quantityOnHand),
      reorderLevel: Number(medicationForm.reorderLevel),
      unitPrice: Number(medicationForm.unitPrice),
    };
    try {
      await readResponse(await apiFetch('/pharmacy/medications', { method: 'POST', body: JSON.stringify(payload) }));
      setMedicationForm(emptyMedication); setShowMedicationForm(false); setSuccess('Medication added to inventory.'); await refresh();
    } catch (requestError) { setError(requestError.message); }
    finally { setBusy(false); }
  };

  const submitOrder = async (event) => {
    event.preventDefault();
    setBusy(true); setError(''); setSuccess('');
    try {
      await readResponse(await apiFetch('/pharmacy/purchase-orders', {
        method: 'POST',
        body: JSON.stringify({ ...orderForm, quantity: Number(orderForm.quantity) }),
      }));
      setOrderForm({ medicationId: '', quantity: '', supplier: '', expectedDeliveryDate: '' });
      setShowOrderForm(false); setSuccess('Purchase order created.'); await refresh();
    } catch (requestError) { setError(requestError.message); }
    finally { setBusy(false); }
  };

  const submitIssue = async (event) => {
    event.preventDefault();
    setBusy(true); setError(''); setSuccess('');
    try {
      await readResponse(await apiFetch('/pharmacy/prescription-issues', {
        method: 'POST', body: JSON.stringify({ ...issueForm, quantity: Number(issueForm.quantity) }),
      }));
      setIssueForm({ prescriptionId: '', patientId: '', medicationId: '', dosage: '', quantity: '' });
      setShowIssueForm(false); setSuccess('Prescription entered in the dispensing queue.'); await refresh();
    } catch (requestError) { setError(requestError.message); }
    finally { setBusy(false); }
  };

  const receiveOrder = async (id) => {
    setBusy(true); setError(''); setSuccess('');
    try {
      await readResponse(await apiFetch(`/pharmacy/purchase-orders/${id}/receive`, { method: 'POST' }));
      setSuccess('Order received and stock updated.'); await refresh();
    } catch (requestError) { setError(requestError.message); }
    finally { setBusy(false); }
  };

  const dispenseIssue = async (id) => {
    setBusy(true); setError(''); setSuccess('');
    try {
      await readResponse(await apiFetch(`/pharmacy/prescription-issues/${id}/dispense`, { method: 'POST' }));
      setSuccess('Prescription dispensed and stock deducted.'); await refresh();
    } catch (requestError) { setError(requestError.message); }
    finally { setBusy(false); }
  };

  const dispenseDoctorPrescription = async (id) => {
    setBusy(true); setError(''); setSuccess('');
    try {
      await readResponse(await apiFetch(`/pharmacy/prescriptions/${id}/dispense`, { method: 'POST' }));
      setSuccess('All medicines on the doctor prescription were dispensed and stock updated.');
      await refresh();
    } catch (requestError) { setError(requestError.message); }
    finally { setBusy(false); }
  };

  const collectCash = async (invoice) => {
    setBusy(true); setError(''); setSuccess('');
    try {
      await readResponse(await apiFetch(`/pharmacy/invoices/${encodeURIComponent(invoice.id)}/payments`, {
        method: 'POST',
        body: JSON.stringify({ amount: Number(invoice.balanceDue).toFixed(2), method: 'CASH' }),
      }));
      setSuccess(`Cash payment recorded for ${invoice.invoiceNumber}.`);
      await refresh();
    } catch (requestError) { setError(requestError.message || 'Could not record pharmacy payment'); }
    finally { setBusy(false); }
  };

  const payOnline = async (invoice) => {
    setBusy(true); setError(''); setSuccess('');
    try {
      await startPharmacyCheckout(invoice.id, 'RAZORPAY', async () => {
        setSuccess(`Online payment verified for ${invoice.invoiceNumber}.`);
        await refresh();
      });
    } catch (requestError) { setError(requestError.message || 'Could not start online pharmacy payment'); }
    finally { setBusy(false); }
  };

  const printInvoice = (invoice) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      setError('Your browser blocked the pharmacy bill print window. Allow pop-ups for this site, then try again.');
      return;
    }
    const rows = (invoice.items || []).map((item) => `
      <tr><td>${escapeHtml(item.medicationName)} ${escapeHtml([item.strength, item.dosageForm].filter(Boolean).join(' · '))}</td>
      <td>${escapeHtml(item.quantity)}</td><td>₹${escapeHtml(Number(item.unitPrice).toFixed(2))}</td>
      <td>₹${escapeHtml(Number(item.lineTotal).toFixed(2))}</td></tr>`).join('');
    printWindow.document.open();
    printWindow.document.write(`<!doctype html><html lang="en"><head><meta charset="utf-8">
      <title>Pharmacy bill ${escapeHtml(invoice.invoiceNumber)}</title>
      <style>body{font:14px Arial,sans-serif;color:#172a24;padding:28px}header{display:flex;align-items:center;justify-content:space-between;border-bottom:2px solid #176b5d;padding-bottom:12px}
      .print-brand{display:flex;align-items:center;gap:14px}.print-brand img{width:110px;height:auto}
      table{width:100%;border-collapse:collapse;margin-top:24px}th,td{border:1px solid #cbd7d2;padding:9px;text-align:left}
      .total{text-align:right;margin-top:22px}</style></head><body>
      <header><div class="print-brand"><img src="/medora_ai_logo.svg" alt="Medora AI"><strong>MEDCARE HOSPITAL · PHARMACY</strong></div><span>${escapeHtml(invoice.invoiceNumber)}</span></header>
      <p>Patient: <strong>${escapeHtml(invoice.patientName)}</strong> · ID: ${escapeHtml(invoice.patientId)}</p>
      <p>Bill date: ${escapeHtml(invoice.createdAt ? new Date(invoice.createdAt).toLocaleDateString() : '')}</p>
      <table><thead><tr><th>Medicine</th><th>Qty</th><th>Unit price</th><th>Amount</th></tr></thead><tbody>${rows}</tbody></table>
      <div class="total"><p>Total: ₹${escapeHtml(Number(invoice.amount).toFixed(2))}</p>
      <p>Paid: ₹${escapeHtml(Number(invoice.paidAmount).toFixed(2))}</p>
      <strong>Balance due: ₹${escapeHtml(Number(invoice.balanceDue).toFixed(2))}</strong></div>
      </body></html>`);
    printWindow.document.close();
    printWindow.focus();
    printWindow.onafterprint = () => printWindow.close();
    printWindow.setTimeout(() => printWindow.print(), 250);
  };

  const printPrescription = (prescription) => {
    setPrintablePrescription(prescription);
    window.setTimeout(() => window.print(), 0);
  };

  return (
    <section className="workflow-page" aria-labelledby="pharmacy-title">
      <header className="workflow-header">
        <div><p className="workflow-eyebrow">Medication operations</p><h1 id="pharmacy-title">Pharmacy &amp; inventory</h1><p>Track stock, purchasing, expiry, and prescription dispensing.</p></div>
        <button className="workflow-button primary" type="button" onClick={() => { setError(''); setShowMedicationForm((shown) => !shown); }}><Plus size={16} /> Add medication</button>
      </header>

      {error && <div className="workflow-alert error" role="alert">{error}</div>}
      {success && <div className="workflow-alert success" role="status">{success}</div>}

      <div className="workflow-kpis">
        <article><span>Medication items</span><strong>{inventory.length}</strong><Boxes size={18} /></article>
        <article className={lowStockItems.length ? 'attention' : ''}><span>Low stock</span><strong>{lowStockItems.length}</strong><AlertTriangle size={18} /></article>
        <article className={nearExpiryItems.length ? 'attention' : ''}><span>Expiring in 90 days</span><strong>{nearExpiryItems.length}</strong><Pill size={18} /></article>
        <article><span>Open purchase orders</span><strong>{pendingOrders.length}</strong><ClipboardList size={18} /></article>
      </div>

      {showMedicationForm && (
        <form className="workflow-form-panel" onSubmit={submitMedication}>
          <div className="workflow-panel-heading"><div><h2>Add medication</h2><p>Record a batch and current stock level.</p></div><button className="workflow-button subtle" type="button" onClick={() => setShowMedicationForm(false)}>Cancel</button></div>
          <div className="workflow-form-grid">
            <label>Medicine name<input required value={medicationForm.name} onChange={(e) => setMedicationForm({ ...medicationForm, name: e.target.value })} /></label>
            <label>Department<select required value={medicationForm.department} onChange={(e) => setMedicationForm({ ...medicationForm, department: e.target.value })}>{medicineDepartments.map((department) => <option key={department}>{department}</option>)}</select></label>
            <label>Strength<input value={medicationForm.strength} placeholder="e.g. 500 mg" onChange={(e) => setMedicationForm({ ...medicationForm, strength: e.target.value })} /></label>
            <label>Dosage form<select value={medicationForm.dosageForm} onChange={(e) => setMedicationForm({ ...medicationForm, dosageForm: e.target.value })}><option>Tablet</option><option>Capsule</option><option>Liquid</option><option>Injection</option><option>Topical</option><option>Other</option></select></label>
            <label>Batch number<input required value={medicationForm.batchNumber} onChange={(e) => setMedicationForm({ ...medicationForm, batchNumber: e.target.value })} /></label>
            <label>Stock on hand<input required type="number" min="0" value={medicationForm.quantityOnHand} onChange={(e) => setMedicationForm({ ...medicationForm, quantityOnHand: e.target.value })} /></label>
            <label>Reorder point<input required type="number" min="0" value={medicationForm.reorderLevel} onChange={(e) => setMedicationForm({ ...medicationForm, reorderLevel: e.target.value })} /></label>
            <label>Unit price<input required type="number" min="0" step="0.01" value={medicationForm.unitPrice} onChange={(e) => setMedicationForm({ ...medicationForm, unitPrice: e.target.value })} /></label>
            <label>Supplier<input value={medicationForm.supplier} onChange={(e) => setMedicationForm({ ...medicationForm, supplier: e.target.value })} /></label>
            <label>Storage location<input value={medicationForm.location} onChange={(e) => setMedicationForm({ ...medicationForm, location: e.target.value })} /></label>
            <label>Expiry date<input type="date" value={medicationForm.expiryDate} onChange={(e) => setMedicationForm({ ...medicationForm, expiryDate: e.target.value })} /></label>
          </div>
          <div className="workflow-form-actions"><button className="workflow-button primary" disabled={busy} type="submit">Save medication</button></div>
        </form>
      )}

      <div className="workflow-tabs" role="tablist" aria-label="Pharmacy workspace">
        {[['inventory', 'Inventory'], ['orders', 'Purchase orders'], ['prescriptions', `Doctor prescriptions (${doctorPrescriptions.filter((item) => item.status === 'PENDING').length})`], ['billing', `Pharmacy billing (${invoices.filter((invoice) => Number(invoice.balanceDue) > 0).length})`], ['issues', 'Manual prescription issues']].map(([id, label]) => <button key={id} type="button" role="tab" aria-selected={activeTab === id} className={activeTab === id ? 'active' : ''} onClick={() => setActiveTab(id)}>{label}</button>)}
      </div>

      <section className="workflow-panel">
        {activeTab === 'inventory' && <>
          <div className="workflow-panel-heading"><div><h2>Stock register</h2><p>Medicines are organized by clinical department. Low stock is flagged at the reorder point.</p></div>
            <label>Department<select aria-label="Filter inventory by department" value={departmentFilter} onChange={(e) => setDepartmentFilter(e.target.value)}><option>All departments</option>{medicineDepartments.map((department) => <option key={department}>{department}</option>)}</select></label>
            <label className="workflow-search"><input aria-label="Search medication inventory" placeholder="Search medication or batch" value={search} onChange={(e) => setSearch(e.target.value)} /></label></div>
          {loading ? <div className="workflow-empty"><RefreshCw size={18} /> Loading inventory…</div> : !filteredInventory.length ? <div className="workflow-empty">No inventory matches this search.</div> : <div className="workflow-table-wrap"><table className="workflow-table"><thead><tr><th>Department</th><th>Medication</th><th>Batch</th><th>Stock</th><th>Reorder point</th><th>Expiry</th><th>Supplier</th></tr></thead><tbody>{filteredInventory.map((item) => { const low = item.quantityOnHand <= item.reorderLevel; const expiring = nearExpiryItems.some((candidate) => candidate.id === item.id); return <tr key={item.id}><td>{item.department || 'General Medicine'}</td><td><strong>{item.name}</strong><small>{[item.strength, item.dosageForm].filter(Boolean).join(' · ')}</small></td><td>{item.batchNumber}</td><td><span className={`workflow-status ${low ? 'warning' : 'ready'}`}>{item.quantityOnHand} {low ? 'Low' : 'In stock'}</span></td><td>{item.reorderLevel}</td><td><span className={expiring ? 'expiry-warning' : ''}>{item.expiryDate || '—'}{expiring && ' · Soon'}</span></td><td>{item.supplier || '—'}</td></tr>; })}</tbody></table></div>}
        </>}

        {activeTab === 'orders' && <>
          <div className="workflow-panel-heading"><div><h2>Purchase orders</h2><p>Receive an order once stock has arrived to update inventory.</p></div><button className="workflow-button primary" type="button" onClick={() => setShowOrderForm((shown) => !shown)}><Plus size={15} /> Create order</button></div>
          {showOrderForm && <form className="workflow-inline-form" onSubmit={submitOrder}><label>Medication<select required value={orderForm.medicationId} onChange={(e) => setOrderForm({ ...orderForm, medicationId: e.target.value })}><option value="">Select medication</option>{inventory.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.batchNumber}</option>)}</select></label><label>Quantity<input required type="number" min="1" value={orderForm.quantity} onChange={(e) => setOrderForm({ ...orderForm, quantity: e.target.value })} /></label><label>Supplier<input value={orderForm.supplier} onChange={(e) => setOrderForm({ ...orderForm, supplier: e.target.value })} /></label><label>Expected delivery<input type="date" value={orderForm.expectedDeliveryDate} onChange={(e) => setOrderForm({ ...orderForm, expectedDeliveryDate: e.target.value })} /></label><button className="workflow-button primary" disabled={busy} type="submit">Save order</button></form>}
          {!purchaseOrders.length ? <div className="workflow-empty">No purchase orders yet.</div> : <div className="workflow-table-wrap"><table className="workflow-table"><thead><tr><th>Medication</th><th>Supplier</th><th>Quantity</th><th>Expected</th><th>Status</th><th>Action</th></tr></thead><tbody>{purchaseOrders.map((order) => <tr key={order.id}><td><strong>{order.medicationName}</strong></td><td>{order.supplier || '—'}</td><td>{order.quantity}</td><td>{order.expectedDeliveryDate || '—'}</td><td><span className={`workflow-status ${order.status === 'RECEIVED' ? 'ready' : 'neutral'}`}>{order.status}</span></td><td>{order.status !== 'RECEIVED' && <button className="workflow-button subtle" disabled={busy} type="button" onClick={() => receiveOrder(order.id)}>Receive stock</button>}</td></tr>)}</tbody></table></div>}
        </>}

        {activeTab === 'prescriptions' && <>
          <div className="workflow-panel-heading"><div><h2>Doctor prescriptions</h2><p>Prescriptions recorded by doctors from completed consultations, ready for printing and dispensing.</p></div></div>
          {!doctorPrescriptions.length ? <div className="workflow-empty">No doctor prescriptions have been sent to the pharmacy.</div>
            : <div className="workflow-table-wrap"><table className="workflow-table"><thead><tr><th>Prescription</th><th>Patient</th><th>Doctor</th><th>Diagnosis</th><th>Medicines</th><th>Status</th><th>Actions</th></tr></thead>
              <tbody>{doctorPrescriptions.map((prescription) => <tr key={prescription.id}>
                <td>{prescription.id}</td><td><strong>{prescription.patientName}</strong><small>{prescription.patientId}</small></td>
                <td>{prescription.doctorName}</td><td>{prescription.diagnosis}</td>
                <td>{prescription.medications?.map((item, index) => <small key={`${item.medicationId}-${index}`}>
                  {item.name} {[item.strength, item.dosageForm].filter(Boolean).join(' · ')} — {item.dose}, {item.frequency}, {item.duration}; qty {item.quantity}<br />
                </small>)}</td>
                <td><span className={`workflow-status ${prescription.status === 'DISPENSED' ? 'ready' : 'neutral'}`}>{prescription.status}</span>
                  <small>Billing: {invoicesByReference.get(`PRESCRIPTION:${prescription.id}`)?.status || 'Invoice pending'}</small></td>
                <td><div className="workflow-row-actions"><button className="workflow-button subtle" type="button" onClick={() => printPrescription(prescription)}>Print</button>
                  {prescription.status === 'PENDING' && <button className="workflow-button primary" type="button"
                    disabled={busy || !['PAID', 'NO_CHARGE'].includes(invoicesByReference.get(`PRESCRIPTION:${prescription.id}`)?.status)}
                    onClick={() => dispenseDoctorPrescription(prescription.id)}>Dispense all</button>}
                </div></td>
              </tr>)}</tbody></table></div>}
        </>}

        {activeTab === 'billing' && <>
          <div className="workflow-panel-heading"><div><h2>Pharmacy bills</h2>
            <p>Collect cash at the pharmacy or use Razorpay online when it is configured. Medicines can only be dispensed after the bill is paid.</p>
          </div></div>
          {loading ? <div className="workflow-empty">Loading pharmacy bills…</div> : !invoices.length
            ? <div className="workflow-empty">No pharmacy bills have been created.</div>
            : <div className="workflow-table-wrap"><table className="workflow-table">
              <thead><tr><th>Bill / reference</th><th>Patient</th><th>Medicines</th><th>Total</th><th>Paid</th><th>Due</th><th>Status</th><th>Payment / print</th></tr></thead>
              <tbody>{invoices.map((invoice) => <tr key={invoice.id}>
                <td><strong>{invoice.invoiceNumber}</strong><small>{invoice.referenceType} · {invoice.referenceId}</small></td>
                <td><strong>{invoice.patientName}</strong><small>{invoice.patientId}</small></td>
                <td>{invoice.items?.map((item) => <small key={item.medicationId}>{item.medicationName} × {item.quantity}<br /></small>)}</td>
                <td>₹{Number(invoice.amount).toFixed(2)}</td>
                <td>₹{Number(invoice.paidAmount).toFixed(2)}</td>
                <td>₹{Number(invoice.balanceDue).toFixed(2)}</td>
                <td><span className={`workflow-status ${['PAID', 'NO_CHARGE'].includes(invoice.status) ? 'ready' : 'warning'}`}>{invoice.status}</span></td>
                <td><div className="workflow-row-actions">
                  <button className="workflow-button subtle" type="button" onClick={() => printInvoice(invoice)}><Printer size={14} /> Print bill</button>
                  {Number(invoice.balanceDue) > 0 && <button className="workflow-button primary" type="button"
                    disabled={busy} onClick={() => collectCash(invoice)}>Collect cash</button>}
                  {Number(invoice.balanceDue) > 0 && paymentGateways.RAZORPAY && <button className="workflow-button subtle" type="button"
                    disabled={busy} onClick={() => payOnline(invoice)}>Pay online</button>}
                </div></td>
              </tr>)}</tbody>
            </table></div>}
        </>}

        {activeTab === 'issues' && <>
          <div className="workflow-panel-heading"><div><h2>Prescription issues</h2><p>Track items awaiting dispense and completed issues.</p></div><button className="workflow-button primary" type="button" onClick={() => setShowIssueForm((shown) => !shown)}><Plus size={15} /> Add prescription</button></div>
          {showIssueForm && <form className="workflow-inline-form" onSubmit={submitIssue}><label>Prescription ID<input required value={issueForm.prescriptionId} onChange={(e) => setIssueForm({ ...issueForm, prescriptionId: e.target.value })} /></label><label>Patient ID<input required value={issueForm.patientId} onChange={(e) => setIssueForm({ ...issueForm, patientId: e.target.value })} /></label><label>Medication<select required value={issueForm.medicationId} onChange={(e) => setIssueForm({ ...issueForm, medicationId: e.target.value })}><option value="">Select medication</option>{inventory.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.strength}</option>)}</select></label><label>Dosage<input required value={issueForm.dosage} placeholder="e.g. 1 tablet twice daily" onChange={(e) => setIssueForm({ ...issueForm, dosage: e.target.value })} /></label><label>Quantity<input required type="number" min="1" value={issueForm.quantity} onChange={(e) => setIssueForm({ ...issueForm, quantity: e.target.value })} /></label><button className="workflow-button primary" disabled={busy} type="submit">Add to queue</button></form>}
            {!issues.length ? <div className="workflow-empty">No prescriptions in the dispensing queue.</div> : <div className="workflow-table-wrap"><table className="workflow-table"><thead><tr><th>Prescription</th><th>Patient</th><th>Medication</th><th>Dosage</th><th>Quantity</th><th>Status</th><th>Billing / action</th></tr></thead><tbody>{issues.map((issue) => {
              const invoice = invoicesByReference.get(`ISSUE:${issue.id}`);
              return <tr key={issue.id}><td>{issue.prescriptionId}</td><td>{issue.patientName || issue.patientId}</td><td><strong>{issue.medicationName}</strong></td><td>{issue.dosage}</td><td>{issue.quantity}</td><td><span className={`workflow-status ${issue.status === 'ISSUED' ? 'ready' : 'neutral'}`}>{issue.status}</span></td><td><small>{invoice?.status || 'Invoice pending'}</small>{issue.status === 'PENDING' && <button className="workflow-button subtle" disabled={busy || !['PAID', 'NO_CHARGE'].includes(invoice?.status)} type="button" onClick={() => dispenseIssue(issue.id)}>Dispense</button>}</td></tr>;
            })}</tbody></table></div>}
        </>}
      </section>
      {printablePrescription && <section className="printable-prescription" aria-label="Printable medication prescription">
        <header><div className="print-brand"><BrandLogo alt="Medora AI" /><strong>MEDCARE HOSPITAL</strong></div><span>Medication prescription</span></header>
        <div className="print-prescription-details">
          <div><b>Patient</b><span>{printablePrescription.patientName}</span></div>
          <div><b>Patient ID</b><span>{printablePrescription.patientId}</span></div>
          <div><b>Doctor</b><span>{printablePrescription.doctorName}</span></div>
          <div><b>Date</b><span>{printablePrescription.createdAt ? new Date(printablePrescription.createdAt).toLocaleDateString() : '—'}</span></div>
          <div><b>Diagnosis</b><span>{printablePrescription.diagnosis}</span></div>
        </div>
        <h2>Medicines</h2>
        <table><thead><tr><th>Medicine</th><th>Dose / route</th><th>Frequency</th><th>Duration</th><th>Qty</th><th>Instructions</th></tr></thead>
          <tbody>{printablePrescription.medications?.map((item, index) => <tr key={`${item.medicationId}-${index}`}>
            <td>{item.name} {[item.strength, item.dosageForm].filter(Boolean).join(' · ')}</td>
            <td>{item.dose} · {item.route}</td><td>{item.frequency}</td><td>{item.duration}</td>
            <td>{item.quantity}</td><td>{item.instructions || '—'}</td>
          </tr>)}</tbody>
        </table>
        <p className="print-prescription-footer">Please follow the prescribed directions and contact the doctor if you have questions.</p>
      </section>}
    </section>
  );
}
