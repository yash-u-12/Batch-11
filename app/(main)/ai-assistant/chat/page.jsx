export const dynamic = "force-dynamic";

import React from "react";
import ChatUI from "@/components/ai-chat";
import { checkUser } from "@/lib/checkUser";
import { redirect } from "next/navigation";

export const metadata = {
  title: "AI Chat - MedSync AI",
  description: "Chat with Our AI Medical Assistant",
};

export default async function ChatPage() {
  const user = await checkUser();

  if (!user || user.role !== "PATIENT") {
    redirect("/");
  }

  return <ChatUI />;
}
