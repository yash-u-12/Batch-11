"use server";

import { db } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import crypto from "crypto";

export async function setUserRole(formData) {
  const { userId } = await auth();

  if (!userId) {
    throw new Error("Unauthorized");
  }

  const user = await db.user.findUnique({
    where: { clerkUserId: userId },
  });

  if (!user) throw new Error("User Not Found in Database");

  const role = formData.get("role");

  if (!role || !["PATIENT", "DOCTOR"].includes(role)) {
    throw new Error("Invalid Role Selection");
  }

  try {
    if (role === "PATIENT") {
      const age = parseInt(formData.get("age"), 10);
      const gender = formData.get("gender");
      const address = formData.get("address");
      const allergies = formData.get("allergies") || null;
      const food_habit = formData.get("food_habit");
      const bp_sys = formData.get("bp_sys")
        ? parseInt(formData.get("bp_sys"), 10)
        : null;
      const bp_dia = formData.get("bp_dia")
        ? parseInt(formData.get("bp_dia"), 10)
        : null;
      const sugar_fasting = formData.get("sugar_fasting")
        ? parseFloat(formData.get("sugar_fasting"))
        : null;
      const sugar_pp = formData.get("sugar_pp")
        ? parseFloat(formData.get("sugar_pp"))
        : null;
      const surgery = formData.get("surgery") || null;
      const transfusion = formData.get("transfusion") || null;
      const accident = formData.get("accident") || null;
      const medical_history = formData.get("medical_history") || null;
      
      const bloodGroup = formData.get("bloodGroup") || null;
      const emergencyContact = formData.get("emergencyContact") || null;
      const qrToken = crypto.randomBytes(32).toString("hex");

      if (!age || !gender || !address || !food_habit) {
        throw new Error("Age, Gender, Address, and Food Habit are Required");
      }

      await db.user.update({
        where: {
          clerkUserId: userId,
        },
        data: {
          role: "PATIENT",
          age,
          gender,
          address,
          allergies,
          food_habit,
          bp_sys,
          bp_dia,
          sugar_fasting,
          sugar_pp,
          surgery,
          transfusion,
          accident,
          medical_history,
          bloodGroup,
          emergencyContact,
          qrToken,
          emergencyAccessEnabled: true,
        },
      });

      revalidatePath("/");
      return { success: true, redirect: "/doctors" };
    }

    if (role === "DOCTOR") {
      const specialty = formData.get("specialty");
      const experience = parseInt(formData.get("experience"), 10);
      const credentialUrl = formData.get("credentialUrl");
      const description = formData.get("description");

      if (!specialty || !experience || !credentialUrl || !description) {
        throw new Error("All Fields are Required");
      }

      await db.user.update({
        where: {
          clerkUserId: userId,
        },
        data: {
          role: "DOCTOR",
          specialty,
          experience,
          credentialUrl,
          description,
          verificationStatus: "VERIFIED", // Auto-verify doctor in development
        },
      });

      revalidatePath("/");
      return { success: true, redirect: "/doctor" };
    }
  } catch (error) {
    console.error("Failed to Set User Role:", error);
    throw new Error(`Failed to Update User Profile: ${error.message}`);
  }
}

export async function getCurrentUser() {
  const { userId } = await auth();

  if (!userId) {
    return null;
  }

  try {
    const user = await db.user.findUnique({
      where: {
        clerkUserId: userId,
      },
    });
    return user;
  } catch (error) {
    console.error("Failed to Get User Information:", error);
    return null;
  }
}
