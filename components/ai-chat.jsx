"use client";
import React, { useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Bot,
  SendIcon,
  User,
  Plus,
  Trash2,
  Sidebar,
  MessageCircle,
  Lock,
  CreditCard,
} from "lucide-react";
import { useRouter, useParams } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

export default function ChatUI() {
  const router = useRouter();
  const params = useParams();
  const endRef = useRef(null);

  const { userId } = useAuth();
  const [chatId, setChatId] = useState(params?.chatId || null);
  const [chats, setChats] = useState([]);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [userCredits, setUserCredits] = useState(0);
  const [showCreditDialog, setShowCreditDialog] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content:
        "Hello! I'm your MedSync AI Assistant. How Can I Help You With Your Medical Questions Today?",
    },
  ]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [unlockChat, setUnlockChat] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  useEffect(() => {
    if (userId) {
      fetchChats();
      fetchUserCredits();
      if (chatId) fetchMessages(chatId);
    }
  }, [userId, chatId]);

  async function fetchUserCredits() {
    try {
      const response = await fetch("/api/user/credits");
      const data = await response.json();
      if (data.credits !== undefined) {
        setUserCredits(data.credits);
      }
    } catch (error) {
      console.error("Error Fetching User Credits:", error);
    }
  }

  async function fetchChats() {
    try {
      const response = await fetch("/api/chat/history");
      const data = await response.json();
      if (data.chats) setChats(data.chats);
    } catch (error) {
      console.error("Error Fetching Chats:", error);
    }
  }

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function fetchMessages(id) {
    try {
      const response = await fetch(`/api/chat/messages?chatId=${id}`);
      const data = await response.json();
      if (data.messages && data.messages.length > 0) {
        setMessages(
          data.messages.map((msg) => ({
            role: msg.role.toLowerCase(),
            content: msg.content,
          }))
        );
      } else {
        setMessages([
          {
            role: "assistant",
            content:
              "Hello! I'm your MedSync AI Assistant. How Can I Help You With Your Medical Questions Today?",
          },
        ]);
      }
    } catch (error) {
      console.error("Error Fetching Messages:", error);
    }
  }

  function startNewChat() {
    if (userCredits < 500) {
      setShowCreditDialog(true);
      return;
    } else if (chatId) {
      router.push("/ai-assistant/chat");
    } else {
      deductCreditsAndStartChat();
    }
  }

  async function deductCreditsAndStartChat() {
    try {
      const response = await fetch("/api/chat/deduct-credits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: 500 }),
      });

      const data = await response.json();

      if (data.success) {
        setChatId(null);
        setMessages([
          {
            role: "assistant",
            content:
              "Hello! I'm your MedSync AI Assistant. How Can I Help You With Your Medical Questions Today?",
          },
        ]);
        setUnlockChat(true);
        router.push("/ai-assistant/chat");
        fetchUserCredits();
      } else {
        console.error("Failed to Deduct Credits:", data.error);
      }
    } catch (error) {
      console.error("Error Deducting Credits:", error);
    }
  }

  function switchChat(id) {
    setChatId(id);
    router.push(`/ai-assistant/${id}`);
    fetchMessages(id);
    setMobileSidebarOpen(false);
  }

  async function deleteChat(id, e) {
    e.stopPropagation();
    try {
      await fetch(`/api/chat/${id}`, { method: "DELETE" });
      fetchChats();
      if (chatId === id) startNewChat();
    } catch (error) {
      console.error("Error Deleting Chat:", error);
    }
  }

  async function sendMessage(e) {
    if (e) e.preventDefault();
    if (!text.trim() || loading) return;

    const userMsg = { role: "user", content: text };
    setMessages((m) => [...m, userMsg]);
    setText("");
    setLoading(true);

    try {
      const r = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          chatId: chatId,
          messageHistory: messages,
        }),
      });
      const json = await r.json();
      if (json.answer) {
        setMessages((m) => [...m, { role: "assistant", content: json.answer }]);
        if (json.chatId && !chatId) {
          setChatId(json.chatId);
          router.push(`/ai-assistant/${json.chatId}`);
          fetchChats();
        }
      } else {
        setMessages((m) => [
          ...m,
          { role: "assistant", content: json.error || "No Response" },
        ]);
      }
    } catch (err) {
      setMessages((m) => [
        ...m,
        { role: "assistant", content: `Error: ${err.message}` },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex h-[calc(100vh-6rem)] w-full mx-auto relative">
      {/* Desktop Sidebar */}
      <div
        className={`hidden md:flex ${
          sidebarOpen ? "w-64" : "w-16"
        } transition-all duration-300 bg-black border-r border-emerald-600/30 flex-col h-full`}
      >
        <SidebarContent
          chats={chats}
          sidebarOpen={sidebarOpen}
          chatId={chatId}
          startNewChat={startNewChat}
          switchChat={switchChat}
          deleteChat={deleteChat}
          userCredits={userCredits}
        />
      </div>

      {/* Mobile Sidebar Drawer */}
      <div
        className={`fixed inset-0 z-50 md:hidden transition-opacity duration-300 ${
          mobileSidebarOpen
            ? "opacity-100 pointer-events-auto"
            : "opacity-0 pointer-events-none"
        } bg-black/50`}
        onClick={() => setMobileSidebarOpen(false)}
      >
        <div
          className={`h-full w-64 bg-black border-r border-emerald-900/20 pt-4 transform transition-transform duration-300 ${
            mobileSidebarOpen ? "translate-x-0" : "-translate-x-full"
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          <SidebarContent
            chats={chats}
            sidebarOpen={true}
            chatId={chatId}
            startNewChat={startNewChat}
            switchChat={switchChat}
            deleteChat={deleteChat}
            userCredits={userCredits}
          />
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex flex-col flex-1">
        {/* Header */}
        <div className="flex items-center px-4 py-2.5 border-b border-emerald-900/20 justify-between">
          <div className="flex items-center">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                if (window.innerWidth < 768) setMobileSidebarOpen(true);
                else setSidebarOpen(!sidebarOpen);
              }}
              className="mr-2 text-emerald-400 hover:text-emerald-300"
            >
              <Sidebar
                className={`h-5 w-5 text-emerald-400 transition-transform ${
                  sidebarOpen ? "rotate-0" : "rotate-180"
                }`}
              />
            </Button>
            <h2 className="text-xl font-semibold text-white">
              AI Medical Assistant
            </h2>
          </div>
        </div>

        {/* Chat Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-muted/10">
          <div className="w-full space-y-4">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex ${
                  message.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={`flex max-w-[80%] ${
                    message.role === "user"
                      ? "bg-emerald-600 text-white"
                      : "bg-muted/20 border border-emerald-900/20 text-white"
                  } rounded-lg p-3`}
                >
                  <div className="flex-shrink-0 items-center flex">
                    {message.role === "user" ? (
                      <User className="h-4.5 w-4.5 mr-2" />
                    ) : (
                      <Bot className="h-5 w-5 text-emerald-400 mr-3" />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm">{message.content}</p>
                  </div>
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <div className="bg-muted/20 border border-emerald-900/20 text-white rounded-lg p-3">
                  <div className="flex items-center space-x-2">
                    <Bot className="h-5 w-5 text-emerald-400" />
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce delay-150"></div>
                      <div className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce delay-300"></div>
                    </div>
                  </div>
                </div>
              </div>
            )}
            <div ref={endRef} />
          </div>
        </div>

        {/* Input Area */}
        <form
          onSubmit={sendMessage}
          className="p-4 border-t border-emerald-900/20 bg-muted/10"
        >
          <div className="flex space-x-2">
            <Input
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={
                !unlockChat && !chatId
                  ? "Unlock Chat to Start"
                  : "Type Your Message..."
              }
              className="flex-1 bg-muted/20 border-emerald-900/20 text-white text-sm"
              disabled={loading || (!unlockChat && !chatId)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage();
                }
              }}
            />
            <Button
              type="submit"
              disabled={loading || text.trim() === ""}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              <SendIcon className="h-4 w-4" />
            </Button>
          </div>
        </form>
      </div>

      {/* Credit Dialog */}
      <Dialog open={showCreditDialog} onOpenChange={setShowCreditDialog}>
        <DialogContent className="bg-black border border-emerald-900/20 text-white">
          <DialogHeader>
            <DialogTitle className="text-xl">Insufficient Credits</DialogTitle>
            <DialogDescription className="text-gray-300">
              You Need 500 Credits to Start a New Chat. Please Purchase More
              Credits to Continue.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center justify-center p-4">
            <div className="text-center">
              <div className="text-5xl font-bold text-emerald-500 mb-2">
                500
              </div>
              <div className="text-sm text-gray-400">Credits Required</div>
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={() => router.push("/pricing")}
              className="bg-emerald-600 hover:bg-emerald-700 w-full"
            >
              Purchase Credits
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SidebarContent({
  chats,
  sidebarOpen,
  chatId,
  startNewChat,
  switchChat,
  deleteChat,
  userCredits,
}) {
  const hasEnoughCredits = userCredits >= 500;
  return (
    <>
      <div className="p-3 border-b border-emerald-900/20 flex justify-between items-center">
        {sidebarOpen && (
          <div className="flex items-center space-x-2">
            <h3 className="font-semibold text-white px-2">Chat History</h3>
            <div className="text-sm text-emerald-400 flex items-center">
              <CreditCard className="h-4 w-4 mr-1" />
              {userCredits}
            </div>
          </div>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={startNewChat}
          className={`${
            hasEnoughCredits
              ? "text-emerald-500 hover:text-emerald-300"
              : "text-gray-500"
          }`}
        >
          {hasEnoughCredits ? (
            <Plus className="h-5 w-5" />
          ) : (
            <Lock className="h-5 w-5" />
          )}
        </Button>
      </div>
      <div className="flex-1 overflow-y-auto">
        {chats.length === 0 ? (
          <div className="px-5 py-4 text-sm text-gray-400">
            {sidebarOpen ? "No Chat History" : ""}
          </div>
        ) : (
          <div className="space-y-2 p-2">
            {chats.map((chat) => (
              <div
                key={chat.id}
                onClick={() => switchChat(chat.id)}
                className={`group flex items-center ${
                  sidebarOpen
                    ? "justify-between px-3 py-0.5"
                    : "justify-center py-2"
                } rounded-md cursor-pointer hover:bg-emerald-900/20 ${
                  chatId === chat.id ? "bg-emerald-900/30" : ""
                }`}
              >
                <div
                  className={`flex items-center ${
                    sidebarOpen ? "space-x-2" : ""
                  } truncate`}
                >
                  <MessageCircle className="h-5 w-4 text-emerald-400 flex-shrink-0" />
                  {sidebarOpen && (
                    <span className="text-sm text-white truncate">
                      {chat.title}
                    </span>
                  )}
                </div>

                {sidebarOpen && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => deleteChat(chat.id, e)}
                    className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-400"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
