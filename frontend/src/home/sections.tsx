import { type FormEvent, type ReactNode, useState } from "react";
import {
  Activity,
  ArrowRight,
  ArrowUpRight,
  Clock,
  Eye,
  Facebook,
  Heart,
  Home as HomeIcon,
  Instagram,
  Linkedin,
  MapPin,
  MessageSquare,
  Search,
  Shield,
  Twitter,
  Users,
  Youtube,
  Zap,
} from "lucide-react";
import type { Route } from "../router";
import { FEATURES, NEWS, QUEUE, QUOTES, SERVICES, SOCIAL, STATS, TILES } from "./content";
import { FEATURE_SCENES, TILE_SCENES } from "./illustrations";

const hashFor = (route: Route) => (route === "dashboard" ? "#/dashboard" : "#/");

const ICONS: Record<string, ReactNode> = {
  home: <HomeIcon size={20} />,
  heart: <Heart size={20} />,
  users: <Users size={20} />,
  map: <MapPin size={20} />,
  zap: <Zap size={18} />,
  shield: <Shield size={18} />,
  eye: <Eye size={18} />,
  activity: <Activity size={18} />,
};

const SOCIAL_ICONS: Record<string, ReactNode> = {
  youtube: <Youtube size={18} />,
  linkedin: <Linkedin size={18} />,
  twitter: <Twitter size={18} />,
  facebook: <Facebook size={18} />,
  instagram: <Instagram size={18} />,
};

/* ===== Hero — full-bleed, photographic-style background ===== */
export function Hero({ onAsk, onOpen }: { onAsk: (prompt?: string) => void; onOpen: (route: Route) => void }) {
  const [query, setQuery] = useState("");
  const [service, setService] = useState("");

  function submit(event: FormEvent) {
    event.preventDefault();
    const text = query.trim();
    if (!text) {
      onAsk();
      return;
    }
    const label = SERVICES.find((item) => item.key === service)?.title;
    onAsk(label ? `${text} — ${label}` : text);
  }

  return (
    <section className="hero">
      <div className="hero-bg" aria-hidden="true">
        <span className="blob b1" />
        <span className="blob b2" />
        <span className="blob b3" />
        <span className="hero-grid" />
      </div>
      <div className="hero-scrim" aria-hidden="true" />

      <div className="hero-inner">
        <div className="hero-copy">
          <span className="hero-eyebrow">Responsible AI for public services</span>
          <h1>Every request, routed to the right team first.</h1>
          <p className="lede">
            Service Priority AI scores incoming requests the moment they arrive — fairly, transparently, and
            always with a caseworker in the loop.
          </p>

          <form className="hero-search" onSubmit={submit}>
            <div className="field">
              <Search size={18} />
              <input
                aria-label="What do you need help with?"
                placeholder="What do you need help with?"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </div>
            <div className="field field-select">
              <select
                aria-label="Service area"
                value={service}
                onChange={(event) => setService(event.target.value)}
              >
                <option value="">All services</option>
                {SERVICES.map((item) => (
                  <option key={item.key} value={item.key}>{item.title}</option>
                ))}
              </select>
            </div>
            <button type="submit">
              <MessageSquare size={16} /> Ask the assistant
            </button>
          </form>

          <div className="hero-popular">
            <span>Popular:</span>
            <button type="button" onClick={() => onAsk("How do I report a repair?")}>Report a repair</button>
            <button type="button" onClick={() => onAsk("How do I request a care assessment?")}>Request care assessment</button>
            <button type="button" onClick={() => onAsk("What council tax support is available?")}>Council tax support</button>
            <a href={hashFor("dashboard")} onClick={() => onOpen("dashboard")}>Model dashboard</a>
          </div>
        </div>

        <div className="hero-visual">
          <HeroCard />
        </div>
      </div>
    </section>
  );
}

/* A single case mid-triage — distinct from the queue list below. */
function HeroCard() {
  return (
    <div className="hero-card">
      <div className="hero-card-head">
        <strong>Live triage</strong>
        <span className="hero-chip"><span className="dot-live" /> Scoring</span>
      </div>
      <div className="hero-gauge">
        <div className="gauge" style={{ ["--v" as string]: 92 }}>
          <b>92</b>
          <small>score</small>
        </div>
        <div className="hero-gauge-meta">
          <span className="queue-flag high">High priority</span>
          <p>Housing — no heating, family with young children</p>
        </div>
      </div>
      <ul className="hero-reasons">
        <li>Vulnerability flag present</li>
        <li>Emergency keywords in the request</li>
        <li>Repeat contact within 48 hours</li>
      </ul>
      <div className="hero-review">Routed for same-day human review</div>
    </div>
  );
}

/* ===== Trust strip ===== */
export function TrustStrip() {
  return (
    <section className="trust">
      <div className="wrap">
        {STATS.map((stat) => (
          <div className="trust-item" key={stat.label}>
            <strong>{stat.value}</strong>
            <span>{stat.label}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ===== Live priority queue — horizontal card row ===== */
export function Queue({ onOpen }: { onOpen: (route: Route) => void }) {
  return (
    <section className="section">
      <div className="wrap">
        <div className="section-head">
          <div>
            <h2>Live priority queue</h2>
            <p>How requests are scored and ordered right now. Illustrative view using synthetic data.</p>
          </div>
          <a className="section-link" href={hashFor("dashboard")} onClick={() => onOpen("dashboard")}>
            View all <ArrowRight size={16} />
          </a>
        </div>
        <div className="vac-row">
          {QUEUE.map((item) => (
            <a className="vac-card" key={item.title} href={hashFor("dashboard")} onClick={() => onOpen("dashboard")}>
              <span className={`queue-flag ${item.flag}`}>{item.flag} priority</span>
              <h3>{item.title}</h3>
              <div className="vac-conf">
                <div className="vac-bar"><span style={{ width: `${item.confidence}%` }} /></div>
                <small>Priority score · {item.confidence}/100</small>
              </div>
              <div className="vac-meta">
                <span>{item.service}</span>
                <span>·</span>
                <span>{item.channel}</span>
              </div>
              <div className="vac-foot">
                <span><Clock size={12} /> {item.age}</span>
                <span className="vac-go">View case <ArrowRight size={14} /></span>
              </div>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ===== Popular services ===== */
export function Services({ onOpen }: { onOpen: (route: Route) => void }) {
  return (
    <section className="section tint" id="services">
      <div className="wrap">
        <div className="section-head">
          <div>
            <h2>Popular services</h2>
            <p>Start a request and the assistant will route it to the right team based on urgency and need.</p>
          </div>
          <a className="section-link" href={hashFor("dashboard")} onClick={() => onOpen("dashboard")}>
            See the model dashboard <ArrowRight size={16} />
          </a>
        </div>
        <div className="service-grid">
          {SERVICES.map((service) => (
            <article className="service-card" key={service.key}>
              <div className="service-ic">{ICONS[service.icon]}</div>
              <h3>{service.title}</h3>
              <p>{service.blurb}</p>
              <span className="sla"><Clock size={13} /> {service.sla}</span>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ===== How it works — three large image tiles ===== */
export function Tiles({ onOpen }: { onOpen: (route: Route) => void }) {
  return (
    <section className="section" id="how-it-works">
      <div className="wrap">
        <div className="section-head center">
          <div>
            <h2>How Service Priority AI works</h2>
            <p>
              Three things have to be true for a triage layer to be worth trusting: it has to be fast, fair, and
              accountable. Here is how each one is built in.
            </p>
          </div>
        </div>
        <div className="tile-grid">
          {TILES.map((tile) => {
            const Scene = TILE_SCENES[tile.icon];
            return (
              <a className="tile" key={tile.title} href={hashFor(tile.route)} onClick={() => onOpen(tile.route)}>
                <div className="tile-cover" style={{ background: tile.grad }}>
                  {Scene && <Scene />}
                  <span className="tile-ic">{ICONS[tile.icon]}</span>
                  <span className="tile-eyebrow">{tile.eyebrow}</span>
                </div>
                <div className="tile-body">
                  <h3>{tile.title}</h3>
                  <p>{tile.body}</p>
                  <span className="tile-link">{tile.link} <ArrowRight size={15} /></span>
                </div>
              </a>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ===== Two alternating media/text feature rows ===== */
export function Features({ onOpen }: { onOpen: (route: Route) => void }) {
  return (
    <section className="section tint">
      <div className="wrap features">
        {FEATURES.map((feature, index) => {
          const Scene = FEATURE_SCENES[index % FEATURE_SCENES.length];
          return (
            <div className={`feature ${index % 2 === 1 ? "rev" : ""}`} key={feature.title}>
              <div className="feature-media" style={{ background: feature.grad }}>
                {Scene && <Scene />}
                <a
                  className="feature-open"
                  href={hashFor(feature.route)}
                  onClick={() => onOpen(feature.route)}
                  aria-label={`${feature.link}: ${feature.title}`}
                >
                  <ArrowUpRight size={26} />
                </a>
                <div className="feature-stat">
                  <strong>{feature.stat.value}</strong>
                  <span>{feature.stat.label}</span>
                </div>
              </div>
              <div className="feature-text">
                <span className="feature-kicker">{feature.kicker}</span>
                <h2>{feature.title}</h2>
                <p>{feature.body}</p>
                <a className="section-link" href={hashFor(feature.route)} onClick={() => onOpen(feature.route)}>
                  {feature.link} <ArrowRight size={16} />
                </a>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

/* ===== Testimonials ===== */
export function Quotes() {
  return (
    <section className="section">
      <div className="wrap">
        <div className="section-head">
          <div>
            <h2>From the people using it</h2>
            <p>Illustrative voices from the caseworkers and governance teams the tool is designed for.</p>
          </div>
        </div>
        <div className="quote-grid">
          {QUOTES.map((quote) => (
            <article className="quote-card" key={quote.name}>
              <p>“{quote.quote}”</p>
              <div className="quote-person">
                <span className="avatar" style={{ background: quote.color }}>
                  {quote.name.charAt(0)}
                </span>
                <div>
                  <b>{quote.name}</b>
                  <small>{quote.role}</small>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ===== News grid ===== */
export function News() {
  return (
    <section className="section tint">
      <div className="wrap">
        <div className="section-head">
          <div>
            <h2>Notes from the team</h2>
            <p>Writing on responsible AI, fairness, and the engineering behind the service.</p>
          </div>
        </div>
        <div className="news-grid">
          {NEWS.map((article) => (
            <article className="news-card" key={article.title}>
              <div className="news-cover" style={{ background: article.cover }}>
                <span className="news-date">{article.date}</span>
              </div>
              <div className="news-body">
                <span className="news-tag">{article.tag}</span>
                <h3>{article.title}</h3>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ===== CTA ===== */
export function Cta({ onAsk }: { onAsk: () => void }) {
  return (
    <section className="cta">
      <div className="wrap">
        <div>
          <h2>Have a request? Let the assistant triage it.</h2>
          <p>Describe what you need and the assistant will score it and point you to the right team.</p>
        </div>
        <button className="btn-amber" onClick={onAsk}>
          <MessageSquare size={18} /> Open the assistant
        </button>
      </div>
    </section>
  );
}

/* ===== Footer ===== */
export function Footer() {
  return (
    <footer className="footer">
      <div className="wrap">
        <div className="footer-top">
          <div className="footer-brand">
            <h4>Service Priority AI</h4>
            <p>A responsible-AI demonstration for public-service request prioritisation. Synthetic data only.</p>
            <div className="footer-social">
              {SOCIAL.map((name) => (
                <a key={name} aria-label={name} className="soc" href="#/">{SOCIAL_ICONS[name]}</a>
              ))}
            </div>
          </div>
          <div className="footer-links">
            <div>
              <h4>Services</h4>
              <ul>
                {SERVICES.map((service) => (
                  <li key={service.key}><a href="#services">{service.title}</a></li>
                ))}
              </ul>
            </div>
            <div>
              <h4>Product</h4>
              <ul>
                <li><a href="#/dashboard">Model dashboard</a></li>
                <li><a href="#/dashboard">Monitoring</a></li>
                <li><a href="#/dashboard">Responsible AI</a></li>
              </ul>
            </div>
            <div>
              <h4>About</h4>
              <ul>
                <li><a href="#how-it-works">How it works</a></li>
                <li><a href="#/">Accessibility</a></li>
                <li><a href="#/">Privacy</a></li>
                <li><a href="#/">Site map</a></li>
              </ul>
            </div>
          </div>
        </div>
        <div className="footer-bottom">
          <span>© 2026 Service Priority AI · Demonstration project · Synthetic data</span>
          <span>Advisory output · Human review in the loop</span>
        </div>
      </div>
    </footer>
  );
}
