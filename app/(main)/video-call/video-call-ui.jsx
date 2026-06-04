"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Script from "next/script";
import { Button } from "@/components/ui/button";
import {
  Loader2,
  Video,
  VideoOff,
  Mic,
  MicOff,
  PhoneOff,
  User,
} from "lucide-react";
import { toast } from "sonner";

import {
  endAppointmentCall,
  getAppointmentParticipants,
} from "@/actions/appointments";
import { addAppointmentNotes } from "@/actions/doctor";

export default function VideoCall({ sessionId, token, appointmentId }) {
  const [isLoading, setIsLoading] = useState(true);
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [role, setRole] = useState(null);

  const [joined, setJoined] = useState({ doctor: false, patient: false });
  const [appointment, setAppointment] = useState(null);
  const [notes, setNotes] = useState("");
  const [isSavingNotes, setIsSavingNotes] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const sessionRef = useRef(null);
  const publisherRef = useRef(null);

  const router = useRouter();
  const appId = process.env.NEXT_PUBLIC_VONAGE_APPLICATION_ID;

  // Initial load
  useEffect(() => {
    async function fetchParticipants() {
      const res = await getAppointmentParticipants(appointmentId);
      if (res.success) {
        const { data: fetchedParticipants, currentUserId } = res;
        setAppointment(fetchedParticipants);
        setNotes(fetchedParticipants.notes || "");
        if (currentUserId === fetchedParticipants.doctorId) {
          setRole("DOCTOR");
        } else if (currentUserId === fetchedParticipants.patientId) {
          setRole("PATIENT");
        } else {
          setRole(null);
        }
      } else {
        console.error("Error Fetching Participants:", res.error);
      }
    }

    if (appointmentId) fetchParticipants();
  }, [appointmentId]);

  // Real-time synchronization of notes/prescription for the Patient
  useEffect(() => {
    if (!appointmentId) return;

    const pollInterval = setInterval(async () => {
      const res = await getAppointmentParticipants(appointmentId);
      if (res.success) {
        const { data: fetchedParticipants } = res;
        setAppointment(fetchedParticipants);
        // Only update the local notes input if the user is a PATIENT (so it doesn't overwrite what the doctor is typing)
        if (role === "PATIENT") {
          setNotes(fetchedParticipants.notes || "");
        }
      }
    }, 5000);

    return () => clearInterval(pollInterval);
  }, [appointmentId, role]);

  useEffect(() => {
    if (!isConnected || !role) return;

    if (role === "DOCTOR") {
      setJoined((prev) => ({ ...prev, doctor: true }));
    } else if (role === "PATIENT") {
      setJoined((prev) => ({ ...prev, patient: true }));
    }
  }, [role, isConnected]);

  const handleScriptLoad = () => {
    setScriptLoaded(true);
    if (!window.OT) {
      toast.error("Failed to Load Vonage Video API");
      setIsLoading(false);
      return;
    }
    initializeSession();
  };

  const initializeSession = () => {
    if (!appId || !sessionId || !token) {
      toast.error("Missing Required Video Call Parameters");
      router.push("/appointments");
      return;
    }

    try {
      sessionRef.current = window.OT.initSession(appId, sessionId);

      sessionRef.current.on("streamCreated", (event) => {
        let connData = null;
        try {
          const raw = event.stream?.connection?.data;
          connData = raw ? JSON.parse(raw) : null;
        } catch (err) {
          console.warn("Failed to parse stream connection data:", err);
        }

        if (connData?.role) {
          setJoined((prev) => ({
            ...prev,
            doctor: prev.doctor || connData.role === "DOCTOR",
            patient: prev.patient || connData.role === "PATIENT",
          }));
        }

        sessionRef.current.subscribe(
          event.stream,
          "subscriber",
          {
            insertMode: "append",
            width: "100%",
            height: "100%",
          },
          (error) => {
            if (error) {
              toast.error("Error Connecting to Other Participant's Stream");
            }
          }
        );
      });

      sessionRef.current.on("streamDestroyed", (event) => {
        let connData = null;
        try {
          const raw = event.stream?.connection?.data;
          connData = raw ? JSON.parse(raw) : null;
        } catch (err) {
          console.warn("Failed to parse stream connection data on destroy:", err);
        }

        if (connData?.role) {
          setJoined((prev) => ({
            ...prev,
            doctor: connData.role === "DOCTOR" ? false : prev.doctor,
            patient: connData.role === "PATIENT" ? false : prev.patient,
          }));
        }
      });

      sessionRef.current.on("sessionConnected", () => {
        setIsConnected(true);
        setIsLoading(false);

        publisherRef.current = window.OT.initPublisher(
          "publisher",
          {
            insertMode: "replace",
            width: "100%",
            height: "100%",
            publishAudio: isAudioEnabled,
            publishVideo: isVideoEnabled,
          },
          (error) => {
            if (error) {
              console.error("Publisher Error:", error);
              toast.error("Error Initializing Your Camera and Microphone");
            } else {
              sessionRef.current.publish(publisherRef.current, (pubErr) => {
                if (pubErr) {
                  console.error("Error Publishing Stream:", pubErr);
                  toast.error("Error Publishing Your Stream");
                } else {
                  if (role === "DOCTOR") {
                    setJoined((prev) => ({ ...prev, doctor: true }));
                  } else if (role === "PATIENT") {
                    setJoined((prev) => ({ ...prev, patient: true }));
                  }
                }
              });
            }
          }
        );
      });

      sessionRef.current.on("sessionDisconnected", () => {
        setIsConnected(false);
      });

      sessionRef.current.connect(token, (error) => {
        if (error) {
          toast.error("Error Connecting to Video Session");
          setIsLoading(false);
        }
      });
    } catch (error) {
      toast.error("Failed to Initialize Video Call");
      setIsLoading(false);
      console.error(error);
    }
  };

  const toggleVideo = () => {
    if (publisherRef.current) {
      publisherRef.current.publishVideo(!isVideoEnabled);
      setIsVideoEnabled((prev) => !prev);
    }
  };

  const toggleAudio = () => {
    if (publisherRef.current) {
      publisherRef.current.publishAudio(!isAudioEnabled);
      setIsAudioEnabled((prev) => !prev);
    }
  };

  const endCall = async () => {
    if (publisherRef.current) {
      try {
        publisherRef.current.destroy();
      } catch (e) {
        console.warn("Error Destroying Publisher:", e);
      }
      publisherRef.current = null;
    }

    if (sessionRef.current) {
      try {
        sessionRef.current.disconnect();
      } catch (e) {
        console.warn("Error Disconnecting Session:", e);
      }
      sessionRef.current = null;
    }

    if (joined.doctor && joined.patient) {
      await endAppointmentCall(sessionId);
    }
    router.push("/appointments");
  };

  const handleSaveNotes = async () => {
    setIsSavingNotes(true);
    try {
      const formData = new FormData();
      formData.append("appointmentId", appointmentId);
      formData.append("notes", notes);

      const res = await addAppointmentNotes(formData);
      if (res.success) {
        toast.success("Prescription and Clinical Notes Saved & Sent Successfully!");
      } else {
        toast.error("Failed to Save Prescription");
      }
    } catch (error) {
      console.error("Failed to save prescription notes:", error);
      toast.error("Error Saving Prescription: " + error.message);
    } finally {
      setIsSavingNotes(false);
    }
  };

  const handleFileUpload = async (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("appointmentId", appointmentId);

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();
      if (data.success) {
        toast.success("Prescription file uploaded successfully!");
        setAppointment((prev) => ({ ...prev, prescriptionUrl: data.url }));
      } else {
        toast.error(data.error || "Failed to upload file");
      }
    } catch (err) {
      console.error(err);
      toast.error("Upload error: " + err.message);
    } finally {
      setIsUploading(false);
    }
  };

  useEffect(() => {
    return () => {
      if (publisherRef.current) {
        try {
          publisherRef.current.destroy();
        } catch {}
      }
      if (sessionRef.current) {
        try {
          sessionRef.current.disconnect();
        } catch {}
      }
    };
  }, []);

  if (!sessionId || !token || !appId) {
    return (
      <div className="container mx-auto px-4 py-12 text-center">
        <h1 className="text-3xl font-bold text-white mb-4">Invalid Video Call</h1>
        <p className="text-muted-foreground mb-6">Missing Required Parameters for the Video Call.</p>
        <Button onClick={() => router.push("/appointments")} className="bg-emerald-600 hover:bg-emerald-700">
          Back to Appointments
        </Button>
      </div>
    );
  }

  return (
    <>
      <Script
        src="https://unpkg.com/@vonage/client-sdk-video@latest/dist/js/opentok.js"
        onLoad={handleScriptLoad}
        onError={() => {
          toast.error("Failed to Load Video Call Script");
          setIsLoading(false);
        }}
      />

      <div className="container mx-auto px-4 py-8">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-white mb-2">Video Consultation</h1>

          {/* Presence UI */}
          <div className="mb-4 flex justify-center gap-6">
            <div className="text-md text-white">
              <strong>Doctor:</strong>{" "}
              <span className={joined.doctor ? "text-emerald-400 font-semibold" : "text-muted-foreground"}>
                {joined.doctor ? "Joined" : "Not Joined"}
              </span>
            </div>
            <div className="text-md text-white">
              <strong>Patient:</strong>{" "}
              <span className={joined.patient ? "text-emerald-400 font-semibold" : "text-muted-foreground"}>
                {joined.patient ? "Joined" : "Not Joined"}
              </span>
            </div>
          </div>

          <p className="text-muted-foreground">
            {isConnected ? "Connected" : isLoading ? "Connecting..." : "Connection Failed"}
          </p>
        </div>

        {isLoading && !scriptLoaded ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-12 w-12 text-emerald-400 animate-spin mb-4" />
            <p className="text-white text-lg">Loading Video Call Components...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column: Video Area (2/3 width on desktop) */}
            <div className="lg:col-span-2 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Publisher (Your Video) */}
                <div className="border border-emerald-900/20 rounded-lg overflow-hidden bg-muted/5">
                  <div className="bg-emerald-900/10 px-3 py-2 text-emerald-400 text-sm font-medium">You</div>
                  <div className="w-full aspect-video">
                    <div id="publisher" className="w-full h-[300px] bg-muted/30">
                      {!scriptLoaded && (
                        <div className="flex items-center justify-center h-full">
                          <div className="bg-muted/20 rounded-full p-8">
                            <User className="h-12 w-12 text-emerald-400" />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Subscriber (Other Person's Video) */}
                <div className="border border-emerald-900/20 rounded-lg overflow-hidden bg-muted/5">
                  <div className="bg-emerald-900/10 px-3 py-2 text-emerald-400 text-sm font-medium">
                    {role === "DOCTOR" ? "Patient" : "Doctor"}
                  </div>
                  <div className="w-full aspect-video">
                    <div id="subscriber" className="w-full h-[300px] bg-muted/30">
                      {(!isConnected || !scriptLoaded) && (
                        <div className="flex items-center justify-center h-full">
                          <div className="bg-muted/20 rounded-full p-8">
                            <User className="h-12 w-12 text-emerald-400" />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Video Controls */}
              <div className="flex justify-center space-x-4">
                <Button
                  variant="outline"
                  size="lg"
                  onClick={toggleVideo}
                  className={`rounded-full p-4 h-14 w-14 ${
                    isVideoEnabled ? "border-emerald-900/30" : "bg-red-900/20 border-red-900/30 text-red-400"
                  }`}
                  disabled={!publisherRef.current}
                >
                  {isVideoEnabled ? <Video /> : <VideoOff />}
                </Button>

                <Button
                  variant="outline"
                  size="lg"
                  onClick={toggleAudio}
                  className={`rounded-full p-4 h-14 w-14 ${
                    isAudioEnabled ? "border-emerald-900/30" : "bg-red-900/20 border-red-900/30 text-red-400"
                  }`}
                  disabled={!publisherRef.current}
                >
                  {isAudioEnabled ? <Mic /> : <MicOff />}
                </Button>

                <Button variant="destructive" size="lg" onClick={endCall} className="rounded-full p-4 h-14 w-14 bg-red-600 hover:bg-red-700">
                  <PhoneOff />
                </Button>
              </div>

              <div className="text-center">
                <p className="text-muted-foreground text-sm">
                  {isVideoEnabled ? "Camera On" : "Camera Off"} • {isAudioEnabled ? "Microphone On" : "Microphone Off"}
                </p>
                <p className="text-muted-foreground text-sm mt-1">When You're Finished with Your Consultation, Click the Red Button to End the Call</p>
              </div>
            </div>

            {/* Right Column: Medical Context & Prescription Panel (1/3 width on desktop) */}
            <div className="border border-emerald-900/20 rounded-lg overflow-hidden bg-card/40 backdrop-blur-sm p-4 space-y-6 max-h-[80vh] overflow-y-auto">
              {role === "DOCTOR" ? (
                <>
                  {/* Doctor's panel: Patient Details and Prescription Form */}
                  <div>
                    <h2 className="text-lg font-bold text-white mb-3 border-b border-emerald-900/20 pb-2">Patient File</h2>
                    {appointment?.patient ? (
                      <div className="text-sm space-y-2 text-gray-300">
                        <p><strong>Name:</strong> {appointment.patient.name}</p>
                        <p><strong>Age/Gender:</strong> {appointment.patient.age || "N/A"} years • {appointment.patient.gender || "N/A"}</p>
                        <p><strong>Food Habit:</strong> {appointment.patient.food_habit || "N/A"}</p>
                        {appointment.patientDescription && (
                          <div className="mt-2 bg-emerald-950/20 border border-emerald-900/30 p-2.5 rounded text-xs">
                            <strong className="text-emerald-400 block mb-1">Symptoms/Description:</strong>
                            <span className="italic">{appointment.patientDescription}</span>
                          </div>
                        )}
                        <p className="border-t border-emerald-900/10 pt-2"><strong>Allergies:</strong> {appointment.patient.allergies || "None reported"}</p>
                        <p><strong>Medical History:</strong> {appointment.patient.medical_history || "None reported"}</p>
                        
                        <div className="grid grid-cols-2 gap-2 text-xs border-t border-emerald-900/10 pt-2">
                          <div>
                            <strong>Blood Pressure:</strong>
                            <p>{appointment.patient.bp_sys && appointment.patient.bp_dia ? `${appointment.patient.bp_sys}/${appointment.patient.bp_dia} mmHg` : "N/A"}</p>
                          </div>
                          <div>
                            <strong>Sugar (Fasting/PP):</strong>
                            <p>
                              {appointment.patient.sugar_fasting ? `${appointment.patient.sugar_fasting} mg/dL` : "N/A"} / {appointment.patient.sugar_pp ? `${appointment.patient.sugar_pp} mg/dL` : "N/A"}
                            </p>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">Loading patient details...</p>
                    )}
                  </div>

                  <div className="space-y-3 pt-2">
                    <h2 className="text-lg font-bold text-white border-b border-emerald-900/20 pb-2">Prescription & Notes</h2>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Type diagnostic details, recommendations, and prescription here..."
                      className="w-full h-[150px] bg-black/40 border border-emerald-900/20 rounded p-3 text-sm text-white focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 resize-none animate-none"
                    />
                    <Button
                      onClick={handleSaveNotes}
                      disabled={isSavingNotes}
                      className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-medium flex items-center justify-center gap-2 text-sm py-2"
                    >
                      {isSavingNotes ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        "Save & Send Prescription"
                      )}
                    </Button>

                    {/* Paper prescription upload */}
                    <div className="space-y-2 pt-3 border-t border-emerald-900/25">
                      <strong className="text-xs font-bold text-white block">Paper Prescription (PDF/Image)</strong>
                      {appointment?.prescriptionUrl ? (
                        <div className="space-y-2 bg-emerald-950/20 border border-emerald-900/30 p-2 rounded">
                          <p className="text-[11px] text-emerald-400 font-medium">Uploaded Prescription Available</p>
                          <div className="flex gap-2">
                            <a
                              href={appointment.prescriptionUrl}
                              download={`prescription-${appointmentId}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[11px] bg-emerald-900/50 hover:bg-emerald-800 border border-emerald-700/30 px-2 py-1 rounded text-white text-center font-medium block flex-1"
                            >
                              View / Download
                            </a>
                            <label className="text-[11px] bg-muted hover:bg-muted/80 px-2 py-1 rounded text-white text-center font-medium block cursor-pointer border border-emerald-900/10">
                              Change
                              <input
                                type="file"
                                accept="image/*,application/pdf"
                                className="hidden"
                                onChange={handleFileUpload}
                                disabled={isUploading}
                              />
                            </label>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <label className="flex flex-col items-center justify-center border border-dashed border-emerald-900/30 rounded p-3 cursor-pointer hover:bg-emerald-950/10">
                            {isUploading ? (
                              <>
                                <Loader2 className="h-4 w-4 text-emerald-400 animate-spin mb-1" />
                                <span className="text-[10px] text-muted-foreground">Uploading File...</span>
                              </>
                            ) : (
                              <>
                                <svg className="h-4 w-4 text-emerald-400 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                                </svg>
                                <span className="text-[11px] text-muted-foreground">Upload Paper Prescription</span>
                              </>
                            )}
                            <input
                              type="file"
                              accept="image/*,application/pdf"
                              className="hidden"
                              onChange={handleFileUpload}
                              disabled={isUploading}
                            />
                          </label>
                        </div>
                      )}
                    </div>
                  </div>
                </>
              ) : (
                <>
                  {/* Patient's panel: Consulting Doctor and Live Prescription Viewer */}
                  <div>
                    <h2 className="text-lg font-bold text-white mb-3 border-b border-emerald-900/20 pb-2">Consulting Doctor</h2>
                    {appointment?.doctor ? (
                      <div className="text-sm space-y-1 text-gray-300">
                        <p className="text-white font-semibold">Dr. {appointment.doctor.name}</p>
                        <p className="text-emerald-400 text-xs">{appointment.doctor.specialty}</p>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">Loading doctor details...</p>
                    )}
                  </div>

                  <div className="space-y-3 pt-2">
                    <h2 className="text-lg font-bold text-white border-b border-emerald-900/20 pb-2">Doctor's Prescription</h2>
                    <div className="w-full min-h-[150px] bg-black/40 border border-emerald-900/20 rounded p-3 text-sm text-white whitespace-pre-wrap overflow-y-auto">
                      {notes ? (
                        <p className="text-gray-100">{notes}</p>
                      ) : (
                        <p className="text-muted-foreground italic text-xs">
                          The doctor hasn't written any prescription or notes yet. They will appear here in real-time as the doctor updates them.
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Paper prescription download for patient */}
                  <div className="space-y-2 pt-3 border-t border-emerald-900/25">
                    <h2 className="text-lg font-bold text-white border-b border-emerald-900/20 pb-2">Paper Prescription</h2>
                    {appointment?.prescriptionUrl ? (
                      <div className="bg-emerald-950/20 border border-emerald-900/20 p-3 rounded text-center space-y-2">
                        <p className="text-xs text-emerald-400 font-medium">The doctor has uploaded a paper prescription for you.</p>
                        <a
                          href={appointment.prescriptionUrl}
                          download={`prescription-${appointmentId}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-1.5 px-3 rounded text-xs inline-block w-full"
                        >
                          Download Prescription
                        </a>
                      </div>
                    ) : (
                      <div className="bg-muted/10 border border-emerald-900/10 p-3 rounded text-center">
                        <p className="text-[11px] text-muted-foreground italic">No paper prescription uploaded by the doctor yet.</p>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
