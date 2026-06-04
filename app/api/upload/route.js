import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/prisma";

export async function POST(req) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get("file");
    const appointmentId = formData.get("appointmentId");

    if (!file || !appointmentId) {
      return NextResponse.json(
        { error: "File and Appointment ID are Required" },
        { status: 400 }
      );
    }

    // Verify user is a verified user
    const user = await db.user.findUnique({
      where: { clerkUserId: userId },
    });

    if (!user) {
      return NextResponse.json({ error: "User Not Found" }, { status: 404 });
    }

    const appointment = await db.appointment.findUnique({
      where: { id: appointmentId },
    });

    if (!appointment) {
      return NextResponse.json({ error: "Appointment Not Found" }, { status: 404 });
    }

    // Only the consulting doctor is allowed to upload the prescription file
    if (appointment.doctorId !== user.id) {
      return NextResponse.json(
        { error: "Only the Consulting Doctor Can Upload a Prescription File" },
        { status: 403 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const mimeType = file.type || "application/pdf";
    const base64Data = buffer.toString("base64");
    const dataUrl = `data:${mimeType};base64,${base64Data}`;

    // Update appointment in DB with prescriptionUrl
    await db.appointment.update({
      where: { id: appointmentId },
      data: { prescriptionUrl: dataUrl },
    });

    return NextResponse.json({ success: true, url: dataUrl });
  } catch (error) {
    console.error("Prescription upload error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to Upload Prescription" },
      { status: 500 }
    );
  }
}
