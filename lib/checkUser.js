"use server";

import { currentUser } from "@clerk/nextjs/server";
import { db } from "@/lib/prisma";

function serializeUser(user) {
  if (!user) return null;

  return {
    ...user,
    sugar_fasting: user.sugar_fasting ? user.sugar_fasting.toNumber() : null,
    sugar_pp: user.sugar_pp ? user.sugar_pp.toNumber() : null,
  };
}

export const checkUser = async () => {
  try {
    const user = await currentUser();
    if (!user) return null;

    let loggedInUser = await db.user.findUnique({
      where: { clerkUserId: user.id },
      include: {
        transactions: { orderBy: { createdAt: "desc" } },
      },
    });

    if (!loggedInUser) {
      const name = `${user.firstName ?? ""} ${user.lastName ?? ""}`;

      loggedInUser = await db.user.create({
        data: {
          clerkUserId: user.id,
          name,
          imageUrl: user.imageUrl,
          email: user.emailAddresses[0].emailAddress,
          role: "UNASSIGNED",
        },
      });
    }
    return serializeUser(loggedInUser);
  } catch (error) {
    console.error("Error in Authentication Flow:", error);
    return null;
  }
};
