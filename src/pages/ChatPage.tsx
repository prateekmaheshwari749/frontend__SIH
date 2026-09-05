import { useState, useRef, useEffect } from 'react';
import {
  Send,
  Bot,
  User,
  Waves,
  Thermometer,
  Wind,
  AlertTriangle,
  RefreshCw,
  Trash2,
  ChevronDown,
  Layers,
} from 'lucide-react';
import { format } from 'date-fns';

import PageLayout from '../components/PageLayout';

import {
  sendChat,
  checkBackendConnection,
} from '../api/oceanApi';


// ============================================================
// TYPES
// ============================================================

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}


// ============================================================
// SUGGESTED QUESTIONS
// ============================================================

const SUGGESTIONS = [
  'Show me the current subsurface profile',
  'What is the Ocean Heat Content?',
  'Explain the Mixed Layer Depth',
  'How does the satellite embedding model work?',
  'What are the active alerts?',
  'Compare SST and SSH anomalies',
];


// ============================================================
// SIMPLE MARKDOWN RENDERER
// ============================================================

function renderContent(text: string) {
  return text
    .split('\n')
    .map((line, i, arr) => {
      const parts =
        line.split(/\*\*(.*?)\*\*/g);

      return (
        <span key={i}>
          {parts.map((part, j) =>
            j % 2 === 1 ? (
              <strong
                key={j}
                className="text-white font-semibold"
              >
                {part}
              </strong>
            ) : (
              part
            )
          )}

          {i < arr.length - 1 && <br />}
        </span>
      );
    });
}


// ============================================================
// PAGE
// ============================================================

export default function ChatPage() {
  const [messages, setMessages] =
    useState<Message[]>([
      {
        id: '0',
        role: 'assistant',
        content:
          "Hello! I'm **X AI**, your North Indian Ocean subsurface temperature intelligence assistant.\n\nAsk me about ocean conditions, subsurface temperature reconstruction, SST, SSS, SSH, OHC, MLD, thermocline, the ML model, or ARGO validation.\n\nAll answers in this chat are requested directly from the OceanBed backend.",
        timestamp: new Date(),
      },
    ]);

  const [input, setInput] =
    useState('');

  const [isTyping, setIsTyping] =
    useState(false);

  const [
    showSuggestions,
    setShowSuggestions,
  ] = useState(true);

  const [
    backendConnected,
    setBackendConnected,
  ] = useState<boolean | null>(null);

  const [
    backendError,
    setBackendError,
  ] = useState<string | null>(null);

  const bottomRef =
    useRef<HTMLDivElement>(null);


  // ==========================================================
  // BACKEND CONNECTION CHECK
  // ==========================================================

  useEffect(() => {
    let cancelled = false;

    async function checkBackend() {
      try {
        const result =
          await checkBackendConnection();

        if (cancelled) return;

        setBackendConnected(
          Boolean(result)
        );

        setBackendError(null);

        console.log(
          '[ChatPage] Backend connection:',
          result
        );
      } catch (error: any) {
        if (cancelled) return;

        setBackendConnected(false);

        setBackendError(
          error?.message ||
            'Backend unavailable'
        );

        console.error(
          '[ChatPage] Backend connection failed:',
          error
        );
      }
    }

    checkBackend();

    return () => {
      cancelled = true;
    };
  }, []);


  // ==========================================================
  // AUTO SCROLL
  // ==========================================================

  useEffect(() => {
    bottomRef.current?.scrollIntoView({
      behavior: 'smooth',
    });
  }, [messages, isTyping]);


  // ==========================================================
  // SEND MESSAGE TO REAL BACKEND
  // ==========================================================

  const sendMessage = async (
    text: string
  ) => {
    const cleanText =
      text.trim();

    if (
      !cleanText ||
      isTyping
    ) {
      return;
    }

    setShowSuggestions(false);

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: cleanText,
      timestamp: new Date(),
    };

    setMessages((prev) => [
      ...prev,
      userMsg,
    ]);

    setInput('');
    setIsTyping(true);


    try {
      console.log(
        '[ChatPage] Sending message to backend:',
        cleanText
      );

      /*
       * REAL BACKEND REQUEST
       *
       * POST /chat
       */
      const result =
        await sendChat(cleanText);

      console.log(
        '[ChatPage] Backend chat response:',
        result
      );

      setBackendConnected(true);
      setBackendError(null);

      const reply =
        result?.reply;

      if (
        !reply ||
        typeof reply !== 'string'
      ) {
        throw new Error(
          'Backend returned an empty or invalid chat response.'
        );
      }

      const assistantMsg: Message = {
        id:
          (
            Date.now() + 1
          ).toString(),
        role: 'assistant',
        content: reply,
        timestamp: new Date(),
      };

      setMessages((prev) => [
        ...prev,
        assistantMsg,
      ]);

    } catch (error: any) {
      console.error(
        '[ChatPage] Backend chat request failed:',
        error
      );

      setBackendConnected(false);

      const message =
        error?.message ||
        'Unable to reach the OceanBed backend.';

      setBackendError(message);

      /*
       * IMPORTANT:
       * NO LOCAL FALLBACK.
       *
       * We do not generate fake answers.
       */
      const errorMsg: Message = {
        id:
          (
            Date.now() + 1
          ).toString(),
        role: 'assistant',
        content:
          `**Backend unavailable.**\n\nI could not get a response from the OceanBed backend.\n\nError: ${message}\n\nPlease make sure the backend is running at:\nhttp://127.0.0.1:8000\n\nNo local or simulated answer was generated.`,
        timestamp: new Date(),
      };

      setMessages((prev) => [
        ...prev,
        errorMsg,
      ]);
    } finally {
      setIsTyping(false);
    }
  };


  // ==========================================================
  // KEYBOARD
  // ==========================================================

  const handleKeyDown = (
    e: React.KeyboardEvent
  ) => {
    if (
      e.key === 'Enter' &&
      !e.shiftKey
    ) {
      e.preventDefault();

      sendMessage(input);
    }
  };


  // ==========================================================
  // CLEAR CHAT
  // ==========================================================

  const clearChat = () => {
    setMessages([
      {
        id: '0',
        role: 'assistant',
        content:
          "Chat cleared.\n\nAsk me a question and I will send it directly to the OceanBed backend.",
        timestamp: new Date(),
      },
    ]);

    setShowSuggestions(true);
  };


  // ==========================================================
  // STATUS
  // ==========================================================

  const statusText =
    backendConnected === true
      ? 'Backend Connected'
      : backendConnected === false
        ? 'Backend Offline'
        : 'Checking Backend...';

  const statusClass =
    backendConnected === true
      ? 'bg-green-400'
      : backendConnected === false
        ? 'bg-red-400'
        : 'bg-yellow-400';


  // ==========================================================
  // RENDER
  // ==========================================================

  return (
    <PageLayout fullHeight>

      <div
        className="flex flex-col max-w-4xl mx-auto px-4 pb-4"
        style={{
          height:
            'calc(100vh - 64px)',
        }}
      >

        {/* ====================================================
            HEADER
        ==================================================== */}

        <div className="flex items-center justify-between py-5">

          <div className="flex items-center gap-3">

            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center glow-cyan">
              <Bot
                size={20}
                className="text-white"
              />
            </div>

            <div>

              <h1 className="font-bold text-white text-lg">
                X AI — Ocean Intelligence
              </h1>

              <div className="flex items-center gap-1.5">

                <span
                  className={`w-1.5 h-1.5 rounded-full ${statusClass} ${
                    backendConnected === true
                      ? 'animate-pulse'
                      : ''
                  }`}
                />

                <span className="text-xs text-white/40">
                  {statusText}
                </span>

              </div>

            </div>

          </div>


          <button
            onClick={clearChat}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg glass border border-white/10 text-white/50 hover:text-white hover:bg-white/10 text-sm transition-all"
          >
            <Trash2 size={13} />
            Clear
          </button>

        </div>


        {/* ====================================================
            BACKEND WARNING
        ==================================================== */}

        {backendConnected === false && (
          <div className="mb-3 glass rounded-xl border border-red-500/30 bg-red-500/5 px-4 py-3">

            <div className="flex items-start gap-2">

              <AlertTriangle
                size={14}
                className="text-red-400 mt-0.5 shrink-0"
              />

              <div>

                <p className="text-xs font-medium text-red-400">
                  OceanBed backend is offline
                </p>

                <p className="text-[11px] text-white/35 mt-1">
                  {backendError ||
                    'Unable to connect to http://127.0.0.1:8000'}
                </p>

              </div>

            </div>

          </div>
        )}


        {/* ====================================================
            MESSAGES
        ==================================================== */}

        <div className="flex-1 overflow-y-auto space-y-4 pr-1">

          {messages.map(
            (msg) => (
              <div
                key={msg.id}
                className={`flex gap-3 fade-in-up ${
                  msg.role === 'user'
                    ? 'flex-row-reverse'
                    : ''
                }`}
              >

                {/* AVATAR */}

                <div
                  className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-1 ${
                    msg.role === 'assistant'
                      ? 'bg-gradient-to-br from-cyan-400 to-blue-600'
                      : 'bg-gradient-to-br from-purple-500 to-pink-600'
                  }`}
                >
                  {msg.role ===
                  'assistant' ? (
                    <Waves
                      size={14}
                      className="text-white"
                    />
                  ) : (
                    <User
                      size={14}
                      className="text-white"
                    />
                  )}
                </div>


                {/* MESSAGE */}

                <div
                  className={`max-w-[80%] flex flex-col gap-1 ${
                    msg.role === 'user'
                      ? 'items-end'
                      : 'items-start'
                  }`}
                >

                  <div
                    className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                      msg.role === 'assistant'
                        ? 'glass border border-white/10 text-white/90 rounded-tl-sm'
                        : 'bg-gradient-to-br from-cyan-500/30 to-blue-600/30 border border-cyan-500/20 text-white rounded-tr-sm'
                    }`}
                  >
                    {renderContent(
                      msg.content
                    )}
                  </div>

                  <span className="text-xs text-white/25 px-1">
                    {format(
                      msg.timestamp,
                      'HH:mm'
                    )}
                  </span>

                </div>

              </div>
            )
          )}


          {/* ==================================================
              TYPING
          ================================================== */}

          {isTyping && (
            <div className="flex gap-3 fade-in-up">

              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center shrink-0 mt-1">
                <Waves
                  size={14}
                  className="text-white"
                />
              </div>

              <div className="glass border border-white/10 rounded-2xl rounded-tl-sm px-4 py-3">

                <div className="flex items-center gap-1">

                  {[0, 1, 2].map(
                    (i) => (
                      <span
                        key={i}
                        className="w-1.5 h-1.5 rounded-full bg-cyan-400"
                        style={{
                          animation:
                            `pulse 1.2s ease-in-out ${
                              i * 0.2
                            }s infinite`,
                        }}
                      />
                    )
                  )}

                </div>

              </div>

            </div>
          )}


          {/* ==================================================
              SUGGESTIONS
          ================================================== */}

          {showSuggestions &&
            messages.length === 1 && (
              <div className="space-y-3 py-4">

                <p className="text-xs text-white/30 flex items-center gap-1.5">
                  <ChevronDown
                    size={12}
                  />
                  Suggested questions
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">

                  {SUGGESTIONS.map(
                    (suggestion) => (
                      <button
                        key={
                          suggestion
                        }
                        onClick={() =>
                          sendMessage(
                            suggestion
                          )
                        }
                        disabled={
                          backendConnected ===
                          false
                        }
                        className="text-left px-4 py-3 rounded-xl glass border border-white/10 text-white/60 text-sm hover:text-white hover:border-cyan-500/30 hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                      >
                        {
                          suggestion
                        }
                      </button>
                    )
                  )}

                </div>

              </div>
            )}


          <div
            ref={
              bottomRef
            }
          />

        </div>


        {/* ====================================================
            INPUT
        ==================================================== */}

        <div className="pt-4">

          <div className="glass rounded-2xl border border-white/10 focus-within:border-cyan-500/40 transition-all p-3">

            <div className="flex items-end gap-3">

              <textarea
                value={input}
                onChange={(e) =>
                  setInput(
                    e.target.value
                  )
                }
                onKeyDown={
                  handleKeyDown
                }
                placeholder={
                  backendConnected ===
                  false
                    ? 'Backend unavailable...'
                    : 'Ask about subsurface temperature, SST, OHC, ARGO validation, ML embeddings...'
                }
                disabled={
                  backendConnected ===
                  false ||
                  isTyping
                }
                rows={1}
                className="flex-1 bg-transparent text-white text-sm placeholder-white/30 resize-none outline-none min-h-[36px] max-h-32 py-1.5 disabled:opacity-40"
                onInput={(e) => {
                  const t =
                    e.target as HTMLTextAreaElement;

                  t.style.height =
                    'auto';

                  t.style.height =
                    t.scrollHeight +
                    'px';
                }}
              />


              <div className="flex items-center gap-2 shrink-0">

                <span className="text-xs text-white/25 hidden sm:block">
                  ↵ send
                </span>

                <button
                  onClick={() =>
                    sendMessage(
                      input
                    )
                  }
                  disabled={
                    !input.trim() ||
                    isTyping ||
                    backendConnected ===
                      false
                  }
                  className="w-9 h-9 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 flex items-center justify-center text-white hover:opacity-90 disabled:opacity-40 transition-opacity shrink-0"
                >
                  {isTyping ? (
                    <RefreshCw
                      size={14}
                      className="animate-spin"
                    />
                  ) : (
                    <Send
                      size={14}
                    />
                  )}
                </button>

              </div>

            </div>

          </div>


          {/* ==================================================
              BACKEND INFO BAR
          ================================================== */}

          <div className="flex flex-wrap items-center justify-center gap-5 mt-3 text-xs">

            <span
              className={`flex items-center gap-1 ${
                backendConnected ===
                true
                  ? 'text-green-400'
                  : backendConnected ===
                      false
                    ? 'text-red-400'
                    : 'text-yellow-400'
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${statusClass}`}
              />

              {statusText}
            </span>

            <span className="flex items-center gap-1 text-white/25">
              <Layers
                size={11}
              />
              POST /chat
            </span>

            <span className="flex items-center gap-1 text-white/25">
              <Thermometer
                size={11}
              />
              OceanBed AI
            </span>

            <span className="flex items-center gap-1 text-white/25">
              <Wind
                size={11}
              />
              Live backend response
            </span>

          </div>

        </div>

      </div>

    </PageLayout>
  );
}