import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/prisma";

export async function GET(req, { params }) {
  try {
    const { token } = await params;

    // 1. Find patient by QR token
    const patient = await db.user.findUnique({
      where: { qrToken: token },
    });

    if (!patient || patient.role !== "PATIENT") {
      return NextResponse.json({ error: "Patient record not found" }, { status: 404 });
    }

    // 2. Check query param requestId for approved access request
    const url = new URL(req.url);
    const requestId = url.searchParams.get("requestId");

    if (requestId) {
      const accessRequest = await db.accessRequest.findUnique({
        where: { id: requestId },
      });

      if (
        accessRequest &&
        accessRequest.patientId === patient.id &&
        accessRequest.status === "APPROVED"
      ) {
        const timeSinceApproval = Date.now() - new Date(accessRequest.updatedAt).getTime();
        const fifteenMinutes = 15 * 60 * 1000;

        if (timeSinceApproval <= fifteenMinutes) {
          // Log approved access
          await db.accessLog.create({
            data: {
              patientId: patient.id,
              accessorName: accessRequest.requesterName || "Verified Requester",
              accessorRole: "EXTERNAL",
              accessType: "PATIENT_APPROVED_ACCESS",
            },
          });

          // Fetch patient records (medical history + appointments)
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
        }
      }
    }

    // 3. Check logged-in user
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({
        status: "ACCESS_REQUEST_REQUIRED",
        patient: {
          id: patient.id,
          name: patient.name,
          emergencyAccessEnabled: patient.emergencyAccessEnabled,
        },
      });
    }

    const currentUser = await db.user.findUnique({
      where: { clerkUserId: userId },
    });

    if (!currentUser) {
      return NextResponse.json({
        status: "ACCESS_REQUEST_REQUIRED",
        patient: {
          id: patient.id,
          name: patient.name,
          emergencyAccessEnabled: patient.emergencyAccessEnabled,
        },
      });
    }

    // 3. If doctor is verified
    if (currentUser.role === "DOCTOR" && currentUser.verificationStatus === "VERIFIED") {
      // Log direct access
      await db.accessLog.create({
        data: {
          patientId: patient.id,
          accessorName: currentUser.name || "MedicSync Doctor",
          accessorRole: "DOCTOR",
          accessType: "DIRECT_DOCTOR_ACCESS",
        },
      });

      // Fetch patient records (medical history + appointments)
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

      // Serialize decimals for safety
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
    }

    // Otherwise, require access request
    return NextResponse.json({
      status: "ACCESS_REQUEST_REQUIRED",
      patient: {
        id: patient.id,
        name: patient.name,
        emergencyAccessEnabled: patient.emergencyAccessEnabled,
      },
    });
  } catch (error) {
    console.error("GET /api/qr/:token Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
