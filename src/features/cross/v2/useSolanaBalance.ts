// A Solana wallet's balance of the source asset, read through the V2 API (the UI has no Solana RPC of its own), so the widget can show it and offer MAX.
// Re-read every 30 s while the wallet and asset stay the same. Null while unknown: nothing is shown rather than a wrong number.
import { useEffect, useState } from "react";
import type { CrossV2Client } from "./client";

const REFRESH_MS = 30_000;

export function useSolanaBalance(client: CrossV2Client, wallet: string | undefined, asset: string | undefined, decimals: number | undefined): { amount: bigint; decimals: number } | null {
  const [balance, setBalance] = useState<{ amount: bigint; decimals: number } | null>(null);
  useEffect(() => {
    setBalance(null);
    if (!wallet || !asset || decimals === undefined) return;
    const ctl = new AbortController();
    const read = () =>
      client
        .solanaBalance(wallet, asset, ctl.signal)
        // A wallet holding none of a token has no decimals to report: it is zero in the token's own decimals.
        .then((b) => { if (!ctl.signal.aborted && /^[0-9]+$/.test(b.amount)) setBalance({ amount: BigInt(b.amount), decimals: b.decimals ?? decimals }); })
        .catch(() => undefined);
    void read();
    const t = setInterval(read, REFRESH_MS);
    return () => { ctl.abort(); clearInterval(t); };
  }, [client, wallet, asset, decimals]);
  return balance;
}
