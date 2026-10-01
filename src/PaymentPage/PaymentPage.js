import React, { useMemo, useState } from "react";
import "./PaymentPage.css";

const initialInvoices = [
  { id: "INV-1001", patient: "Riya Sharma", service: "Consultation", amount: 3200, status: "Paid", method: "UPI", date: "2026-10-01" },
  { id: "INV-1002", patient: "Arjun Verma", service: "ICU Stay", amount: 11800, status: "Pending", method: "Card", date: "2026-10-02" },
  { id: "INV-1003", patient: "Neha Singh", service: "Lab Tests", amount: 4800, status: "Paid", method: "Cash", date: "2026-10-03" },
  { id: "INV-1004", patient: "David Kumar", service: "Operation", amount: 24500, status: "Overdue", method: "Bank Transfer", date: "2026-10-05" },
  { id: "INV-1005", patient: "Pooja Iyer", service: "Pharmacy", amount: 2100, status: "Paid", method: "Card", date: "2026-10-06" },
];

const PaymentPage = () => {
  const [invoices, setInvoices] = useState(initialInvoices);
  const [filter, setFilter] = useState("All");

  const filteredInvoices = useMemo(() => {
    if (filter === "All") return invoices;
    return invoices.filter((invoice) => invoice.status === filter);
  }, [filter, invoices]);

  const totals = useMemo(() => {
    const paid = invoices.filter((item) => item.status === "Paid").reduce((sum, item) => sum + item.amount, 0);
    const pending = invoices.filter((item) => item.status === "Pending").reduce((sum, item) => sum + item.amount, 0);
    const overdue = invoices.filter((item) => item.status === "Overdue").reduce((sum, item) => sum + item.amount, 0);
    const total = invoices.reduce((sum, item) => sum + item.amount, 0);

    return { paid, pending, overdue, total };
  }, [invoices]);

  const markAsPaid = (id) => {
    setInvoices((prev) =>
      prev.map((invoice) =>
        invoice.id === id ? { ...invoice, status: "Paid", method: "Online" } : invoice
      )
    );
  };

  const exportCSV = () => {
    const rows = [
      ["Invoice ID", "Patient", "Service", "Amount", "Status", "Method", "Date"],
      ...invoices.map((invoice) => [
        invoice.id,
        invoice.patient,
        invoice.service,
        invoice.amount,
        invoice.status,
        invoice.method,
        invoice.date,
      ]),
    ];

    const csv = rows.map((row) => row.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "billing_report.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="payment-page-shell">
      <div className="payment-header">
        <div>
          <p className="eyebrow">Hospital Finance</p>
          <h2>Billing & Payments</h2>
        </div>
        <button className="export-btn" onClick={exportCSV}>Export CSV</button>
      </div>

      <div className="summary-grid">
        <div className="summary-card paid">
          <span>Total Collected</span>
          <strong>₹{totals.paid.toLocaleString()}</strong>
        </div>
        <div className="summary-card pending">
          <span>Pending</span>
          <strong>₹{totals.pending.toLocaleString()}</strong>
        </div>
        <div className="summary-card overdue">
          <span>Overdue</span>
          <strong>₹{totals.overdue.toLocaleString()}</strong>
        </div>
        <div className="summary-card total">
          <span>Total Billing</span>
          <strong>₹{totals.total.toLocaleString()}</strong>
        </div>
      </div>

      <div className="billing-tools">
        <div className="filter-group">
          {['All', 'Paid', 'Pending', 'Overdue'].map((option) => (
            <button
              key={option}
              className={filter === option ? 'filter-chip active' : 'filter-chip'}
              onClick={() => setFilter(option)}
            >
              {option}
            </button>
          ))}
        </div>
      </div>

      <div className="invoice-table-wrap">
        <table className="invoice-table">
          <thead>
            <tr>
              <th>Invoice</th>
              <th>Patient</th>
              <th>Service</th>
              <th>Amount</th>
              <th>Status</th>
              <th>Method</th>
              <th>Date</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredInvoices.map((invoice) => (
              <tr key={invoice.id}>
                <td>{invoice.id}</td>
                <td>{invoice.patient}</td>
                <td>{invoice.service}</td>
                <td>₹{invoice.amount.toLocaleString()}</td>
                <td>
                  <span className={`status ${invoice.status.toLowerCase()}`}>{invoice.status}</span>
                </td>
                <td>{invoice.method}</td>
                <td>{invoice.date}</td>
                <td>
                  {invoice.status !== "Paid" ? (
                    <button className="mark-paid-btn" onClick={() => markAsPaid(invoice.id)}>
                      Mark Paid
                    </button>
                  ) : (
                    <span className="paid-text">Completed</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default PaymentPage;
