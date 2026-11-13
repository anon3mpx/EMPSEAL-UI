// The plan carries EIP-712 messages as JSON, where uint/int values are decimal strings. viem's encoder wants bigint for those, so revive them by the declared type (ethers, which the SDK uses, accepts strings).
type TypeDefs = Record<string, Array<{ name: string; type: string }>>;

const INT_TYPE = /^u?int[0-9]*$/;

function revive(value: unknown, type: string, types: TypeDefs): unknown {
  const arr = /^(.*)\[[0-9]*\]$/.exec(type);
  if (arr) {
    if (!Array.isArray(value)) throw new Error(`typed data: ${type} value is not a list`);
    return value.map((v) => revive(v, arr[1]!, types));
  }
  if (INT_TYPE.test(type)) {
    if (typeof value === "bigint") return value;
    if (typeof value === "number" && Number.isSafeInteger(value)) return BigInt(value);
    if (typeof value === "string" && /^-?(0|[1-9][0-9]*)$/.test(value)) return BigInt(value);
    if (typeof value === "string" && /^0x[0-9a-fA-F]+$/.test(value)) return BigInt(value);
    throw new Error(`typed data: ${JSON.stringify(value)} is not an integer for ${type}`);
  }
  const fields = types[type];
  if (fields) {
    if (typeof value !== "object" || value === null) throw new Error(`typed data: ${type} value is not an object`);
    const o = value as Record<string, unknown>;
    return Object.fromEntries(fields.map((f) => [f.name, revive(o[f.name], f.type, types)]));
  }
  return value;
}

export function reviveTypedMessage(types: TypeDefs, primaryType: string, message: Record<string, unknown>): Record<string, unknown> {
  return revive(message, primaryType, types) as Record<string, unknown>;
}
