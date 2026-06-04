import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/prisma";

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

    const logs = await db.accessLog.findMany({
      where: {
        patientId: user.id,
      },
      orderBy: { timestamp: "desc" },
    });

    return NextResponse.json({ logs });
  } catch (error) {
    console.error("GET /api/access-logs Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
