import {afterEach,expect,it,vi} from 'vitest';
import {rampApi} from './rampApi';
afterEach(()=>vi.unstubAllGlobals());
const command={wallet:'0x1111111111111111111111111111111111111111',chainId:8453,signedAction:{action:'REPORT_RAMP_LEG2',wallet:'0x1111111111111111111111111111111111111111',chainId:8453,payloadHash:'0xhash',nonce:'n1',timestamp:1,expiresAt:2,signature:'0xsig'}};
it('uses same-origin V2 even when the legacy origin is configured; retains signed intent attachment',async()=>{
 const f=vi.fn(async(_url:string,_init?:RequestInit)=>new Response('{}'));vi.stubGlobal('fetch',f);
 await rampApi.getCapabilities();await rampApi.reportLeg2('transfer-1','intent-1',command);
 expect(f.mock.calls[0]?.[0]).toBe('/api/cross-v2/v2/ramp/capabilities');
 expect(f.mock.calls[1]?.[0]).toBe('/api/cross-v2/v2/ramp/transfers/transfer-1/leg2');
 const init=f.mock.calls[1]?.[1];expect(JSON.parse(String(init?.body))).toEqual({...command,intentId:'intent-1'});
 expect(new Headers(init?.headers).has('x-api-key')).toBe(false);
});
it('preserves V2 error body for unsupported wallets and scope failures',async()=>{
 vi.stubGlobal('fetch',vi.fn(async()=>new Response(JSON.stringify({error:{code:'RAMP_SIGNATURE_UNSUPPORTED_WALLET'}}),{status:422})));
 await expect(rampApi.getProfile(command)).rejects.toMatchObject({status:422,body:{error:{code:'RAMP_SIGNATURE_UNSUPPORTED_WALLET'}},message:expect.stringContaining('Connect an EOA')});
});
