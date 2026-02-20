import { useState, useRef, useEffect, useCallback, useMemo, memo, lazy, Suspense } from "react";
import { useAuth } from "../../context/AuthContext";
import { sendChatMessage } from "../../services/chatService";
import { collection, getDocs, query, where, orderBy, limit } from "firebase/firestore";
import { db } from "../../config/firebase";
import { motion, AnimatePresence } from "framer-motion";

const ReactMarkdown = lazy(() => import("react-markdown"));

const MAX_MESSAGES = 50;
const STATS_CACHE_KEY = "ai_chat_stats";
const STATS_CACHE_TTL = 10 * 60 * 1000;

// ─── Sanitizers ───
const sanitizeInput = (str) =>
  str.replace(/<[^>]*>/g, "").replace(/[^\S\r\n]+/g, " ").trim().slice(0, 1000);

const sanitizeMarkdown = (md) =>
  (md || "")
    .replace(/!\[.*?\]\(.*?\)/g, "")
    .replace(/\[([^\]]*)\]\(javascript:[^)]*\)/gi, "$1")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<iframe[\s\S]*?<\/iframe>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<video[\s\S]*?(<\/video>|\/?>)/gi, "")
    .replace(/<audio[\s\S]*?(<\/audio>|\/?>)/gi, "")
    .replace(/<embed[\s\S]*?\/?>|<object[\s\S]*?(<\/object>|\/?>)/gi, "")
    .replace(/<source[\s\S]*?\/?>|<picture[\s\S]*?(<\/picture>|\/?>)/gi, "")
    .replace(/<img[\s\S]*?\/?>|<canvas[\s\S]*?(<\/canvas>|\/?>)/gi, "")
    .replace(/\[.*?\]\(data:[^)]*\)/gi, "");

// ─── Icons ───
const AiIcon = ({ size = 24, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
    <path d="M12 2L13.09 8.26L18 6L14.74 10.91L21 12L14.74 13.09L18 18L13.09 15.74L12 22L10.91 15.74L6 18L9.26 13.09L3 12L9.26 10.91L6 6L10.91 8.26L12 2Z" fill="currentColor" opacity="0.9" />
    <path d="M19 2L19.5 3.5L21 4L19.5 4.5L19 6L18.5 4.5L17 4L18.5 3.5L19 2Z" fill="currentColor" opacity="0.6" />
  </svg>
);

const SendIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
    <line x1="22" y1="2" x2="11" y2="13" />
    <polygon points="22 2 15 22 11 13 2 9 22 2" />
  </svg>
);

const MicIcon = ({ active }) => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" fill={active ? "currentColor" : "none"} />
    <path d="M19 10v2a7 7 0 01-14 0v-2" />
    <line x1="12" y1="19" x2="12" y2="23" />
    <line x1="8" y1="23" x2="16" y2="23" />
  </svg>
);

// ─── Typing indicator with 3D avatar ───
const TypingIndicator = memo(() => (
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    className="flex items-start gap-2"
  >
    <motion.div
      className="w-6 h-6 rounded-full bg-gradient-to-br from-violet-500 to-blue-500 flex items-center justify-center flex-shrink-0 mt-0.5 shadow-md shadow-violet-500/30"
      animate={{ rotateY: [0, 360] }}
      transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
      style={{ transformStyle: "preserve-3d" }}
    >
      <AiIcon size={14} className="text-white" />
    </motion.div>
    <div className="bg-gray-100 dark:bg-gray-700/80 px-4 py-3 rounded-2xl rounded-tl-md shadow-sm">
      <div className="flex gap-1.5 items-center h-4">
        {[0, 150, 300].map((d) => (
          <motion.span
            key={d}
            className="w-1.5 h-1.5 bg-gray-400 dark:bg-gray-500 rounded-full"
            animate={{ y: [0, -6, 0], scale: [1, 1.3, 1] }}
            transition={{ duration: 0.6, repeat: Infinity, delay: d / 1000 }}
          />
        ))}
      </div>
    </div>
  </motion.div>
));
TypingIndicator.displayName = "TypingIndicator";

const formatTime = (ts) => {
  if (!ts) return "";
  return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
};

// ─── 3D Chat message bubble ───
const ChatMessage = memo(({ msg, index, onEdit, loading, listening, toggleListening, hasStt }) => {
  const [copied, setCopied] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(msg.content);
  const [showMenu, setShowMenu] = useState(false);
  const editRef = useRef(null);
  const menuRef = useRef(null);

  const handleCopy = useCallback(() => {
    const text = msg.content;
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(text).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }).catch(() => {
        // Fallback for insecure contexts
        const ta = document.createElement("textarea");
        ta.value = text;
        ta.style.cssText = "position:fixed;opacity:0";
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      });
    } else {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.cssText = "position:fixed;opacity:0";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
    setShowMenu(false);
  }, [msg.content]);

  const [speaking, setSpeaking] = useState(false);
  const [speakWordIdx, setSpeakWordIdx] = useState(-1);
  const speakRef = useRef({ words: [], cancelled: false, timer: null, active: false });

  const stopSpeaking = useCallback(() => {
    const s = speakRef.current;
    s.cancelled = true;
    s.active = false;
    if (s.timer) { clearTimeout(s.timer); s.timer = null; }
    window.speechSynthesis?.cancel();
    setSpeaking(false);
    setSpeakWordIdx(-1);
  }, []);

  const getBestVoice = useCallback(() => {
    const v = window.speechSynthesis.getVoices();
    const ranked = ["Google UK English Female", "Google UK English Male", "Google US English", "Microsoft Jenny Online", "Microsoft Aria Online", "Microsoft Jenny", "Microsoft Zira", "Samantha", "Karen", "Daniel", "Tessa", "Moira"];
    for (const name of ranked) { const found = v.find((x) => x.name.includes(name)); if (found) return found; }
    return v.find((x) => x.lang.startsWith("en") && !x.localService) || v.find((x) => x.lang.startsWith("en")) || null;
  }, []);

  const handleSpeak = useCallback(() => {
    if (!window.speechSynthesis) return;
    if (speakRef.current.active) { stopSpeaking(); return; }

    const text = msg.content.replace(/[#*_~`>|]/g, "").replace(/\[([^\]]*)\]\([^)]*\)/g, "$1").trim();
    const words = text.match(/\S+/g);
    if (!words || !words.length) return;

    const s = speakRef.current;
    s.words = words;
    s.cancelled = false;
    s.active = true;
    setSpeaking(true);
    setSpeakWordIdx(0);

    // Split into sentences for clearer speech and better sync
    const sentences = text.match(/[^.!?\n]+[.!?\n]*/g) || [text];
    let globalWordIdx = 0;

    const speakSentence = (si) => {
      if (s.cancelled || si >= sentences.length) {
        if (!s.cancelled) { s.active = false; setSpeaking(false); setSpeakWordIdx(-1); }
        return;
      }
      const chunk = sentences[si].trim();
      if (!chunk) { speakSentence(si + 1); return; }
      const chunkWords = chunk.match(/\S+/g) || [];
      const startIdx = globalWordIdx;

      const utt = new SpeechSynthesisUtterance(chunk);
      utt.rate = 0.92;
      utt.pitch = 1.0;
      utt.volume = 1.0;
      const voice = getBestVoice();
      if (voice) utt.voice = voice;

      const totalChars = chunkWords.reduce((a, w) => a + w.length, 0);
      const msPerChar = totalChars > 0 ? ((chunkWords.length * 430) / totalChars) : 80;
      let li = 0;

      const step = () => {
        if (s.cancelled || li >= chunkWords.length) return;
        setSpeakWordIdx(startIdx + li);
        const d = Math.max(130, chunkWords[li].length * msPerChar);
        li++;
        s.timer = setTimeout(step, d);
      };

      utt.onstart = () => { li = 0; step(); };
      utt.onend = () => {
        if (s.timer) clearTimeout(s.timer);
        globalWordIdx += chunkWords.length;
        if (!s.cancelled) s.timer = setTimeout(() => speakSentence(si + 1), 60);
      };
      utt.onerror = () => {
        if (s.timer) clearTimeout(s.timer);
        s.active = false; setSpeaking(false); setSpeakWordIdx(-1);
      };
      window.speechSynthesis.speak(utt);
    };

    const voices = window.speechSynthesis.getVoices();
    if (voices.length) { speakSentence(0); }
    else { window.speechSynthesis.onvoiceschanged = () => { window.speechSynthesis.onvoiceschanged = null; speakSentence(0); }; }
  }, [msg.content, stopSpeaking, getBestVoice]);

  useEffect(() => {
    return () => stopSpeaking();
  }, [stopSpeaking]);

  const highlightedParts = useMemo(() => {
    if (!speaking || speakWordIdx < 0) return null;
    const wd = speakRef.current.words;
    if (!wd.length) return null;
    return {
      before: wd.slice(0, speakWordIdx).join(" ") + (speakWordIdx > 0 ? " " : ""),
      word: wd[speakWordIdx] || "",
      after: (speakWordIdx < wd.length - 1 ? " " : "") + wd.slice(speakWordIdx + 1).join(" "),
    };
  }, [speaking, speakWordIdx]);

  const [speakElapsed, setSpeakElapsed] = useState(0);
  const elapsedRef = useRef(null);

  // Elapsed timer while speaking
  useEffect(() => {
    if (speaking) {
      setSpeakElapsed(0);
      elapsedRef.current = setInterval(() => setSpeakElapsed((p) => p + 1), 1000);
    } else {
      clearInterval(elapsedRef.current);
      setSpeakElapsed(0);
    }
    return () => clearInterval(elapsedRef.current);
  }, [speaking]);

  const handleSelectText = useCallback(() => {
    const sel = window.getSelection();
    const range = document.createRange();
    const bubble = menuRef.current?.parentElement?.querySelector("[data-bubble]");
    if (bubble) { range.selectNodeContents(bubble); sel.removeAllRanges(); sel.addRange(range); }
    setShowMenu(false);
  }, []);

  useEffect(() => {
    if (editing && editRef.current) {
      editRef.current.focus();
      editRef.current.style.height = "auto";
      editRef.current.style.height = editRef.current.scrollHeight + "px";
    }
  }, [editing]);

  // Close mobile menu on outside tap
  useEffect(() => {
    if (!showMenu) return;
    const close = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setShowMenu(false); };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [showMenu]);

  const submitEdit = useCallback(() => {
    const trimmed = editText.trim();
    if (!trimmed || trimmed === msg.content) { setEditing(false); return; }
    onEdit(index, trimmed);
    setEditing(false);
    setShowMenu(false);
  }, [editText, msg.content, onEdit, index]);

  if (msg.role === "user") {
    return (
      <motion.div
        initial={{ opacity: 0, x: 30, rotateY: -15 }}
        animate={{ opacity: 1, x: 0, rotateY: 0 }}
        transition={{ type: "spring", stiffness: 200, damping: 20 }}
        className="flex flex-col items-end gap-0.5 group/user"
        style={{ perspective: "600px" }}
      >
        {editing ? (
          <motion.div
            initial={{ scale: 0.97, opacity: 0.8 }}
            animate={{ scale: 1, opacity: 1 }}
            className="max-w-[85%] w-full flex flex-col gap-1.5"
          >
            <textarea
              ref={editRef}
              value={editText}
              onChange={(e) => {
                setEditText(e.target.value.slice(0, 1000));
                e.target.style.height = "auto";
                e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px";
              }}
              onKeyDown={(e) => {
                const isMobile = window.innerWidth < 768;
                if (e.key === "Enter" && e.altKey) {
                  e.preventDefault();
                  const ta = e.target;
                  const start = ta.selectionStart;
                  const end = ta.selectionEnd;
                  const newVal = editText.slice(0, start) + "\n" + editText.slice(end);
                  setEditText(newVal.slice(0, 1000));
                  requestAnimationFrame(() => { ta.selectionStart = ta.selectionEnd = start + 1; ta.style.height = "auto"; ta.style.height = Math.min(ta.scrollHeight, 120) + "px"; });
                  return;
                }
                if (e.key === "Enter" && !e.shiftKey && !isMobile) { e.preventDefault(); submitEdit(); }
                if (e.key === "Escape") { setEditing(false); setEditText(msg.content); }
              }}
              className="w-full resize-none border border-blue-400 dark:border-blue-500 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 px-3 py-2 text-sm rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/40 max-h-[120px]"
              aria-label="Edit message"
            />
            <div className="flex justify-end gap-1.5">
              {hasStt && (
                <button
                  onClick={() => toggleListening(setEditText, () => editText)}
                  className={`px-2 py-1 text-xs rounded-lg transition-colors ${listening ? "text-red-500 bg-red-50 dark:bg-red-900/30 animate-pulse" : "text-gray-400 bg-gray-100 dark:bg-gray-700 hover:text-violet-500"}`}
                  aria-label={listening ? "Stop recording" : "Voice input"}
                  title={listening ? "Stop" : "Voice"}
                >
                  <MicIcon active={listening} />
                </button>
              )}
              <button
                onClick={() => { setEditing(false); setEditText(msg.content); }}
                className="px-2.5 py-1 text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={submitEdit}
                disabled={!editText.trim() || editText.trim() === msg.content}
                className="px-2.5 py-1 text-xs text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Send
              </button>
            </div>
          </motion.div>
        ) : (
          <>
            <motion.div
              className="relative max-w-[80%] px-3.5 py-2.5 bg-gradient-to-br from-blue-600 to-indigo-600 text-white rounded-2xl rounded-br-md text-sm shadow-lg shadow-blue-600/20 md:cursor-default cursor-pointer"
              whileHover={{ scale: 1.02, rotateY: 2 }}
              style={{ transformStyle: "preserve-3d" }}
              onClick={() => { if (window.innerWidth < 768 && !loading) setShowMenu((p) => !p); }}
              onContextMenu={(e) => { if (window.innerWidth < 768 && !loading) { e.preventDefault(); setShowMenu((p) => !p); } }}
            >
              <p data-bubble className="whitespace-pre-wrap leading-relaxed break-words select-text" style={{ transform: "translateZ(4px)" }}>{msg.content}</p>
            </motion.div>

            {/* Desktop: icon row on hover */}
            {!loading && (
              <div className="hidden md:flex items-center gap-1 px-1 opacity-0 group-hover/user:opacity-100 transition-opacity">
                {msg.timestamp && <span className="text-[10px] text-gray-400 dark:text-gray-600 select-none mr-1">{formatTime(msg.timestamp)}</span>}
                <button onClick={handleCopy} className="p-1 text-gray-400 hover:text-blue-500 dark:hover:text-blue-400 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors" title={copied ? "Copied" : "Copy"} aria-label="Copy message">
                  {copied
                    ? <svg className="w-3.5 h-3.5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                    : <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                  }
                </button>
                <button onClick={() => { setEditText(msg.content); setEditing(true); }} className="p-1 text-gray-400 hover:text-blue-500 dark:hover:text-blue-400 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors" title="Edit" aria-label="Edit message">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                </button>
                <button onClick={handleSelectText} className="p-1 text-gray-400 hover:text-blue-500 dark:hover:text-blue-400 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors" title="Select text" aria-label="Select text">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" /></svg>
                </button>
              </div>
            )}

            {/* Mobile: dropdown menu on tap */}
            <AnimatePresence>
              {showMenu && (
                <motion.div
                  ref={menuRef}
                  initial={{ opacity: 0, scale: 0.9, y: -4 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9, y: -4 }}
                  transition={{ duration: 0.15 }}
                  className="md:hidden mt-1 mr-1 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden z-20"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button onClick={handleCopy} className="flex items-center gap-2.5 w-full px-3.5 py-2.5 text-sm text-gray-700 dark:text-gray-200 active:bg-gray-100 dark:active:bg-gray-700 transition-colors">
                    {copied
                      ? <svg className="w-4 h-4 text-green-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                      : <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                    }
                    <span>{copied ? "Copied" : "Copy"}</span>
                  </button>
                  <button onClick={() => { setEditText(msg.content); setEditing(true); setShowMenu(false); }} className="flex items-center gap-2.5 w-full px-3.5 py-2.5 text-sm text-gray-700 dark:text-gray-200 active:bg-gray-100 dark:active:bg-gray-700 transition-colors border-t border-gray-100 dark:border-gray-700">
                    <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                    <span>Edit message</span>
                  </button>
                  <button onClick={handleSelectText} className="flex items-center gap-2.5 w-full px-3.5 py-2.5 text-sm text-gray-700 dark:text-gray-200 active:bg-gray-100 dark:active:bg-gray-700 transition-colors border-t border-gray-100 dark:border-gray-700">
                    <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" /></svg>
                    <span>Select text</span>
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Timestamp on mobile (always visible) */}
            {msg.timestamp && <span className="md:hidden text-[10px] text-gray-400 dark:text-gray-600 px-1 select-none">{formatTime(msg.timestamp)}</span>}
          </>
        )}
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: -30, rotateY: 15 }}
      animate={{ opacity: 1, x: 0, rotateY: 0 }}
      transition={{ type: "spring", stiffness: 200, damping: 20 }}
      className="flex items-start gap-2 group/msg"
      style={{ perspective: "600px" }}
    >
      <motion.div
        className="w-6 h-6 rounded-full bg-gradient-to-br from-violet-500 to-blue-500 flex items-center justify-center flex-shrink-0 mt-0.5 shadow-md shadow-violet-500/25"
        initial={{ scale: 0, rotateZ: -90 }}
        animate={{ scale: 1, rotateZ: 0 }}
        transition={{ type: "spring", stiffness: 300, delay: 0.1 }}
      >
        <AiIcon size={14} className="text-white" />
      </motion.div>
      <div className="flex flex-col gap-0.5 max-w-[80%]">
        <motion.div
          className="relative px-3.5 py-2.5 bg-gray-100 dark:bg-gray-700/80 text-gray-800 dark:text-gray-200 rounded-2xl rounded-tl-md text-sm shadow-sm"
          whileHover={{ scale: 1.01, rotateY: -1 }}
          style={{ transformStyle: "preserve-3d" }}
        >
          {speaking && highlightedParts ? (
            <p className="whitespace-pre-wrap leading-relaxed break-words text-sm">
              <span className="text-gray-500 dark:text-gray-400">{highlightedParts.before}</span>
              <span className="bg-violet-200 dark:bg-violet-700 text-violet-900 dark:text-white rounded px-0.5">{highlightedParts.word}</span>
              <span>{highlightedParts.after}</span>
            </p>
          ) : (
            <Suspense fallback={<p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>}>
              <div className="prose prose-sm dark:prose-invert max-w-none leading-relaxed [&>p]:m-0 [&>p+p]:mt-2 [&>ul]:my-1.5 [&>ol]:my-1.5 [&>li]:my-0.5 [&>pre]:my-2 [&>pre]:rounded-lg [&>pre]:text-xs [&>code]:text-xs [&>code]:bg-gray-200 [&>code]:dark:bg-gray-600 [&>code]:px-1 [&>code]:py-0.5 [&>code]:rounded [&>a]:text-blue-600 [&>a]:dark:text-blue-400 [&>a]:underline">
                <ReactMarkdown allowedElements={["p", "span", "strong", "em", "del", "br", "ul", "ol", "li", "h1", "h2", "h3", "h4", "h5", "h6", "blockquote", "pre", "code", "a", "hr", "table", "thead", "tbody", "tr", "th", "td", "sup", "sub"]} unwrapDisallowed>{sanitizeMarkdown(msg.content)}</ReactMarkdown>
              </div>
            </Suspense>
          )}
        </motion.div>
        <div className="flex items-center gap-1 px-1 mt-0.5">
          {msg.timestamp && <span className="text-[10px] text-gray-400 dark:text-gray-600 select-none">{formatTime(msg.timestamp)}</span>}
          {msg.elapsed && !speaking && <span className="text-[10px] text-gray-400 dark:text-gray-500 select-none">· {msg.elapsed}s</span>}
          {speaking && <span className="text-[10px] text-violet-500 dark:text-violet-400 select-none font-medium">{Math.floor(speakElapsed / 60)}:{String(speakElapsed % 60).padStart(2, "0")}</span>}
          <span className="mr-auto" />
          <button
            onClick={handleCopy}
            className="p-1 text-gray-400 hover:text-blue-500 dark:hover:text-blue-400 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            aria-label="Copy response"
            title={copied ? "Copied" : "Copy"}
          >
            {copied
              ? <svg className="w-3.5 h-3.5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
              : <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
            }
          </button>
          <button
            onClick={handleSpeak}
            className={`p-1 rounded-md transition-colors ${speaking ? "text-violet-500 bg-violet-50 dark:bg-violet-900/30" : "text-gray-400 hover:text-violet-500 dark:hover:text-violet-400 hover:bg-gray-100 dark:hover:bg-gray-800"}`}
            aria-label={speaking ? "Stop speaking" : "Listen"}
            title={speaking ? "Stop" : "Listen"}
          >
            {speaking
              ? <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><rect x="6" y="4" width="4" height="16" rx="1" strokeWidth={2} /><rect x="14" y="4" width="4" height="16" rx="1" strokeWidth={2} /></svg>
              : <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707A1 1 0 0112 5.586v12.828a1 1 0 01-1.707.707L5.586 15z" /></svg>
            }
          </button>
        </div>
      </div>
    </motion.div>
  );
});
ChatMessage.displayName = "ChatMessage";

// ─── 3D Scroll-to-bottom ───
const ScrollDownBtn = memo(({ onClick }) => (
  <motion.button
    initial={{ opacity: 0, y: 10, scale: 0.8 }}
    animate={{ opacity: 1, y: 0, scale: 1 }}
    exit={{ opacity: 0, y: 10, scale: 0.8 }}
    whileHover={{ scale: 1.15, rotateX: 10 }}
    whileTap={{ scale: 0.9 }}
    onClick={onClick}
    className="absolute bottom-2 left-1/2 -translate-x-1/2 z-10 p-1.5 bg-white dark:bg-gray-800 rounded-full shadow-lg shadow-gray-300/50 dark:shadow-black/30 border border-gray-200 dark:border-gray-700"
    style={{ transformStyle: "preserve-3d" }}
    aria-label="Scroll to bottom"
  >
    <svg className="w-4 h-4 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
    </svg>
  </motion.button>
));
ScrollDownBtn.displayName = "ScrollDownBtn";

// ═══════════════════════════════════════════
// MAIN WIDGET
// ═══════════════════════════════════════════
const AiChatWidget = memo(({ context = {} }) => {
  const { currentUser, userDetails } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [userStats, setUserStats] = useState(null);
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef(null);
  const sttSetterRef = useRef(null);
  const sttBaseRef = useRef("");
  const [hasStt, setHasStt] = useState(false);

  useEffect(() => {
    setHasStt(!!(window.SpeechRecognition || window.webkitSpeechRecognition));
  }, []);

  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const inputRef = useRef(null);
  const panelRef = useRef(null);
  const statsFetchedRef = useRef(false);
  const [keyboardVisible, setKeyboardVisible] = useState(false);

  // ── Desktop resize ──
  const [panelSize, setPanelSize] = useState({ width: 400, height: 576 });
  const resizingRef = useRef(null);
  const resizeStartRef = useRef({ x: 0, y: 0, w: 0, h: 0 });

  const MIN_W = 320;
  const MAX_W = 700;
  const MIN_H = 400;

  useEffect(() => {
    const onMove = (e) => {
      if (!resizingRef.current) return;
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      const { x, y, w, h } = resizeStartRef.current;
      const dir = resizingRef.current;
      const maxH = window.innerHeight - 48;

      setPanelSize(() => {
        let newW = w;
        let newH = h;
        if (dir === "left" || dir === "corner") {
          newW = Math.min(MAX_W, Math.max(MIN_W, w + (x - clientX)));
        }
        if (dir === "top" || dir === "corner") {
          newH = Math.min(maxH, Math.max(MIN_H, h + (y - clientY)));
        }
        return { width: newW, height: newH };
      });
    };

    const onUp = () => {
      if (!resizingRef.current) return;
      resizingRef.current = null;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    window.addEventListener("touchmove", onMove, { passive: false });
    window.addEventListener("touchend", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend", onUp);
    };
  }, []);

  const startResize = useCallback(
    (dir) => (e) => {
      e.preventDefault();
      resizingRef.current = dir;
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      resizeStartRef.current = { x: clientX, y: clientY, w: panelSize.width, h: panelSize.height };
      document.body.style.cursor = dir === "corner" ? "nwse-resize" : dir === "left" ? "ew-resize" : "ns-resize";
      document.body.style.userSelect = "none";
    },
    [panelSize],
  );

  const scrollToBottom = useCallback((behavior = "smooth") => {
    requestAnimationFrame(() => {
      messagesEndRef.current?.scrollIntoView({ behavior, block: "end" });
    });
  }, []);

  const handleScroll = useCallback(() => {
    const el = messagesContainerRef.current;
    if (!el) return;
    setShowScrollBtn(el.scrollHeight - el.scrollTop - el.clientHeight > 120);
  }, []);

  // ── Mobile keyboard detection + panel pinning to visual viewport ──
  useEffect(() => {
    if (!isOpen) return;
    const vv = window.visualViewport;
    if (!vv) return;

    const syncPanel = () => {
      const isMobile = window.innerWidth < 768;
      if (!isMobile || !panelRef.current) return;

      // Always pin panel to visual viewport — handles keyboard, address bar, everything
      panelRef.current.style.height = `${vv.height}px`;
      panelRef.current.style.top = `${vv.offsetTop}px`;

      // Compare against screen height — reliable across all devices
      const kbOpen = window.screen.height - vv.height > 150;
      setKeyboardVisible(kbOpen);
      if (kbOpen) requestAnimationFrame(() => scrollToBottom("instant"));
    };

    syncPanel();
    vv.addEventListener("resize", syncPanel);
    vv.addEventListener("scroll", syncPanel);
    return () => {
      vv.removeEventListener("resize", syncPanel);
      vv.removeEventListener("scroll", syncPanel);
      if (panelRef.current) {
        panelRef.current.style.height = "";
        panelRef.current.style.top = "";
      }
      setKeyboardVisible(false);
    };
  }, [isOpen, scrollToBottom]);

  // ── Scroll to bottom when textarea gets focus (keyboard opening) ──
  useEffect(() => {
    if (!isOpen) return;
    const ta = inputRef.current;
    if (!ta) return;
    const onFocus = () => {
      // Wait for keyboard animation to settle
      setTimeout(() => scrollToBottom("instant"), 350);
      setTimeout(() => scrollToBottom("instant"), 600);
    };
    ta.addEventListener("focus", onFocus);
    return () => ta.removeEventListener("focus", onFocus);
  }, [isOpen, scrollToBottom]);

  useEffect(() => { scrollToBottom(); }, [messages, scrollToBottom]);
  useEffect(() => {
    if (!isOpen) return;
    // Only auto-focus on desktop — on mobile it opens the keyboard which is annoying
    const isMobile = window.innerWidth < 768;
    if (!isMobile) setTimeout(() => inputRef.current?.focus(), 200);
  }, [isOpen]);

  // ── Lock body scroll on mobile when chat is open ──
  useEffect(() => {
    if (!isOpen) return;
    const isMobile = window.innerWidth < 768;
    if (!isMobile) return;
    const prevOverflow = document.body.style.overflow;
    const prevPosition = document.body.style.position;
    const prevWidth = document.body.style.width;
    document.body.style.overflow = "hidden";
    document.body.style.position = "fixed";
    document.body.style.width = "100%";
    return () => {
      document.body.style.overflow = prevOverflow;
      document.body.style.position = prevPosition;
      document.body.style.width = prevWidth;
    };
  }, [isOpen]);

  // ── Stats fetch (cached) ──
  useEffect(() => {
    if (!isOpen || !currentUser || statsFetchedRef.current) return;
    statsFetchedRef.current = true;
    try {
      const cached = sessionStorage.getItem(STATS_CACHE_KEY);
      if (cached) {
        const { data, ts, uid } = JSON.parse(cached);
        if (uid === currentUser.uid && Date.now() - ts < STATS_CACHE_TTL) { setUserStats(data); return; }
      }
    } catch { /* ignore */ }

    (async () => {
      try {
        const snap = await getDocs(query(
          collection(db, "tests"),
          where("userId", "==", currentUser.uid),
          where("completed", "==", true),
          orderBy("endTime", "desc"),
          limit(20)
        ));
        const tests = snap.docs.map((d) => d.data());
        if (!tests.length) { setUserStats({ attempted: 0 }); return; }

        const attempted = tests.length;
        const avgAccuracy = tests.reduce((s, t) => s + Number(t.accuracy || 0), 0) / attempted;
        const subjectMap = {};
        for (const t of tests) {
          if (t.subjectWise) {
            for (const [subj, d] of Object.entries(t.subjectWise)) {
              if (!subjectMap[subj]) subjectMap[subj] = { correct: 0, total: 0 };
              subjectMap[subj].correct += d.correct || 0;
              subjectMap[subj].total += d.total || 0;
            }
          }
        }
        const subjects = Object.entries(subjectMap).filter(([, d]) => d.total >= 3)
          .map(([name, d]) => ({ name, accuracy: d.total > 0 ? (d.correct / d.total) * 100 : 0 }))
          .sort((a, b) => a.accuracy - b.accuracy);
        const weakSubjects = subjects.filter((s) => s.accuracy < 50).slice(0, 3).map((s) => s.name);
        const strongSubjects = subjects.filter((s) => s.accuracy >= 70).slice(-3).map((s) => s.name);
        const statsData = { attempted, avgAccuracy, weakSubjects, strongSubjects };
        setUserStats(statsData);
        try { sessionStorage.setItem(STATS_CACHE_KEY, JSON.stringify({ data: statsData, ts: Date.now(), uid: currentUser.uid })); } catch { /* quota */ }
      } catch { setUserStats({ attempted: 0 }); }
    })();
  }, [isOpen, currentUser]);

  const enrichedContext = useMemo(() => {
    const ctx = { ...context };
    if (userDetails) { ctx.userName = userDetails.name || null; ctx.examType = userDetails.targetExam || context.examType || null; }
    if (userStats?.attempted > 0) {
      const parts = [`${userStats.attempted} tests taken`, `${userStats.avgAccuracy?.toFixed(0)}% avg accuracy`];
      if (userStats.weakSubjects?.length) parts.push(`Weak in: ${userStats.weakSubjects.join(", ")}`);
      if (userStats.strongSubjects?.length) parts.push(`Strong in: ${userStats.strongSubjects.join(", ")}`);
      ctx.performanceSummary = parts.join(". ");
    }
    return ctx;
  }, [context, userDetails, userStats]);

  // ── Boundary violation detection ──
  const violationCountRef = useRef(0);

  const isBoundaryResponse = useCallback((reply) => {
    const lower = (reply || "").toLowerCase();
    const markers = [
      "i'm here to help with your exam prep",
      "outside what i can help with",
      "let's focus on your prep",
      "nice try",
      "i stick to exam prep",
      "let's keep it respectful",
      "i'm just here to help you crack",
      "help you succeed",
      "ask me a study question",
    ];
    return markers.some((m) => lower.includes(m));
  }, []);

  const handleSend = useCallback(async () => {
    const sanitized = sanitizeInput(input);
    if (!sanitized || loading) return;
    // Stop mic if active
    if (recognitionRef.current) stopListening();
    setError(null);
    setMessages((prev) => [...prev.slice(-(MAX_MESSAGES - 1)), { role: "user", content: sanitized, timestamp: Date.now() }]);
    setInput("");
    if (inputRef.current) inputRef.current.style.height = "auto";
    setLoading(true);
    // Scroll to bottom immediately after sending so user sees their message
    requestAnimationFrame(() => scrollToBottom("instant"));
    const sendStart = Date.now();
    try {
      const history = messages.slice(-10).map((m) => ({ role: m.role, content: m.content }));
      const reply = await sendChatMessage(sanitized, history, enrichedContext);
      const elapsed = ((Date.now() - sendStart) / 1000).toFixed(1);
      setMessages((prev) => [...prev.slice(-(MAX_MESSAGES - 1)), { role: "assistant", content: reply, timestamp: Date.now(), elapsed }]);

      // Check if AI flagged this as off-topic/harmful
      if (isBoundaryResponse(reply)) {
        violationCountRef.current += 1;
        if (violationCountRef.current >= 2) {
          // Auto-close and clear after a short delay so user sees the warning
          setTimeout(() => {
            setMessages([]);
            setError(null);
            setIsOpen(false);
            violationCountRef.current = 0;
          }, 2000);
          setError("Chat closed — repeated off-topic messages.");
        }
      } else {
        // Reset counter on a valid on-topic exchange
        violationCountRef.current = 0;
      }
    } catch (err) {
      const msg = err.message || "";
      if (msg.includes("Rate") || msg.includes("Too many")) setError("Too many requests. Wait a moment.");
      else if (msg.includes("timed out") || msg.includes("Timeout")) setError("Response took too long. Try again.");
      else setError("Couldn't reach Mockzam AI. Try again.");
    } finally {
      setLoading(false);
      if (window.innerWidth >= 768) setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [input, loading, messages, enrichedContext, isBoundaryResponse, stopListening]);

  const handleKeyDown = useCallback((e) => {
    const isMobile = window.innerWidth < 768;
    if (e.key === "Enter" && e.altKey) {
      e.preventDefault();
      const ta = e.target;
      const start = ta.selectionStart;
      const end = ta.selectionEnd;
      const val = ta.value;
      const newVal = val.slice(0, start) + "\n" + val.slice(end);
      setInput(newVal.slice(0, 1000));
      requestAnimationFrame(() => { ta.selectionStart = ta.selectionEnd = start + 1; ta.style.height = "auto"; ta.style.height = Math.min(ta.scrollHeight, 96) + "px"; });
      return;
    }
    if (e.key === "Enter" && !e.shiftKey && !isMobile) { e.preventDefault(); handleSend(); }
  }, [handleSend]);

  useEffect(() => {
    if (!isOpen) return;
    const onEsc = (e) => { if (e.key === "Escape") setIsOpen(false); };
    document.addEventListener("keydown", onEsc);
    return () => document.removeEventListener("keydown", onEsc);
  }, [isOpen]);

  const handleInputChange = useCallback((e) => {
    const val = e.target.value.slice(0, 1000);
    setInput(val);
    const el = e.target;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 96) + "px";
  }, []);

  // ── Production-ready STT ──
  const sttSilenceRef = useRef(null);
  const sttRestartRef = useRef(false);
  const sttStoppingRef = useRef(false);
  const sttLastResultRef = useRef(0);

  const stopListening = useCallback(() => {
    sttRestartRef.current = false;
    sttStoppingRef.current = true;
    if (sttSilenceRef.current) { clearTimeout(sttSilenceRef.current); sttSilenceRef.current = null; }
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch { /* already stopped */ }
    }
    recognitionRef.current = null;
    sttSetterRef.current = null;
    setListening(false);
    sttStoppingRef.current = false;
  }, []);

  const toggleListening = useCallback((setter, getCurrentValue) => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { setError("Speech recognition not supported in this browser."); return; }

    // If already listening, stop
    if (recognitionRef.current) { stopListening(); return; }

    // Prevent double-start
    if (sttStoppingRef.current) return;

    sttSetterRef.current = setter;
    sttBaseRef.current = getCurrentValue ? getCurrentValue() : "";
    sttLastResultRef.current = 0;

    const startRecognition = () => {
      // Guard against multiple instances
      if (recognitionRef.current) { stopListening(); }

      const rec = new SR();
      rec.continuous = true;
      rec.interimResults = true;
      rec.lang = "en-US";
      rec.maxAlternatives = 1;

      // Reset silence timer on every result
      const resetSilenceTimer = () => {
        if (sttSilenceRef.current) clearTimeout(sttSilenceRef.current);
        sttSilenceRef.current = setTimeout(() => {
          // Auto-stop after 8s of silence
          if (recognitionRef.current) stopListening();
        }, 8000);
      };

      rec.onstart = () => {
        sttStoppingRef.current = false;
        setListening(true);
        resetSilenceTimer();
      };

      rec.onresult = (e) => {
        resetSilenceTimer();
        let final = "";
        let interim = "";
        for (let i = 0; i < e.results.length; i++) {
          const t = e.results[i][0].transcript;
          if (e.results[i].isFinal) final += t;
          else interim += t;
        }
        const transcript = (final + interim).trim();
        sttLastResultRef.current = Date.now();
        const base = sttBaseRef.current;
        if (sttSetterRef.current) {
          sttSetterRef.current((base ? base.trimEnd() + " " : "") + transcript);
        }
        // Auto-resize textarea if visible
        requestAnimationFrame(() => {
          const ta = inputRef.current;
          if (ta) { ta.style.height = "auto"; ta.style.height = Math.min(ta.scrollHeight, 96) + "px"; }
        });
      };

      rec.onend = () => {
        if (sttSilenceRef.current) { clearTimeout(sttSilenceRef.current); sttSilenceRef.current = null; }
        // If we didn't intentionally stop, and recognition ended (e.g. network hiccup, no-speech auto-stop),
        // restart automatically unless user explicitly stopped
        if (sttRestartRef.current && recognitionRef.current && !sttStoppingRef.current) {
          try { recognitionRef.current.start(); return; } catch { /* fall through to cleanup */ }
        }
        recognitionRef.current = null;
        setListening(false);
      };

      rec.onerror = (e) => {
        if (sttSilenceRef.current) { clearTimeout(sttSilenceRef.current); sttSilenceRef.current = null; }
        const err = e.error;
        if (err === "aborted") {
          // User or system aborted — clean exit
          recognitionRef.current = null;
          setListening(false);
          return;
        }
        if (err === "no-speech") {
          // Silently restart once, then stop
          if (sttRestartRef.current && recognitionRef.current && !sttStoppingRef.current) {
            sttRestartRef.current = false; // only retry once for no-speech
            try { recognitionRef.current.start(); return; } catch { /* fall through */ }
          }
          stopListening();
          return;
        }
        if (err === "not-allowed") {
          setError("Mic blocked. Allow microphone in browser settings.");
        } else if (err === "network") {
          setError("Network error during voice input. Check your connection.");
        } else if (err === "audio-capture") {
          setError("No microphone found. Check your device.");
        } else if (err === "service-not-allowed") {
          setError("Speech service unavailable. Try again later.");
        } else {
          setError("Voice input failed. Try again.");
        }
        recognitionRef.current = null;
        setListening(false);
      };

      recognitionRef.current = rec;
      sttRestartRef.current = true;
      try {
        rec.start();
      } catch (e) {
        recognitionRef.current = null;
        setListening(false);
        setError("Could not start voice input. Try again.");
      }
    };

    // Secure context check
    if (!window.isSecureContext) {
      setError("Voice input requires HTTPS.");
      return;
    }

    // Request mic permission first, then start recognition
    if (navigator.mediaDevices?.getUserMedia) {
      navigator.mediaDevices.getUserMedia({ audio: true })
        .then((stream) => {
          stream.getTracks().forEach((t) => t.stop());
          startRecognition();
        })
        .catch((err) => {
          if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
            setError("Mic access denied. Allow microphone in browser settings.");
          } else if (err.name === "NotFoundError") {
            setError("No microphone found on this device.");
          } else {
            setError("Could not access microphone. Try again.");
          }
        });
    } else {
      // Fallback — try directly (older browsers)
      try { startRecognition(); } catch { setError("Could not start voice input."); }
    }
  }, [stopListening]);

  // Stop listening when chat closes
  useEffect(() => {
    if (!isOpen && recognitionRef.current) stopListening();
  }, [isOpen, stopListening]);

  // Stop listening on unmount
  useEffect(() => {
    return () => { if (recognitionRef.current) stopListening(); };
  }, [stopListening]);

  // Stop listening on page visibility change (user switches tab/app)
  useEffect(() => {
    const onVisChange = () => {
      if (document.hidden && recognitionRef.current) stopListening();
    };
    document.addEventListener("visibilitychange", onVisChange);
    return () => document.removeEventListener("visibilitychange", onVisChange);
  }, [stopListening]);

  const handleEditMessage = useCallback(async (msgIndex, newContent) => {
    if (loading) return;
    const sanitized = sanitizeInput(newContent);
    if (!sanitized) return;
    // Stop mic if active
    if (recognitionRef.current) stopListening();

    // Keep messages above the edited one, replace the edited message, drop everything below
    setMessages((prev) => [...prev.slice(0, msgIndex), { role: "user", content: sanitized, timestamp: Date.now() }]);
    setError(null);
    setLoading(true);
    requestAnimationFrame(() => scrollToBottom("instant"));
    const editStart = Date.now();

    try {
      const history = messages.slice(0, msgIndex).slice(-10).map((m) => ({ role: m.role, content: m.content }));
      const reply = await sendChatMessage(sanitized, history, enrichedContext);
      const elapsed = ((Date.now() - editStart) / 1000).toFixed(1);
      setMessages((prev) => [...prev, { role: "assistant", content: reply, timestamp: Date.now(), elapsed }]);
    } catch (err) {
      const msg = err.message || "";
      if (msg.includes("Rate") || msg.includes("Too many")) setError("Too many requests. Wait a moment.");
      else if (msg.includes("timed out") || msg.includes("Timeout")) setError("Response took too long. Try again.");
      else setError("Couldn't reach Mockzam AI. Try again.");
    } finally {
      setLoading(false);
      if (window.innerWidth >= 768) setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [loading, messages, enrichedContext, scrollToBottom, stopListening]);

  if (!currentUser) return null;

  const firstName = userDetails?.name?.split(" ")[0] || "there";

  // SVG icons for suggestion chips (consistent across all devices)
  const chipIcons = {
    bulb: (
      <svg className="w-4 h-4 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
      </svg>
    ),
    chart: (
      <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
    book: (
      <svg className="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
      </svg>
    ),
    calc: (
      <svg className="w-4 h-4 text-violet-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2 1 3 3 3h10c2 0 3-1 3-3V7c0-2-1-3-3-3H7C5 4 4 5 4 7zm4 0h8M8 11h2m4 0h2M8 15h2m4 0h2" />
      </svg>
    ),
  };

  const suggestions = [
    { icon: chipIcons.bulb, text: "Explain a concept" },
    { icon: chipIcons.chart, text: "How am I doing?" },
    { icon: chipIcons.book, text: "What should I study?" },
    { icon: chipIcons.calc, text: "Solve step by step" },
  ];

  return (
    <>
      {/* ── 3D Floating Action Button ── */}
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            key="fab"
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            exit={{ scale: 0, rotate: 180 }}
            transition={{ type: "spring", stiffness: 260, damping: 20 }}
            whileHover={{ scale: 1.1, rotateY: 15, rotateX: -10 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => setIsOpen(true)}
            className="fixed bottom-[5.5rem] md:bottom-6 right-4 z-[55]"
            style={{ perspective: "500px", transformStyle: "preserve-3d" }}
            aria-label="Open Mockzam AI chat"
          >
            {/* 3D Glow layers — contained to prevent overflow clipping */}
            <span className="absolute inset-0 rounded-full bg-gradient-to-r from-violet-500 to-blue-500 opacity-30 blur-xl animate-pulse pointer-events-none" />
            <span className="absolute inset-[-3px] rounded-full bg-gradient-to-r from-violet-400 via-blue-400 to-indigo-400 opacity-20 blur-md pointer-events-none" />
            {/* Main button with 3D depth */}
            <span
              className="relative w-14 h-14 flex items-center justify-center rounded-full bg-gradient-to-br from-violet-600 via-blue-600 to-indigo-600 text-white shadow-[0_8px_30px_-4px_rgba(99,102,241,0.5)]"
              style={{ transform: "translateZ(8px)" }}
            >
              <AiIcon size={26} className="drop-shadow-md" />
            </span>
            {/* Online dot */}
            <motion.span
              className="absolute top-0 right-0 w-3.5 h-3.5 bg-green-400 border-2 border-white dark:border-gray-900 rounded-full"
              animate={{ scale: [1, 1.3, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
          </motion.button>
        )}
      </AnimatePresence>

      {/* ── 3D Chat Panel ── */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            ref={panelRef}
            key="panel"
            initial={{ opacity: 0, scale: 0.92, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 30 }}
            transition={{ type: "spring", stiffness: 350, damping: 30 }}
            className="fixed inset-0 z-[60] md:inset-auto md:bottom-6 md:right-4 md:z-50 flex flex-col bg-white dark:bg-gray-900 md:rounded-2xl overflow-hidden md:border border-gray-200/80 dark:border-gray-700/80 md:shadow-[0_25px_60px_-12px_rgba(99,102,241,0.25),0_8px_24px_-8px_rgba(0,0,0,0.15)]"
            style={{
              perspective: "1000px",
              transformStyle: "preserve-3d",
              ...(window.innerWidth >= 768 ? { width: panelSize.width, height: panelSize.height } : {}),
            }}
            role="dialog"
            aria-label="Mockzam AI Chat"
          >
            {/* ── Desktop resize handles ── */}
            <div
              onMouseDown={startResize("left")}
              className="hidden md:block absolute left-0 top-0 bottom-0 w-1.5 cursor-ew-resize z-10 hover:bg-violet-500/20 active:bg-violet-500/30 transition-colors rounded-l-2xl"
            />
            <div
              onMouseDown={startResize("top")}
              className="hidden md:block absolute top-0 left-0 right-0 h-1.5 cursor-ns-resize z-10 hover:bg-violet-500/20 active:bg-violet-500/30 transition-colors rounded-t-2xl"
            />
            <div
              onMouseDown={startResize("corner")}
              className="hidden md:block absolute top-0 left-0 w-3 h-3 cursor-nwse-resize z-20 hover:bg-violet-500/30 active:bg-violet-500/40 transition-colors rounded-tl-2xl"
            />
            {/* ── Header — adapts between full 3D and slim keyboard mode ── */}
            <motion.div
              className="relative flex items-center justify-between px-4 flex-shrink-0 overflow-hidden"
              style={{ transformStyle: "preserve-3d" }}
              layout
              transition={{ layout: { duration: 0.25, ease: "easeOut" } }}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-violet-600 via-blue-600 to-indigo-600" />

              {/* Animated decorations — only when keyboard closed */}
              <AnimatePresence>
                {!keyboardVisible && (
                  <>
                    <motion.div
                      key="grid"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 0.08 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.3 }}
                      className="absolute inset-0"
                      style={{ backgroundImage: "radial-gradient(circle, white 1px, transparent 1px)", backgroundSize: "20px 20px" }}
                    />
                    <motion.div
                      key="orb"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1, x: ["-20%", "120%"], y: ["-50%", "50%"] }}
                      exit={{ opacity: 0 }}
                      transition={{ opacity: { duration: 0.3 }, x: { duration: 6, repeat: Infinity, repeatType: "reverse" }, y: { duration: 6, repeat: Infinity, repeatType: "reverse" } }}
                      className="absolute w-32 h-32 bg-white/10 rounded-full blur-2xl"
                    />
                  </>
                )}
              </AnimatePresence>

              {/* Left: avatar + title */}
              <div className={`relative flex items-center transition-all duration-300 ease-out ${keyboardVisible ? "gap-2 py-1.5 pt-[max(0.375rem,env(safe-area-inset-top))]" : "gap-3 py-3 pt-[calc(0.75rem+env(safe-area-inset-top,0px))]"}`} style={{ transform: "translateZ(10px)" }}>
                <motion.div
                  className={`rounded-full bg-white/15 backdrop-blur-sm flex items-center justify-center ring-1 ring-white/25 transition-all duration-300 ease-out ${keyboardVisible ? "w-6 h-6" : "w-9 h-9 shadow-lg shadow-white/10"}`}
                  whileHover={!keyboardVisible ? { rotateY: 180 } : {}}
                  transition={{ duration: 0.5 }}
                  style={{ transformStyle: "preserve-3d" }}
                >
                  <AiIcon size={keyboardVisible ? 12 : 18} className="text-white" />
                </motion.div>
                {keyboardVisible ? (
                  <div className="flex items-center gap-1.5">
                    <h3 className="text-xs font-semibold text-white leading-none">Mockzam AI</h3>
                    <span className="w-1.5 h-1.5 bg-green-400 rounded-full flex-shrink-0" />
                  </div>
                ) : (
                  <div>
                    <h3 className="font-semibold text-white text-sm leading-tight">Mockzam AI</h3>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <motion.span
                        className="w-1.5 h-1.5 bg-green-400 rounded-full"
                        animate={{ scale: [1, 1.4, 1], opacity: [1, 0.6, 1] }}
                        transition={{ duration: 2, repeat: Infinity }}
                      />
                      <p className="text-[11px] text-blue-100/80 leading-tight">
                        {enrichedContext.examType ? `${enrichedContext.examType} prep` : "Ask any doubt"}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Right: action buttons */}
              <div className={`relative flex items-center gap-0.5 transition-all duration-300 ${keyboardVisible ? "py-1.5" : "py-3"}`} style={{ transform: "translateZ(10px)" }}>
                {messages.length > 0 && (
                  <motion.button
                    whileHover={{ scale: 1.1, rotate: 180 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => { setMessages([]); setError(null); }}
                    className={`hover:bg-white/15 rounded-lg transition-all text-white/70 hover:text-white ${keyboardVisible ? "p-1.5" : "p-2"}`}
                    title="New chat"
                    aria-label="Clear chat"
                  >
                    <svg className={`transition-all duration-300 ${keyboardVisible ? "w-3.5 h-3.5" : "w-4 h-4"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  </motion.button>
                )}
                <motion.button
                  whileHover={{ scale: 1.1, rotate: 90 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setIsOpen(false)}
                  className={`hover:bg-white/15 rounded-lg transition-all text-white/70 hover:text-white ${keyboardVisible ? "p-1.5" : "p-2"}`}
                  aria-label="Close chat"
                >
                  <svg className={`transition-all duration-300 ${keyboardVisible ? "w-4 h-4" : "w-5 h-5"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </motion.button>
              </div>
            </motion.div>

            {/* ── Messages area ── */}
            <div
              ref={messagesContainerRef}
              onScroll={handleScroll}
              className={`relative flex-1 overflow-y-auto space-y-3 bg-gray-50/50 dark:bg-gray-900 scroll-smooth overscroll-contain min-h-0 transition-all duration-300 ${keyboardVisible ? "px-3 py-2" : "px-4 py-4"}`}
            >
              {/* ── Full empty state (keyboard closed) ── */}
              {messages.length === 0 && !keyboardVisible && (
                <div className="flex flex-col items-center justify-center h-full py-4" style={{ perspective: "800px" }}>
                  {/* 3D Floating AI Avatar */}
                  <motion.div
                    className="relative mb-4"
                    animate={{ y: [0, -8, 0], rotateY: [0, 5, 0, -5, 0] }}
                    transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                    style={{ transformStyle: "preserve-3d" }}
                  >
                    {/* Shadow beneath */}
                    <motion.div
                      className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-14 h-3 bg-violet-500/20 rounded-full blur-md"
                      animate={{ scaleX: [1, 0.8, 1], opacity: [0.3, 0.15, 0.3] }}
                      transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                    />
                    <motion.div
                      className="w-18 h-18 rounded-2xl bg-gradient-to-br from-violet-500 via-blue-500 to-indigo-500 flex items-center justify-center shadow-xl shadow-blue-500/30 p-4"
                      style={{ transform: "translateZ(20px) rotateX(5deg)" }}
                      whileHover={{ rotateY: 20, rotateX: -10, scale: 1.1 }}
                    >
                      <AiIcon size={36} className="text-white drop-shadow-lg" />
                    </motion.div>
                    <motion.span
                      className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-400 border-2 border-white dark:border-gray-900 rounded-full shadow-md shadow-green-400/40"
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{ duration: 2, repeat: Infinity }}
                      style={{ transform: "translateZ(25px)" }}
                    />
                  </motion.div>

                  <motion.h4
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="text-base font-semibold text-gray-800 dark:text-gray-100"
                  >
                    Hey {firstName} <motion.span
                      className="inline-block origin-center"
                      animate={{ rotate: [0, 15, -10, 15, 0], scale: [1, 1.2, 1, 1.15, 1] }}
                      transition={{ duration: 1.8, delay: 0.4 }}
                    >
                      <svg className="w-5 h-5 inline -mt-0.5" viewBox="0 0 24 24" fill="none">
                        <path d="M12 2l2.09 6.26L20 6l-3.26 4.91L23 12l-6.26 1.09L20 18l-5.91-2.26L12 22l-2.09-6.26L4 18l3.26-4.91L1 12l6.26-1.09L4 6l5.91 2.26L12 2z" fill="url(#sparkGrad)" />
                        <defs>
                          <linearGradient id="sparkGrad" x1="1" y1="2" x2="23" y2="22" gradientUnits="userSpaceOnUse">
                            <stop stopColor="#A78BFA" />
                            <stop offset="1" stopColor="#60A5FA" />
                          </linearGradient>
                        </defs>
                      </svg>
                    </motion.span>
                  </motion.h4>
                  <motion.p
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="text-xs text-gray-500 dark:text-gray-400 mt-1 text-center max-w-[240px] leading-relaxed"
                  >
                    I know your exam, your strengths & weak areas. Just ask away.
                  </motion.p>

                  {enrichedContext.examType && (
                    <motion.span
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.4, type: "spring" }}
                      className="mt-2 inline-flex items-center gap-1 text-[11px] font-medium text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-900/20 px-2.5 py-1 rounded-full shadow-sm"
                    >
                      <svg className="w-3 h-3 text-violet-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
                      {enrichedContext.examType}
                    </motion.span>
                  )}

                  {/* 3D Suggestion chips */}
                  <div className="mt-4 w-full grid grid-cols-2 gap-2 px-1" style={{ perspective: "600px" }}>
                    {suggestions.map((s, i) => (
                      <motion.button
                        key={s.text}
                        initial={{ opacity: 0, y: 15, rotateX: 20 }}
                        animate={{ opacity: 1, y: 0, rotateX: 0 }}
                        transition={{ delay: 0.4 + i * 0.08, type: "spring", stiffness: 200 }}
                        whileHover={{ scale: 1.04, rotateY: 5, y: -2, boxShadow: "0 8px 20px -4px rgba(139, 92, 246, 0.2)" }}
                        whileTap={{ scale: 0.96 }}
                        onClick={() => { setInput(s.text); setTimeout(() => inputRef.current?.focus(), 50); }}
                        className="flex items-center gap-2 text-left text-xs px-3 py-2.5 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm"
                        style={{ transformStyle: "preserve-3d" }}
                      >
                        <span className="flex-shrink-0" style={{ transform: "translateZ(6px)" }}>{s.icon}</span>
                        <span className="leading-tight" style={{ transform: "translateZ(4px)" }}>{s.text}</span>
                      </motion.button>
                    ))}
                  </div>
                </div>
              )}

              {/* ── Keyboard-open empty state: mini avatar + horizontal quick chips ── */}
              {messages.length === 0 && keyboardVisible && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25 }}
                  className="flex flex-col gap-2.5 py-2"
                >
                  <div className="flex items-center gap-2.5 px-1">
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500 to-blue-500 flex items-center justify-center shadow-md shadow-violet-500/20 flex-shrink-0">
                      <AiIcon size={16} className="text-white" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-200 leading-tight">What can I help with?</p>
                      <p className="text-[10px] text-gray-400 dark:text-gray-500 leading-tight mt-0.5">Tap a suggestion or type below</p>
                    </div>
                  </div>
                  <div className="flex gap-2 overflow-x-auto pb-0.5 scrollbar-none -mx-1 px-1">
                    {suggestions.map((s) => (
                      <button
                        key={s.text}
                        onClick={() => { setInput(s.text); setTimeout(() => inputRef.current?.focus(), 50); }}
                        className="flex-shrink-0 flex items-center gap-1.5 text-[11px] font-medium px-3 py-1.5 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 rounded-full border border-gray-200 dark:border-gray-700 shadow-sm active:scale-95 transition-transform"
                      >
                        {s.icon}
                        <span>{s.text}</span>
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}

              {messages.map((msg, i) => (
                <ChatMessage key={`${msg.timestamp}-${i}`} msg={msg} index={i} onEdit={handleEditMessage} loading={loading} listening={listening} toggleListening={toggleListening} hasStt={hasStt} />
              ))}

              {loading && <TypingIndicator />}

              <AnimatePresence>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="flex justify-center"
                  >
                    <button
                      onClick={() => setError(null)}
                      className="text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-xl border border-red-200 dark:border-red-800/50 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
                    >
                      <svg className="w-3.5 h-3.5 inline mr-1 -mt-0.5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                      {error} — Tap to dismiss
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>

              <div ref={messagesEndRef} />
              <AnimatePresence>{showScrollBtn && <ScrollDownBtn onClick={() => scrollToBottom()} />}</AnimatePresence>
            </div>

            {/* ── Input Area ── */}
            <motion.div
              className={`flex-shrink-0 border-t border-gray-200 dark:border-gray-700/80 bg-white dark:bg-gray-900 px-3 transition-all duration-300 ease-out ${keyboardVisible ? "py-1.5" : "py-2.5 pb-[calc(0.625rem+env(safe-area-inset-bottom,0px))] md:pb-2.5"}`}
              style={{ transformStyle: "preserve-3d" }}
            >
              <div className="flex items-end gap-2">
                <div className="relative flex-1">
                  <textarea
                    ref={inputRef}
                    value={input}
                    onChange={handleInputChange}
                    onKeyDown={handleKeyDown}
                    placeholder={listening ? "Listening..." : "Type your doubt..."}
                    rows={1}
                    className={`w-full resize-none border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-800 dark:text-gray-200 text-sm leading-snug focus:outline-none focus:ring-2 focus:ring-violet-500/40 focus:border-violet-400 dark:focus:border-violet-500 placeholder:text-gray-400 dark:placeholder:text-gray-500 transition-all duration-300 ${listening ? "border-red-300 dark:border-red-600 ring-2 ring-red-200 dark:ring-red-800/40" : ""} ${keyboardVisible ? "py-2 pl-3.5 pr-9 rounded-lg max-h-20" : "py-2.5 pl-3.5 pr-9 rounded-xl max-h-24"}`}
                    disabled={loading}
                    aria-label="Chat message input"
                  />
                  {hasStt && (
                    <button
                      onClick={() => toggleListening(setInput, () => input)}
                      className={`absolute right-2 bottom-2 p-1 rounded-md transition-all ${listening ? "text-red-500 animate-pulse" : "text-gray-400 hover:text-violet-500 dark:hover:text-violet-400 active:text-violet-500"}`}
                      aria-label={listening ? "Stop recording" : "Voice input"}
                      title={listening ? "Tap to stop" : "Voice input"}
                      type="button"
                    >
                      <MicIcon active={listening} />
                    </button>
                  )}
                </div>
                <motion.button
                  whileHover={{ scale: 1.08, rotateZ: -5 }}
                  whileTap={{ scale: 0.88, rotateZ: 15 }}
                  onClick={handleSend}
                  disabled={!input.trim() || loading}
                  className={`flex items-center justify-center bg-gradient-to-r from-violet-600 to-blue-600 text-white disabled:opacity-30 disabled:cursor-not-allowed shadow-lg shadow-blue-500/25 transition-all duration-300 ${keyboardVisible ? "p-2 rounded-lg" : "p-2.5 rounded-xl"}`}
                  style={{ transformStyle: "preserve-3d" }}
                  aria-label="Send message"
                >
                  {loading ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <motion.span style={{ display: "flex", transform: "translateZ(4px)" }}>
                      <SendIcon />
                    </motion.span>
                  )}
                </motion.button>
              </div>
              <AnimatePresence>
                {!keyboardVisible && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                    className="flex items-center justify-between mt-1.5 px-0.5 overflow-hidden"
                  >
                    <span className="text-[10px] text-gray-400 dark:text-gray-600 select-none">
                      {input.length > 0 && <span className={input.length > 900 ? "text-orange-400" : ""}>{input.length}/1000</span>}
                    </span>
                    <span className="text-[10px] text-gray-400 dark:text-gray-600 select-none">AI · May not always be accurate</span>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
});

AiChatWidget.displayName = "AiChatWidget";
export default AiChatWidget;
