import { CSSProperties, ReactNode, useState } from "react";
import { getCachedLogoStatus, setCachedLogoStatus } from "../data/logoRegistry";

export interface ResolvedLogoProps {
  candidates: string[];
  alt: string;
  fallback: ReactNode;
  size: number;
  radius?: number | string;
  className?: string;
  style?: CSSProperties;
}

function usableCandidates(candidates: string[]): string[] {
  return candidates.filter((url) => getCachedLogoStatus(url) !== "fail");
}

export default function ResolvedLogo({
  candidates,
  alt,
  fallback,
  size,
  radius = 4,
  className = "",
  style = {},
}: ResolvedLogoProps) {
  const identityKey = candidates.join("|");
  const [state, setState] = useState({ key: identityKey, attempt: 0 });
  if (state.key !== identityKey) {
    setState({ key: identityKey, attempt: 0 });
  }

  const current = usableCandidates(candidates)[0];
  const box: CSSProperties = {
    width: size,
    height: size,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    overflow: "hidden",
    borderRadius: radius,
    ...style,
  };

  if (!current) {
    return (
      <span className={className} style={box}>
        {fallback}
      </span>
    );
  }

  return (
    <img
      src={current}
      alt={alt}
      loading="lazy"
      className={className}
      style={{
        width: size,
        height: size,
        objectFit: "cover",
        flexShrink: 0,
        borderRadius: radius,
        ...style,
      }}
      onLoad={() => setCachedLogoStatus(current, "ok")}
      onError={() => {
        setCachedLogoStatus(current, "fail");
        setState((prev) => ({
          key: identityKey,
          attempt: prev.key === identityKey ? prev.attempt + 1 : 0,
        }));
      }}
    />
  );
}
