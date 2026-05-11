import { useEffect, useMemo, useState } from "react";
import { useAccount, useSwitchChain } from "wagmi";
import Emp from "../swap/Emp";
import Wallet from "../swap/Wallet";
import { useWidgetConfig } from "../../widget/useWidgetConfig";
import { WIDGET_CHAIN_BY_KEY } from "../../widget/chains";
import { createWidgetContractApi } from "../../widget/widgetContractCalls";
import { useSetSelectedChainId } from "../../hooks/ChainContext";

const parseHexToRgb = (value) => {
  if (!value) return null;
  const normalized = value.trim().replace("#", "");
  if (normalized.length < 6) return null;
  const hex = normalized.slice(0, 6);
  if (!/^[0-9a-fA-F]{6}$/.test(hex)) return null;
  const r = Number.parseInt(hex.slice(0, 2), 16);
  const g = Number.parseInt(hex.slice(2, 4), 16);
  const b = Number.parseInt(hex.slice(4, 6), 16);
  return `${r}, ${g}, ${b}`;
};

const WidgetSwapPage = () => {
  const config = useWidgetConfig();
  const runtime = WIDGET_CHAIN_BY_KEY[config.chain];
  const { address, chain } = useAccount();
  const { chains: walletChains, switchChain } = useSwitchChain();
  const setSelectedChainId = useSetSelectedChainId();
  const [padding, setPadding] = useState("");
  const [bestRoute, setBestRoute] = useState(null);
  const [tokenA, setTokenA] = useState(null);
  const [tokenB, setTokenB] = useState(null);
  const contractApi = useMemo(
    () => createWidgetContractApi(config.integratorId),
    [config.integratorId],
  );

  useEffect(() => {
    const targetChainId = runtime.chainId;
    setSelectedChainId(targetChainId);

    if (!address || chain?.id === targetChainId) {
      return;
    }

    const walletSupportedChainIds = walletChains.map(
      (walletChain) => walletChain.id,
    );
    if (walletSupportedChainIds.includes(targetChainId)) {
      switchChain?.({ chainId: targetChainId });
    }
  }, [
    address,
    chain?.id,
    runtime.chainId,
    setSelectedChainId,
    switchChain,
    walletChains,
  ]);

  const handleTokensChange = (tA, tB) => {
    setTokenA(tA);
    setTokenB(tB);
  };

  const primaryRgb = parseHexToRgb(config.primaryColor) || "255, 138, 0";

  return (
    <div
      className={`widget-embed-mode widget-theme-${config.theme}`}
      style={{
        "--primary": config.primaryColor,
        "--widget-primary": config.primaryColor,
        "--widget-primary-rgb": primaryRgb,
        "--bg-color": config.background,
        "--border-color": config.borderColor,
      }}
    >
      <div className="mx-auto w-full px-4">
        <div className="flex justify-end items-center gap-2 py-3">
          <Wallet />
        </div>
      </div>
      <div className="mx-auto w-full px-4 flex flex-col justify-start gap-4 items-start">
        <Emp
          setPadding={setPadding}
          setBestRoute={setBestRoute}
          onTokensChange={handleTokensChange}
          initialConfig={{
            defaultTokenIn: config.defaultTokenIn,
            defaultTokenOut: config.defaultTokenOut,
            defaultAmountIn: config.defaultAmountIn,
          }}
          displayConfig={{
            isWidgetMode: true,
            theme: config.theme,
            primaryColor: config.primaryColor,
            background: config.background,
            borderColor: config.borderColor,
            showSlippage: config.showSlippage,
            showPoweredBy: config.showPoweredBy,
          }}
          runtimeConfig={{
            routerAddress: runtime.routerAddress,
            wethAddress: runtime.wethAddress,
          }}
          contractApi={contractApi}
        />
      </div>
    </div>
  );
};

export default WidgetSwapPage;
