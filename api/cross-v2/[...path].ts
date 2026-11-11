// Vercel function: the V2 calls the cross-chain page makes, with the server's EMPX_V2_API_KEY added here (see api/_lib/crossV2Proxy.ts).
import { crossV2EnvFromProcess, crossV2NodeHandler } from "../_lib/crossV2Proxy.js";

export default crossV2NodeHandler(crossV2EnvFromProcess);
