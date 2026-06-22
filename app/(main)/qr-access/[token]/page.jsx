"use client";

import React, { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { PageHeader } from "@/components/page-header";
import {
  Lock,
  User,
  HeartPulse,
  FileText,
  Activity,
  AlertTriangle,
  Stethoscope,
  PhoneCall,
  Calendar,
} from "lucide-react";
import { toast } from "sonner";

export default function QrAccessPage({ params: paramsPromise }) {
  const params = use(paramsPromise);
  const token = params.token;
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [requesting, setRequesting] = useState(false);
  const [accessStatus, setAccessStatus] = useState("PENDING_CHECK"); // PENDING_CHECK, AUTHORIZED, ACCESS_REQUEST_REQUIRED
  
  // Records state
  const [patient, setPatient] = useState(null);
  const [history, setHistory] = useState(null);

  // Access request form
  const [reqName, setReqName] = useState("");
  const [reqPhone, setReqPhone] = useState("");
  const [reqReason, setReqReason] = useState("");
  const [requestSubmitted, setRequestSubmitted] = useState(false);

  // Emergency Mode state
  const [emergencyData, setEmergencyData] = useState(null);
  const [showEmergency, setShowEmergency] = useState(false);
  const [loadingEmergency, setLoadingEmergency] = useState(false);

  const checkAccess = async () => {
    try {
      let url = `/api/qr/${token}`;
      if (typeof window !== "undefined") {
        const savedRequestId = localStorage.getItem(`access_request_${token}`);
        if (savedRequestId) {
          url += `?requestId=${savedRequestId}`;
        }
      }

      const res = await fetch(url);
      const data = await res.json();
      
      if (data.status === "AUTHORIZED") {
        setAccessStatus("AUTHORIZED");
        setPatient(data.patient);
        setHistory(data.history);
      } else {
        setAccessStatus("ACCESS_REQUEST_REQUIRED");
        setPatient(data.patient); // holds patient id and emergency toggle
      }
    } catch (e) {
      console.error(e);
      toast.error("Failed to authenticate QR access");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!token) return;

    checkAccess();

    // Auto-poll approval status every 5 seconds if not yet authorized
    const interval = setInterval(() => {
      if (accessStatus !== "AUTHORIZED") {
        checkAccess();
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [token, accessStatus]);

  const handleRequestAccess = async (e) => {
    e.preventDefault();
    if (!reqName.trim() || !reqPhone.trim() || !reqReason.trim()) {
      toast.error("Please fill in all request fields");
      return;
    }

    setRequesting(true);
    try {
      const res = await fetch("/api/access-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientId: patient.id,
          name: reqName,
          phone: reqPhone,
          reason: reqReason,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Access request sent to patient! Please ask them to approve it.");
        setRequestSubmitted(true);
        if (typeof window !== "undefined" && data.request?.id) {
          localStorage.setItem(`access_request_${token}`, data.request.id);
        }
      } else {
        toast.error(data.error || "Failed to submit request");
      }
    } catch (err) {
      console.error(err);
      toast.error("Error submitting access request");
    } finally {
      setRequesting(false);
    }
  };

  const handleTriggerEmergency = async () => {
    setLoadingEmergency(true);
    try {
      const res = await fetch(`/api/qr/emergency/${token}`);
      const data = await res.json();
      if (res.ok) {
        setEmergencyData(data);
        setShowEmergency(true);
        toast.success("Emergency details retrieved successfully");
      } else {
        toast.error(data.error || "Failed to retrieve emergency details");
      }
    } catch (err) {
      console.error(err);
      toast.error("Emergency mode fetch error");
    } finally {
      setLoadingEmergency(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-24 text-center">
        <div className="flex flex-col items-center justify-center space-y-4">
          <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-muted-foreground text-sm">Authenticating QR Code Record...</p>
        </div>
      </div>
    );
  }

  // CASE 1: AUTHORIZED - DISPLAY FULL PATIENT HEALTH RECORD
  if (accessStatus === "AUTHORIZED" && patient) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        <PageHeader
          icon={<HeartPulse />}
          title={`Medical Record - ${patient.name}`}
          backLink="/doctor"
          backLabel="Doctor Dashboard"
        />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-6">
          {/* Patient Overview Side Pane */}
          <div className="md:col-span-1 space-y-6">
            <Card className="border-emerald-900/20 bg-muted/5">
              <CardHeader className="text-center pb-2">
                <div className="w-16 h-16 rounded-full bg-emerald-900/20 border border-emerald-500/20 flex items-center justify-center mx-auto mb-3">
                  <User className="h-8 w-8 text-emerald-400" />
                </div>
                <CardTitle className="text-lg font-bold text-white">{patient.name}</CardTitle>
                <CardDescription>Patient Profile Info</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 text-sm">
                <div className="border-t border-emerald-900/20 pt-3">
                  <span className="text-muted-foreground block text-xs">Email</span>
                  <span className="text-white font-medium">{patient.email}</span>
                </div>
                <div>
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
                <div>
                  <span className="text-muted-foreground block text-xs">Address</span>
                  <span className="text-white font-medium block leading-snug">{patient.address || "N/A"}</span>
                </div>
              </CardContent>
            </Card>

            {/* Vitals Panel */}
            <Card className="border-emerald-900/20 bg-muted/5">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-bold text-white flex items-center gap-2">
                  <Activity className="h-4.5 w-4.5 text-emerald-400" />
                  Key Vitals Info
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

          {/* Medical History Pane */}
          <div className="md:col-span-2 space-y-6">
            {/* Background Medical Info */}
            <Card className="border-emerald-900/20 bg-muted/5">
              <CardHeader>
                <CardTitle className="text-base font-bold text-white flex items-center gap-2">
                  <FileText className="h-4.5 w-4.5 text-emerald-400" />
                  Medical History & Notes
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm">
                <div>
                  <span className="text-xs text-emerald-400 font-semibold block uppercase tracking-wide">Allergies</span>
                  <p className="text-white mt-1">{patient.allergies || "No reported allergies."}</p>
                </div>
                <div className="border-t border-emerald-900/10 pt-3">
                  <span className="text-xs text-emerald-400 font-semibold block uppercase tracking-wide">Food Habit</span>
                  <p className="text-white mt-1">{patient.food_habit || "N/A"}</p>
                </div>
                <div className="border-t border-emerald-900/10 pt-3">
                  <span className="text-xs text-emerald-400 font-semibold block uppercase tracking-wide">Surgeries & Medical Events</span>
                  <p className="text-white mt-1">{patient.surgery || "No previous surgeries recorded."}</p>
                </div>
                <div className="border-t border-emerald-900/10 pt-3">
                  <span className="text-xs text-emerald-400 font-semibold block uppercase tracking-wide">Past Diagnosis / Notes</span>
                  <p className="text-white mt-1 block leading-relaxed">{patient.medical_history || "No notes available."}</p>
                </div>
              </CardContent>
            </Card>

            {/* Consultations and Clinical documents list */}
            <Card className="border-emerald-900/20 bg-muted/5">
              <CardHeader>
                <CardTitle className="text-base font-bold text-white flex items-center gap-2">
                  <Stethoscope className="h-4.5 w-4.5 text-emerald-400" />
                  Past Clinical Appointments
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {history.appointments?.length === 0 ? (
                  <div className="text-center py-6 text-muted-foreground text-sm">
                    No clinical consult history available.
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

  // CASE 2: ACCESS_REQUEST_REQUIRED - DISPLAY REQUEST FORM OR EMERGENCY VIEW
  return (
    <div className="container mx-auto px-4 py-8 max-w-lg">
      <PageHeader
        icon={<Lock />}
        title="Protected Health Record"
        backLink="/"
        backLabel="Home"
      />

      <div className="mt-6 space-y-6">
        {/* Shield / Locked Header */}
        <div className="text-center py-6">
          <div className="w-16 h-16 rounded-full bg-red-950/30 border border-red-500/20 flex items-center justify-center mx-auto mb-4">
            <Lock className="h-8 w-8 text-red-400" />
          </div>
          <h3 className="text-xl font-bold text-white">Patient Record Protected</h3>
          <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto leading-normal">
            This patient's record is protected. You must request temporary access or initiate emergency mode.
          </p>
        </div>

        {/* Access Request Form */}
        {!showEmergency && (
          <Card className="border-emerald-900/20 bg-muted/5">
            <CardHeader>
              <CardTitle className="text-base font-bold text-white">Request Digital Access</CardTitle>
              <CardDescription>
                Submit access request. The patient will receive a notification to approve.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {requestSubmitted ? (
                <div className="text-center py-6 space-y-2">
                  <div className="text-emerald-400 font-semibold">✓ Request Successfully Sent</div>
                  <p className="text-xs text-muted-foreground">
                    A notification has been dispatched to {patient.name}. Keep this page open; once approved, you can view the records.
                  </p>
                  <Button
                    onClick={() => {
                      setLoading(true);
                      checkAccess();
                    }}
                    className="mt-4 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold"
                  >
                    Check Approval Status
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleRequestAccess} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="reqName">Your Name</Label>
                    <Input
                      id="reqName"
                      value={reqName}
                      onChange={(e) => setReqName(e.target.value)}
                      placeholder="Dr. Rajesh Sharma"
                      className="bg-background text-sm border-emerald-900/20"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="reqPhone">Your Phone Number</Label>
                    <Input
                      id="reqPhone"
                      value={reqPhone}
                      onChange={(e) => setReqPhone(e.target.value)}
                      placeholder="9876543210"
                      className="bg-background text-sm border-emerald-900/20"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="reqReason">Reason for Access</Label>
                    <Textarea
                      id="reqReason"
                      value={reqReason}
                      onChange={(e) => setReqReason(e.target.value)}
                      placeholder="Clinical consultation / symptom check"
                      rows={3}
                      className="bg-background text-sm border-emerald-900/20 h-20"
                    />
                  </div>

                  <Button
                    type="submit"
                    disabled={requesting}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold mt-2"
                  >
                    {requesting ? "Sending Request..." : "Request Access"}
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>
        )}

        {/* Emergency Mode View */}
        {patient.emergencyAccessEnabled && (
          <div className="space-y-4">
            {!showEmergency ? (
              <Button
                onClick={handleTriggerEmergency}
                disabled={loadingEmergency}
                className="w-full bg-red-600 hover:bg-red-700 text-white font-bold flex items-center justify-center gap-2 py-6 rounded-xl shadow-lg shadow-red-950/20"
              >
                {loadingEmergency ? "Accessing Emergency File..." : "🚨 Emergency Mode (Access Info)"}
              </Button>
            ) : (
              emergencyData && (
                <Card className="border-red-900/30 bg-red-950/10 animate-shake">
                  <CardHeader className="border-b border-red-900/30 pb-3">
                    <CardTitle className="text-base font-bold text-red-400 flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5" />
                      Emergency Medical Card
                    </CardTitle>
                    <CardDescription className="text-xs text-red-500/70">
                      Disclosed publicly for life-saving care. Access has been logged.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-4 space-y-4 text-sm">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <span className="text-muted-foreground text-xs block">Patient Name</span>
                        <span className="text-white font-bold block">{emergencyData.name}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground text-xs block">Age / Gender</span>
                        <span className="text-white font-bold block">{emergencyData.age} / {emergencyData.gender}</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 border-t border-red-900/20 pt-3">
                      <div>
                        <span className="text-red-400 text-xs font-bold block">BLOOD GROUP</span>
                        <span className="text-white font-black text-lg block">{emergencyData.bloodGroup}</span>
                      </div>
                      <div>
                        <span className="text-red-400 text-xs font-bold block">EMERGENCY PHONE</span>
                        <a
                          href={`tel:${emergencyData.emergencyContact}`}
                          className="text-white font-bold flex items-center gap-1 mt-1 hover:underline text-sm"
                        >
                          <PhoneCall className="h-3.5 w-3.5 text-emerald-400" />
                          {emergencyData.emergencyContact}
                        </a>
                      </div>
                    </div>

                    <div className="border-t border-red-900/20 pt-3">
                      <span className="text-red-400 text-xs font-bold block">KNOWN ALLERGIES</span>
                      <p className="text-white font-medium mt-1 leading-normal">
                        {emergencyData.allergies}
                      </p>
                    </div>

                    <Button
                      variant="outline"
                      onClick={() => setShowEmergency(false)}
                      className="w-full border-red-900/30 hover:bg-red-950/20 text-red-400 text-xs font-semibold mt-2"
                    >
                      Hide Emergency Card
                    </Button>
                  </CardContent>
                </Card>
              )
            )}
          </div>
        )}
      </div>
    </div>
  );
}
