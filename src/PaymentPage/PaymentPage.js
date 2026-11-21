import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { apiFetch } from '../API/api';
import { startAppointmentCheckout } from './paymentGatewayCheckout';
import { printAppointmentInvoice } from './appointmentInvoiceReceipt';
import './PaymentPage.css';

const paymentMethods = ['CASH', 'UPI', 'CARD', 'BANK_TRANSFER'];

async function readResponse(response) {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || data.detail || `Billing request failed (${response.status})`);
  return data;
}

const PaymentPage = ({ username = '' }) => {
  const [invoices, setInvoices] = useState([]);
  const [filter, setFilter] = useState('All');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [activeInvoiceId, setActiveInvoiceId] = useState('');
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [payment, setPayment] = useState({ amount: '', method: 'CASH', reference: '' });
  const [gateways, setGateways] = useState({});
  const [gatewayBusy, setGatewayBusy] = useState('');
  const handledStripeReturn = useRef(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [invoiceResponse, gatewayResponse] = await Promise.all([
        apiFetch('/billing/appointment-invoices'),
        apiFetch('/billing/appointment-invoices/gateways'),
      ]);
      const [data, gatewayData] = await Promise.all([readResponse(invoiceResponse), readResponse(gatewayResponse)]);
      if (!Array.isArray(data)) throw new Error('Billing service returned an invalid invoice list');
      setInvoices(data);
      setGateways(gatewayData);
    } catch (requestError) {
      setError(requestError.message || 'Could not load appointment invoices');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const invoiceId = params.get('invoiceId');
    const stripeSession = params.get('stripeSession');
    const paymentResult = params.get('paymentResult');
    if (stripeSession && invoiceId && !handledStripeReturn.current) {
      handledStripeReturn.current = true;
      apiFetch(`/billing/appointment-invoices/${encodeURIComponent(invoiceId)}/verify`, {
        method: 'POST',
        body: JSON.stringify({ provider: 'STRIPE', gatewayOrderId: stripeSession }),
      }).then(readResponse).then(async () => {
        setSuccess('Stripe payment verified and recorded.');
        await refresh();
      }).catch((requestError) => setError(requestError.message || 'Could not verify Stripe payment.'))
        .finally(() => window.history.replaceState({}, '', window.location.pathname));
    } else if (paymentResult === 'success') {
      setSuccess('PayU payment verified and recorded.');
      window.history.replaceState({}, '', window.location.pathname);
      refresh();
    } else if (paymentResult === 'failed') {
      setError('PayU payment was not completed or could not be verified.');
      window.history.replaceState({}, '', window.location.pathname);
      refresh();
    } else if (paymentResult === 'cancelled') {
      setSuccess('Online payment was cancelled. The invoice remains unpaid.');
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [refresh]);

  const totals = useMemo(() => invoices.reduce((summary, invoice) => {
    summary.paid += Number(invoice.paidAmount || 0);
    summary.pending += Number(invoice.balanceDue || 0);
    summary.total += Number(invoice.amount || 0);
    return summary;
  }, { paid: 0, pending: 0, total: 0 }), [invoices]);

  const filteredInvoices = useMemo(() => {
    if (filter === 'All') return invoices;
    if (filter === 'Pending') return invoices.filter((invoice) => ['PENDING', 'PARTIALLY_PAID'].includes(invoice.status));
    return invoices.filter((invoice) => invoice.status === filter.toUpperCase().replaceAll(' ', '_'));
  }, [filter, invoices]);

  const openPaymentForm = (invoice) => {
    setActiveInvoiceId(invoice.id);
    setPayment({ amount: String(invoice.balanceDue), method: 'CASH', reference: '' });
    setError('');
    setSuccess('');
  };

  const printInvoice = (invoice) => {
    if (!printAppointmentInvoice(invoice, username)) {
      setError('Your browser blocked the invoice print window. Allow pop-ups for this site, then try again.');
    }
  };

  const recordPayment = async (event, invoice) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    setSuccess('');
    try {
      await readResponse(await apiFetch(`/billing/appointment-invoices/${encodeURIComponent(invoice.id)}/payments`, {
        method: 'POST',
        body: JSON.stringify({
          amount: Number(payment.amount),
          method: payment.method,
          reference: payment.reference.trim() || undefined,
        }),
      }));
      setSuccess(`Payment recorded for invoice ${invoice.invoiceNumber}.`);
      setActiveInvoiceId('');
      await refresh();
    } catch (requestError) {
      setError(requestError.message || 'Could not record payment');
    } finally {
      setBusy(false);
    }
  };

  const startOnlinePayment = async (invoice, provider) => {
    setGatewayBusy(`${invoice.id}:${provider}`);
    setError('');
    setSuccess('');
    try {
      await startAppointmentCheckout(invoice.id, provider, async () => {
        setSuccess(`${provider} payment verified for ${invoice.invoiceNumber}.`);
        await refresh();
      });
    } catch (requestError) {
      setError(requestError.message || `Could not start ${provider} checkout.`);
    } finally {
      setGatewayBusy('');
    }
  };

  const exportCSV = () => {
    const rows = [
      ['Invoice ID', 'Appointment number', 'Patient ID', 'Patient', 'Doctor', 'Amount', 'Paid', 'Balance', 'Status', 'Date'],
      ...invoices.map((invoice) => [
        invoice.invoiceNumber, invoice.appointmentNumber || 'Legacy booking', invoice.patientId, invoice.patientName, invoice.doctorName,
        invoice.amount, invoice.paidAmount, invoice.balanceDue, invoice.status, invoice.createdAt,
      ]),
    ];
    const csv = rows.map((row) => row.map((value) => `"${String(value ?? '').replaceAll('"', '""')}"`).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'appointment_billing.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="payment-page-shell">
      <div className="payment-header">
        <div>
          <p className="eyebrow">Hospital Finance</p>
          <h2>Billing &amp; Payments</h2>
          <p>Appointment invoices are created automatically when an appointment is booked.</p>
        </div>
        <button className="export-btn" type="button" onClick={exportCSV}>Export CSV</button>
      </div>

      {error && <div className="workflow-alert error" role="alert">{error}</div>}
      {success && <div className="workflow-alert success" role="status">{success}</div>}

      <div className="summary-grid">
        <div className="summary-card paid"><span>Total Collected</span><strong>₹{totals.paid.toLocaleString('en-IN')}</strong></div>
        <div className="summary-card pending"><span>Outstanding</span><strong>₹{totals.pending.toLocaleString('en-IN')}</strong></div>
        <div className="summary-card total"><span>Total Billing</span><strong>₹{totals.total.toLocaleString('en-IN')}</strong></div>
        <button className="summary-card invoice-count-card" type="button" onClick={() => {
          document.getElementById('appointment-invoices')?.scrollIntoView({ behavior: 'smooth' });
        }}>
          <span>Invoices · View list</span><strong>{invoices.length}</strong>
        </button>
      </div>
      {!Object.values(gateways).some(Boolean) && !loading
        && <p className="billing-empty" role="status">Online gateways are not configured. Staff can record payments after receiving them at the hospital.</p>}

      <div className="billing-tools">
        <div className="filter-group">
          {['All', 'Pending', 'Paid', 'No charge', 'Void', 'Refund required'].map((option) => (
            <button key={option} type="button" className={filter === option ? 'filter-chip active' : 'filter-chip'}
              onClick={() => setFilter(option)}>{option}</button>
          ))}
        </div>
      </div>

      {loading ? <p role="status">Loading appointment invoices…</p> : filteredInvoices.length === 0
        ? <p className="billing-empty">No appointment invoices match this filter.</p>
        : <div className="invoice-table-wrap" id="appointment-invoices">
          <table className="invoice-table">
            <thead><tr><th>Invoice</th><th>Patient</th><th>Doctor / Service</th><th>Amount</th><th>Paid</th><th>Balance</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>{filteredInvoices.map((invoice) => <React.Fragment key={invoice.id}>
              <tr>
                <td>{invoice.invoiceNumber}<small>Appointment number: {invoice.appointmentNumber || 'Legacy booking'}</small></td>
                <td><strong>{invoice.patientName}</strong><small>Patient ID: {invoice.patientId}</small></td>
                <td>{invoice.doctorName}<small>{invoice.service}</small></td>
                <td>₹{Number(invoice.amount).toLocaleString('en-IN')}</td>
                <td>₹{Number(invoice.paidAmount).toLocaleString('en-IN')}</td>
                <td>₹{Number(invoice.balanceDue).toLocaleString('en-IN')}</td>
                <td><span className={`status ${String(invoice.status).toLowerCase()}`}>{String(invoice.status).replaceAll('_', ' ')}</span></td>
                <td><div className="billing-row-actions">
                  <button type="button" className="filter-chip" aria-label={`View invoice ${invoice.invoiceNumber}`}
                    onClick={() => setSelectedInvoice(invoice)}>View</button>
                  <button type="button" className="filter-chip" aria-label={`Print invoice ${invoice.invoiceNumber}`}
                    onClick={() => printInvoice(invoice)}>Print</button>
                  {Number(invoice.balanceDue) > 0 && <>
                    <button type="button" className="mark-paid-btn" onClick={() => openPaymentForm(invoice)}>Record received payment</button>
                    {['RAZORPAY', 'PAYU', 'STRIPE'].filter((provider) => gateways[provider]).map((provider) => (
                      <button key={provider} type="button" className="filter-chip" disabled={Boolean(gatewayBusy)}
                        onClick={() => startOnlinePayment(invoice, provider)}>
                        {gatewayBusy === `${invoice.id}:${provider}` ? 'Opening…' : `Pay ${provider}`}
                      </button>
                    ))}
                  </>}
                  {Number(invoice.balanceDue) <= 0 && invoice.status === 'PAID' && <span className="paid-text">Completed</span>}
                </div></td>
              </tr>
              {activeInvoiceId === invoice.id && <tr><td colSpan="8">
                <form className="billing-payment-form" onSubmit={(event) => recordPayment(event, invoice)}>
                  <strong>Record received payment · {invoice.invoiceNumber}</strong>
                  <label>Amount<input required type="number" min="0.01" max={invoice.balanceDue} step="0.01" value={payment.amount}
                    onChange={(event) => setPayment({ ...payment, amount: event.target.value })} /></label>
                  <label>Method<select value={payment.method} onChange={(event) => setPayment({ ...payment, method: event.target.value })}>
                    {paymentMethods.map((method) => <option key={method} value={method}>{method.replace('_', ' ')}</option>)}
                  </select></label>
                  <label>Receipt / transaction reference<input value={payment.reference}
                    onChange={(event) => setPayment({ ...payment, reference: event.target.value })} /></label>
                  <button type="submit" className="mark-paid-btn" disabled={busy}>{busy ? 'Saving…' : 'Confirm received payment'}</button>
                  <button type="button" className="filter-chip" onClick={() => setActiveInvoiceId('')}>Cancel</button>
                </form>
              </td></tr>}
              {invoice.payments?.map((item) => <tr key={item.id} className="billing-payment-row">
                <td colSpan="2">Payment {item.id.slice(0, 8)}</td>
                <td>{item.method}{item.reference ? ` · ${item.reference}` : ''}</td>
                <td>₹{Number(item.amount).toLocaleString('en-IN')}</td>
                <td colSpan="2">{item.receivedBy || '—'}</td>
                <td>{item.status}</td><td>{item.createdAt ? new Date(item.createdAt).toLocaleDateString() : '—'}</td>
              </tr>)}
            </React.Fragment>)}</tbody>
          </table>
        </div>}

      {selectedInvoice && (
        <div className="invoice-dialog-backdrop" onMouseDown={(event) => {
          if (event.target === event.currentTarget) setSelectedInvoice(null);
        }}>
          <section className="invoice-dialog" role="dialog" aria-modal="true"
            aria-labelledby="invoice-dialog-title">
            <header className="invoice-dialog-header">
              <div><p className="eyebrow">Billing audit</p><h3 id="invoice-dialog-title">{selectedInvoice.invoiceNumber}</h3></div>
              <button type="button" className="invoice-dialog-close" aria-label="Close invoice details"
                onClick={() => setSelectedInvoice(null)}>×</button>
            </header>
            <dl className="invoice-detail-grid">
              <div><dt>Patient</dt><dd>{selectedInvoice.patientName || '—'}</dd></div>
              <div><dt>Patient ID</dt><dd>{selectedInvoice.patientId || '—'}</dd></div>
              <div><dt>Doctor</dt><dd>{selectedInvoice.doctorName || '—'}</dd></div>
              <div><dt>Service</dt><dd>{selectedInvoice.service || '—'}</dd></div>
              <div><dt>Appointment number</dt><dd>{selectedInvoice.appointmentNumber || 'Legacy booking'}</dd></div>
              <div><dt>Created</dt><dd>{selectedInvoice.createdAt ? new Date(selectedInvoice.createdAt).toLocaleString('en-IN') : '—'}</dd></div>
              <div><dt>Status</dt><dd>{String(selectedInvoice.status || '—').replaceAll('_', ' ')}</dd></div>
              <div><dt>Total</dt><dd>₹{Number(selectedInvoice.amount || 0).toLocaleString('en-IN')}</dd></div>
              <div><dt>Paid</dt><dd>₹{Number(selectedInvoice.paidAmount || 0).toLocaleString('en-IN')}</dd></div>
              <div><dt>Balance due</dt><dd>₹{Number(selectedInvoice.balanceDue || 0).toLocaleString('en-IN')}</dd></div>
            </dl>
            <h4>Payment history</h4>
            {selectedInvoice.payments?.length ? (
              <div className="invoice-payment-history">
                <table><thead><tr><th>Date</th><th>Method</th><th>Reference</th><th>Received by</th><th>Status</th><th>Amount</th></tr></thead>
                  <tbody>{selectedInvoice.payments.map((item, index) => (
                    <tr key={item.id || `${item.createdAt}-${index}`}>
                      <td>{item.createdAt ? new Date(item.createdAt).toLocaleString('en-IN') : '—'}</td>
                      <td>{item.method || item.provider || '—'}</td>
                      <td>{item.reference || item.gatewayPaymentId || '—'}</td>
                      <td>{item.receivedBy || '—'}</td>
                      <td>{item.status || '—'}</td>
                      <td>₹{Number(item.amount || 0).toLocaleString('en-IN')}</td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            ) : <p className="invoice-no-payments">No payments recorded.</p>}
            <footer className="invoice-dialog-actions">
              <button type="button" className="mark-paid-btn" onClick={() => printInvoice(selectedInvoice)}>Print invoice</button>
              <button type="button" className="filter-chip" onClick={() => setSelectedInvoice(null)}>Close</button>
            </footer>
          </section>
        </div>
      )}
    </div>
  );
};

export default PaymentPage;
