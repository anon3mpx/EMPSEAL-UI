import DestinationAddressInput from "../../../components/DestinationAddressInput";
import { Disclosure } from "../../../design-system/widgetKit";
import { chainKindFor, isNonEvmChain } from "@/lib/wallet/chainKind";
import { allowSameChain } from "./solanaSwap";
interface AddressFieldsProps {
  fromChain: { id: number; name: string };
  toChain: { id: number; name: string };
  sourceAddress: string;
  setSourceAddress: (v: string) => void;
  recipient: string;
  setRecipient: (v: string) => void;
  solana: boolean;
  evmSender?: string;
  solanaSender?: string;
}
export default function V2AddressFields(p: AddressFieldsProps) {
  // With no EVM wallet connected there is no default recipient, so the field is shown instead of hidden behind "Send to another address".
  const explicitRecipient = isNonEvmChain(p.toChain.id) || ((p.solana || isNonEvmChain(p.fromChain.id)) && !p.evmSender);
  return (
    <>
      {p.solana ? (
        p.solanaSender ? (
          <p style={{ fontSize: 12, overflowWrap: "anywhere" }}>Solana sender: {p.solanaSender}</p>
        ) : (
          <DestinationAddressInput
            id="cross-v2-source-address"
            chainKind="solana"
            chainLabel={p.fromChain.name}
            value={p.sourceAddress}
            onChange={p.setSourceAddress}
            label="Your Solana address (shows offers; connect Phantom to sign)"
            required
          />
        )
      ) : (
        isNonEvmChain(p.fromChain.id) && (
          <DestinationAddressInput
            id="cross-v2-source-address"
            chainKind={chainKindFor(p.fromChain.id)!}
            chainLabel={p.fromChain.name}
            value={p.sourceAddress}
            onChange={p.setSourceAddress}
            label={`Your ${p.fromChain.name} address (refunds go here)`}
            required
          />
        )
      )}
      {allowSameChain(p.fromChain.id, p.toChain.id) ? (
        <p style={{ fontSize: 12 }}>Swap output returns to your connected Phantom wallet.</p>
      ) : explicitRecipient ? (
        <DestinationAddressInput
          id="cross-v2-recipient"
          chainKind={chainKindFor(p.toChain.id)!}
          chainLabel={p.toChain.name}
          value={p.recipient}
          onChange={p.setRecipient}
          label={`Recipient on ${p.toChain.name} (required)`}
          required
        />
      ) : (
        <Disclosure label={p.recipient ? "Recipient · another address" : "Send to another address"}>
          <DestinationAddressInput
            id="cross-v2-recipient"
            chainKind={chainKindFor(p.toChain.id)!}
            chainLabel={p.toChain.name}
            value={p.recipient}
            onChange={p.setRecipient}
            label="Recipient (defaults to your wallet)"
          />
        </Disclosure>
      )}
    </>
  );
}
