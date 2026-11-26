import type {
  BindingLimits,
  InspectionLimits,
  ErrorCode,
  LimitName,
  Result,
  SvtError,
} from "./model.js";
const MiB = 1024 * 1024;
export const defaultInspectionLimits: InspectionLimits = Object.freeze({
  maxSourceBytes: 20 * MiB,
  maxSourceCharacters: 20 * MiB,
  maxNodes: 200000,
  maxDepth: 64,
  maxAttributesPerElement: 128,
  maxTargets: 50000,
});
export const defaultBindingLimits: BindingLimits = Object.freeze({
  maxBindings: 10000,
  maxValueCharacters: 10 * MiB,
  maxTotalValueCharacters: 40 * MiB,
  maxImageBytes: 20 * MiB,
  maxTotalImageBytes: 40 * MiB,
  maxMediaTypeCharacters: 256,
  maxOutputBytes: 80 * MiB,
});
/** Only deliberately classified input failures are converted into public result objects. */
class Rejection extends Error {
  constructor(readonly detail: SvtError) {
    super(detail.message);
  }
}
export function reject(
  code: ErrorCode,
  message: string,
  fields: Pick<SvtError, "inputKey" | "limit"> = {},
): never {
  throw new Rejection(Object.freeze({ code, message, ...fields }));
}
export function attempt<T>(body: () => T): Result<T> {
  try {
    return Object.freeze({ ok: true, value: body() });
  } catch (e) {
    if (e instanceof Rejection)
      return Object.freeze({ ok: false, error: e.detail });
    throw e;
  }
}
export function limit(value: number, maximum: number, name: LimitName): void {
  if (value > maximum)
    reject("limit-exceeded", `Exceeded ${name}.`, { limit: name });
}
export function addWithin(
  total: number,
  amount: number,
  maximum: number,
  name: LimitName,
): number {
  if (amount > maximum - total)
    reject("limit-exceeded", `Exceeded ${name}.`, { limit: name });
  return total + amount;
}
export function options<T extends object>(
  defaults: T,
  supplied: Partial<T> | undefined,
): T {
  if (supplied === undefined) return defaults;
  if (
    supplied === null ||
    typeof supplied !== "object" ||
    Array.isArray(supplied)
  )
    throw new TypeError("Options must be an object.");
  const result = { ...defaults };
  for (const key of Object.keys(supplied)) {
    if (!Object.hasOwn(defaults, key))
      throw new TypeError(`Unknown option: ${key}.`);
    const value: unknown = Reflect.get(supplied, key);
    if (typeof value !== "number" || !Number.isSafeInteger(value) || value <= 0)
      throw new RangeError(`${key} must be a positive safe integer.`);
    Reflect.set(result, key, value);
  }
  return Object.freeze(result);
}
// The intrinsic typed-array brand works across browser realms and distinguishes byte view types.
const typedArrayPrototype = Object.getPrototypeOf(Uint8Array.prototype);
function isUint8Array(value: unknown): value is Uint8Array {
  return (
    ArrayBuffer.isView(value) &&
    Reflect.get(typedArrayPrototype, Symbol.toStringTag, value) === "Uint8Array"
  );
}
export function bytes(value: unknown, name: string): Uint8Array {
  if (!isUint8Array(value))
    throw new TypeError(`${name} must be a Uint8Array.`);
  if (Object.prototype.toString.call(value.buffer) !== "[object ArrayBuffer]")
    throw new TypeError(`${name} must not use shared memory.`);
  // A local view preserves subarray boundaries and gives callers standard byte-copy semantics.
  return new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
}
export function string(value: unknown, name: string): string {
  if (typeof value !== "string")
    throw new TypeError(`${name} must be a string.`);
  return value;
}
/** Count UTF-8 without allocating an encoded copy. XML representability is checked separately. */
export function utf8Length(value: string): number {
  let count = 0;
  for (const c of value) {
    const cp = c.codePointAt(0);
    if (cp === undefined) throw new Error("Missing character.");
    count += cp <= 0x7f ? 1 : cp <= 0x7ff ? 2 : cp <= 0xffff ? 3 : 4;
  }
  return count;
}
export function xmlValue(value: string, key: string): void {
  for (const c of value) {
    const n = c.codePointAt(0);
    if (
      n === undefined ||
      !(
        n === 9 ||
        n === 10 ||
        n === 13 ||
        (n >= 32 && n <= 0xd7ff) ||
        (n >= 0xe000 && n <= 0xfffd) ||
        (n >= 0x10000 && n <= 0x10ffff)
      )
    )
      reject(
        "invalid-binding",
        "Replacement is not representable in XML 1.0.",
        { inputKey: key },
      );
  }
}
