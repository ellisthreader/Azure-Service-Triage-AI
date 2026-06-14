import { useState } from "react";
import { MessageSquare, Menu, X } from "lucide-react";
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
        <a className="brand" href="#/" aria-label="Essex County Council AI hub — home">
          <img
            className="brand-logo"
            src="/essex-brand/ecc-logo-long-red.svg"
            alt="Essex County Council"
          />
          <span className="brand-product">AI services hub</span>
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
          {route === "home" && (
            <button className="btn-primary" onClick={onOpenChat}>
              <MessageSquare size={15} /> Ask the assistant
            </button>
          )}
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
          {route === "home" && (
            <button
              className="btn-primary"
              onClick={() => {
                setMenuOpen(false);
                onOpenChat();
              }}
            >
              <MessageSquare size={15} /> Ask the assistant
            </button>
          )}
        </nav>
      )}
    </header>
  );
}
