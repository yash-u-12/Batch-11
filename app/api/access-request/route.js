import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/prisma";

// GET: Patient retrieves their own incoming access requests
export async function GET(req) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await db.user.findUnique({
      where: { clerkUserId: userId },
    });

    if (!user || user.role !== "PATIENT") {
      return NextResponse.json({ error: "Patient record not found" }, { status: 404 });
    }

    const requests = await db.accessRequest.findMany({
      where: {
        patientId: user.id,
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ requests });
  } catch (error) {
    console.error("GET /api/access-request Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST: External doctor or family member requests access
export async function POST(req) {
  try {
    const { patientId, name, phone, reason } = await req.json();

    if (!patientId || !name || !phone || !reason) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const patient = await db.user.findUnique({
      where: { id: patientId },
    });

    if (!patient || patient.role !== "PATIENT") {
      return NextResponse.json({ error: "Patient profile not found" }, { status: 404 });
    }

    const request = await db.accessRequest.create({
      data: {
        patientId: patient.id,
        requesterName: name,
        requesterPhone: phone,
        requesterType: "EXTERNAL",
        reason: reason,
        status: "PENDING",
      },
    });

    return NextResponse.json({ success: true, request });
  } catch (error) {
    console.error("POST /api/access-request Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
