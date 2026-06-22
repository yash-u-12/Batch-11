import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/prisma";
import { generateToken, createQRCode } from "@/lib/qr";

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
      return NextResponse.json({ error: "Patient profile not found" }, { status: 404 });
    }

    let token = user.qrToken;

    // Auto-generate token if not set (for legacy users)
    if (!token) {
      token = generateToken();
      await db.user.update({
        where: { id: user.id },
        data: { qrToken: token },
      });
    }

    const url = new URL(req.url);
    const origin = url.origin;
    const qrCode = await createQRCode(token, origin);

    return NextResponse.json({
      qrCode,
      token,
      name: user.name || "Patient Profile",
      age: user.age || null,
      gender: user.gender || "",
      bloodGroup: user.bloodGroup || "",
      emergencyContact: user.emergencyContact || "",
      emergencyAccessEnabled: user.emergencyAccessEnabled,
    });
  } catch (error) {
    console.error("GET /api/patient/my-qr Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST endpoint to update emergency contact details and toggles
export async function POST(req) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await db.user.findUnique({
      where: { clerkUserId: userId },
    });

    if (!user || user.role !== "PATIENT") {
      return NextResponse.json({ error: "Patient profile not found" }, { status: 404 });
    }

    const { bloodGroup, emergencyContact, emergencyAccessEnabled } = await req.json();

    const updated = await db.user.update({
      where: { id: user.id },
      data: {
        bloodGroup: bloodGroup !== undefined ? bloodGroup : user.bloodGroup,
        emergencyContact: emergencyContact !== undefined ? emergencyContact : user.emergencyContact,
        emergencyAccessEnabled: emergencyAccessEnabled !== undefined ? emergencyAccessEnabled : user.emergencyAccessEnabled,
      },
    });

    return NextResponse.json({ success: true, user: updated });
  } catch (error) {
    console.error("POST /api/patient/my-qr Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
