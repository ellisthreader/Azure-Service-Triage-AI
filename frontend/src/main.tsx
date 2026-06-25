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
  const [online, setOnline] = useState(false);
  const [caseInput, setCaseInput] = useState<CaseRequest>(defaultCase);
  const [prediction, setPrediction] = useState<Prediction | null>(null);

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

  useEffect(() => {
    document.body.classList.toggle("body--dashboard", route === "dashboard");
    document.documentElement.classList.toggle("html--dashboard", route === "dashboard");
    return () => {
      document.body.classList.remove("body--dashboard");
      document.documentElement.classList.remove("html--dashboard");
    };
  }, [route]);

  return (
    <div className={`app app--${route}`}>
      {route === "home" && (
        <TopNav
          route={route}
          online={online}
          onNavigate={navigate}
        />
      )}

      <main className="main-col">
        {route === "home" ? (
          <Home onNavigate={navigate} />
        ) : (
          <Dashboard
            caseInput={caseInput}
            setCaseInput={setCaseInput}
            prediction={prediction}
            setPrediction={setPrediction}
            online={online}
            chatOpen={chatOpen}
            onToggleChat={() => setChatOpen((value) => !value)}
          />
        )}
      </main>

      {route === "dashboard" && (
        <ChatWidget
          open={chatOpen}
          onClose={() => setChatOpen(false)}
          caseContext={caseInput}
          online={online}
        />
      )}
    </div>
  );
}

createRoot(document.getElementById("root")!).render(<App />);
