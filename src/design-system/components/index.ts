// ─── EmpX Design System — component exports ──────────────────────────────────

// Breakpoints + responsive hooks
export { breakpoints, mq, useBreakpoint, useMediaQuery, useIsMobile } from "../breakpoints";
export type { BreakpointKey } from "../breakpoints";

// Surfaces
export { default as Card } from "./Card";
export { default as LogoTile } from "./LogoTile";
export { default as BrandMark } from "./BrandMark";

// Loading / empty states
export { default as Skeleton } from "./Skeleton";
export { default as EmptyState } from "./EmptyState";

// Navigation primitive
export { default as Tabs } from "./Tabs";
export type { TabOption } from "./Tabs";

// Social links tray
export { default as SocialTray } from "./SocialTray";
export type { SocialLink } from "./SocialTray";

// Numbers + breakdowns
export { default as NumberDisplay } from "./NumberDisplay";
export { default as FeeBreakdown } from "./FeeBreakdown";
export type { FeeRow } from "./FeeBreakdown";

// Borderless switchers — clickable
export { default as TokenSwitcher } from "./TokenSwitcher";
export { default as ChainSwitcher } from "./ChainSwitcher";

// Passive identifiers
export { default as ChainBadge } from "./ChainBadge";
export { default as ChainLogo } from "./ChainLogo";
export { default as TokenLogo } from "./TokenLogo";

// Inline labels
export { default as Pill } from "./Pill";

// Inputs + buttons
export { default as AmountInput } from "./AmountInput";
export { default as SwapDivider } from "./SwapDivider";
export { default as PrimaryButton } from "./PrimaryButton";

// Disclosure
export { default as Collapsible } from "./Collapsible";

// Routing visual
export { default as RouteVisualization } from "./RouteVisualization";
export type { RouteHop } from "./RouteVisualization";
export { default as SplitRouteVisualization } from "./SplitRouteVisualization";
export type { SplitBranch } from "./SplitRouteVisualization";

// Quote countdown
export { default as QuoteCountdown } from "./QuoteCountdown";

// Overlay system
export { default as Modal } from "./Modal";

// Pickers
export { default as TokenPicker } from "./TokenPicker";
export type { PickerToken } from "./TokenPicker";
export { default as ChainPicker } from "./ChainPicker";
export type { PickerChain } from "./ChainPicker";

// Specialist modals
export { default as WalletModal } from "./WalletModal";
export type { WalletOption } from "./WalletModal";
export { default as ConfirmTradeModal } from "./ConfirmTradeModal";
export { default as AccountModal } from "./AccountModal";
export type { RecentActivityItem } from "./AccountModal";

// NFT panel + gallery
export { default as NFTPanel } from "./NFTPanel";
export type { NFTItem } from "./NFTPanel";
export { default as NFTGalleryModal } from "./NFTGalleryModal";

// Account modal additions
export type { AccountTokenBalance, AccountNetworkBalance } from "./AccountModal";

// Trade success
export { default as TradeSuccessModal } from "./TradeSuccessModal";
export type { TradeTimelineStep, TxHashLink } from "./TradeSuccessModal";

// Toaster
export { default as Toaster, toast } from "./Toaster";

// Navigation
export { default as DappNavbar } from "./DappNavbar";
export type { NavLink } from "./DappNavbar";
export { default as WalletButton } from "./WalletButton";
export { default as NetworkSelector } from "./NetworkSelector";

// Backwards-compat aliases
export { default as TokenButton } from "./TokenSwitcher";
