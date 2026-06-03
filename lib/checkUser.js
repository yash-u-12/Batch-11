// Server helper utility

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
      const email = user.emailAddresses[0].emailAddress;

      // Check if a user already exists with the same email
      loggedInUser = await db.user.findUnique({
        where: { email },
        include: {
          transactions: { orderBy: { createdAt: "desc" } },
        },
      });

      const name = `${user.firstName ?? ""} ${user.lastName ?? ""}`;

      if (loggedInUser) {
        // Link the existing user by updating clerkUserId
        loggedInUser = await db.user.update({
          where: { email },
          data: {
            clerkUserId: user.id,
            name,
            imageUrl: user.imageUrl,
          },
          include: {
            transactions: { orderBy: { createdAt: "desc" } },
          },
        });
      } else {
        // Create new user
        loggedInUser = await db.user.create({
          data: {
            clerkUserId: user.id,
            name,
            imageUrl: user.imageUrl,
            email,
            role: "UNASSIGNED",
            credits: 5000, // Give 5000 credits initially so they can use the AI assistant and consult
          },
        });
      }
    }
    return serializeUser(loggedInUser);
  } catch (error) {
    console.error("Error in Authentication Flow:", error);
    return null;
  }
};
