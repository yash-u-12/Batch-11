"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
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
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { PageHeader } from "@/components/page-header";
import {
  QrCode,
  ShieldCheck,
  UserCheck,
  History,
  AlertOctagon,
  Clock,
} from "lucide-react";
import PatientQRCard from "@/components/PatientQRCard";
import { toast } from "sonner";

export default function HealthCardPage() {
  const router = useRouter();
  const { isLoaded, isSignedIn } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);
  const [qrData, setQrData] = useState(null);
  const [requests, setRequests] = useState([]);
  const [logs, setLogs] = useState([]);

  // Form states for emergency settings
  const [bloodGroup, setBloodGroup] = useState("");
  const [emergencyContact, setEmergencyContact] = useState("");
  const [emergencyAccessEnabled, setEmergencyAccessEnabled] = useState(true);

  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.push("/onboarding");
    }
  }, [isLoaded, isSignedIn, router]);

  const fetchData = async () => {
    try {
      // 1. Fetch QR and Patient Info
      const qrRes = await fetch("/api/patient/my-qr");
      const qrJson = await qrRes.json();
      if (qrJson.error) {
        toast.error("Failed to load health card settings");
        return;
      }
      setQrData(qrJson);
      setBloodGroup(qrJson.bloodGroup || "");
      setEmergencyContact(qrJson.emergencyContact || "");
      setEmergencyAccessEnabled(qrJson.emergencyAccessEnabled ?? true);

      // 2. Fetch Access Requests
      const reqRes = await fetch("/api/access-request");
      const reqJson = await reqRes.json();
      setRequests(reqJson.requests || []);

      // 3. Fetch Access Logs
      const logsRes = await fetch("/api/access-logs");
      const logsJson = await logsRes.json();
      setLogs(logsJson.logs || []);

    } catch (e) {
      console.error(e);
      toast.error("Error loading dashboard data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isSignedIn) {
      fetchData();
      
      // Auto-poll requests and logs every 7 seconds
      const interval = setInterval(() => {
        fetchData();
      }, 7000);
      return () => clearInterval(interval);
    }
  }, [isSignedIn]);

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    setSavingSettings(true);
    try {
      const res = await fetch("/api/patient/my-qr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bloodGroup,
          emergencyContact,
          emergencyAccessEnabled,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Emergency settings updated successfully");
        fetchData();
      } else {
        toast.error(data.error || "Failed to save settings");
      }
    } catch (err) {
      console.error(err);
      toast.error("Error updating settings");
    } finally {
      setSavingSettings(false);
    }
  };

  const handleRequestAction = async (requestId, action) => {
    try {
      const res = await fetch("/api/access-request/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId, action }),
      });
      const data = await res.json();
      if (data.success) {
        if (action === "APPROVE") {
          toast.success("Access request approved! Requester has 15 mins to view records.");
        } else {
          toast.info("Access request declined.");
        }
        fetchData();
      } else {
        toast.error(data.error || "Failed to process request");
      }
    } catch (err) {
      console.error(err);
      toast.error("Error processing request");
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-24 text-center">
        <div className="flex flex-col items-center justify-center space-y-4">
          <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-muted-foreground text-sm font-medium">Loading Health Card Dashboard...</p>
        </div>
      </div>
    );
  }

  const pendingRequests = requests.filter(r => r.status === "PENDING");
  const pastRequests = requests.filter(r => r.status !== "PENDING");

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <PageHeader
        icon={<QrCode />}
        title="My Medical Health Card"
        backLink="/appointments"
        backLabel="My Appointments"
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mt-6">
        {/* Left Column: Health Card & Settings */}
        <div className="lg:col-span-5 space-y-8">
          <Card className="border-emerald-900/20 bg-muted/5">
            <CardHeader>
              <CardTitle className="text-lg font-bold text-white flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-emerald-400" />
                Digital Health ID Card
              </CardTitle>
              <CardDescription>
                Your QR Code points to your encrypted medical passport.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {qrData && (
                <PatientQRCard
                  patientData={{
                    name: qrData.bloodGroup ? qrData.bloodGroup : "Patient Profile",
                    id: qrData.token ? `PAT-${qrData.token.substring(0, 8).toUpperCase()}` : "N/A",
                    ...qrData,
                  }}
                  qrCode={qrData.qrCode}
                />
              )}
            </CardContent>
          </Card>

          {/* Emergency settings form */}
          <Card className="border-emerald-900/20 bg-muted/5">
            <CardHeader>
              <CardTitle className="text-lg font-bold text-white flex items-center gap-2">
                <AlertOctagon className="h-5 w-5 text-red-400" />
                Emergency Access Info
              </CardTitle>
              <CardDescription>
                Configure details that first responders can access instantly in a medical emergency.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSaveSettings} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="bloodGroup">Blood Group</Label>
                  <Input
                    id="bloodGroup"
                    value={bloodGroup}
                    onChange={(e) => setBloodGroup(e.target.value)}
                    placeholder="Eg. O+, A-, AB+"
                    className="bg-background text-sm border-emerald-900/20"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="emergencyContact">Emergency Contact Number</Label>
                  <Input
                    id="emergencyContact"
                    value={emergencyContact}
                    onChange={(e) => setEmergencyContact(e.target.value)}
                    placeholder="Eg. +91 98765 43210"
                    className="bg-background text-sm border-emerald-900/20"
                  />
                </div>

                <div className="flex items-center justify-between border-t border-emerald-900/20 pt-4">
                  <div className="space-y-0.5">
                    <Label htmlFor="emergencyMode" className="text-sm font-semibold text-white">
                      Instant Emergency View
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Expose blood group & emergency contact to anyone scanning without verification.
                    </p>
                  </div>
                  <button
                    id="emergencyMode"
                    type="button"
                    onClick={() => setEmergencyAccessEnabled(!emergencyAccessEnabled)}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 ${
                      emergencyAccessEnabled ? 'bg-emerald-600' : 'bg-gray-700'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        emergencyAccessEnabled ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                <Button
                  type="submit"
                  disabled={savingSettings}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-medium mt-2"
                >
                  {savingSettings ? "Saving Settings..." : "Save Emergency Settings"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Requests & Access logs tabs */}
        <div className="lg:col-span-7">
          <Tabs defaultValue="requests" className="w-full">
            <TabsList className="grid w-full grid-cols-2 bg-muted/20 border border-emerald-900/10">
              <TabsTrigger value="requests" className="text-xs font-semibold py-2">
                <UserCheck className="h-4 w-4 mr-2" />
                Access Requests ({pendingRequests.length})
              </TabsTrigger>
              <TabsTrigger value="logs" className="text-xs font-semibold py-2">
                <History className="h-4 w-4 mr-2" />
                Access History ({logs.length})
              </TabsTrigger>
            </TabsList>

            {/* Access Requests Tab Panel */}
            <TabsContent value="requests" className="mt-4 space-y-4">
              <Card className="border-emerald-900/20 bg-muted/5">
                <CardHeader>
                  <CardTitle className="text-base font-bold text-white">Pending Requests</CardTitle>
                  <CardDescription>
                    Approve requests to grant doctors or family members temporary 15-minute access to your full records.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {pendingRequests.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground text-sm">
                      No pending access requests.
                    </div>
                  ) : (
                    pendingRequests.map((req) => (
                      <div
                        key={req.id}
                        className="flex flex-col md:flex-row md:items-center justify-between p-4 border border-emerald-900/20 rounded-xl bg-background/40 gap-4"
                      >
                        <div className="space-y-1">
                          <p className="font-bold text-white text-sm">{req.requesterName}</p>
                          <p className="text-xs text-muted-foreground">Phone: {req.requesterPhone}</p>
                          <p className="text-xs bg-emerald-950/40 text-emerald-400 border border-emerald-900/30 rounded px-1.5 py-0.5 w-fit mt-1">
                            Reason: {req.reason}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => handleRequestAction(req.id, "APPROVE")}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs"
                          >
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleRequestAction(req.id, "REJECT")}
                            className="text-xs font-semibold"
                          >
                            Decline
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>

              {/* Past/Approved Requests Card */}
              {pastRequests.length > 0 && (
                <Card className="border-emerald-900/20 bg-muted/5">
                  <CardHeader>
                    <CardTitle className="text-base font-bold text-white">Past Requests</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {pastRequests.slice(0, 5).map((req) => (
                      <div
                        key={req.id}
                        className="flex items-center justify-between p-3 border border-emerald-900/10 rounded-lg bg-background/20 text-xs"
                      >
                        <div>
                          <p className="font-semibold text-white">{req.requesterName}</p>
                          <p className="text-muted-foreground">{new Date(req.createdAt).toLocaleDateString()}</p>
                        </div>
                        <div>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              req.status === "APPROVED"
                                ? "bg-emerald-900/30 text-emerald-400 border border-emerald-500/20"
                                : "bg-red-955/20 text-red-400 border border-red-500/20"
                            } border`}
                          >
                            {req.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* Access Logs Tab Panel */}
            <TabsContent value="logs" className="mt-4">
              <Card className="border-emerald-900/20 bg-muted/5">
                <CardHeader>
                  <CardTitle className="text-base font-bold text-white">Access Logs</CardTitle>
                  <CardDescription>
                    Real-time monitoring log of all attempts and direct scans of your QR card records.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {logs.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground text-sm">
                      No access history recorded yet.
                    </div>
                  ) : (
                    <div className="relative border-l border-emerald-900/30 ml-3 pl-6 space-y-6">
                      {logs.map((log) => (
                        <div key={log.id} className="relative">
                          {/* Timeline Dot */}
                          <div className="absolute -left-[31px] top-1 w-2.5 h-2.5 rounded-full bg-emerald-500 border border-background shadow-md shadow-emerald-500/20" />
                          
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-white text-sm">{log.accessorName}</span>
                              <span
                                className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border ${
                                  log.accessorRole === "DOCTOR"
                                    ? "bg-emerald-950/20 text-emerald-400 border-emerald-500/20"
                                    : "bg-amber-950/20 text-amber-400 border-amber-500/20"
                                }`}
                              >
                                {log.accessorRole}
                              </span>
                            </div>
                            
                            <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                              <Clock className="h-3.5 w-3.5 text-emerald-500/60" />
                              {new Date(log.timestamp).toLocaleString()}
                            </p>

                            <p className="text-xs text-emerald-400/90 font-medium">
                              Type: {log.accessType.replace(/_/g, " ")}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
