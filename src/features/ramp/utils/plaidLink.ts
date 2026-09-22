export type PlaidLinkLauncher = (linkToken: string) => Promise<string>;

type PlaidHandler = {
  open: () => void;
  destroy?: () => void;
};

type PlaidFactory = {
  create: (config: {
    token: string;
    onSuccess: (publicToken: string) => void;
    onExit?: (error: unknown | null) => void;
  }) => PlaidHandler;
};

const PLAID_SCRIPT = "https://cdn.plaid.com/link/v2/stable/link-initialize.js";

function plaidFromWindow(): PlaidFactory | undefined {
  return (window as Window & { Plaid?: PlaidFactory }).Plaid;
}

export function loadPlaidFactory(): Promise<PlaidFactory> {
  const existing = plaidFromWindow();
  if (existing) return Promise.resolve(existing);
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = PLAID_SCRIPT;
    script.async = true;
    script.dataset.plaidLink = "true";
    script.onload = () => {
      const loaded = plaidFromWindow();
      if (!loaded) {
        reject(new Error("Plaid Link loaded without a factory."));
        return;
      }
      resolve(loaded);
    };
    script.onerror = () => reject(new Error("Plaid Link failed to load."));
    document.head.appendChild(script);
  });
}

export async function launchPlaidLink(linkToken: string): Promise<string> {
  if (!linkToken.trim()) {
    throw new Error("Bank-link session is missing a link token.");
  }
  const Plaid = await loadPlaidFactory();
  return new Promise((resolve, reject) => {
    const handler = Plaid.create({
      token: linkToken,
      onSuccess: (publicToken) => {
        handler.destroy?.();
        resolve(publicToken);
      },
      onExit: (error) => {
        handler.destroy?.();
        reject(error instanceof Error ? error : new Error("Bank link was closed before a public token was returned."));
      },
    });
    handler.open();
  });
}

export async function exchangeAfterPlaidLink(input: {
  linkToken: string;
  launch?: PlaidLinkLauncher;
  exchange: (publicToken: string) => Promise<unknown>;
}): Promise<unknown> {
  const launch = input.launch ?? launchPlaidLink;
  const publicToken = await launch(input.linkToken);
  if (!publicToken.trim()) {
    throw new Error("Plaid Link did not return a public token.");
  }
  return input.exchange(publicToken);
}
