import type { ReactNode } from "react";
import {
  ArrowRight,
  Banknote,
  BookOpen,
  BriefcaseBusiness,
  Building2,
  Bus,
  CreditCard,
  Facebook,
  HeartHandshake,
  Landmark,
  Linkedin,
  Mail,
  Palette,
  Recycle,
  Search,
  School,
  Twitter,
  Users,
  Youtube,
} from "lucide-react";
import type { Route } from "../router";
import {
  CALLOUTS,
  CAMPAIGN,
  FEEDBACK,
  FOOTER_LINKS,
  HERO,
  NEWS,
  NEWSLETTER,
  NEWS_MORE,
  SERVICES,
  SOCIAL_LINKS,
} from "./content";

const serviceIcons: Record<string, ReactNode> = {
  heart: <HeartHandshake size={20} />,
  users: <Users size={20} />,
  school: <School size={20} />,
  briefcase: <BriefcaseBusiness size={20} />,
  landmark: <Landmark size={20} />,
  book: <BookOpen size={20} />,
  road: <Bus size={20} />,
  recycle: <Recycle size={20} />,
  building: <Building2 size={20} />,
  council: <Landmark size={20} />,
  palette: <Palette size={20} />,
  card: <CreditCard size={20} />,
};

const socialIcons: Record<string, ReactNode> = {
  facebook: <Facebook size={18} />,
  twitter: <Twitter size={18} />,
  linkedin: <Linkedin size={18} />,
  youtube: <Youtube size={18} />,
};

export function Hero({ onOpen }: { onOpen: (route: Route) => void }) {
  return (
    <section className="essex-hero">
      <img className="hero-generated-bg" src={HERO.generatedBackdrop} alt="" aria-hidden="true" />
      <div className="hero-shell">
        <div className="hero-copy">
          <img className="hero-logo" src="/essex-brand/ecc-logo-long-red.svg" alt="Essex County Council" />
          <span className="hero-kicker">Modernised homepage concept</span>
          <h1>{HERO.title}</h1>
          <p>
            Services, support, campaigns and news from the current Essex homepage, presented in a cleaner and more
            direct interface.
          </p>
          <form className="hero-search" onSubmit={(event) => event.preventDefault()}>
            <Search size={19} />
            <input aria-label={HERO.searchLabel} placeholder={HERO.searchLabel} />
            <button type="submit">
              Search
            </button>
          </form>
          <div className="hero-actions">
            <a href="#services">Browse services <ArrowRight size={16} /></a>
            <button type="button" onClick={() => onOpen("dashboard")}>Open AI dashboard</button>
          </div>
        </div>

        <div className="hero-photo-panel">
          <img src={HERO.primaryImage} alt={HERO.primaryAlt} />
          <div className="hero-photo-caption">
            <strong>Search, support and services</strong>
            <span>Current homepage content, rebuilt as a polished product surface.</span>
          </div>
        </div>
      </div>
    </section>
  );
}

export function TrustStrip() {
  return (
    <section className="quick-callouts">
      <div className="wrap">
        {CALLOUTS.map((item) => (
          <a className={`callout-card ${item.tone}`} href={item.href} key={item.title}>
            <span>{item.tone === "blue" ? <Banknote size={20} /> : <Landmark size={20} />}</span>
            <div>
              <h2>{item.title}</h2>
              <p>{item.body}</p>
              <strong>{item.label} <ArrowRight size={15} /></strong>
            </div>
          </a>
        ))}
      </div>
    </section>
  );
}

export function Queue() {
  return (
    <section className="essex-section" id="services">
      <div className="wrap">
        <SectionHead eyebrow="Our services" title="Everything from the Essex homepage, made easier to scan." />
        <div className="service-grid">
          {SERVICES.map((service) => (
            <a className="service-card" href={service.href} key={service.title}>
              <span className="service-icon">{serviceIcons[service.icon]}</span>
              <h3>{service.title}</h3>
              <p>{service.body}</p>
              <strong>Open service <ArrowRight size={14} /></strong>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}

export function Services() {
  return (
    <section className="essex-section section-soft" id="campaigns">
      <div className="wrap">
        <div className="campaign-panel">
          <div className="campaign-copy">
            <span className="section-eyebrow">Current campaign</span>
            <h2>{CAMPAIGN.title}</h2>
            <p>{CAMPAIGN.body}</p>
            <a href={CAMPAIGN.href}>{CAMPAIGN.label} <ArrowRight size={16} /></a>
          </div>
          <img src={CAMPAIGN.image} alt={CAMPAIGN.alt} />
        </div>
      </div>
    </section>
  );
}

export function Tiles() {
  return null;
}

export function Features() {
  return null;
}

export function Quotes() {
  return null;
}

export function News() {
  return (
    <section className="essex-section" id="news">
      <div className="wrap">
        <SectionHead eyebrow="Our news" title="Latest council updates." action={<a href={NEWS_MORE.href}>{NEWS_MORE.label}</a>} />
        <div className="news-grid">
          {NEWS.map((article) => (
            <a className="news-card" href={article.href} key={article.title}>
              <img src={article.image} alt={article.alt} />
              <div className="news-body">
                <span>{article.date}</span>
                <h3>{article.title}</h3>
                <p>{article.body}</p>
              </div>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}

export function Cta() {
  return (
    <section className="newsletter-section">
      <div className="wrap">
        <div className="newsletter-card">
          <span className="newsletter-icon"><Mail size={22} /></span>
          <div>
            <h2>{NEWSLETTER.title}</h2>
            <p>{NEWSLETTER.body}</p>
          </div>
          <a href={NEWSLETTER.href}>{NEWSLETTER.label}</a>
        </div>
      </div>
    </section>
  );
}

export function Footer() {
  return (
    <footer className="footer">
      <div className="wrap">
        <div className="footer-top">
          <div className="footer-brand">
            <img className="footer-logo" src="/essex-brand/ecc-logo-long-red.svg" alt="Essex County Council" />
            <p>{FEEDBACK.body}</p>
            <a className="feedback-link" href={FEEDBACK.href}>Give feedback</a>
          </div>
          <div className="footer-links">
            <div>
              <h4>Footer</h4>
              <ul>
                {FOOTER_LINKS.map((link) => (
                  <li key={link.label}><a href={link.href}>{link.label}</a></li>
                ))}
              </ul>
            </div>
            <div>
              <h4>Social Media</h4>
              <div className="social-grid">
                {SOCIAL_LINKS.map((link) => (
                  <a className="social-link" href={link.href} key={link.label} aria-label={link.label}>
                    {socialIcons[link.icon]}
                    <span>{link.label}</span>
                  </a>
                ))}
              </div>
            </div>
          </div>
        </div>
        <div className="footer-bottom">
          <span>Content and imagery from the Essex County Council homepage.</span>
          <span>Modernised local prototype.</span>
        </div>
      </div>
    </footer>
  );
}

function SectionHead({ eyebrow, title, action }: { eyebrow: string; title: string; action?: ReactNode }) {
  return (
    <div className="section-head">
      <div>
        <span className="section-eyebrow">{eyebrow}</span>
        <h2>{title}</h2>
      </div>
      {action ? <div className="section-action">{action}</div> : null}
    </div>
  );
}
