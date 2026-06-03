import { NextResponse } from "next/server";
import { queryPinecone } from "@/lib/pinecone";
import { getEmbedding } from "@/lib/embeddings";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/prisma";

const PINECONE_INDEX = "medical-chatbot";
const PINECONE_TOP_K = 3;


export async function POST(req) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { message, chatId, messageHistory, language } = await req.json();
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

    const langInstruction = language === "te-IN"
      ? "IMPORTANT: The user has selected Telugu. You MUST respond completely in Telugu using the Telugu script (తెలుగు లిపి). Even if the user details or context are in English, translate the necessary parts and converse naturally in Telugu."
      : "IMPORTANT: The user has selected English. You MUST respond in English.";

    const prompt = `You are a Smart and Compassionate Medical Assistant Designed to Help Users Understand their Symptoms.
    Before Suggesting any Possible Causes, Conditions, or Remedies, You Must Ask 1 Clear and Relevant Question at a Time to Understand the User's Symptoms Better. 
    Wait for the User's Response to Each Question Before Asking the Next One, Just Like a Doctor Having a Conversation. 
    Use ONLY the Provided Context and Conversation History to Suggest Possible Causes, Common Medicines and Remedies.
    If You Don't have Enough Information, Politely Let the User Know You Cannot Provide a Suggestion Yet and Ask Another Clarifying Question. 
    Ensure Your Response is Concise, Friendly, and Easy to Understand. Maintain a Conversational Tone Throughout.
    
    CRITICAL SAFETY GUARDRAIL: If the user's symptoms, question, or situation indicates a potential medical emergency (e.g., chest pain, difficulty breathing, high fever, severe bleeding, signs of stroke, etc.), or requires human/doctor intervention (such as prescription adjustments, complex diagnoses, or clinical decisions), you MUST immediately recommend booking an appointment with a real doctor or consulting healthcare professionals. Explicitly state that as an AI, you cannot provide definitive medical advice or replace a human doctor, and advise booking an appointment. Respond in the selected language (${language === "te-IN" ? "Telugu (తెలుగు లిపి)" : "English"}).
    
    ${langInstruction}
    
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

    let answer = "";

    if (process.env.OPENAI_API_KEY) {
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [{ role: "user", content: prompt }],
          temperature: 0.7,
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`OpenAI API Error: ${response.status} ${errText}`);
      }

      const data = await response.json();
      answer = data.choices?.[0]?.message?.content || "";
    } else if (process.env.GROQ_API_KEY) {
      const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
        },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages: [{ role: "user", content: prompt }],
          temperature: 0.7,
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Groq API Error: ${response.status} ${errText}`);
      }

      const data = await response.json();
      answer = data.choices?.[0]?.message?.content || "";
    } else if (process.env.OPENROUTER_API_KEY) {
      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
          "HTTP-Referer": "http://localhost:3000",
          "X-Title": "MedSync AI",
        },
        body: JSON.stringify({
          model: "meta-llama/llama-3-8b-instruct:free",
          messages: [{ role: "user", content: prompt }],
          temperature: 0.7,
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`OpenRouter API Error: ${response.status} ${errText}`);
      }

      const data = await response.json();
      answer = data.choices?.[0]?.message?.content || "";
    } else {
      // Fallback to Gemini
      const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
      const model = genAI.getGenerativeModel({
        model: "gemini-2.0-flash",
      });
      const result = await model.generateContent(prompt);
      answer = result.response.text();
    }

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
