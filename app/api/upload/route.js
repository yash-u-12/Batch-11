import { NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
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
    const originalName = file.name;
    const ext = path.extname(originalName) || ".pdf";
    const filename = `prescription-${appointmentId}-${Date.now()}${ext}`;

    // Ensure public/uploads directory exists
    const uploadDir = path.join(process.cwd(), "public", "uploads");
    await mkdir(uploadDir, { recursive: true });

    const filePath = path.join(uploadDir, filename);
    await writeFile(filePath, buffer);

    const publicUrl = `/uploads/${filename}`;

    // Update appointment in DB with prescriptionUrl
    await db.appointment.update({
      where: { id: appointmentId },
      data: { prescriptionUrl: publicUrl },
    });

    return NextResponse.json({ success: true, url: publicUrl });
  } catch (error) {
    console.error("Prescription upload error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to Upload Prescription" },
      { status: 500 }
    );
  }
}
