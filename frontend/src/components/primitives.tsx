import React from "react";

export type SelectOption = {
  value: string;
  label: string;
  help?: string;
};

export function CustomSelect({
  ariaLabel,
  onChange,
  options,
  placeholder = "Select",
  value,
}: {
  ariaLabel: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  value: string;
}) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement | null>(null);
  const listId = React.useId();
  const selected = options.find((option) => option.value === value);

  React.useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent) => {
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  return (
    <div className="custom-select" ref={ref}>
      <button
        type="button"
        className={!selected ? "placeholder" : ""}
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => setOpen((current) => !current)}
      >
        <span>{selected?.label ?? placeholder}</span>
        <i aria-hidden="true" />
      </button>
      {open && (
        <div className="custom-select-list" id={listId} role="listbox" aria-label={ariaLabel}>
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              role="option"
              aria-selected={option.value === value}
              className={option.value === value ? "selected" : ""}
              onClick={() => {
                onChange(option.value);
                setOpen(false);
              }}
            >
              <span>{option.label}</span>
              {option.help && <small>{option.help}</small>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function Kpi({ icon, label, value, hint }: { icon: React.ReactNode; label: string; value: string | number; hint?: string }) {
  return (
    <section className="kpi-card">
      <div className="kpi-icon">{icon}</div>
      <span className="kpi-label">{label}</span>
      <strong className="kpi-value">{value}</strong>
      {hint && <small className="kpi-hint">{hint}</small>}
    </section>
  );
}

export function PanelTitle({ icon, title, action }: { icon: React.ReactNode; title: string; action?: React.ReactNode }) {
  return (
    <div className="panel-title">
      <span className="panel-title-icon">{icon}</span>
      <h2>{title}</h2>
      {action && <span className="panel-title-action">{action}</span>}
    </div>
  );
}

export function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

export function BarRow({
  label,
  value,
  detail,
  tone,
}: {
  label: string;
  value: number;
  detail: string;
  tone: "good" | "warm" | "neutral";
}) {
  return (
    <div className="bar-row">
      <div className="bar-label">
        <span>{label}</span>
        <strong>{detail}</strong>
      </div>
      <div className="bar-track">
        <span className={tone} style={{ width: `${Math.max(4, Math.min(value, 1) * 100)}%` }} />
      </div>
    </div>
  );
}

export function Badge({ label }: { label: string }) {
  const tone = /pass|ready|complete|ok/i.test(label) ? "ok" : /requir/i.test(label) ? "warn" : "neutral";
  return <span className={`badge badge-${tone}`}>{label}</span>;
}
