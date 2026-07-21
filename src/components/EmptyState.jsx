// ─── <EmptyState> ─────────────────────────────────────────────────────────────
//
// Shared empty-state component for lists/tables/panels.  Closes UI-UX-AUDIT-v2
// M9: most empty states across the project were either silent (literally
// nothing) or a bare text line with no visual structure.
//
// Aesthetic: matches the orange/black terminal style.  Icon-optional,
// CTA-optional.  Three sizes — compact (in-row), default (panel-level),
// large (full-page).
//
// Usage:
//
//   {tokens.length === 0 ? (
//     <EmptyState
//       icon={<Inbox className="w-8 h-8" />}
//       title="No tokens found"
//       description="Try a different search term or check the chain selector."
//       action={{ label: "Clear search", onClick: () => setSearch("") }}
//     />
//   ) : (
//     // render the list
//   )}

import { Inbox } from "lucide-react";

const SIZE_MAP = {
  compact: {
    container: "py-6 px-4",
    icon: "w-6 h-6",
    title: "text-xs",
    description: "text-[11px]",
    actionPad: "px-3 py-1.5 text-[10px]",
  },
  default: {
    container: "py-10 px-6",
    icon: "w-8 h-8",
    title: "text-sm",
    description: "text-xs",
    actionPad: "px-4 py-2 text-[11px]",
  },
  large: {
    container: "py-16 px-8",
    icon: "w-12 h-12",
    title: "text-base",
    description: "text-sm",
    actionPad: "px-5 py-2.5 text-xs",
  },
};

/**
 * @typedef {Object} EmptyStateAction
 * @property {string} label
 * @property {() => void} onClick
 * @property {boolean} [primary]  - styled as a CTA (orange) when true; ghost otherwise
 */

/**
 * Empty-state component.
 *
 * @param {Object} props
 * @param {React.ReactNode} [props.icon]        - optional lucide-react icon node; defaults to <Inbox/>
 * @param {string}          props.title         - one-line headline
 * @param {string}          [props.description] - optional helper text below title
 * @param {EmptyStateAction|EmptyStateAction[]} [props.action] - optional CTA button(s)
 * @param {'compact'|'default'|'large'} [props.size]  - default 'default'
 * @param {string}          [props.className]   - extra container classes
 */
export default function EmptyState({
  icon,
  title,
  description,
  action,
  size = "default",
  className = "",
}) {
  const s = SIZE_MAP[size] ?? SIZE_MAP.default;
  const actions = !action ? [] : Array.isArray(action) ? action : [action];
  const DefaultIcon = Inbox;

  return (
    <div
      role="status"
      aria-live="polite"
      className={`flex flex-col items-center justify-center text-center ${s.container} ${className}`}
      data-testid="empty-state"
    >
      <div className={`${s.icon} text-white/30 mb-3`} aria-hidden="true">
        {icon ?? <DefaultIcon className={s.icon} />}
      </div>
      <div
        className={`${s.title} font-bold tracking-[0.06em] uppercase text-white/80 mb-1`}
        data-testid="empty-state-title"
      >
        {title}
      </div>
      {description && (
        <div
          className={`${s.description} text-white/50 max-w-xs leading-relaxed`}
          data-testid="empty-state-description"
        >
          {description}
        </div>
      )}
      {actions.length > 0 && (
        <div className="flex gap-2 mt-4">
          {actions.map((a, i) => (
            <button
              key={`${a.label}-${i}`}
              type="button"
              onClick={a.onClick}
              className={
                a.primary
                  ? `${s.actionPad} bg-[#FF8A00] text-black font-bold uppercase tracking-[0.08em] hover:opacity-80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white cursor-pointer`
                  : `${s.actionPad} border border-white/20 text-white/70 font-bold uppercase tracking-[0.08em] hover:text-white hover:border-white/50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#FF8A00] cursor-pointer`
              }
              data-testid={`empty-state-action-${i}`}
            >
              {a.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
