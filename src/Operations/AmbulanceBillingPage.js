import { useCallback, useEffect, useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { RefreshCw, Wallet } from 'lucide-react';
import { apiFetch } from '../API/api';
import './Operations.css';

const money = (amount) => new Intl.NumberFormat('en-IN', {
  style: 'currency', currency: 'INR', maximumFractionDigits: 2,
}).format(Number(amount) || 0);

const pretty = (value) => String(value || '').replaceAll('_', ' ').toLowerCase()
  .replace(/\b\w/g, (character) => character.toUpperCase());

async function readResponse(response) {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || data.detail || `Request failed (${response.status})`);
  return data;
}

function monthKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function buildMonthlyTotals(bookings, now = new Date()) {
  const months = Array.from({ length: 6 }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - 5 + index, 1);
    return {
      key: monthKey(date),
      month: date.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' }),
      collected: 0,
      refunded: 0,
    };
  });
  const byMonth = new Map(months.map((month) => [month.key, month]));
  bookings.forEach((booking) => {
    (booking.payments || []).forEach((payment) => {
      if (!['RECEIVED', 'REFUNDED', 'REFUND_PENDING'].includes(payment.status)) return;
      const receivedAt = payment.receivedAt || payment.createdAt || booking.createdAt;
      const month = receivedAt && byMonth.get(monthKey(new Date(receivedAt)));
      if (month) month.collected += Number(payment.amount) || 0;
    });
    if (booking.refundStatus === 'REFUNDED' && Number(booking.refundAmount) > 0) {
      const refundAt = booking.refundedAt || booking.updatedAt;
      const month = refundAt && byMonth.get(monthKey(new Date(refundAt)));
      if (month) month.refunded += Number(booking.refundAmount) || 0;
    }
  });
  return months.map((month) => ({ ...month, net: month.collected - month.refunded }));
}

export default function AmbulanceBillingPage() {
  const [bookings, setBookings] = useState([]);
  const [branches, setBranches] = useState([]);
  const [selectedBranchId, setSelectedBranchId] = useState('');
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const refresh = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [bookingsResponse, branchesResponse] = await Promise.all([
        apiFetch('/ambulance/bookings'),
        apiFetch('/ambulance/branches'),
      ]);
      const [bookingData, branchData] = await Promise.all([
        readResponse(bookingsResponse), readResponse(branchesResponse),
      ]);
      setBookings(bookingData);
      setBranches(branchData);
    } catch (requestError) {
      setError(requestError.message || 'Could not load ambulance billing');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  const branchBookings = useMemo(() => bookings.filter((booking) => (
    !selectedBranchId || booking.branchId === selectedBranchId
  )), [bookings, selectedBranchId]);
  const grossCollected = branchBookings.reduce((total, booking) => (
    total + ((booking.payments || [])
      .filter((payment) => ['RECEIVED', 'REFUNDED', 'REFUND_PENDING'].includes(payment.status))
      .reduce((sum, payment) => sum + (Number(payment.amount) || 0), 0))
  ), 0);
  const refunded = branchBookings.reduce((total, booking) => (
    total + (booking.refundStatus === 'REFUNDED' ? Number(booking.refundAmount) || 0 : 0)
  ), 0);
  const refundsPending = branchBookings.reduce((total, booking) => (
    total + (['REFUND_DUE', 'REFUND_PENDING'].includes(booking.refundStatus)
      ? Number(booking.refundAmount) || 0 : 0)
  ), 0);
  const cashAwaitingConfirmation = branchBookings
    .filter((booking) => booking.paymentMethod === 'CASH'
      && booking.paymentStatus === 'PENDING' && booking.status !== 'CANCELLED');
  const monthlyTotals = useMemo(() => buildMonthlyTotals(branchBookings), [branchBookings]);
  const sortedBookings = [...branchBookings].sort((first, second) => (
    new Date(second.updatedAt || second.createdAt) - new Date(first.updatedAt || first.createdAt)
  ));

  const confirmCashPayment = async (booking) => {
    setBusyId(booking.id);
    setError('');
    setSuccess('');
    try {
      await readResponse(await apiFetch(
        `/ambulance/bookings/${encodeURIComponent(booking.id)}/cash-payment`, { method: 'POST' },
      ));
      setSuccess(`Cash payment ${money(booking.amount)} for ${booking.bookingNumber} confirmed and added to collections.`);
      await refresh();
    } catch (requestError) {
      setError(requestError.message || 'Could not confirm cash payment');
    } finally {
      setBusyId('');
    }
  };

  return (
    <section className="workflow-page" aria-labelledby="ambulance-billing-title">
      <header className="workflow-header">
        <div>
          <p className="workflow-eyebrow">Ambulance finance</p>
          <h1 id="ambulance-billing-title">Ambulance billing &amp; collections</h1>
          <p>Confirm cash received, review online payments and refunds, and track net ambulance revenue.</p>
        </div>
        <div className="workflow-toolbar-actions">
          <label className="ambulance-branch-filter">Branch
            <select aria-label="Ambulance billing branch" value={selectedBranchId}
              onChange={(event) => setSelectedBranchId(event.target.value)}>
              <option value="">All branches</option>
              {branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
            </select>
          </label>
          <button className="workflow-button subtle" type="button" onClick={() => void refresh()} disabled={loading}>
            <RefreshCw size={15} /> Refresh billing
          </button>
        </div>
      </header>

      {error && <div className="workflow-alert error" role="alert">{error}</div>}
      {success && <div className="workflow-alert success" role="status">{success}</div>}

      <div className="workflow-kpis ambulance-billing-kpis">
        <article><span>Gross collected</span><strong>{money(grossCollected)}</strong><Wallet size={18} /></article>
        <article><span>Refunds completed</span><strong>{money(refunded)}</strong><Wallet size={18} /></article>
        <article className={refundsPending > 0 ? 'attention' : ''}><span>Refunds due / pending</span><strong>{money(refundsPending)}</strong><Wallet size={18} /></article>
        <article><span>Net after completed refunds</span><strong>{money(grossCollected - refunded)}</strong><Wallet size={18} /></article>
      </div>
      <p className="workflow-empty ambulance-accounting-note">
        Gross collections include confirmed cash and verified online receipts. Net revenue deducts completed refunds;
        pending refunds are shown separately until returned or processed.
      </p>

      <section className="workflow-panel">
        <div className="workflow-panel-heading">
          <div><h2>Six-month collection and refund trend</h2><p>Amounts use the recorded receipt and refund dates.</p></div>
        </div>
        <div className="ambulance-revenue-chart" role="img" aria-label="Monthly ambulance collections, refunds and net revenue chart">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={monthlyTotals} margin={{ top: 12, right: 18, left: 12, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis tickFormatter={(value) => `₹${Number(value).toLocaleString('en-IN')}`} />
              <Tooltip formatter={(value) => money(value)} />
              <Legend />
              <Bar dataKey="collected" name="Gross collected" fill="#2f7767" radius={[4, 4, 0, 0]} />
              <Bar dataKey="refunded" name="Refunds completed" fill="#d47b71" radius={[4, 4, 0, 0]} />
              <Bar dataKey="net" name="Net after refunds" fill="#628bb5" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="workflow-panel">
        <div className="workflow-panel-heading">
          <div><h2>Cash awaiting confirmation</h2><p>Cash bookings are not counted as collections and cannot be dispatched until a billing user confirms receipt.</p></div>
          <span className="workflow-status neutral">{cashAwaitingConfirmation.length} pending</span>
        </div>
        {loading ? <div className="workflow-empty">Loading pending cash…</div>
          : cashAwaitingConfirmation.length === 0 ? <div className="workflow-empty">No cash payments are awaiting confirmation.</div>
            : <div className="workflow-table-wrap"><table className="workflow-table">
              <thead><tr><th>Booking</th><th>Branch</th><th>Patient</th><th>Fare to collect</th><th>Booked on</th><th>Action</th></tr></thead>
              <tbody>{cashAwaitingConfirmation.map((booking) => <tr key={booking.id}>
                <td><strong>{booking.bookingNumber}</strong></td><td>{booking.branchName || '—'}</td>
                <td>{booking.patientName}<br /><small>{booking.patientId}</small></td>
                <td>{money(booking.amount)}</td><td>{new Date(booking.createdAt).toLocaleString()}</td>
                <td><button className="workflow-button primary" type="button" disabled={busyId === booking.id}
                  onClick={() => void confirmCashPayment(booking)}>
                  {busyId === booking.id ? 'Confirming…' : 'Confirm cash received'}
                </button></td>
              </tr>)}</tbody>
            </table></div>}
      </section>

      <section className="workflow-panel">
        <div className="workflow-panel-heading"><div><h2>Ambulance payment ledger</h2><p>Confirmed receipts, outstanding cash, and cancellation/refund status by booking.</p></div></div>
        {loading ? <div className="workflow-empty">Loading ambulance ledger…</div>
          : sortedBookings.length === 0 ? <div className="workflow-empty">No ambulance billing records for this branch.</div>
            : <div className="workflow-table-wrap"><table className="workflow-table">
              <thead><tr><th>Booking / date</th><th>Branch</th><th>Patient</th><th>Payment method</th><th>Fare</th><th>Payment status</th><th>Refund</th></tr></thead>
              <tbody>{sortedBookings.map((booking) => <tr key={booking.id}>
                <td><strong>{booking.bookingNumber}</strong><br /><small>{new Date(booking.createdAt).toLocaleString()}</small></td>
                <td>{booking.branchName || '—'}</td><td>{booking.patientName}<br /><small>{booking.patientId}</small></td>
                <td>{pretty(booking.paymentMethod)}</td><td>{money(booking.amount)}</td>
                <td><span className={`workflow-status ${booking.paymentStatus === 'PAID' ? 'ready' : 'neutral'}`}>{pretty(booking.paymentStatus)}</span>
                  {booking.payments?.filter((payment) => payment.status === 'RECEIVED').map((payment) => (
                    <small className="ambulance-ledger-receipt" key={payment.id}>
                      {payment.receivedAt ? new Date(payment.receivedAt).toLocaleString() : 'Receipt recorded'}
                      {payment.receivedBy ? ` · ${payment.receivedBy}` : ''}
                    </small>
                  ))}
                </td>
                <td>{pretty(booking.refundStatus)}{Number(booking.refundAmount) > 0 ? ` · ${money(booking.refundAmount)}` : ''}
                  {booking.refundedAt && <small className="ambulance-ledger-receipt">{new Date(booking.refundedAt).toLocaleString()}</small>}
                </td>
              </tr>)}</tbody>
            </table></div>}
      </section>
    </section>
  );
}
