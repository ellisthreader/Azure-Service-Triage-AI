import { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { type CaseRequest, type Prediction, defaultCase, fetchMetrics } from "./api";
import { useHashRoute } from "./router";
import { TopNav } from "./layout/TopNav";
import { Home } from "./pages/Home";
import { Dashboard } from "./pages/Dashboard";
import { ChatWidget } from "./chat/ChatWidget";
import "./styles.css";

function App() {
  const [route, navigate] = useHashRoute();
  const [chatOpen, setChatOpen] = useState(false);
  const [seed, setSeed] = useState<string | null>(null);
  const [online, setOnline] = useState(false);
  const [caseInput, setCaseInput] = useState<CaseRequest>(defaultCase);
  const [prediction, setPrediction] = useState<Prediction | null>(null);

  const openChat = (prompt?: string) => {
    if (prompt) setSeed(prompt);
    setChatOpen(true);
  };

  useEffect(() => {
    let active = true;
    const ping = () => fetchMetrics().then((metrics) => active && setOnline(metrics !== null));
    ping();
    const timer = window.setInterval(ping, 15000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, []);

  return (
    <div className={`app app--${route}`}>
      <TopNav route={route} online={online} onNavigate={navigate} onOpenChat={() => openChat()} />

      <main className="main-col">
        {route === "home" ? (
          <Home onOpenChat={openChat} onNavigate={navigate} />
        ) : (
          <Dashboard
            caseInput={caseInput}
            setCaseInput={setCaseInput}
            prediction={prediction}
            setPrediction={setPrediction}
          />
        )}
      </main>

      <ChatWidget
        open={chatOpen}
        onToggle={() => setChatOpen((value) => !value)}
        onClose={() => setChatOpen(false)}
        caseContext={caseInput}
        online={online}
        seed={seed}
        onSeedConsumed={() => setSeed(null)}
      />
    </div>
  );
}

createRoot(document.getElementById("root")!).render(<App />);
