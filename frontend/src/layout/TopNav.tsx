import { useState } from "react";
import { MessageSquare, Menu, ShieldCheck, X } from "lucide-react";
import type { Route } from "../router";
import { NAV } from "../home/content";

type Props = {
  route: Route;
  online: boolean;
  onNavigate: (route: Route) => void;
  onOpenChat: () => void;
};

export function TopNav({ route, online, onOpenChat }: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const isActive = (match?: "home" | "dashboard") => match !== undefined && match === route;

  return (
    <header className="topnav">
      <div className="topnav-inner">
        <a className="brand" href="#/" aria-label="Service Priority AI — home">
          <span className="brand-mark"><ShieldCheck size={18} /></span>
          <span className="brand-name">
            Service Priority<span className="brand-ai">AI</span>
          </span>
        </a>

        <nav className="nav-links" aria-label="Primary">
          {NAV.map((item) => (
            <a key={item.label} className={isActive(item.match) ? "active" : ""} href={item.href}>
              {item.label}
            </a>
          ))}
        </nav>

        <div className="nav-actions">
          {route === "dashboard" && (
            <span className={`nav-pill ${online ? "" : "offline"}`} title={online ? "API online" : "API offline"}>
              <span className="dot-live" /> {online ? "API online" : "API offline"}
            </span>
          )}
          <button className="btn-primary" onClick={onOpenChat}>
            <MessageSquare size={15} /> Ask the assistant
          </button>
          <button
            className="nav-burger"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((value) => !value)}
          >
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {menuOpen && (
        <nav className="nav-mobile" aria-label="Mobile">
          {NAV.map((item) => (
            <a
              key={item.label}
              className={isActive(item.match) ? "active" : ""}
              href={item.href}
              onClick={() => setMenuOpen(false)}
            >
              {item.label}
            </a>
          ))}
          <button
            className="btn-primary"
            onClick={() => {
              setMenuOpen(false);
              onOpenChat();
            }}
          >
            <MessageSquare size={15} /> Ask the assistant
          </button>
        </nav>
      )}
    </header>
  );
}
