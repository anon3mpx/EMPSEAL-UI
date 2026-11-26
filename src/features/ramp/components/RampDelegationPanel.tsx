import {useState} from 'react';
import {RAMP_ACTIONS,type RampDelegation,type RampDirection,type RampGrantOperation} from '../api/contracts';
import {rampApi} from '../api/rampApi';
import {signRampCommand,type RampSigner} from '../execution/rampSigning';
import {RampActions,RampButton,RampChecks,RampCheck,RampCollapsible,RampField,RampText,rampInput,rampSelect} from './rampUi';
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
 return <RampCollapsible label="Ramp grants" title="Delegations and agent grants" note="Wallet-issued grants. No Partner API key leaves the server. Expiry is at most 90 days; limits are per transfer.">
  <RampField label="Grant type"><select style={rampSelect} value={agent?'agent':'partner'} disabled={busy} onChange={e=>{setAgent(e.target.value==='agent');setGrants([]);}}><option value="partner">Partner delegation</option><option value="agent">Agent grant</option></select></RampField>
  <RampField label="Partner tenant"><input style={rampInput} value={partner} onChange={e=>setPartner(e.target.value)}/></RampField>
  {agent && <RampField label="Agent identity"><input style={rampInput} value={agentId} onChange={e=>setAgentId(e.target.value)}/></RampField>}
  <RampChecks legend="Allowed operations">{OPS.map(op=><RampCheck key={op} label={op} checked={operations.includes(op)} onChange={c=>setOperations(v=>c?[...v,op]:v.filter(x=>x!==op))}/>)}</RampChecks>
  <RampChecks legend="Allowed directions">{DIRECTIONS.map(d=><RampCheck key={d} label={d} checked={directions.includes(d)} onChange={c=>setDirections(v=>c?[...v,d]:v.filter(x=>x!==d))}/>)}</RampChecks>
  <RampText>Chain {chainId}; off-ramp restricted to currently linked bank accounts ({externalAccountIds.length}).</RampText>
  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
   <RampField label="Expiry in days"><input style={rampInput} type="number" min="1" max="90" value={days} onChange={e=>setDays(e.target.value)}/></RampField>
   <RampField label="Maximum USD per transfer (optional)"><input style={rampInput} inputMode="decimal" value={max} onChange={e=>setMax(e.target.value)}/></RampField>
  </div>
  <RampActions>
   <RampButton primary disabled={blocked} onClick={()=>void create()}>Create grant</RampButton>
   <RampButton disabled={blocked} onClick={()=>void list()}>List grants</RampButton>
  </RampActions>
  {grants.map(g=><article key={g.id} style={{display:'flex',flexDirection:'column',gap:8}}><RampText>{g.delegateType} {g.delegateId??g.partnerId}: {g.operations?.join(', ')}; expires {g.expiresAt}; max {g.maxTransferUsd??'unlimited'} USD {g.revokedAt?'— revoked':''}</RampText><RampActions><RampButton disabled={blocked||Boolean(g.revokedAt)} onClick={()=>void revoke(g)}>Revoke {g.id}</RampButton></RampActions></article>)}
  {disabledReason && <RampText tone="bad">{disabledReason}</RampText>}{message && <RampText role="status">{message}</RampText>}
 </RampCollapsible>;
}
