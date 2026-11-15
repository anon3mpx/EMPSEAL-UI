import {useState} from 'react';
import {RAMP_ACTIONS,type RampDelegation,type RampDirection,type RampGrantOperation} from '../api/contracts';
import {rampApi} from '../api/rampApi';
import {signRampCommand,type RampSigner} from '../execution/rampSigning';
const OPS:readonly RampGrantOperation[]=['READ','PREVIEW','CREATE_ON_RAMP','CREATE_OFF_RAMP'];
const DIRECTIONS:readonly RampDirection[]=['ON_RAMP','OFF_RAMP'];
export function RampDelegationPanel({signer,chainId,disabledReason,externalAccountIds=[]}:{signer:RampSigner;chainId:number;disabledReason:string|null;externalAccountIds?:string[]}) {
 const [grants,setGrants]=useState<RampDelegation[]>([]);
 const [agent,setAgent]=useState(false);
 const [partner,setPartner]=useState('');
 const [agentId,setAgentId]=useState('');
 const [operations,setOperations]=useState<RampGrantOperation[]>(['READ']);
 const [directions,setDirections]=useState<RampDirection[]>([...DIRECTIONS]);
 const [days,setDays]=useState('7');
 const [max,setMax]=useState('');
 const [busy,setBusy]=useState(false);
 const [message,setMessage]=useState('');
 const blocked=busy||Boolean(disabledReason)||!signer.address;
 const sign=async(action:string,payload:Record<string,unknown>,resourceId?:string)=>{
  if(!signer.address)throw new Error('Connect the registered wallet');
  const now=Math.floor(Date.now()/1000);
  return (await signRampCommand({action,wallet:signer.address,chainId,payload,resourceId,nonce:crypto.randomUUID(),timestamp:now,expiresAt:now+300,signer})).command;
 };
 const request=async(work:()=>Promise<void>)=>{setBusy(true);setMessage('');try{await work();}catch(e){setMessage(e instanceof Error?e.message:JSON.stringify(e));}finally{setBusy(false);}};
 const list=()=>request(async()=>{
  const payload={wallet:signer.address,chainId};
  const items=await rampApi.listDelegations(await sign(RAMP_ACTIONS.listDelegations,payload),agent);
  setGrants(items.filter(g=>agent?g.delegateType==='AGENT':g.delegateType!=='AGENT'));
 });
 const create=()=>request(async()=>{
  const n=Number(days);if(!Number.isFinite(n)||n<=0||n>90)throw new Error('Expiry must be within 90 days');
  if(!partner.trim()||!operations.length||!directions.length||(agent&&!agentId.trim()))throw new Error('Choose partner, identity, operations and directions');
  if(max && (!/^(0|[1-9]\d*)(\.\d{1,18})?$/.test(max)||Number(max)<=0))throw new Error('Maximum USD must be positive');
  const payload={wallet:signer.address!,chainId,partner:partner.trim(),delegateType:agent?'AGENT' as const:'PARTNER' as const,...(agent?{agentId:agentId.trim()}:{}),operations,directions,chainIds:[chainId],externalAccountIds,expiresAt:new Date(Date.now()+n*86400000).toISOString(),...(max?{maxTransferUsd:max}:{})};
  const signed=await sign(agent?RAMP_ACTIONS.createAgentGrant:RAMP_ACTIONS.createDelegation,payload);
  const grant=await (agent?rampApi.createAgentGrant:rampApi.createDelegation)({...payload,...signed},crypto.randomUUID());
  setGrants(items=>[grant,...items.filter(g=>g.id!==grant.id)]);setMessage('Grant created. Restrictions apply on every delegated call.');
 });
 const revoke=(grant:RampDelegation)=>request(async()=>{
  const payload={wallet:signer.address,chainId};
  const signed=await sign(grant.delegateType==='AGENT'?RAMP_ACTIONS.revokeAgentGrant:RAMP_ACTIONS.revokeDelegation,payload,grant.id);
  await (grant.delegateType==='AGENT'?rampApi.revokeAgentGrant:rampApi.revokeDelegation)(grant.id,signed);
  setGrants(items=>items.map(g=>g.id===grant.id?{...g,revokedAt:new Date().toISOString()}:g));setMessage('Revoked. Subsequent delegated calls are denied.');
 });
 return <section aria-label="Ramp grants" style={{width:'100%',maxWidth:480}}>
  <h3>Delegations and agent grants</h3>
  <p>Wallet-issued grants. No Partner API key leaves the server. Expiry is at most 90 days; limits are per transfer.</p>
  <label>Grant type <select value={agent?'agent':'partner'} disabled={busy} onChange={e=>{setAgent(e.target.value==='agent');setGrants([]);}}><option value="partner">Partner delegation</option><option value="agent">Agent grant</option></select></label>
  <label>Partner tenant <input value={partner} onChange={e=>setPartner(e.target.value)}/></label>
  {agent && <label>Agent identity <input value={agentId} onChange={e=>setAgentId(e.target.value)}/></label>}
  <fieldset><legend>Allowed operations</legend>{OPS.map(op=><label key={op}><input type="checkbox" checked={operations.includes(op)} onChange={e=>setOperations(v=>e.target.checked?[...v,op]:v.filter(x=>x!==op))}/>{op}</label>)}</fieldset>
  <fieldset><legend>Allowed directions</legend>{DIRECTIONS.map(d=><label key={d}><input type="checkbox" checked={directions.includes(d)} onChange={e=>setDirections(v=>e.target.checked?[...v,d]:v.filter(x=>x!==d))}/>{d}</label>)}</fieldset>
  <p>Chain {chainId}; off-ramp restricted to currently linked bank accounts ({externalAccountIds.length}).</p>
  <label>Expiry in days <input type="number" min="1" max="90" value={days} onChange={e=>setDays(e.target.value)}/></label>
  <label>Maximum USD per transfer (optional) <input inputMode="decimal" value={max} onChange={e=>setMax(e.target.value)}/></label>
  <button type="button" disabled={blocked} onClick={()=>void create()}>Create grant</button>
  <button type="button" disabled={blocked} onClick={()=>void list()}>List grants</button>
  {grants.map(g=><article key={g.id}><p>{g.delegateType} {g.delegateId??g.partnerId}: {g.operations?.join(', ')}; expires {g.expiresAt}; max {g.maxTransferUsd??'unlimited'} USD {g.revokedAt?'— revoked':''}</p><button type="button" disabled={blocked||Boolean(g.revokedAt)} onClick={()=>void revoke(g)}>Revoke {g.id}</button></article>)}
  {disabledReason && <p>{disabledReason}</p>}{message && <p role="status">{message}</p>}
 </section>;
}
