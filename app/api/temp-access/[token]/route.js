import { NextResponse } from "next/server";
import { db } from "@/lib/prisma";

export async function GET(req, { params }) {
  try {
    const { token } = await params;

    // Find temporary access token
    const tempAccess = await db.temporaryAccess.findUnique({
      where: { accessToken: token },
    });

    if (!tempAccess) {
      return NextResponse.json({ error: "Access token is invalid or has been revoked" }, { status: 404 });
    }

    // Check if token has expired
    if (new Date() > new Date(tempAccess.expiresAt)) {
      return NextResponse.json({ error: "Access token has expired" }, { status: 410 });
    }

    // Log the access
    await db.accessLog.create({
      data: {
        patientId: tempAccess.patientId,
        accessorName: tempAccess.requesterName || "External Requester",
        accessorRole: "EXTERNAL",
        accessType: "PATIENT_APPROVED_ACCESS",
      },
    });

    // Fetch patient record
    const patient = await db.user.findUnique({
      where: { id: tempAccess.patientId },
    });

    if (!patient) {
      return NextResponse.json({ error: "Patient record not found" }, { status: 404 });
    }

    // Fetch appointments history
    const appointments = await db.appointment.findMany({
      where: { patientId: patient.id },
      include: {
        doctor: {
          select: {
            name: true,
            specialty: true,
          },
        },
      },
      orderBy: { startTime: "desc" },
    });

    const serializedPatient = {
      ...patient,
      sugar_fasting: patient.sugar_fasting ? Number(patient.sugar_fasting) : null,
      sugar_pp: patient.sugar_pp ? Number(patient.sugar_pp) : null,
    };

    return NextResponse.json({
      status: "AUTHORIZED",
      patient: serializedPatient,
      history: {
        appointments,
        medical_history: patient.medical_history || "",
        allergies: patient.allergies || "",
        surgery: patient.surgery || "",
        transfusion: patient.transfusion || "",
        accident: patient.accident || "",
      },
    });
  } catch (error) {
    console.error("GET /api/temp-access/:token Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
