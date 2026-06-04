import { NextResponse } from "next/server";
import { db } from "@/lib/prisma";

export async function GET(req, { params }) {
  try {
    const { token } = await params;

    const patient = await db.user.findUnique({
      where: { qrToken: token },
    });

    if (!patient || patient.role !== "PATIENT") {
      return NextResponse.json({ error: "Patient record not found" }, { status: 404 });
    }

    if (!patient.emergencyAccessEnabled) {
      return NextResponse.json({ error: "Emergency access is disabled by patient" }, { status: 403 });
    }

    // Log the emergency access
    await db.accessLog.create({
      data: {
        patientId: patient.id,
        accessorName: "First Responder / Public Scan",
        accessorRole: "EXTERNAL",
        accessType: "EMERGENCY_ACCESS",
      },
    });

    return NextResponse.json({
      name: patient.name,
      bloodGroup: patient.bloodGroup || "Not Specified",
      allergies: patient.allergies || "None Reported",
      emergencyContact: patient.emergencyContact || "Not Provided",
      age: patient.age || "N/A",
      gender: patient.gender || "N/A",
    });
  } catch (error) {
    console.error("GET /api/qr/emergency/:token Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
