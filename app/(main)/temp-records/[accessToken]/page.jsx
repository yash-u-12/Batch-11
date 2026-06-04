"use client";

import React, { useState, useEffect, use } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import {
  User,
  HeartPulse,
  FileText,
  Activity,
  AlertTriangle,
  Stethoscope,
  Calendar,
  Clock,
} from "lucide-react";
import { toast } from "sonner";

export default function TempRecordsPage({ params: paramsPromise }) {
  const params = use(paramsPromise);
  const accessToken = params.accessToken;

  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [patient, setPatient] = useState(null);
  const [history, setHistory] = useState(null);

  useEffect(() => {
    const fetchRecords = async () => {
      try {
        const res = await fetch(`/api/temp-access/${accessToken}`);
        const data = await res.json();

        if (res.ok && data.status === "AUTHORIZED") {
          setAuthorized(true);
          setPatient(data.patient);
          setHistory(data.history);
        } else {
          setAuthorized(false);
          setErrorMsg(data.error || "Temporary access expired or invalid.");
        }
      } catch (e) {
        console.error(e);
        setErrorMsg("Failed to retrieve temporary access records.");
      } finally {
        setLoading(false);
      }
    };

    if (accessToken) {
      fetchRecords();
    }
  }, [accessToken]);

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-24 text-center">
        <div className="flex flex-col items-center justify-center space-y-4">
          <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-muted-foreground text-sm font-medium">Validating Temporary Access Token...</p>
        </div>
      </div>
    );
  }

  // EXPIRED OR INVALID ACCESS TOKEN VIEW
  if (!authorized) {
    return (
      <div className="container mx-auto px-4 py-16 max-w-md text-center">
        <div className="w-16 h-16 rounded-full bg-red-950/30 border border-red-500/20 flex items-center justify-center mx-auto mb-4">
          <AlertTriangle className="h-8 w-8 text-red-400" />
        </div>
        <h3 className="text-xl font-bold text-white">Temporary Access Expired</h3>
        <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
          {errorMsg || "The 15-minute consent window has expired or the token is invalid. Please scan the patient's QR code again to submit a new access request."}
        </p>
      </div>
    );
  }

  // VALID AND ACTIVE TEMPORARY ACCESS VIEW
  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      <PageHeader
        icon={<Clock />}
        title={`Consent Records - ${patient.name}`}
        backLink="/"
        backLabel="Home"
      />

      {/* Expiry Alert banner */}
      <div className="mt-4 flex items-center space-x-2 bg-amber-950/20 border border-amber-900/30 rounded-lg p-3 text-amber-400 text-xs">
        <Clock className="h-4 w-4 shrink-0 animate-pulse" />
        <span>
          <strong>Temporary Session Active:</strong> You have been granted a 15-minute window to view this patient's records. Do not refresh this page.
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-6">
        {/* Patient Info Side Panel */}
        <div className="md:col-span-1 space-y-6">
          <Card className="border-emerald-900/20 bg-muted/5">
            <CardHeader className="text-center pb-2">
              <div className="w-16 h-16 rounded-full bg-emerald-900/20 border border-emerald-500/20 flex items-center justify-center mx-auto mb-3">
                <User className="h-8 w-8 text-emerald-400" />
              </div>
              <CardTitle className="text-lg font-bold text-white">{patient.name}</CardTitle>
              <CardDescription>Patient Details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div className="border-t border-emerald-900/20 pt-3">
                <span className="text-muted-foreground block text-xs">Age / Gender</span>
                <span className="text-white font-medium">{patient.age || "N/A"} years / {patient.gender || "N/A"}</span>
              </div>
              <div>
                <span className="text-muted-foreground block text-xs">Blood Group</span>
                <span className="text-red-400 font-bold">{patient.bloodGroup || "Not Set"}</span>
              </div>
              <div>
                <span className="text-muted-foreground block text-xs">Emergency Contact</span>
                <span className="text-white font-medium">{patient.emergencyContact || "Not Set"}</span>
              </div>
            </CardContent>
          </Card>

          {/* Vitals Panel */}
          <Card className="border-emerald-900/20 bg-muted/5">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-bold text-white flex items-center gap-2">
                <Activity className="h-4.5 w-4.5 text-emerald-400" />
                Vitals Profile
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between border-b border-emerald-900/10 pb-2">
                <span className="text-muted-foreground">Blood Pressure (BP)</span>
                <span className="text-white font-bold">
                  {patient.bp_sys && patient.bp_dia ? `${patient.bp_sys}/${patient.bp_dia} mmHg` : "N/A"}
                </span>
              </div>
              <div className="flex justify-between border-b border-emerald-900/10 pb-2">
                <span className="text-muted-foreground">Sugar (Fasting)</span>
                <span className="text-white font-bold">
                  {patient.sugar_fasting ? `${patient.sugar_fasting} mg/dL` : "N/A"}
                </span>
              </div>
              <div className="flex justify-between pb-1">
                <span className="text-muted-foreground">Sugar (Post Prandial)</span>
                <span className="text-white font-bold">
                  {patient.sugar_pp ? `${patient.sugar_pp} mg/dL` : "N/A"}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Medical History & Appointments */}
        <div className="md:col-span-2 space-y-6">
          {/* Medical Notes Card */}
          <Card className="border-emerald-900/20 bg-muted/5">
            <CardHeader>
              <CardTitle className="text-base font-bold text-white flex items-center gap-2">
                <FileText className="h-4.5 w-4.5 text-emerald-400" />
                Medical File Background
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div>
                <span className="text-xs text-emerald-400 font-semibold block uppercase tracking-wide">Allergies</span>
                <p className="text-white mt-1">{patient.allergies || "No reported allergies."}</p>
              </div>
              <div className="border-t border-emerald-900/10 pt-3">
                <span className="text-xs text-emerald-400 font-semibold block uppercase tracking-wide">Surgeries & Medical Events</span>
                <p className="text-white mt-1">{patient.surgery || "No previous surgeries recorded."}</p>
              </div>
              <div className="border-t border-emerald-900/10 pt-3">
                <span className="text-xs text-emerald-400 font-semibold block uppercase tracking-wide">Diagnosis History</span>
                <p className="text-white mt-1 block leading-relaxed">{patient.medical_history || "No notes available."}</p>
              </div>
            </CardContent>
          </Card>

          {/* Past Consultations Card */}
          <Card className="border-emerald-900/20 bg-muted/5">
            <CardHeader>
              <CardTitle className="text-base font-bold text-white flex items-center gap-2">
                <Stethoscope className="h-4.5 w-4.5 text-emerald-400" />
                Clinical Consultations
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {history.appointments?.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground text-sm">
                  No consult records found.
                </div>
              ) : (
                history.appointments.map((appt) => (
                  <div
                    key={appt.id}
                    className="p-4 border border-emerald-900/20 rounded-xl bg-background/40 space-y-2 text-sm"
                  >
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-white">Consultation with {appt.doctor.name}</span>
                      <span className="text-xs text-emerald-400 font-mono flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5" />
                        {new Date(appt.startTime).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-xs text-emerald-400/75 italic">Specialty: {appt.doctor.specialty}</p>

                    {appt.notes && (
                      <div className="mt-2 bg-emerald-950/20 border border-emerald-900/30 p-2 rounded text-muted-foreground leading-relaxed">
                        <span className="text-[10px] font-bold text-emerald-400 block mb-1">DOCTOR NOTES:</span>
                        {appt.notes}
                      </div>
                    )}

                    {appt.prescriptionUrl && (
                      <div className="mt-2 pt-2 border-t border-emerald-900/10 flex justify-end">
                        <a
                          href={appt.prescriptionUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-emerald-400 hover:underline font-semibold"
                        >
                          View Prescription Document →
                        </a>
                      </div>
                    )}
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
