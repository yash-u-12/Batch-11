import { NextResponse } from "next/server";
import { queryPinecone } from "@/lib/pinecone";
import { getEmbedding } from "@/lib/embeddings";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/prisma";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const PINECONE_INDEX = "medical-chatbot";
const PINECONE_TOP_K = 3;

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const model = genAI.getGenerativeModel({
  model: "gemini-2.0-flash",
});

export async function POST(req) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { message, chatId, messageHistory } = await req.json();
    const formattedHistory = messageHistory
      .map((m) => `${m.role === "user" ? "User" : "Assistant"}: ${m.content}`)
      .join("\n");

    if (!message) {
      return NextResponse.json(
        { error: "Missing `Message` in Body" },
        { status: 400 }
      );
    }

    const user = await db.user.findUnique({
      where: { clerkUserId: userId },
    });

    if (!user) {
      return NextResponse.json({ error: "User Not Found" }, { status: 404 });
    }

    const userDetails = {
      name: user.name || "",
      accident: user.accident || "",
      address: user.address || "",
      age: user.age || null,
      allergies: user.allergies || "",
      bp_dia: user.bp_dia || null,
      bp_sys: user.bp_sys || null,
      food_habit: user.food_habit || "",
      gender: user.gender || "",
      medical_history: user.medical_history || "",
      sugar_fasting: user.sugar_fasting || null,
      sugar_pp: user.sugar_pp || null,
      surgery: user.surgery || "",
      transfusion: user.transfusion || "",
    };

    const queryEmbedding = await getEmbedding(message);

    const hits = await queryPinecone(
      queryEmbedding,
      PINECONE_TOP_K,
      PINECONE_INDEX
    );

    const contexts = hits
      .map(
        (h, i) =>
          `Source ${i + 1}:\n${h.metadata?.text || h.metadata?.content || ""}`
      )
      .join("\n\n");

    const prompt = `You are a Smart and Compassionate Medical Assistant Designed to Help Users Understand their Symptoms.
    Before Suggesting any Possible Causes, Conditions, or Remedies, You Must Ask 1 Clear and Relevant Question at a Time to Understand the User's Symptoms Better. 
    Wait for the User's Response to Each Question Before Asking the Next One, Just Like a Doctor Having a Conversation. 
    Use ONLY the Provided Context and Conversation History to Suggest Possible Causes, Common Medicines and Remedies.
    If You Don't have Enough Information, Politely Let the User Know You Cannot Provide a Suggestion Yet and Ask Another Clarifying Question. 
    Ensure Your Response is Concise, Friendly, and Easy to Understand. Maintain a Conversational Tone Throughout.
    
    User Details:
    ${JSON.stringify(userDetails, null, 2)}

    Context:
    ${contexts}
    
    Conversation History:
    ${formattedHistory}
    
    User:
    ${message}
    
    Assistant:
    `;

    const result = await model.generateContent(prompt);
    const answer = result.response.text();

    let chat;
    if (chatId) {
      chat = await db.chat.findUnique({
        where: { id: chatId, userId: user.id },
      });

      if (!chat) {
        return NextResponse.json({ error: "Chat Not Found" }, { status: 404 });
      }

      await db.chat.update({
        where: { id: chatId },
        data: { updatedAt: new Date() },
      });
    } else {
      const title =
        message.length > 30 ? `${message.substring(0, 30)}...` : message;
      chat = await db.chat.create({
        data: {
          userId: user.id,
          title: title,
        },
      });

      await db.message.create({
        data: {
          chatId: chat.id,
          role: "ASSISTANT",
          content:
            "Hello! I'm your MedSync AI Assistant. How Can I Help You With Your Medical Questions Today?",
        },
      });
    }

    await db.message.create({
      data: {
        chatId: chat.id,
        role: "USER",
        content: message,
      },
    });

    await db.message.create({
      data: {
        chatId: chat.id,
        role: "ASSISTANT",
        content: answer?.trim() || "No Answer Returned from Gemini.",
      },
    });

    return NextResponse.json({
      answer: answer?.trim() || "No Answer Returned from Gemini.",
      chatId: chat.id,
    });
  } catch (err) {
    console.error("API /api/chat Error:", err);
    return NextResponse.json(
      { error: String(err.message || err) },
      { status: 500 }
    );
  }
}
