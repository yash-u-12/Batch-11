"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { Html5QrcodeScanner } from "html5-qrcode";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/page-header";
import { Camera, AlertCircle } from "lucide-react";
import { toast } from "sonner";

export default function DoctorScannerPage() {
  const router = useRouter();
  const { isLoaded, isSignedIn } = useAuth();
  const [scannerInitialized, setScannerInitialized] = useState(false);

  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.push("/onboarding");
    }
  }, [isLoaded, isSignedIn, router]);

  useEffect(() => {
    let scanner = null;

    if (isSignedIn) {
      // Delay initialization slightly to ensure the reader container div is rendered
      const timer = setTimeout(() => {
        try {
          scanner = new Html5QrcodeScanner(
            "qr-reader-container",
            { 
              fps: 10, 
              qrbox: { width: 250, height: 250 },
              aspectRatio: 1.0,
            },
            /* verbose= */ false
          );

          const onScanSuccess = (decodedText) => {
            scanner.clear().then(() => {
              toast.success("QR Code scanned successfully!");
              
              // Handle full medicsync url scan or raw tokens
              if (decodedText.includes("/qr-access/")) {
                const tokenIndex = decodedText.indexOf("/qr-access/");
                const subPath = decodedText.substring(tokenIndex);
                router.push(subPath);
              } else {
                // If it's a raw token, route to qr-access
                router.push(`/qr-access/${decodedText}`);
              }
            }).catch(err => {
              console.error("Failed to clear scanner:", err);
            });
          };

          const onScanFailure = (error) => {
            // Quietly ignore failed frames (standard html5-qrcode behavior)
          };

          scanner.render(onScanSuccess, onScanFailure);
          setScannerInitialized(true);
        } catch (e) {
          console.error("Error starting QR scanner:", e);
          toast.error("Could not access camera for QR scanning.");
        }
      }, 500);

      return () => {
        clearTimeout(timer);
        if (scanner) {
          try {
            scanner.clear().catch(e => console.error("Error clearing scanner on unmount:", e));
          } catch (e) {
            // ignore
          }
        }
      };
    }
  }, [isSignedIn, router]);

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <PageHeader
        icon={<Camera />}
        title="Patient ID Card Scanner"
        backLink="/doctor"
        backLabel="Doctor Dashboard"
      />

      <div className="mt-6">
        <Card className="border-emerald-900/20 bg-muted/5 overflow-hidden">
          <CardHeader className="text-center">
            <CardTitle className="text-xl font-bold text-white flex items-center justify-center gap-2">
              <Camera className="h-5 w-5 text-emerald-400" />
              Scan Patient QR Code
            </CardTitle>
            <CardDescription>
              Scan a patient's MedicSync Health Card to request access or view their medical file.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center">
            {/* Camera feed reader element */}
            <div 
              id="qr-reader-container" 
              className="w-full max-w-md border border-emerald-900/20 rounded-xl overflow-hidden bg-background/50 p-2"
            />
            
            <div className="mt-6 flex items-start space-x-2 bg-emerald-950/20 border border-emerald-900/30 rounded-lg p-3 text-xs text-muted-foreground max-w-md">
              <AlertCircle className="h-4.5 w-4.5 text-emerald-400 shrink-0 mt-0.5" />
              <div className="space-y-1 text-left">
                <p className="font-semibold text-white">How it works:</p>
                <p>1. Grant permission to your camera device.</p>
                <p>2. Align the patient's card QR code inside the scanning box.</p>
                <p>3. If you are their verified MedicSync doctor, their records will open instantly.</p>
                <p>4. Other doctor roles can submit an access request to be approved by the patient.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
