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

const client=createCrossV2Client();
const errorText=(e:unknown)=>e instanceof Error?e.message:JSON.stringify(e);
export function fundingHandoffCopy(transfer:RampTransfer|null):string {
 if(!transfer)return 'Creating a transfer returns funding instructions. It does not move funds.';
 if(transfer.direction==='ON_RAMP' && transfer.state==='COMPLETED')return 'Fiat is complete. Settled USDC is in your wallet. Move funds is a separate, wallet-signed V2 order; retrying it never repeats the fiat transfer.';
 return `Transfer ${transfer.id} is ${transfer.state}. Fund only these instructions from an account you control.`;
}

/** Uses the ordinary checked-plan executor. Attaches the committed intent before any wallet step. */
function CryptoLeg({transfer,signer,onStatus}:{transfer:RampTransfer;signer:RampSigner;onStatus:()=>void}) {
 const buy=transfer.direction==='ON_RAMP';
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
 return <section aria-label={buy?'Move settled funds':'Fund off-ramp'}>
  <p>{buy?'Choose where to move your settled USDC.':'Bridge receives USDC at the address below. Select the token and chain you actually hold.'}</p>
  <label>{buy?'Destination':'Source'} chain <select value={pickChain} disabled={working||Boolean(sent)} onChange={e=>{const id=Number(e.target.value);setPickChain(id);setPickAsset(assetIdOf(v2Tokens(id)[0]!));}}>{v2Chains().filter(c=>c.kind==='EVM').map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
  <label>Token <select value={pickAsset} disabled={working||Boolean(sent)} onChange={e=>setPickAsset(e.target.value)}>{tokens.map(t=><option key={assetIdOf(t)} value={assetIdOf(t)}>{t.ticker}</option>)}</select></label>
  {!buy && !direct && <label>Source amount <input value={sourceAmount} disabled={working||Boolean(sent)} onChange={e=>setSourceAmount(e.target.value)} inputMode="decimal"/></label>}
  <p>Recipient: {recipient??'No deposit address returned. Do not send funds.'}</p>
  <p>{amount} of {fromAsset} → {toAsset}</p>
  {!buy && !direct && <p>Required delivery: {deposit?.amount??transfer.amount} USDC. A firm minimum must cover this amount.</p>}
  {offer && <p>V2 expected output {offer.offer.journey.expectedOutput.amount} base units; minimum {offer.offer.journey.minimumOutput?.amount??'not guaranteed'}. Fees and wallet approvals apply.</p>}
  <button type="button" disabled={!canExecute} onClick={()=>void run()}>{working?'Awaiting wallet':direct?'Transfer USDC to Bridge':'Reviewed — sign V2 order'}</button>
  {quote.error && <p role="alert">{quote.error}</p>}
  {sent && <p>Recorded submission: {sent}. Do not resend. Track this intent in the ordinary Cross V2 activity view; an interrupted order must fail/refund before a new leg can be started.</p>}
  {buy && recordedIntent && <button type="button" disabled={working} onClick={()=>{setWorking(true);void attach(recordedIntent).then(()=>{setNotice('Recorded intent attached; refresh status, do not create another fiat transfer.');onStatus();}).catch(e=>setNotice(errorText(e))).finally(()=>setWorking(false));}}>Attach recorded intent</button>}
  {notice && <p role="status">{notice}</p>}
 </section>;
}

export function RampTransferPanel({preview,transfer,disabledReason,busy,onPreview,onCreate,onStatus,onCancel,canCreate=false,signer}:{
 preview:RampPreview|null;transfer:RampTransfer|null;disabledReason:string|null;busy:boolean;onPreview:()=>void;onCreate:()=>void;onStatus:()=>void;onCancel:()=>void;canCreate?:boolean;signer?:RampSigner;
}) {
 const [open,setOpen]=useState(false);
 const move=transfer?.direction==='ON_RAMP' && transfer.state==='COMPLETED' && Boolean(transfer.leg2?.suggestedQuote);
 const fund=transfer?.direction==='OFF_RAMP' && ['CREATED','AWAITING_FUNDS'].includes(transfer.state) && Boolean(transfer.depositInstructions?.depositAddress);
 return <section style={{display:'flex',flexDirection:'column',gap:8,width:'100%',maxWidth:480}}>
  <h3>Preview and transfer</h3>
  {preview && <p>Preview source {preview.sourceAmount} → destination {preview.destinationAmount} · fee {preview.feeAmount} {preview.feeCurrency}</p>}
  <p>{fundingHandoffCopy(transfer)}</p>
  {transfer?.depositInstructions && <p>{transfer.depositInstructions.paymentRail} {transfer.depositInstructions.amount} {transfer.depositInstructions.currency}{transfer.depositInstructions.memo?` · memo ${transfer.depositInstructions.memo}`:''}</p>}
  <div>
   <button type="button" disabled={busy||Boolean(disabledReason)} onClick={onPreview}>Preview</button>
   <button type="button" disabled={busy||Boolean(disabledReason)||!canCreate} onClick={onCreate}>Create funding instructions</button>
   <button type="button" disabled={busy||!transfer} onClick={onStatus}>Refresh status</button>
   <button type="button" disabled={busy||!transfer||!['CREATED','AWAITING_FUNDS'].includes(transfer.state)} onClick={onCancel}>Cancel awaiting-funds</button>
  </div>
  {(move||fund) && <button type="button" disabled={busy} onClick={()=>setOpen(v=>!v)}>{move?(transfer?.leg2?.state==='failed'?'Retry Move funds':'Move funds'):'Fund off-ramp'}</button>}
  {open && transfer && (move||fund) && (signer?.address?<CryptoLeg key={`${transfer.id}:${transfer.leg2?.intentId??''}`} transfer={transfer} signer={signer} onStatus={onStatus}/>:<p>Connect the registered wallet to sign.</p>)}
  {transfer?.leg2?.intentId && <p>Crypto leg {transfer.leg2.intentId}: {transfer.leg2.state}. Fiat state remains {transfer.state}.</p>}
 </section>;
}
