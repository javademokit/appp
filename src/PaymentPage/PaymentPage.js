import React, { useState } from "react";
import { Html5QrcodeScanner } from "html5-qrcode";
import jsPDF from "jspdf";
import "jspdf-autotable";
import "./PaymentPage.css";

const PaymentPage = () => {
  const [scannedData, setScannedData] = useState(null);
  const [showReceipt, setShowReceipt] = useState(false);

  const handleScan = () => {
    const scanner = new Html5QrcodeScanner("qr-reader", {
      fps: 10,
      qrbox: 250,
    });

    scanner.render(
      (decodedText) => {
        try {
          const parsed = JSON.parse(decodedText);
          setScannedData(parsed);
          setShowReceipt(true);
          scanner.clear();
        } catch (e) {
          alert("Invalid QR code");
        }
      },
      (error) => console.warn(error)
    );
  };

  const handleSave = async () => {
    if (!scannedData) return;

    try {
      const response = await fetch("http://localhost:7771/api/payments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(scannedData),
      });

      const result = await response.json();
      alert("Payment saved successfully!");
    } catch (error) {
      console.error("Error saving payment:", error);
      alert("Failed to save payment.");
    }
  };

  const handlePDF = () => {
    const doc = new jsPDF();

    // Set background color for header
    doc.setFillColor(52, 152, 219); // blue
    doc.rect(0, 0, 210, 30, "F");

    doc.setFontSize(16);
    doc.setTextColor(255, 255, 255);
    doc.text("🏥 Wellness Hospital", 105, 10, { align: "center" });
    doc.setFontSize(10);
    doc.text("123 Health St, Wellness City, IN", 105, 18, { align: "center" });
    doc.text("📞 +91 98765 43210", 105, 25, { align: "center" });

    doc.setTextColor(0, 0, 0);
    doc.setFontSize(12);
    doc.text("🧾 Payment Receipt", 105, 40, { align: "center" });

    const tableData = [
      ["Name", scannedData.name],
      ["Amount", `₹${scannedData.amount}`],
      ["Date", scannedData.date],
      ["Payment Mode", scannedData.paymentMode],
    ];

    doc.autoTable({
      startY: 50,
      head: [["Field", "Value"]],
      body: tableData,
      styles: { fillColor: [230, 247, 255] },
      headStyles: { fillColor: [41, 128, 185], textColor: 255 },
    });

    doc.save("payment_receipt.pdf");
  };

  return (
    <div className="payment-container">
      <h2 className="page-title">📱 Scan to Pay</h2>
      {!scannedData && <div id="qr-reader" style={{ width: "300px" }}></div>}
      {!scannedData && (
        <button className="scan-btn" onClick={handleScan}>
          Start Scanning
        </button>
      )}

      {showReceipt && scannedData && (
        <div className="receipt-container">
          <h3>🏥 Wellness Hospital</h3>
          <p>123 Health St, Wellness City, IN</p>
          <p>📞 +91 98765 43210</p>

          <table className="receipt-table">
            <tbody>
              <tr>
                <th>Name</th>
                <td>{scannedData.name}</td>
              </tr>
              <tr>
                <th>Amount</th>
                <td>₹{scannedData.amount}</td>
              </tr>
              <tr>
                <th>Date</th>
                <td>{scannedData.date}</td>
              </tr>
              <tr>
                <th>Payment Mode</th>
                <td>{scannedData.paymentMode}</td>
              </tr>
            </tbody>
          </table>

          <div className="btn-group">
            <button className="save-btn" onClick={handleSave}>Save Payment</button>
            <button className="pdf-btn" onClick={handlePDF}>Export PDF</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default PaymentPage;
