import { useCallback, useEffect, useRef, useState } from "react";
import { rampApi } from "../api/rampApi";
import {
  RAMP_ACTIONS,
  type RampCreateDelegationCommand,
  type RampDelegation,
  type RampExternalAccount,
  type RampKycHandoff,
  type RampPreview,
  type RampProfile,
  type RampTransfer,
  type RampTransferCommand,
} from "../api/contracts";
import { signRampCommand, type RampSigner } from "../execution/rampSigning";
import { mapRampApiError } from "../utils/errors";
import { loadRampSession, saveRampSession } from "../utils/session";

const ACTION_TTL_SECONDS = 120;

export function useRampSession(input: {
  signer: RampSigner;
  now?: () => number;
  randomUUID?: () => string;
  api?: typeof rampApi;
}) {
  const api = input.api ?? rampApi;
  const nowRef = useRef(input.now);
  nowRef.current = input.now;
  const randomUUIDRef = useRef(input.randomUUID);
  randomUUIDRef.current = input.randomUUID;
  const signerRef = useRef(input.signer);
  signerRef.current = input.signer;
  const apiRef = useRef(api);
  apiRef.current = api;

  const getNow = useCallback(() => {
    return (nowRef.current ?? (() => Math.floor(Date.now() / 1000)))();
  }, []);
  const nextUUID = useCallback(() => {
    return (randomUUIDRef.current ?? (() => crypto.randomUUID()))();
  }, []);

  const [profile, setProfile] = useState<RampProfile | null>(null);
  const [kyc, setKyc] = useState<RampKycHandoff | null>(null);
  const [accounts, setAccounts] = useState<RampExternalAccount[]>([]);
  const [preview, setPreview] = useState<RampPreview | null>(null);
  const [transfer, setTransfer] = useState<RampTransfer | null>(null);
  const [delegation, setDelegation] = useState<RampDelegation | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const resumedTransferId = useRef<string | null>(null);

  const signed = useCallback(async (
    action: string,
    wallet: string,
    chainId: number,
    payload: Record<string, unknown>,
    resourceId?: string,
  ) => {
    const timestamp = getNow();
    return signRampCommand({
      action,
      wallet,
      chainId,
      payload,
      nonce: nextUUID(),
      timestamp,
      expiresAt: timestamp + ACTION_TTL_SECONDS,
      signer: signerRef.current,
      resourceId,
    });
  }, [getNow, nextUUID]);

  const run = useCallback(async <T,>(fn: () => Promise<T>): Promise<T> => {
    setBusy(true);
    setErrorMessage(null);
    try {
      return await fn();
    } catch (error) {
      const message = mapRampApiError(error);
      setErrorMessage(message);
      throw error;
    } finally {
      setBusy(false);
    }
  }, []);

  const registerWallet = useCallback((wallet: string, chainId: number) => run(async () => {
    const { command } = await signed(RAMP_ACTIONS.registerWallet, wallet, chainId, { wallet, chainId });
    const registered = await apiRef.current.registerWallet(command, nextUUID());
    saveRampSession({ wallet, chainId });
    return registered;
  }), [nextUUID, run, signed]);

  const loadProfile = useCallback((wallet: string, chainId: number) => run(async () => {
    const { command } = await signed(RAMP_ACTIONS.profile, wallet, chainId, { wallet, chainId });
    const next = await apiRef.current.getProfile(command);
    setProfile(next);
    setAccounts(next.externalAccounts ?? []);
    return next;
  }), [run, signed]);

  const createKycLink = useCallback((payload: {
    wallet: string;
    chainId: number;
    fullName: string;
    email: string;
    type: "individual" | "business";
    redirectUri: string;
  }) => run(async () => {
    const hashed = {
      fullName: payload.fullName,
      email: payload.email,
      type: payload.type,
      redirectUri: payload.redirectUri,
    };
    const { signedAction } = await signed(RAMP_ACTIONS.kycLink, payload.wallet, payload.chainId, hashed);
    const next = await apiRef.current.createKycLink({
      wallet: payload.wallet,
      chainId: payload.chainId,
      ...hashed,
      signedAction,
    }, nextUUID());
    setKyc(next);
    return next;
  }), [nextUUID, run, signed]);

  const refreshKyc = useCallback((wallet: string, chainId: number) => run(async () => {
    const { command } = await signed(RAMP_ACTIONS.kycRefresh, wallet, chainId, { wallet, chainId });
    const next = await apiRef.current.refreshKyc(command);
    setProfile(next);
    return next;
  }), [run, signed]);

  const createBankLink = useCallback((wallet: string, chainId: number) => run(async () => {
    const { command } = await signed(RAMP_ACTIONS.bankLink, wallet, chainId, { wallet, chainId });
    return apiRef.current.createBankLink(command, nextUUID());
  }), [nextUUID, run, signed]);

  const exchangeBankLink = useCallback((payload: {
    wallet: string;
    chainId: number;
    sessionId: string;
    publicToken: string;
  }) => run(async () => {
    const { signedAction } = await signed(RAMP_ACTIONS.bankLinkExchange, payload.wallet, payload.chainId, payload);
    const next = await apiRef.current.exchangeBankLink({ ...payload, signedAction });
    setAccounts(next);
    return next;
  }), [run, signed]);

  const syncAccounts = useCallback((wallet: string, chainId: number) => run(async () => {
    const { command } = await signed(RAMP_ACTIONS.externalAccounts, wallet, chainId, { wallet, chainId });
    const next = await apiRef.current.syncExternalAccounts(command);
    setAccounts(next);
    return next;
  }), [run, signed]);

  const previewTransfer = useCallback((payload: Omit<RampTransferCommand, "signedAction">) => run(async () => {
    const { signedAction } = await signed(RAMP_ACTIONS.preview, payload.wallet, payload.chainId, payload);
    const next = await apiRef.current.preview({ ...payload, signedAction });
    setPreview(next);
    return next;
  }), [run, signed]);

  const createTransfer = useCallback((payload: Omit<RampTransferCommand, "signedAction">) => run(async () => {
    const { signedAction } = await signed(RAMP_ACTIONS.createTransfer, payload.wallet, payload.chainId, payload);
    const next = await apiRef.current.createTransfer({ ...payload, signedAction }, nextUUID());
    setTransfer(next);
    saveRampSession({
      wallet: payload.wallet,
      chainId: payload.chainId,
      transferId: next.id,
      ...(next.basketId ? { basketId: next.basketId } : {}),
    });
    return next;
  }), [nextUUID, run, signed]);

  const loadTransferStatus = useCallback((transferId: string, wallet: string, chainId: number) => run(async () => {
    const { command } = await signed(RAMP_ACTIONS.transferStatus, wallet, chainId, { wallet, chainId }, transferId);
    const next = await apiRef.current.getTransferStatus(transferId, command);
    setTransfer(next);
    return next;
  }), [run, signed]);

  const cancelTransfer = useCallback((transferId: string, wallet: string, chainId: number) => run(async () => {
    const { command } = await signed(RAMP_ACTIONS.cancelTransfer, wallet, chainId, { wallet, chainId }, transferId);
    const next = await apiRef.current.cancelTransfer(transferId, command, nextUUID());
    setTransfer(next);
    return next;
  }), [nextUUID, run, signed]);

  const createDelegation = useCallback((payload: Omit<RampCreateDelegationCommand, "signedAction">) => run(async () => {
    const { signedAction } = await signed(RAMP_ACTIONS.createDelegation, payload.wallet, payload.chainId, payload);
    const next = await apiRef.current.createDelegation({ ...payload, signedAction }, nextUUID());
    setDelegation(next);
    return next;
  }), [nextUUID, run, signed]);

  const revokeDelegation = useCallback((delegationId: string, wallet: string, chainId: number) => run(async () => {
    const { command } = await signed(RAMP_ACTIONS.revokeDelegation, wallet, chainId, { wallet, chainId }, delegationId);
    return apiRef.current.revokeDelegation(delegationId, command);
  }), [run, signed]);

  const clearPreview = useCallback(() => {
    setPreview(null);
  }, []);

  useEffect(() => {
    const snapshot = loadRampSession();
    const address = input.signer.address;
    if (!snapshot || !address) return;
    if (snapshot.wallet.toLowerCase() !== address.toLowerCase()) return;
    if (!snapshot.transferId) return;
    if (resumedTransferId.current === snapshot.transferId) return;
    resumedTransferId.current = snapshot.transferId;
    void loadTransferStatus(snapshot.transferId, snapshot.wallet, snapshot.chainId).catch((error) => {
      setErrorMessage(mapRampApiError(error));
    });
  }, [input.signer.address, loadTransferStatus]);

  return {
    profile,
    kyc,
    accounts,
    preview,
    transfer,
    delegation,
    errorMessage,
    busy,
    registerWallet,
    loadProfile,
    createKycLink,
    refreshKyc,
    createBankLink,
    exchangeBankLink,
    syncAccounts,
    previewTransfer,
    createTransfer,
    loadTransferStatus,
    cancelTransfer,
    createDelegation,
    revokeDelegation,
    clearPreview,
  };
}
