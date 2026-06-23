// ─── SocialTray — X · Telegram · Docs · GitHub icon row ────────────────────

import { CSSProperties, ReactNode } from "react";

export interface SocialLink {
  /** Visual identifier */
  kind: "x" | "telegram" | "docs" | "github" | "discord" | "mirror" | "custom";
  /** Tooltip + accessible label */
  label?: string;
  /** Destination URL */
  href: string;
  /** Custom icon override (defaults to built-in for known kinds) */
  icon?: ReactNode;
}

interface SocialTrayProps {
  links: SocialLink[];
  size?: number;
  className?: string;
  style?: CSSProperties;
  /** When set, separator line renders before the tray (slots between nav controls) */
  withSeparator?: boolean;
}

const ICONS: Record<SocialLink["kind"], ReactNode> = {
  x: (
    <svg width="11" height="11" viewBox="0 0 14 14" fill="none">
      <path d="M10.4 1.5h2.05L8.05 6.55l5.25 6.95H9.25L6.1 9.4l-3.6 4.1H.45l4.7-5.4L.1 1.5h4.15l2.85 3.75L10.4 1.5zm-.7 10.75h1.13L4.4 2.65H3.2l6.5 9.6z" fill="currentColor" />
    </svg>
  ),
  telegram: (
    <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
      <path d="M12.95 1.65L1.05 6.25c-.55.22-.55.7-.07.85l3.0.93 1.16 3.6c.15.45.27.45.55.35.22-.08 1.8-1.13 1.95-1.23l3.3 2.45c.6.33.95.16 1.08-.55l2.0-9.45c.17-.83-.27-1.2-1.07-.86zM5.6 9.83l-.4-.6c-.07-.1-.05-.27.05-.36l5.5-5.0c.13-.13.3-.05.2.13l-4.7 5.55c-.07.08-.18.13-.28.13l-.37.15z" fill="currentColor" />
    </svg>
  ),
  docs: (
    <svg width="11" height="12" viewBox="0 0 11 12" fill="none">
      <path d="M1.5 1.5h5l3 3v6.5H1.5V1.5z" stroke="currentColor" strokeWidth="1.1" strokeLinejoin="round" />
      <path d="M6.5 1.5V4.5H9.5" stroke="currentColor" strokeWidth="1.1" strokeLinejoin="round" />
      <path d="M3.5 6.5H7.5M3.5 8.5H7.5" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" />
    </svg>
  ),
  github: (
    <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
      <path d="M7 .5C3.4.5.5 3.4.5 7c0 2.9 1.85 5.32 4.43 6.18.32.06.44-.14.44-.31v-1.1c-1.8.4-2.18-.86-2.18-.86-.3-.75-.72-.95-.72-.95-.6-.4.04-.4.04-.4.65.05.99.67.99.67.58.99 1.52.7 1.89.54.06-.42.23-.7.41-.86-1.43-.16-2.94-.72-2.94-3.2 0-.7.25-1.28.67-1.73-.07-.16-.29-.83.06-1.72 0 0 .54-.17 1.78.66a6.2 6.2 0 013.24 0c1.23-.83 1.78-.66 1.78-.66.35.89.13 1.56.06 1.72.41.45.66 1.03.66 1.73 0 2.5-1.51 3.04-2.95 3.2.23.2.44.6.44 1.22v1.8c0 .17.12.38.45.31C11.65 12.32 13.5 9.9 13.5 7c0-3.6-2.9-6.5-6.5-6.5z" fill="currentColor" />
    </svg>
  ),
  discord: (
    <svg width="13" height="10" viewBox="0 0 13 10" fill="none">
      <path d="M11.05.7A10.6 10.6 0 008.3.05c-.13.22-.27.5-.36.74a9.85 9.85 0 00-2.88 0A6.5 6.5 0 004.7.05c-.97.17-1.92.45-2.78.68C.18 3.27-.27 5.78.0 8.27a10.7 10.7 0 003.18 1.55c.26-.34.5-.7.7-1.07a6.9 6.9 0 01-1.1-.5l.28-.2c2.13.95 4.43.95 6.5 0l.3.2c-.36.2-.73.37-1.1.5.2.37.43.74.7 1.07 1.13-.33 2.2-.85 3.18-1.55.25-2.83-.42-5.3-1.78-7.57zM4.4 6.85c-.65 0-1.2-.6-1.2-1.32 0-.7.55-1.3 1.2-1.3.66 0 1.2.6 1.2 1.3 0 .72-.54 1.32-1.2 1.32zm4.2 0c-.66 0-1.2-.6-1.2-1.32 0-.7.55-1.3 1.2-1.3.65 0 1.2.6 1.2 1.3 0 .72-.55 1.32-1.2 1.32z" fill="currentColor" />
    </svg>
  ),
  mirror: (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
      <circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.1" />
      <path d="M3.5 6.5L6 4L8.5 6.5" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  custom: null,
};

const DEFAULT_LABEL: Record<SocialLink["kind"], string> = {
  x: "X (Twitter)",
  telegram: "Telegram",
  docs: "Documentation",
  github: "GitHub",
  discord: "Discord",
  mirror: "Mirror",
  custom: "Link",
};

export default function SocialTray({ links, size = 30, className = "", style = {}, withSeparator = false }: SocialTrayProps) {
  return (
    <span
      className={`empx-social-tray ${className}`}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        ...style,
      }}
    >
      {withSeparator && (
        <span
          aria-hidden
          style={{
            display: "inline-block",
            width: 1,
            height: 16,
            background: "rgba(255,255,255,0.08)",
            marginRight: 6,
            marginLeft: 2,
          }}
        />
      )}
      {links.map((link, i) => (
        <a
          key={i}
          href={link.href}
          target="_blank"
          rel="noreferrer"
          aria-label={link.label || DEFAULT_LABEL[link.kind]}
          title={link.label || DEFAULT_LABEL[link.kind]}
          style={{
            width: size,
            height: size,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            color: "rgba(255,255,255,0.55)",
            borderRadius: 4,
            transition: "color 160ms ease, background 160ms ease",
            textDecoration: "none",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = "#FF8A00";
            e.currentTarget.style.background = "rgba(255,138,0,0.06)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = "rgba(255,255,255,0.55)";
            e.currentTarget.style.background = "transparent";
          }}
        >
          {link.icon || ICONS[link.kind]}
        </a>
      ))}
    </span>
  );
}
