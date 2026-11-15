import {fireEvent,render,screen,waitFor} from '@testing-library/react';
import {expect,it,vi} from 'vitest';
import {RampDelegationPanel} from './RampDelegationPanel';
const {sign,create}=vi.hoisted(()=>({sign:vi.fn(async (i)=>({command:{wallet:i.wallet,chainId:i.chainId,signedAction:{signature:'0xsig'}}})),create:vi.fn(async()=>({id:'grant1'}))}));
vi.mock('../execution/rampSigning',()=>({signRampCommand:sign}));
vi.mock('../api/rampApi',()=>({rampApi:{createDelegation:create}}));
it('signs only selected operations, direction and optional maximum',async()=>{
 render(<RampDelegationPanel signer={{address:'0x1111111111111111111111111111111111111111',chainId:8453,signMessage:vi.fn()}} chainId={8453} disabledReason={null}/>);
 fireEvent.change(screen.getByLabelText('Partner tenant'),{target:{value:'tenant-a'}});
 fireEvent.click(screen.getByLabelText('READ'));fireEvent.click(screen.getByLabelText('CREATE_OFF_RAMP'));
 fireEvent.change(screen.getByLabelText('Maximum USD per transfer (optional)'),{target:{value:'25.00'}});
 fireEvent.click(screen.getByRole('button',{name:'Create grant'}));
 await waitFor(()=>expect(create).toHaveBeenCalledOnce());
 expect(sign.mock.calls[0]?.[0].payload).toMatchObject({operations:['CREATE_OFF_RAMP'],directions:['ON_RAMP','OFF_RAMP'],maxTransferUsd:'25.00'});
 expect(create.mock.calls[0]?.[0].operations).toEqual(['CREATE_OFF_RAMP']);
});
