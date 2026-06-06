import { useEffect, useRef, useState } from "react";
import { MessageSquare, Send, Sparkles, X } from "lucide-react";
import type { CaseRequest, ChatMessage, Prediction } from "../api";
import { pct, postChat } from "../api";

const GREETING =
  "Hi — I'm the Service Priority assistant. I can explain how the model scores a case, walk through fairness and governance, or triage a request for you. What would you like to know?";

const STARTERS = ["How does the scoring work?", "Is the model fair?", "Triage my current case", "What needs human review?"];

type Props = {
  open: boolean;
  onToggle: () => void;
  onClose: () => void;
  caseContext: CaseRequest;
  online: boolean;
  seed?: string | null;
  onSeedConsumed?: () => void;
};

type Turn = ChatMessage & { prediction?: Prediction | null; citations?: { label: string; source: string }[] };

export function ChatWidget({ open, onToggle, onClose, caseContext, online, seed, onSeedConsumed }: Props) {
  const [turns, setTurns] = useState<Turn[]>([{ role: "assistant", content: GREETING }]);
  const [suggestions, setSuggestions] = useState<string[]>(STARTERS);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: "smooth" });
  }, [turns, busy, open]);

  // Close on Escape while open.
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // A seed message (e.g. from the hero search) opens the widget and sends itself.
  useEffect(() => {
    if (seed && open) {
      send(seed);
      onSeedConsumed?.();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seed, open]);

  async function send(text: string) {
    const message = text.trim();
    if (!message || busy) return;
    const history: ChatMessage[] = turns.map(({ role, content }) => ({ role, content }));
    setTurns((prev) => [...prev, { role: "user", content: message }]);
    setInput("");
    setSuggestions([]);
    setBusy(true);

    try {
      const response = await postChat(message, history, caseContext);
      setTurns((prev) => [
        ...prev,
        { role: "assistant", content: response.reply, prediction: response.prediction, citations: response.citations },
      ]);
      setSuggestions(response.suggestions ?? []);
    } catch {
      setTurns((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "I can't reach the API right now. Start the backend with `uvicorn backend.app.main:app --port 8010` and try again.",
        },
      ]);
      setSuggestions(STARTERS);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className={`chat-pop ${open ? "open" : ""}`} role="dialog" aria-label="Service Priority assistant" aria-hidden={!open}>
        <div className="rail-head">
          <div className="rail-avatar"><Sparkles size={18} /></div>
          <div className="title">
            <b>Priority assistant</b>
            <small>Grounded in the live model</small>
          </div>
          <span className={`rail-status ${online ? "" : "offline"}`}>
            <span className="dot-live" /> {online ? "Online" : "Offline"}
          </span>
          <button className="rail-close" onClick={onClose} aria-label="Close assistant"><X size={18} /></button>
        </div>

        <div className="rail-log" ref={logRef}>
          {turns.map((turn, index) => (
            <div className={`msg ${turn.role}`} key={index}>
              <div className="msg-ic">{turn.role === "assistant" ? "AI" : "You"}</div>
              <div className="bubble">
                {turn.content}
                {turn.prediction && <ChatPrediction prediction={turn.prediction} />}
                {turn.citations && turn.citations.length > 0 && (
                  <div className="chat-cite">
                    {turn.citations.map((cite) => (
                      <span key={cite.source} title={cite.source}>{cite.label}</span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
          {busy && (
            <div className="msg assistant">
              <div className="msg-ic">AI</div>
              <div className="bubble typing"><i /><i /><i /></div>
            </div>
          )}
        </div>

        {suggestions.length > 0 && (
          <div className="suggestions">
            {suggestions.map((suggestion) => (
              <button key={suggestion} onClick={() => send(suggestion)}>{suggestion}</button>
            ))}
          </div>
        )}

        <form
          className="rail-input"
          onSubmit={(event) => {
            event.preventDefault();
            send(input);
          }}
        >
          <textarea
            value={input}
            placeholder="Ask about scoring, fairness, or triage…"
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                send(input);
              }
            }}
          />
          <button className="rail-send" type="submit" disabled={busy || !input.trim()} aria-label="Send">
            <Send size={18} />
          </button>
        </form>
        <p className="rail-note">Advisory only · synthetic data · a caseworker makes the final decision.</p>
      </div>

      <button
        className={`chat-fab ${open ? "is-open" : ""}`}
        onClick={onToggle}
        aria-label={open ? "Close assistant" : "Open assistant"}
        aria-expanded={open}
      >
        <span className="fab-ic fab-chat"><MessageSquare size={24} /></span>
        <span className="fab-ic fab-close"><X size={24} /></span>
        {!open && <span className="fab-ping" aria-hidden="true" />}
      </button>
    </>
  );
}

function ChatPrediction({ prediction }: { prediction: Prediction }) {
  return (
    <div className="chat-pred">
      <div className={`chat-pred-top ${prediction.priority}`}>
        <span>{prediction.priority} priority</span>
        <span className="tabular">{pct(prediction.confidence)}</span>
      </div>
      <ul>
        {prediction.main_reasons.slice(0, 3).map((reason) => (
          <li key={reason.factor}>{reason.factor}</li>
        ))}
        {prediction.human_review_required && <li><strong>Flagged for human review</strong></li>}
      </ul>
    </div>
  );
}
