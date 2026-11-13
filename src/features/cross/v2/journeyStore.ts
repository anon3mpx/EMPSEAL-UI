// Open journeys and transfers per wallet, so a reload or a closed tab can pick one up again (plan 6.3, 7.3). Browser storage only: it is a
// convenience, never the record — the server's status is the truth, and a missing or cleared store loses nothing on-chain.
const MAX_PER_WALLET = 10;

function walletList<T extends { id: string }>(key: string) {
  const readAll = (): Record<string, T[]> => {
    try {
      const v = JSON.parse(localStorage.getItem(key) ?? "{}");
      return v && typeof v === "object" && !Array.isArray(v) ? v : {};
    } catch {
      return {};
    }
  };
  const writeAll = (v: Record<string, T[]>) => {
    try {
      localStorage.setItem(key, JSON.stringify(v));
    } catch {
      /* storage unavailable: resume simply is not offered */
    }
  };
  return {
    list(wallet: string): T[] {
      const l = readAll()[wallet.toLowerCase()];
      return Array.isArray(l) ? l.filter((x) => typeof x?.id === "string") : [];
    },
    remember(wallet: string, item: T) {
      const all = readAll();
      const w = wallet.toLowerCase();
      all[w] = [item, ...(all[w] ?? []).filter((x) => x.id !== item.id)].slice(0, MAX_PER_WALLET);
      writeAll(all);
    },
    forget(wallet: string, id: string) {
      const all = readAll();
      const w = wallet.toLowerCase();
      all[w] = (all[w] ?? []).filter((x) => x.id !== id);
      writeAll(all);
    },
  };
}

export interface StoredJourney {
  journeyId: string;
  createdAt: number;
  /** CAIP-2 ids, for labels before the server answers. */
  fromChain: string;
  viaChain: string;
  toChain: string;
  toAsset: string;
  recipient: string;
}
const journeys = walletList<StoredJourney & { id: string }>("empx.v2.journeys");
export const openJourneys = (wallet: string): StoredJourney[] => journeys.list(wallet);
export const rememberJourney = (wallet: string, j: StoredJourney) => journeys.remember(wallet, { ...j, id: j.journeyId });
export const forgetJourney = (wallet: string, journeyId: string) => journeys.forget(wallet, journeyId);

/** A single-order transfer the wallet started, with the source transactions it sent (for explorer links before the server lists them). */
export interface StoredIntent {
  intentId: string;
  createdAt: number;
  fromChain: string;
  toChain: string;
  toAsset: string;
  /** The compiled rail (for its explorer link). Absent on transfers stored before it was recorded. */
  rail?: string;
  /** `stepId` says what each transaction was (fee, approval, transfer). Absent on transfers stored before it was recorded. */
  sourceTxs: Array<{ chainId: number; hash: string; stepId?: string }>;
}
const intents = walletList<StoredIntent & { id: string }>("empx.v2.intents");
export const openIntents = (wallet: string): StoredIntent[] => intents.list(wallet);
export const rememberIntent = (wallet: string, i: StoredIntent) => intents.remember(wallet, { ...i, id: i.intentId });
export const forgetIntent = (wallet: string, intentId: string) => intents.forget(wallet, intentId);

export interface StoredBasket {
  basketId: string;
  createdAt: number;
}
const baskets = walletList<StoredBasket & { id: string }>("empx.v2.baskets");
export const openBaskets = (wallet: string): StoredBasket[] => baskets.list(wallet);
export const rememberBasket = (wallet: string, b: StoredBasket) => baskets.remember(wallet, { ...b, id: b.basketId });
export const forgetBasket = (wallet: string, basketId: string) => baskets.forget(wallet, basketId);
