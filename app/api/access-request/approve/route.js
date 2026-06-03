import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/prisma";
import crypto from "crypto";

export async function POST(req) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const patientUser = await db.user.findUnique({
      where: { clerkUserId: userId },
    });

    if (!patientUser || patientUser.role !== "PATIENT") {
      return NextResponse.json({ error: "Patient profile not found" }, { status: 404 });
    }

    const { requestId, action } = await req.json();

    if (!requestId || !action || !["APPROVE", "REJECT"].includes(action)) {
      return NextResponse.json({ error: "Invalid action or request ID" }, { status: 400 });
    }

    const accessRequest = await db.accessRequest.findUnique({
      where: { id: requestId },
    });

    if (!accessRequest || accessRequest.patientId !== patientUser.id) {
      return NextResponse.json({ error: "Request not found or access denied" }, { status: 404 });
    }

    if (action === "REJECT") {
      const updatedRequest = await db.accessRequest.update({
        where: { id: requestId },
        data: { status: "REJECTED" },
      });
      return NextResponse.json({ success: true, request: updatedRequest });
    }

    // Generate 15-minute temporary access
    const accessToken = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    const [updatedRequest, tempAccess] = await db.$transaction([
      db.accessRequest.update({
        where: { id: requestId },
        data: { status: "APPROVED" },
      }),
      db.temporaryAccess.create({
        data: {
          accessToken,
          patientId: patientUser.id,
          requesterName: accessRequest.requesterName,
          requesterPhone: accessRequest.requesterPhone,
          expiresAt,
        },
      }),
    ]);

    return NextResponse.json({
      success: true,
      request: updatedRequest,
      accessToken: tempAccess.accessToken,
      expiresAt: tempAccess.expiresAt,
    });
  } catch (error) {
    console.error("POST /api/access-request/approve Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
