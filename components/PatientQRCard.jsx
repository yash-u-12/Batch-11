"use client";

import React, { useRef } from "react";
import { Download, Printer, ShieldAlert } from "lucide-react";
import { Card, CardContent } from "./ui/card";
import { Button } from "./ui/button";

export default function PatientQRCard({ patientData, qrCode }) {
  const cardRef = useRef(null);

  const handlePrint = () => {
    const printContent = cardRef.current.innerHTML;
    const originalContent = document.body.innerHTML;
    
    // Create print window style overrides to format like a wallet card
    const style = `
      <style>
        body {
          background: #ffffff !important;
          color: #000000 !important;
          font-family: system-ui, -apple-system, sans-serif;
          padding: 20px;
        }
        .print-card {
          width: 450px;
          border: 2px solid #047857;
          border-radius: 12px;
          padding: 20px;
          background: #f0fdf4;
          box-shadow: none;
          margin: 0 auto;
        }
        .print-header {
          display: flex;
          align-items: center;
          border-bottom: 2px solid #047857;
          padding-bottom: 10px;
          margin-bottom: 15px;
        }
        .print-title {
          font-size: 20px;
          font-weight: bold;
          color: #047857;
        }
        .print-body {
          display: flex;
          justify-content: space-between;
        }
        .print-info {
          flex: 1;
        }
        .print-row {
          margin-bottom: 8px;
          font-size: 14px;
        }
        .print-label {
          font-weight: bold;
          color: #374151;
        }
        .print-value {
          color: #000000;
        }
        .print-qr {
          width: 120px;
          height: 120px;
          margin-left: 20px;
        }
        .print-emergency {
          margin-top: 15px;
          border-top: 1px dashed #9ca3af;
          padding-top: 10px;
          font-size: 12px;
          color: #b91c1c;
          font-weight: bold;
        }
        .no-print {
          display: none !important;
        }
      </style>
    `;

    const printWindow = window.open("", "_blank");
    printWindow.document.write(`
      <html>
        <head>
          <title>MedicSync Health Card - ${patientData.name}</title>
          ${style}
        </head>
        <body>
          <div class="print-card">
            <div class="print-header">
              <div class="print-title">MedicSync Digital Health ID</div>
            </div>
            <div class="print-body">
              <div class="print-info">
                <div class="print-row"><span class="print-label">Name:</span> <span class="print-value">${patientData.name}</span></div>
                <div class="print-row"><span class="print-label">Patient ID:</span> <span class="print-value">${patientData.id}</span></div>
                <div class="print-row"><span class="print-label">Age/Gender:</span> <span class="print-value">${patientData.age || "N/A"} / ${patientData.gender || "N/A"}</span></div>
                <div class="print-row"><span class="print-label">Blood Group:</span> <span class="print-value" style="color: #b91c1c; font-weight: bold;">${patientData.bloodGroup || "N/A"}</span></div>
                <div class="print-row"><span class="print-label">Emergency Contact:</span> <span class="print-value">${patientData.emergencyContact || "N/A"}</span></div>
              </div>
              <div>
                <img src="${qrCode}" class="print-qr" />
              </div>
            </div>
            <div class="print-emergency">
              * SCAN FOR EMERGENCY MEDICAL INFORMATION AND SECURE ACCESS
            </div>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 500);
  };

  return (
    <div className="space-y-6 max-w-xl mx-auto">
      {/* Visual Health Card Render */}
      <div ref={cardRef}>
        <Card className="relative overflow-hidden bg-gradient-to-br from-emerald-950/40 via-card to-background border border-emerald-500/25 rounded-2xl shadow-xl shadow-emerald-950/20">
          {/* Card Accent Lines */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none" />
          <div className="absolute -bottom-8 -left-8 w-24 h-24 bg-emerald-500/5 rounded-full blur-xl pointer-events-none" />

          <CardContent className="p-6">
            {/* Card Header */}
            <div className="flex justify-between items-center border-b border-emerald-900/30 pb-4 mb-4">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center border border-emerald-500/30">
                  <span className="text-emerald-400 font-bold text-lg font-mono">M</span>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-emerald-400 uppercase tracking-wider font-mono">MedicSync ID</h3>
                  <p className="text-[10px] text-muted-foreground font-mono">SECURE HEALTH PASSPORT</p>
                </div>
              </div>
              <div className="text-right">
                <span className="text-xs bg-emerald-900/40 text-emerald-400 border border-emerald-700/30 rounded-full px-2.5 py-0.5 font-medium">
                  Patient
                </span>
              </div>
            </div>

            {/* Card Details Block */}
            <div className="grid grid-cols-3 gap-4 items-center">
              <div className="col-span-2 space-y-3">
                <div>
                  <label className="text-[10px] uppercase text-muted-foreground tracking-wide font-mono block">Patient Name</label>
                  <span className="text-base font-bold text-white block truncate">{patientData.name}</span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] uppercase text-muted-foreground tracking-wide font-mono block">Age / Sex</label>
                    <span className="text-xs font-semibold text-white block">{patientData.age || "N/A"} / {patientData.gender || "N/A"}</span>
                  </div>
                  <div>
                    <label className="text-[10px] uppercase text-muted-foreground tracking-wide font-mono block">Blood Group</label>
                    <span className="text-xs font-bold text-red-400 block">{patientData.bloodGroup || "Not Set"}</span>
                  </div>
                </div>

                <div>
                  <label className="text-[10px] uppercase text-muted-foreground tracking-wide font-mono block">Emergency Contact</label>
                  <span className="text-xs font-semibold text-white block">{patientData.emergencyContact || "Not Set"}</span>
                </div>
              </div>

              {/* QR Code Container */}
              <div className="col-span-1 flex flex-col items-center justify-center p-2 bg-white/5 border border-emerald-900/30 rounded-xl">
                <img
                  src={qrCode}
                  alt="Patient Medical Record QR"
                  className="w-full h-auto rounded-lg object-contain bg-white p-1"
                />
                <span className="text-[8px] font-semibold text-emerald-500/70 font-mono tracking-widest mt-1.5 uppercase">
                  SCAN ME
                </span>
              </div>
            </div>

            {/* Footer Emergency Alert bar */}
            {patientData.emergencyAccessEnabled && (
              <div className="mt-4 flex items-center space-x-2 bg-red-950/20 border border-red-900/30 rounded-lg p-2 text-red-400">
                <ShieldAlert className="h-4 w-4 shrink-0" />
                <span className="text-[10px] leading-tight font-medium">
                  Emergency scan will expose name, blood group, allergies, and contact.
                </span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Button Controls */}
      <div className="flex gap-4">
        <a
          href={qrCode}
          download={`medicsync-qr-${patientData.name.toLowerCase().replace(/\s+/g, "-")}.png`}
          className="flex-1"
        >
          <Button className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-medium gap-2">
            <Download className="h-4 w-4" />
            Download QR
          </Button>
        </a>

        <Button
          onClick={handlePrint}
          variant="outline"
          className="flex-1 border-emerald-700/30 text-emerald-400 hover:bg-emerald-950/10 font-medium gap-2"
        >
          <Printer className="h-4 w-4" />
          Print ID Card
        </Button>
      </div>
    </div>
  );
}
