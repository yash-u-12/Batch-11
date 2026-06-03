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
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Play,
  Square,
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
  const [unlockChat, setUnlockChat] = useState(true);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const [language, setLanguage] = useState("en-US");
  const [isListening, setIsListening] = useState(false);
  const [autoSpeak, setAutoSpeak] = useState(false);
  const [currentlySpeakingIndex, setCurrentlySpeakingIndex] = useState(null);

  const recognitionRef = useRef(null);

  // Set up Speech Recognition (Speech-to-Text)
  useEffect(() => {
    if (typeof window !== "undefined") {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = language;

        recognition.onstart = () => {
          setIsListening(true);
        };

        recognition.onend = () => {
          setIsListening(false);
        };

        recognition.onerror = (event) => {
          console.error("Speech Recognition Error:", event.error);
          setIsListening(false);
        };

        recognition.onresult = (event) => {
          const transcript = event.results[0][0].transcript;
          if (transcript) {
            setText((prev) => prev ? prev + " " + transcript : transcript);
          }
        };

        recognitionRef.current = recognition;
      }
    }

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {
          // ignore
        }
      }
    };
  }, [language]);

  // Clean up Speech Synthesis on unmount
  useEffect(() => {
    return () => {
      if (typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // Speak last assistant message if autoSpeak is active
  useEffect(() => {
    if (messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      if (lastMessage.role === "assistant" && autoSpeak && !loading) {
        speakText(lastMessage.content, messages.length - 1);
      }
    }
  }, [messages, autoSpeak, loading]);

  const toggleListening = () => {
    if (!recognitionRef.current) {
      alert("Speech recognition is not supported in this browser. Please use Chrome, Edge, or Safari.");
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
    } else {
      try {
        recognitionRef.current.start();
      } catch (error) {
        console.error("Failed to start speech recognition:", error);
      }
    }
  };

  const speakText = (txt, index) => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;

    if (window.speechSynthesis.speaking && currentlySpeakingIndex === index) {
      window.speechSynthesis.cancel();
      setCurrentlySpeakingIndex(null);
      return;
    }

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(txt);
    utterance.lang = language;

    // Load voices and select preferred language voice
    const voices = window.speechSynthesis.getVoices();
    const langVoice = voices.find(v => v.lang.startsWith(language.split("-")[0]));
    if (langVoice) {
      utterance.voice = langVoice;
    }

    utterance.onend = () => {
      setCurrentlySpeakingIndex(null);
    };

    utterance.onerror = (event) => {
      console.error("Speech Synthesis Error:", event);
      setCurrentlySpeakingIndex(null);
    };

    setCurrentlySpeakingIndex(index);
    window.speechSynthesis.speak(utterance);
  };

  const stopSpeaking = () => {
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
      setCurrentlySpeakingIndex(null);
    }
  };

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

    // Stop speaking when user sends a new message
    stopSpeaking();

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
          language: language,
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

          <div className="flex items-center space-x-3">
            {/* Language Selector Segmented Control */}
            <div className="flex bg-muted/20 border border-emerald-900/25 rounded-lg p-0.5">
              <button
                type="button"
                onClick={() => {
                  stopSpeaking();
                  setLanguage("en-US");
                }}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-all duration-200 ${
                  language === "en-US"
                    ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/10"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                English
              </button>
              <button
                type="button"
                onClick={() => {
                  stopSpeaking();
                  setLanguage("te-IN");
                }}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-all duration-200 ${
                  language === "te-IN"
                    ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/10"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                తెలుగు
              </button>
            </div>

            {/* Auto Read Toggle */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                const nextState = !autoSpeak;
                setAutoSpeak(nextState);
                if (!nextState) {
                  stopSpeaking();
                }
              }}
              className={`h-9 w-9 rounded-lg border border-emerald-900/25 transition-all duration-200 ${
                autoSpeak
                  ? "bg-emerald-600/10 text-emerald-400 border-emerald-500/30"
                  : "text-gray-400 hover:text-emerald-400 hover:bg-muted/10"
              }`}
              title={autoSpeak ? "Auto-read enabled (Click to mute)" : "Auto-read disabled (Click to enable)"}
            >
              {autoSpeak ? (
                <Volume2 className="h-4.5 w-4.5 animate-pulse" />
              ) : (
                <VolumeX className="h-4.5 w-4.5" />
              )}
            </Button>
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
                  <div className="flex-1 flex flex-col">
                    <p className="text-sm">{message.content}</p>
                    {message.role === "assistant" && (
                      <div className="mt-2 flex justify-start">
                        <button
                          type="button"
                          onClick={() => speakText(message.content, index)}
                          className="flex items-center text-xs text-emerald-400/80 hover:text-emerald-300 transition-colors bg-emerald-950/20 border border-emerald-900/40 rounded px-1.5 py-0.5 space-x-1"
                        >
                          {currentlySpeakingIndex === index ? (
                            <>
                              <Square className="h-3 w-3 fill-emerald-400/50" />
                              <span>Stop</span>
                            </>
                          ) : (
                            <>
                              <Play className="h-3 w-3 fill-emerald-400/50" />
                              <span>Listen</span>
                            </>
                          )}
                        </button>
                      </div>
                    )}
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
          <div className="flex space-x-2 items-center">
            <Input
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={
                isListening
                  ? language === "te-IN"
                    ? "తెలుగులో మాట్లాడండి..."
                    : "Listening... Speak now..."
                  : language === "te-IN"
                  ? "మీ సందేశాన్ని ఇక్కడ టైప్ చేయండి..."
                  : "Type Your Message..."
              }
              className={`flex-1 bg-muted/20 border-emerald-900/20 text-white text-sm transition-all duration-200 ${
                isListening ? "border-red-500/50 ring-1 ring-red-500/20" : ""
              }`}
              disabled={loading}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage();
                }
              }}
            />
            
            {/* Microphone button */}
            <Button
              type="button"
              onClick={toggleListening}
              disabled={loading}
              className={`transition-all duration-300 ${
                isListening
                  ? "bg-red-600 hover:bg-red-700 text-white animate-pulse shadow-lg shadow-red-600/20"
                  : "bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-400 border border-emerald-900/30"
              }`}
              title={isListening ? "Stop listening" : "Start voice typing"}
            >
              {isListening ? (
                <MicOff className="h-4 w-4" />
              ) : (
                <Mic className="h-4 w-4" />
              )}
            </Button>

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
}) {
  return (
    <>
      <div className="p-3 border-b border-emerald-900/20 flex justify-between items-center">
        {sidebarOpen && (
          <div className="flex items-center space-x-2">
            <h3 className="font-semibold text-white px-2">Chat History</h3>
          </div>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={startNewChat}
          className="text-emerald-500 hover:text-emerald-300"
        >
          <Plus className="h-5 w-5" />
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
