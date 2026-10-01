import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Boxes, ClipboardList, Pill, Plus, RefreshCw } from 'lucide-react';
import { apiFetch } from '../API/api';
import './Operations.css';

const emptyMedication = {
  name: '', strength: '', dosageForm: 'Tablet', batchNumber: '', quantityOnHand: '',
  reorderLevel: '', unitPrice: '', supplier: '', location: '', expiryDate: '',
};

async function readResponse(response) {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || 'Request failed');
  return data;
}

export default function PharmacyPage() {
  const [activeTab, setActiveTab] = useState('inventory');
  const [inventory, setInventory] = useState([]);
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [search, setSearch] = useState('');
  const [showMedicationForm, setShowMedicationForm] = useState(false);
  const [showOrderForm, setShowOrderForm] = useState(false);
  const [showIssueForm, setShowIssueForm] = useState(false);
  const [medicationForm, setMedicationForm] = useState(emptyMedication);
  const [orderForm, setOrderForm] = useState({ medicationId: '', quantity: '', supplier: '', expectedDeliveryDate: '' });
  const [issueForm, setIssueForm] = useState({ prescriptionId: '', patientId: '', patientName: '', medicationId: '', dosage: '', quantity: '' });

  const refresh = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [inventoryResponse, ordersResponse, issuesResponse] = await Promise.all([
        apiFetch('/pharmacy/medications'),
        apiFetch('/pharmacy/purchase-orders'),
        apiFetch('/pharmacy/prescription-issues'),
      ]);
      const [inventoryData, ordersData, issuesData] = await Promise.all([
        readResponse(inventoryResponse), readResponse(ordersResponse), readResponse(issuesResponse),
      ]);
      setInventory(inventoryData);
      setPurchaseOrders(ordersData);
      setIssues(issuesData);
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
  const filteredInventory = useMemo(() => inventory.filter((item) =>
    `${item.name} ${item.strength || ''} ${item.batchNumber || ''} ${item.supplier || ''}`
      .toLowerCase().includes(search.toLowerCase())
  ), [inventory, search]);

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
      setIssueForm({ prescriptionId: '', patientId: '', patientName: '', medicationId: '', dosage: '', quantity: '' });
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
        {[['inventory', 'Inventory'], ['orders', 'Purchase orders'], ['prescriptions', 'Prescription issues']].map(([id, label]) => <button key={id} type="button" role="tab" aria-selected={activeTab === id} className={activeTab === id ? 'active' : ''} onClick={() => setActiveTab(id)}>{label}</button>)}
      </div>

      <section className="workflow-panel">
        {activeTab === 'inventory' && <>
          <div className="workflow-panel-heading"><div><h2>Stock register</h2><p>Low stock is flagged when quantity reaches the reorder point.</p></div><label className="workflow-search"><input aria-label="Search medication inventory" placeholder="Search medication or batch" value={search} onChange={(e) => setSearch(e.target.value)} /></label></div>
          {loading ? <div className="workflow-empty"><RefreshCw size={18} /> Loading inventory…</div> : !filteredInventory.length ? <div className="workflow-empty">No inventory matches this search.</div> : <div className="workflow-table-wrap"><table className="workflow-table"><thead><tr><th>Medication</th><th>Batch</th><th>Stock</th><th>Reorder point</th><th>Expiry</th><th>Supplier</th></tr></thead><tbody>{filteredInventory.map((item) => { const low = item.quantityOnHand <= item.reorderLevel; const expiring = nearExpiryItems.some((candidate) => candidate.id === item.id); return <tr key={item.id}><td><strong>{item.name}</strong><small>{[item.strength, item.dosageForm].filter(Boolean).join(' · ')}</small></td><td>{item.batchNumber}</td><td><span className={`workflow-status ${low ? 'warning' : 'ready'}`}>{item.quantityOnHand} {low ? 'Low' : 'In stock'}</span></td><td>{item.reorderLevel}</td><td><span className={expiring ? 'expiry-warning' : ''}>{item.expiryDate || '—'}{expiring && ' · Soon'}</span></td><td>{item.supplier || '—'}</td></tr>; })}</tbody></table></div>}
        </>}

        {activeTab === 'orders' && <>
          <div className="workflow-panel-heading"><div><h2>Purchase orders</h2><p>Receive an order once stock has arrived to update inventory.</p></div><button className="workflow-button primary" type="button" onClick={() => setShowOrderForm((shown) => !shown)}><Plus size={15} /> Create order</button></div>
          {showOrderForm && <form className="workflow-inline-form" onSubmit={submitOrder}><label>Medication<select required value={orderForm.medicationId} onChange={(e) => setOrderForm({ ...orderForm, medicationId: e.target.value })}><option value="">Select medication</option>{inventory.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.batchNumber}</option>)}</select></label><label>Quantity<input required type="number" min="1" value={orderForm.quantity} onChange={(e) => setOrderForm({ ...orderForm, quantity: e.target.value })} /></label><label>Supplier<input value={orderForm.supplier} onChange={(e) => setOrderForm({ ...orderForm, supplier: e.target.value })} /></label><label>Expected delivery<input type="date" value={orderForm.expectedDeliveryDate} onChange={(e) => setOrderForm({ ...orderForm, expectedDeliveryDate: e.target.value })} /></label><button className="workflow-button primary" disabled={busy} type="submit">Save order</button></form>}
          {!purchaseOrders.length ? <div className="workflow-empty">No purchase orders yet.</div> : <div className="workflow-table-wrap"><table className="workflow-table"><thead><tr><th>Medication</th><th>Supplier</th><th>Quantity</th><th>Expected</th><th>Status</th><th>Action</th></tr></thead><tbody>{purchaseOrders.map((order) => <tr key={order.id}><td><strong>{order.medicationName}</strong></td><td>{order.supplier || '—'}</td><td>{order.quantity}</td><td>{order.expectedDeliveryDate || '—'}</td><td><span className={`workflow-status ${order.status === 'RECEIVED' ? 'ready' : 'neutral'}`}>{order.status}</span></td><td>{order.status !== 'RECEIVED' && <button className="workflow-button subtle" disabled={busy} type="button" onClick={() => receiveOrder(order.id)}>Receive stock</button>}</td></tr>)}</tbody></table></div>}
        </>}

        {activeTab === 'prescriptions' && <>
          <div className="workflow-panel-heading"><div><h2>Prescription issues</h2><p>Track items awaiting dispense and completed issues.</p></div><button className="workflow-button primary" type="button" onClick={() => setShowIssueForm((shown) => !shown)}><Plus size={15} /> Add prescription</button></div>
          {showIssueForm && <form className="workflow-inline-form" onSubmit={submitIssue}><label>Prescription ID<input required value={issueForm.prescriptionId} onChange={(e) => setIssueForm({ ...issueForm, prescriptionId: e.target.value })} /></label><label>Patient ID<input required value={issueForm.patientId} onChange={(e) => setIssueForm({ ...issueForm, patientId: e.target.value })} /></label><label>Patient name<input value={issueForm.patientName} onChange={(e) => setIssueForm({ ...issueForm, patientName: e.target.value })} /></label><label>Medication<select required value={issueForm.medicationId} onChange={(e) => setIssueForm({ ...issueForm, medicationId: e.target.value })}><option value="">Select medication</option>{inventory.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.strength}</option>)}</select></label><label>Dosage<input required value={issueForm.dosage} placeholder="e.g. 1 tablet twice daily" onChange={(e) => setIssueForm({ ...issueForm, dosage: e.target.value })} /></label><label>Quantity<input required type="number" min="1" value={issueForm.quantity} onChange={(e) => setIssueForm({ ...issueForm, quantity: e.target.value })} /></label><button className="workflow-button primary" disabled={busy} type="submit">Add to queue</button></form>}
          {!issues.length ? <div className="workflow-empty">No prescriptions in the dispensing queue.</div> : <div className="workflow-table-wrap"><table className="workflow-table"><thead><tr><th>Prescription</th><th>Patient</th><th>Medication</th><th>Dosage</th><th>Quantity</th><th>Status</th><th>Action</th></tr></thead><tbody>{issues.map((issue) => <tr key={issue.id}><td>{issue.prescriptionId}</td><td>{issue.patientName || issue.patientId}</td><td><strong>{issue.medicationName}</strong></td><td>{issue.dosage}</td><td>{issue.quantity}</td><td><span className={`workflow-status ${issue.status === 'ISSUED' ? 'ready' : 'neutral'}`}>{issue.status}</span></td><td>{issue.status === 'PENDING' && <button className="workflow-button subtle" disabled={busy} type="button" onClick={() => dispenseIssue(issue.id)}>Dispense</button>}</td></tr>)}</tbody></table></div>}
        </>}
      </section>
    </section>
  );
}
