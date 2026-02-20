import { aiRequestLimiter } from "../utils/securityUtils";
import { auth } from "../config/firebase";

// Prevent sending while a request is in-flight (double-tap guard)
let inflight = false;

/**
 * Send a message to the AI chat endpoint.
 * Includes client-side rate limiting, auth token, abort timeout, and input validation.
 */
export const sendChatMessage = async (message, conversationHistory = [], context = {}) => {
  // ── Guards ──
  if (inflight) throw new Error("Request already in progress.");
  if (!aiRequestLimiter.canMakeRequest("ai-chat")) throw new Error("Too many requests. Wait a moment.");
  if (!message || typeof message !== "string") throw new Error("Invalid message.");
  if (!auth.currentUser) throw new Error("Not authenticated.");

  const cleanMsg = message.trim().slice(0, 1000);
  if (!cleanMsg) throw new Error("Message is empty.");

  // Only send last 10 messages to keep payload small
  const recentHistory = (conversationHistory || [])
    .slice(-10)
    .map((m) => ({ role: m.role, content: (m.content || "").slice(0, 1000) }));

  // Strip any fields from context that shouldn't be sent
  const safeContext = {};
  const allowedKeys = ["userName", "examType", "currentQuestion", "performanceSummary", "currentPage", "learningProfile"];
  for (const key of allowedKeys) {
    if (context[key] !== undefined && context[key] !== null) {
      safeContext[key] = typeof context[key] === "string" ? context[key].slice(0, 500) : context[key];
    }
  }

  const apiUrl = import.meta.env.VITE_API_URL || "/api";
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 35000); // 35s timeout for 70B model

  inflight = true;

  try {
    const idToken = await auth.currentUser.getIdToken();

    const response = await fetch(`${apiUrl}/ai-chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify({
        message: cleanMsg,
        conversationHistory: recentHistory,
        context: safeContext,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      if (response.status === 429) throw new Error("Too many requests");
      if (response.status === 401) throw new Error("Session expired. Refresh the page.");
      throw new Error(err.error || "Failed to get response");
    }

    const data = await response.json();
    if (!data.reply || typeof data.reply !== "string") throw new Error("Invalid AI response.");
    return data.reply;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === "AbortError") throw new Error("Request timed out. Try again.");
    throw error;
  } finally {
    inflight = false;
  }
};
