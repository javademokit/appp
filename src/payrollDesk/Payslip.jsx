import { Fragment } from "react";
import { inr } from "./utils";
import BrandLogo from "../components/BrandLogo";

const SMALL_NUMBERS = [
  "Zero", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
  "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen",
  "Seventeen", "Eighteen", "Nineteen",
];
const TENS = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];
const INDIAN_UNITS = ["", "Thousand", "Lakh", "Crore", "Arab", "Kharab"];

function wordsBelowThousand(value) {
  const words = [];
  if (value >= 100) {
    words.push(`${SMALL_NUMBERS[Math.floor(value / 100)]} Hundred`);
    value %= 100;
  }
  if (value >= 20) {
    words.push(TENS[Math.floor(value / 10)]);
    value %= 10;
  }
  if (value > 0) words.push(SMALL_NUMBERS[value]);
  return words.join(" ");
}

function indianNumberWords(value) {
  if (value === 0) return SMALL_NUMBERS[0];
  const groups = [wordsBelowThousand(value % 1000)];
  let remainder = Math.floor(value / 1000);
  let unitIndex = 1;
  while (remainder > 0) {
    const part = remainder % 100;
    if (part > 0) {
      groups.push(`${wordsBelowThousand(part)} ${INDIAN_UNITS[unitIndex] || "Crore"}`);
    }
    remainder = Math.floor(remainder / 100);
    unitIndex += 1;
  }
  return groups.reverse().filter(Boolean).join(" ");
}

function amountInWords(amount) {
  const totalPaise = Math.round((Number(amount) || 0) * 100);
  const absolutePaise = Math.abs(totalPaise);
  const rupees = Math.floor(absolutePaise / 100);
  const paise = absolutePaise % 100;
  const sign = totalPaise < 0 ? "Minus " : "";
  const suffix = paise
    ? ` and ${indianNumberWords(paise)} Paise Only`
    : " Only";
  return `Rupees ${sign}${indianNumberWords(rupees)}${suffix}`;
}

function displayMetric(value) {
  return value == null ? "Not recorded" : value;
}

export default function Payslip({ row, monthLabel, runAt, onClose }) {
  const payslipDate = runAt
    ? new Date(runAt).toLocaleDateString("en-GB")
    : "Not generated";
  const year = monthLabel.match(/\d{4}/)?.[0] || "Not provided";
  const earnings = Array.isArray(row.earnings) ? row.earnings : [];
  const deductions = Array.isArray(row.deductions) ? row.deductions : [];
  const statementRows = Array.from(
    { length: Math.max(7, earnings.length, deductions.length) },
    (_, index) => ({ earning: earnings[index], deduction: deductions[index] }),
  );
  const identity = [
    ["Employee Code", row.code],
    ["Date of Joining", "Not provided"],
    ["Employee Name", row.name],
    ["Designation", row.role],
    ["Department", row.department],
    ["Work Location", "Not provided"],
    ["PAN", "Not provided"],
    ["UAN", "Not provided"],
    ["PF A/C No.", "Not provided"],
    ["ESIC IP No.", "Not provided"],
    ["Bank A/C No.", "Not provided"],
    ["IFSC", "Not provided"],
  ];
  const identityRows = Array.from(
    { length: identity.length / 2 },
    (_, index) => [identity[index * 2], identity[index * 2 + 1]],
  );
  const metrics = [
    ["Days in month", displayMetric(row.totalDays)],
    ["Paid days", displayMetric(row.paidDays)],
    ["LOP days", displayMetric(row.lopDays)],
    ["Weekly offs", displayMetric(row.weeklyOffDays)],
    ["OT hours", "Not recorded"],
  ];

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal payroll-slip-document" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Payslip">
        <header className="payroll-slip-header">
          <div className="payroll-slip-brand">
            <BrandLogo className="payroll-slip-logo" alt="Medora AI Health Care" />
            <div>
              <h2>MEDCARE HOSPITAL</h2>
              <p>Employer registration details not provided</p>
            </div>
          </div>
          <h3>PAYSLIP FOR THE MONTH OF {monthLabel.toUpperCase()}</h3>
        </header>

        <div className="payroll-slip-identity-wrap">
          <table className="payroll-slip-identity" aria-label="Employee details">
            <tbody>
              {identityRows.map((fields, index) => (
                <tr key={index}>
                  {fields.map(([label, value]) => (
                    <Fragment key={label}>
                      <th scope="row">{label}</th><td>{value || "Not provided"}</td>
                    </Fragment>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <table className="payroll-slip-metrics" aria-label="Attendance summary">
          <thead><tr>{metrics.map(([label]) => <th key={label}>{label}</th>)}</tr></thead>
          <tbody><tr>{metrics.map(([label, value]) => <td key={label}>{value}</td>)}</tr></tbody>
        </table>

        <div className="payroll-slip-table-wrap">
        <table className="payroll-slip-table" aria-label="Earnings and deductions">
          <thead>
            <tr>
              <th>EARNINGS</th><th>AMOUNT (₹)</th><th>DEDUCTIONS</th><th>AMOUNT (₹)</th>
            </tr>
          </thead>
          <tbody>
            {statementRows.map(({ earning, deduction }, index) => (
              <tr key={index}>
                <td>{earning?.name || ""}</td><td>{earning ? inr(earning.amount) : ""}</td>
                <td>{deduction?.name || ""}</td><td>{deduction ? inr(deduction.amount) : ""}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <th scope="row">GROSS EARNINGS</th><td>{inr(row.gross)}</td>
              <th scope="row">TOTAL DEDUCTIONS</th><td>{inr(row.totalDeductions)}</td>
            </tr>
          </tfoot>
        </table>
        </div>

        <table className="payroll-slip-net" aria-label="Net salary">
          <tbody>
            <tr>
              <th scope="row">NET PAY</th><td>{inr(row.net)}</td>
              <th scope="row">In words</th><td>{amountInWords(row.net)}</td>
            </tr>
          </tbody>
        </table>

        <table className="payroll-slip-information" aria-label="Other payroll information">
          <colgroup>
            <col className="payroll-slip-label-col" />
            <col className="payroll-slip-value-col" />
            <col className="payroll-slip-label-col" />
            <col className="payroll-slip-value-col" />
          </colgroup>
          <tbody>
            <tr>
              <th scope="row">EMPLOYER CONTRIBUTIONS</th>
              <td colSpan={3}>Not available from saved payroll data.</td>
            </tr>
            <tr>
              <th scope="row">LEAVE BALANCE</th>
              <td>Not available from saved leave-balance data.</td>
              <th scope="row">YEAR-TO-DATE (APR {year} - {monthLabel.toUpperCase()})</th>
              <td>Not available from saved payroll data.</td>
            </tr>
          </tbody>
        </table>

        <table className="payroll-slip-payment" aria-label="Payment details">
          <tbody>
            <tr><th scope="row">Payment mode</th><td>Not provided</td><th scope="row">Paid on</th><td>Not recorded</td></tr>
          </tbody>
        </table>
        <footer className="payroll-slip-footer">
          <div className="payroll-slip-signature">
            <div className="payroll-slip-signature-line"></div>
            <span>Authorized signature</span>
          </div>
          <p><strong>Date:</strong> {payslipDate}</p>
        </footer>
        <div className="row noprint" style={{ marginTop: 14, marginBottom: 0 }}>
          <button type="button" className="btn" onClick={() => window.print()}>Print / Save PDF</button>
          <button type="button" className="btn ghost" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}
