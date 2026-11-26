import {useState} from 'react';
import {encodeFunctionData,erc20Abi,formatUnits,parseUnits} from 'viem';
import type {RampPreview,RampTransfer} from '../api/contracts';
import {RAMP_ACTIONS} from '../api/contracts';
import {rampApi} from '../api/rampApi';
import {signRampCommand,type RampSigner} from '../execution/rampSigning';
import {createCrossV2Client} from '../../cross/v2/client';
import {useV2Quote} from '../../cross/v2/useV2Quote';
import {useV2WalletPort} from '../../cross/v2/useV2WalletPort';
import {performSteps} from '../../cross/v2/execute';
import {checkOffer} from '../../cross/v2/planCheck';
import {assetIdOf,v2Chains,v2Tokens} from '../../cross/v2/assets';
import {rememberIntent,type StoredIntent} from '../../cross/v2/journeyStore';
import {RampActions,RampButton,RampCard,RampCopyRow,RampField,RampText,rampInput,rampSelect,shortAddress} from './rampUi';

const client=createCrossV2Client();
const errorText=(e:unknown)=>e instanceof Error?e.message:JSON.stringify(e);
export function fundingHandoffCopy(transfer:RampTransfer|null):string {
 if(!transfer)return 'Creating a transfer returns funding instructions. It does not move funds.';
 if(transfer.direction==='ON_RAMP' && transfer.state==='COMPLETED')return 'Fiat is complete. Settled USDC is in your wallet. Move funds is a separate, wallet-signed V2 order; retrying it never repeats the fiat transfer.';
 return `Transfer ${transfer.id} is ${transfer.state}. Fund only these instructions from an account you control.`;
}

/** Uses the ordinary checked-plan executor. Attaches the committed intent before any wallet step. */
export function CryptoLeg({transfer,signer,onStatus}:{transfer:RampTransfer;signer:RampSigner;onStatus:()=>void}) {
 const buy=transfer.direction==='ON_RAMP';
 const [custom,setCustom]=useState(false);
 const suggestion=transfer.leg2?.suggestedQuote;
 const deposit=transfer.depositInstructions;
 const settlementChain=buy?transfer.chainId:deposit?.chainId??transfer.chainId;
 const settlementToken=buy?transfer.tokenAddress:deposit?.tokenAddress??transfer.tokenAddress;
 const settlementAsset=`eip155:${settlementChain}/erc20:${settlementToken.toLowerCase()}`;
 const [pickChain,setPickChain]=useState(settlementChain);
 const [pickAsset,setPickAsset]=useState(settlementAsset);
 const [sourceAmount,setSourceAmount]=useState(deposit?.amount??transfer.amount);
 const [working,setWorking]=useState(false);
 const [notice,setNotice]=useState('');
 const storageKey=`empx-ramp-funding:${signer.address?.toLowerCase()}:${transfer.id}${buy?`:${transfer.leg2?.intentId??'initial'}`:''}`;
 const [sent,setSent]=useState(()=>localStorage.getItem(storageKey)??'');
 const [recordedIntent,setRecordedIntent]=useState(()=>localStorage.getItem(storageKey+':intent')??'');
 const tokens=v2Tokens(pickChain);
 const chosenToken=tokens.find(t=>assetIdOf(t)===pickAsset);
 const fromAsset=buy?suggestion?.from.asset??settlementAsset:pickAsset;
 const toAsset=buy?pickAsset:settlementAsset;
 const decimals=buy?suggestion?.from.decimals??6:chosenToken?.decimals??6;
 const amount=buy?(suggestion?formatUnits(BigInt(suggestion.from.amount),suggestion.from.decimals):'0'):sourceAmount;
 const recipient=buy?suggestion?.recipient:deposit?.depositAddress;
 const port=useV2WalletPort(signer.address??undefined);
 const direct=!buy && fromAsset.toLowerCase()===toAsset.toLowerCase();
 const quote=useV2Quote(client,{fromAsset,toAsset,fromDecimals:decimals,amount:sent||direct?'0':amount,sender:signer.address??undefined,recipient,paused:working},errorText);
 const offer=quote.offers.find(o=>o.check.ok);
 const required=buy?0n:parseUnits(deposit?.amount??transfer.amount,6);
 const funded=buy || Boolean(offer?.offer.journey.minimumOutput && BigInt(offer.offer.journey.minimumOutput.amount)>=required);
 const attach=async(intentId:string)=>{
  if(!port)throw new Error('Connect the registered wallet');
  const payload={wallet:port.address,chainId:transfer.chainId,intentId},now=Math.floor(Date.now()/1000);
  const signed=await signRampCommand({action:RAMP_ACTIONS.reportLeg2,wallet:port.address,chainId:transfer.chainId,payload,resourceId:transfer.id,nonce:crypto.randomUUID(),timestamp:now,expiresAt:now+300,signer});
  await rampApi.reportLeg2(transfer.id,intentId,signed.command);
 };
 const canExecute=Boolean(port && recipient && !sent && !working && (direct || (offer && !quote.forNewInput && funded)));
 const run=async()=>{
  if(!canExecute || !port || !recipient)return;
  setWorking(true);setNotice('');
  try {
   if(direct){
    // A lost wallet response is ambiguous too. Persist BEFORE prompting; never offer an automatic resend.
    localStorage.setItem(storageKey,'Submission uncertain: check wallet and Bridge status before any further deposit.');
    setSent(localStorage.getItem(storageKey)!);
    await port.ensureChain(settlementChain);
    const tx=await port.sendTransaction({chainId:settlementChain,to:settlementToken,data:encodeFunctionData({abi:erc20Abi,functionName:'transfer',args:[recipient as `0x${string}`,required]}),value:0n});
    localStorage.setItem(storageKey,tx.hash);setSent(tx.hash);return;
   }
   if(!offer)throw new Error('Obtain a current V2 quote first');
   const plan=offer.offer.execution.plan;
   const checked=checkOffer(offer.offer,{fromAsset,toAsset,amount:parseUnits(amount,decimals).toString(),sender:port.address,recipient,now:Math.floor(Date.now()/1000)});
   if(!checked.ok)throw new Error(checked.problems.join('; '));
   const commitKey=`ramp:${transfer.id}:${plan.hash}`;
   const committed=await client.commit(plan,offer.offer.journey,port.address,commitKey);
   // Remember the intent before signing/reporting so a failure can never silently create a second order.
   localStorage.setItem(storageKey,`Intent ${committed.intentId}; refresh status before retrying`);setSent(localStorage.getItem(storageKey)!);
   localStorage.setItem(storageKey+':intent',committed.intentId);setRecordedIntent(committed.intentId);
   const tracking:StoredIntent={intentId:committed.intentId,createdAt:Date.now(),fromChain:fromAsset.split('/')[0]!,toChain:toAsset.split('/')[0]!,toAsset,sourceTxs:[]};
   rememberIntent(port.address,tracking);
   if(buy)await attach(committed.intentId);
   const result=await performSteps(client,committed.intentId,committed.kind,plan,checked.sourceChainId,port,{onSent:tx=>{tracking.sourceTxs.push(tx);rememberIntent(port.address,tracking);}});
   setNotice(`Intent ${result.intentId}: wallet steps ${result.waiting.length?'still waiting':'submitted'}. Refresh status; do not fund twice.`);
   onStatus();
  } catch(e){setNotice(errorText(e));}finally{setWorking(false);}
 };
 const chainName=(id:number)=>v2Chains().find(c=>c.id===id)?.name??`Chain ${id}`;
 const tickerOf=(asset:string)=>v2Tokens(Number(asset.split('/')[0]!.split(':')[1])).find(t=>assetIdOf(t).toLowerCase()===asset.toLowerCase())?.ticker??'token';
 const showPickers=buy||custom;
 return <section aria-label={buy?'Move settled funds':'Fund off-ramp'} style={{display:'flex',flexDirection:'column',gap:12}}>
  {!buy && <>
   <RampCopyRow label="Send" value={deposit?.amount??transfer.amount} display={`${deposit?.amount??transfer.amount} USDC on ${chainName(settlementChain)}`} copy={false}/>
   {recipient?<RampCopyRow label="To Bridge" value={recipient} display={shortAddress(recipient)}/>:<RampText tone="bad">No deposit address returned. Do not send funds.</RampText>}
  </>}
  {buy && <RampText>Choose where to move your USDC. This is a separate wallet-signed order; it never repeats the bank transfer.</RampText>}
  {showPickers && <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
   <RampField label={`${buy?'Destination':'Pay from'} chain`}><select style={rampSelect} value={pickChain} disabled={working||Boolean(sent)} onChange={e=>{const id=Number(e.target.value);setPickChain(id);setPickAsset(assetIdOf(v2Tokens(id)[0]!));}}>{v2Chains().filter(c=>c.kind==='EVM').map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></RampField>
   <RampField label="Token"><select style={rampSelect} value={pickAsset} disabled={working||Boolean(sent)} onChange={e=>setPickAsset(e.target.value)}>{tokens.map(t=><option key={assetIdOf(t)} value={assetIdOf(t)}>{t.ticker}</option>)}</select></RampField>
  </div>}
  {!buy && !direct && <RampField label={`Amount of ${tickerOf(fromAsset)} to send`}><input style={rampInput} value={sourceAmount} disabled={working||Boolean(sent)} onChange={e=>setSourceAmount(e.target.value)} inputMode="decimal"/></RampField>}
  {!buy && !direct && <RampText>Bridge must receive at least {deposit?.amount??transfer.amount} USDC, so the order's guaranteed minimum has to cover that.</RampText>}
  {buy && <RampText>{amount} {tickerOf(fromAsset)} → {tickerOf(toAsset)} on {chainName(pickChain)}</RampText>}
  {offer && <RampText>Expected {formatUnits(BigInt(offer.offer.journey.expectedOutput.amount),buy?(chosenToken?.decimals??6):6)}; guaranteed minimum {offer.offer.journey.minimumOutput?formatUnits(BigInt(offer.offer.journey.minimumOutput.amount),buy?(chosenToken?.decimals??6):6):'none'}. Network fees and wallet approvals apply.</RampText>}
  <RampActions>
   <RampButton primary disabled={!canExecute} onClick={()=>void run()}>{working?'Waiting for wallet…':direct?`Send ${deposit?.amount??transfer.amount} USDC on ${chainName(settlementChain)}`:buy?'Sign order to move funds':'Sign order to pay Bridge'}</RampButton>
   {!buy && !sent && <RampButton disabled={working} onClick={()=>{setCustom(v=>!v);if(custom){setPickChain(settlementChain);setPickAsset(settlementAsset);}}}>{custom?`Pay with USDC on ${chainName(settlementChain)} instead`:'Pay with a different token'}</RampButton>}
   {buy && recordedIntent && <RampButton disabled={working} onClick={()=>{setWorking(true);void attach(recordedIntent).then(()=>{setNotice('Recorded intent attached; refresh status, do not create another fiat transfer.');onStatus();}).catch(e=>setNotice(errorText(e))).finally(()=>setWorking(false));}}>Attach recorded intent</RampButton>}
  </RampActions>
  {quote.error && <RampText tone="bad" role="alert">{quote.error}</RampText>}
  {sent && <RampText tone="strong">Submitted: {sent}. Don't send again. The status below updates once Bridge sees the deposit; an interrupted order must fail or refund before you start another.</RampText>}
  {notice && <RampText role="status">{notice}</RampText>}
 </section>;
}

export function RampTransferPanel({preview,transfer,disabledReason,busy,onPreview,onCreate,onStatus,onCancel,canCreate=false,signer}:{
 preview:RampPreview|null;transfer:RampTransfer|null;disabledReason:string|null;busy:boolean;onPreview:()=>void;onCreate:()=>void;onStatus:()=>void;onCancel:()=>void;canCreate?:boolean;signer?:RampSigner;
}) {
 const [open,setOpen]=useState(false);
 const move=transfer?.direction==='ON_RAMP' && transfer.state==='COMPLETED' && Boolean(transfer.leg2?.suggestedQuote);
 const fund=transfer?.direction==='OFF_RAMP' && ['CREATED','AWAITING_FUNDS'].includes(transfer.state) && Boolean(transfer.depositInstructions?.depositAddress);
 return <RampCard title="Preview and transfer" note={fundingHandoffCopy(transfer)}>
  {preview && <RampText tone="strong">Preview source {preview.sourceAmount} → destination {preview.destinationAmount} · fee {preview.feeAmount} {preview.feeCurrency}</RampText>}
  {transfer?.depositInstructions && <RampText tone="strong">{transfer.depositInstructions.paymentRail} {transfer.depositInstructions.amount} {transfer.depositInstructions.currency}{transfer.depositInstructions.memo?` · memo ${transfer.depositInstructions.memo}`:''}</RampText>}
  <RampActions>
   <RampButton disabled={busy||Boolean(disabledReason)} onClick={onPreview}>Preview</RampButton>
   <RampButton primary disabled={busy||Boolean(disabledReason)||!canCreate} onClick={onCreate}>Create funding instructions</RampButton>
   <RampButton disabled={busy||!transfer} onClick={onStatus}>Refresh status</RampButton>
   <RampButton disabled={busy||!transfer||!['CREATED','AWAITING_FUNDS'].includes(transfer.state)} onClick={onCancel}>Cancel awaiting-funds</RampButton>
  </RampActions>
  {(move||fund) && <RampActions><RampButton primary disabled={busy} onClick={()=>setOpen(v=>!v)}>{move?(transfer?.leg2?.state==='failed'?'Retry Move funds':'Move funds'):'Fund off-ramp'}</RampButton></RampActions>}
  {open && transfer && (move||fund) && (signer?.address?<CryptoLeg key={`${transfer.id}:${transfer.leg2?.intentId??''}`} transfer={transfer} signer={signer} onStatus={onStatus}/>:<RampText>Connect the registered wallet to sign.</RampText>)}
  {transfer?.leg2?.intentId && <RampText>Crypto leg {transfer.leg2.intentId}: {transfer.leg2.state}. Fiat state remains {transfer.state}.</RampText>}
 </RampCard>;
}
