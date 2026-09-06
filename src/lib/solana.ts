/**
 * A dependency-light Solana devnet client: JSON-RPC over fetch, ed25519 signing and
 * legacy transaction serialization built on the same audited @noble primitives the
 * ECDSA shim already uses. No @solana/web3.js, so the identical module runs in the
 * browser and under Hermes in Expo Go.
 *
 * Scope is deliberately narrow: read balances, and submit one SPL token transfer.
 * Nothing here proves ownership of an address or claims an invoice is settled; a
 * payment counts only once getSignatureStatuses reports a confirmation.
 */
import { ed25519 } from '@noble/curves/ed25519.js';
import { sha256 } from '@noble/hashes/sha2.js';
import { decodePublicKey, encodeBase58 } from './base58';

export const DEVNET_RPC = 'https://api.devnet.solana.com';
export const SYSTEM_PROGRAM_ID = '11111111111111111111111111111111';
export const TOKEN_PROGRAM_ID = 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA';
export const ASSOCIATED_TOKEN_PROGRAM_ID = 'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL';

/** Circle's Solana devnet USDC. Devnet tokens carry no financial value. */
export const DEVNET_USDC_MINT = '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU';
export const USDC_DECIMALS = 6;
export const LAMPORTS_PER_SOL = 1_000_000_000;

/** Solana's base fee, per signature. Priority fees and rent deposits are extra. */
export const BASE_FEE_LAMPORTS = 5_000;
/** Rent-exempt minimum for a 165-byte SPL token account, refundable when it is closed. */
export const TOKEN_ACCOUNT_RENT_LAMPORTS = 2_039_280;

export const FAUCET_USDC_URL = 'https://faucet.circle.com';
export const FAUCET_SOL_URL = 'https://faucet.solana.com';

const PDA_MARKER = new TextEncoder().encode('ProgramDerivedAddress');

export type Keypair = { address: string; seed: Uint8Array };
export type AccountMeta = { pubkey: string; isSigner: boolean; isWritable: boolean };
export type Instruction = { programId: string; keys: AccountMeta[]; data: Uint8Array };

// --- byte helpers -----------------------------------------------------------

function concatBytes(parts: Uint8Array[]): Uint8Array {
  const total = parts.reduce((sum, part) => sum + part.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const part of parts) { out.set(part, offset); offset += part.length; }
  return out;
}

/** Solana's compact-u16 ("shortvec") length prefix. */
export function encodeLength(length: number): Uint8Array {
  if (!Number.isSafeInteger(length) || length < 0 || length > 0xffff) throw new RangeError('Compact-u16 lengths must be between 0 and 65535.');
  const out: number[] = [];
  let remainder = length;
  for (;;) {
    const chunk = remainder & 0x7f;
    remainder >>= 7;
    if (remainder === 0) { out.push(chunk); break; }
    out.push(chunk | 0x80);
  }
  return new Uint8Array(out);
}

export function u64le(value: number): Uint8Array {
  if (!Number.isSafeInteger(value) || value < 0) throw new RangeError('Amounts must be nonnegative safe integers.');
  const out = new Uint8Array(8);
  let remainder = BigInt(value);
  for (let index = 0; index < 8; index++) { out[index] = Number(remainder & 0xffn); remainder >>= 8n; }
  return out;
}

function toBase64(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

// --- keys and addresses -----------------------------------------------------

/**
 * A reproducible 32-byte seed from a label, so every device derives the same demo
 * wallet without any sync. This is deliberately public and predictable: it is only
 * ever used for valueless devnet keys, and must never derive a wallet holding funds.
 */
export function seedFromLabel(label: string): Uint8Array {
  return sha256(new TextEncoder().encode(label));
}

/** Derives the ed25519 keypair for a 32-byte seed. Demo seeds are devnet-only and carry no value. */
export function keypairFromSeed(seed: Uint8Array): Keypair {
  if (seed.length !== 32) throw new TypeError('An ed25519 seed must be exactly 32 bytes.');
  return { address: encodeBase58(ed25519.getPublicKey(seed)), seed: seed.slice() };
}

/** True when the bytes decode to a point on the ed25519 curve, i.e. a key someone could hold. */
export function isOnCurve(bytes: Uint8Array): boolean {
  try {
    ed25519.Point.fromBytes(bytes);
    return true;
  } catch {
    return false;
  }
}

/** The off-curve address derived from seeds and a program, matching Solana's findProgramAddress. */
export function findProgramAddress(seeds: Uint8Array[], programId: string): { address: string; bump: number } {
  const program = decodePublicKey(programId);
  for (let bump = 255; bump >= 0; bump--) {
    const candidate = sha256(concatBytes([...seeds, new Uint8Array([bump]), program, PDA_MARKER]));
    if (!isOnCurve(candidate)) return { address: encodeBase58(candidate), bump };
  }
  throw new Error('No program address for these seeds falls off the ed25519 curve.');
}

/** The associated token account holding `mint` for `owner`. Derivation alone does not create it. */
export function deriveAta(owner: string, mint: string): string {
  return findProgramAddress(
    [decodePublicKey(owner), decodePublicKey(TOKEN_PROGRAM_ID), decodePublicKey(mint)],
    ASSOCIATED_TOKEN_PROGRAM_ID,
  ).address;
}

// --- transaction building ---------------------------------------------------

/**
 * Compiles a legacy message. Accounts are ordered writable-signer, readonly-signer,
 * writable, readonly, with the fee payer pinned first, as the runtime requires.
 */
export function compileMessage(payer: string, instructions: Instruction[], recentBlockhash: string): Uint8Array {
  const metas = new Map<string, AccountMeta>();
  const add = (meta: AccountMeta) => {
    const existing = metas.get(meta.pubkey);
    if (existing) {
      // A key referenced twice keeps the strongest privilege either reference asked for.
      existing.isSigner ||= meta.isSigner;
      existing.isWritable ||= meta.isWritable;
    } else metas.set(meta.pubkey, { ...meta });
  };

  add({ pubkey: payer, isSigner: true, isWritable: true });
  for (const instruction of instructions) for (const key of instruction.keys) add(key);
  // Program ids are always readonly and never signers.
  for (const instruction of instructions) add({ pubkey: instruction.programId, isSigner: false, isWritable: false });

  const rank = (meta: AccountMeta) => (meta.isSigner ? (meta.isWritable ? 0 : 1) : meta.isWritable ? 2 : 3);
  const ordered = [...metas.values()].sort((left, right) => {
    if (left.pubkey === payer) return -1;
    if (right.pubkey === payer) return 1;
    return rank(left) - rank(right);
  });

  const header = new Uint8Array([
    ordered.filter((meta) => meta.isSigner).length,
    ordered.filter((meta) => meta.isSigner && !meta.isWritable).length,
    ordered.filter((meta) => !meta.isSigner && !meta.isWritable).length,
  ]);
  const index = new Map(ordered.map((meta, position) => [meta.pubkey, position]));
  const indexOf = (pubkey: string) => {
    const position = index.get(pubkey);
    if (position === undefined) throw new Error(`Account ${pubkey} is missing from the compiled message.`);
    return position;
  };

  const encodedInstructions = instructions.map((instruction) => concatBytes([
    new Uint8Array([indexOf(instruction.programId)]),
    encodeLength(instruction.keys.length),
    new Uint8Array(instruction.keys.map((key) => indexOf(key.pubkey))),
    encodeLength(instruction.data.length),
    instruction.data,
  ]));

  return concatBytes([
    header,
    encodeLength(ordered.length),
    ...ordered.map((meta) => decodePublicKey(meta.pubkey)),
    decodePublicKey(recentBlockhash),
    encodeLength(instructions.length),
    ...encodedInstructions,
  ]);
}

/** Associated Token Account program, CreateIdempotent (instruction 1). Safe when the account exists. */
export function createAtaIdempotentInstruction(payer: string, owner: string, mint: string): Instruction {
  return {
    programId: ASSOCIATED_TOKEN_PROGRAM_ID,
    keys: [
      { pubkey: payer, isSigner: true, isWritable: true },
      { pubkey: deriveAta(owner, mint), isSigner: false, isWritable: true },
      { pubkey: owner, isSigner: false, isWritable: false },
      { pubkey: mint, isSigner: false, isWritable: false },
      { pubkey: SYSTEM_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    ],
    data: new Uint8Array([1]),
  };
}

/**
 * SPL Token TransferChecked (instruction 12). The mint and decimals travel with the
 * transfer, so the runtime rejects a transfer whose decimals do not match the mint.
 */
export function transferCheckedInstruction(input: {
  owner: string; source: string; destination: string; mint: string; amountMicros: number; decimals: number;
}): Instruction {
  return {
    programId: TOKEN_PROGRAM_ID,
    keys: [
      { pubkey: input.source, isSigner: false, isWritable: true },
      { pubkey: input.mint, isSigner: false, isWritable: false },
      { pubkey: input.destination, isSigner: false, isWritable: true },
      { pubkey: input.owner, isSigner: true, isWritable: false },
    ],
    data: concatBytes([new Uint8Array([12]), u64le(input.amountMicros), new Uint8Array([input.decimals])]),
  };
}

/** Creates the recipient's token account if needed, then transfers. Both in one atomic transaction. */
export function buildUsdcTransfer(input: {
  from: string; to: string; amountMicros: number; blockhash: string;
  mint?: string; decimals?: number;
}): Uint8Array {
  const mint = input.mint ?? DEVNET_USDC_MINT;
  const decimals = input.decimals ?? USDC_DECIMALS;
  if (input.from === input.to) throw new Error('The payer and the recipient must be different wallets.');
  if (input.amountMicros <= 0) throw new RangeError('A payment must be greater than zero.');
  return compileMessage(input.from, [
    createAtaIdempotentInstruction(input.from, input.to, mint),
    transferCheckedInstruction({
      owner: input.from,
      source: deriveAta(input.from, mint),
      destination: deriveAta(input.to, mint),
      mint,
      amountMicros: input.amountMicros,
      decimals,
    }),
  ], input.blockhash);
}

/** Signs a compiled message and returns the wire transaction, base64 encoded for the RPC. */
export function signTransaction(message: Uint8Array, seed: Uint8Array): { wire: string; signature: string } {
  const signature = ed25519.sign(message, seed);
  return {
    wire: toBase64(concatBytes([encodeLength(1), signature, message])),
    signature: encodeBase58(signature),
  };
}

// --- JSON-RPC ---------------------------------------------------------------

let requestId = 0;

/** Every RPC call is capped, so a dropped connection fails loudly instead of hanging forever. */
const RPC_TIMEOUT_MS = 15_000;

export async function rpc<T>(method: string, params: unknown[], endpoint = DEVNET_RPC, timeoutMs = RPC_TIMEOUT_MS): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  let response: Response;
  try {
    response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: ++requestId, method, params }),
      signal: controller.signal,
    });
  } catch (caught) {
    if (caught instanceof Error && caught.name === 'AbortError') {
      throw new Error(`Solana devnet did not respond to ${method} within ${Math.round(timeoutMs / 1000)}s. Check your connection and try again.`);
    }
    throw new Error(`Could not reach Solana devnet for ${method}. ${caught instanceof Error ? caught.message : 'Check your connection and try again.'}`);
  } finally {
    clearTimeout(timer);
  }
  if (!response.ok) throw new Error(`Solana devnet returned ${response.status}. Check your connection and try again.`);
  const payload = await response.json() as { result?: T; error?: { message?: string } };
  if (payload.error) throw new Error(payload.error.message ?? `The ${method} request failed.`);
  if (payload.result === undefined) throw new Error(`The ${method} request returned no result.`);
  return payload.result;
}

/** A balance must be a nonnegative safe integer; anything else is treated as unknown. */
function integerAmount(value: unknown): number | null {
  const amount = typeof value === 'string' || typeof value === 'number' ? Number(value) : NaN;
  return Number.isSafeInteger(amount) && amount >= 0 ? amount : null;
}

/** SOL balance in lamports. */
export async function getSolBalance(address: string, endpoint = DEVNET_RPC): Promise<number> {
  const result = await rpc<{ value: unknown }>('getBalance', [address], endpoint);
  const lamports = integerAmount(result?.value);
  if (lamports === null) throw new Error('The devnet node returned an unreadable SOL balance.');
  return lamports;
}

/** USDC balance in integer micros. Returns 0 when the token account does not exist yet. */
export async function getUsdcBalance(address: string, mint = DEVNET_USDC_MINT, endpoint = DEVNET_RPC): Promise<number> {
  try {
    const result = await rpc<{ value: { amount?: unknown } }>(
      'getTokenAccountBalance', [deriveAta(address, mint)], endpoint,
    );
    // An absent token account is a zero balance; an unreadable response is not.
    return integerAmount(result?.value?.amount) ?? 0;
  } catch {
    return 0;
  }
}

export async function getLatestBlockhash(endpoint = DEVNET_RPC): Promise<string> {
  const result = await rpc<{ value: { blockhash: string } }>(
    'getLatestBlockhash', [{ commitment: 'confirmed' }], endpoint,
  );
  return result.value.blockhash;
}

export async function sendRawTransaction(wire: string, endpoint = DEVNET_RPC): Promise<string> {
  return rpc<string>('sendTransaction', [wire, { encoding: 'base64', preflightCommitment: 'confirmed' }], endpoint);
}

/** Devnet SOL for network fees. Public endpoints rate-limit this; fall back to FAUCET_SOL_URL. */
export async function requestAirdrop(address: string, lamports = LAMPORTS_PER_SOL, endpoint = DEVNET_RPC): Promise<string> {
  return rpc<string>('requestAirdrop', [address, lamports], endpoint);
}

export type Confirmation = { confirmed: boolean; slot: number | null; error: string | null };

/** Polls until the network confirms or rejects. Nothing may be shown as paid before this resolves true. */
export async function confirmSignature(
  signature: string,
  options: { endpoint?: string; timeoutMs?: number; intervalMs?: number } = {},
): Promise<Confirmation> {
  const { endpoint = DEVNET_RPC, timeoutMs = 45_000, intervalMs = 1_200 } = options;
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    const result = await rpc<{ value: ({ confirmationStatus: string | null; slot: number; err: unknown } | null)[] }>(
      'getSignatureStatuses', [[signature], { searchTransactionHistory: true }], endpoint,
    );
    const status = result.value[0];
    if (status) {
      if (status.err) return { confirmed: false, slot: status.slot, error: 'The network rejected this transaction.' };
      if (status.confirmationStatus === 'confirmed' || status.confirmationStatus === 'finalized') {
        return { confirmed: true, slot: status.slot, error: null };
      }
    }
    if (Date.now() >= deadline) {
      return { confirmed: false, slot: null, error: 'This transaction was not confirmed in time. Check the explorer before retrying.' };
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
}

export function explorerUrl(signature: string): string {
  return `https://explorer.solana.com/tx/${signature}?cluster=devnet`;
}

export function addressExplorerUrl(address: string): string {
  return `https://explorer.solana.com/address/${address}?cluster=devnet`;
}

/** Builds, signs, submits and confirms a USDC transfer. Rejects rather than reporting an unconfirmed payment. */
/**
 * A transaction that was actually broadcast but did not confirm within the wait
 * window. It may still land later, so the signature is carried on the error and
 * callers should offer the explorer link rather than treating this as never sent.
 */
export class PaymentTimeoutError extends Error {
  readonly signature: string;
  constructor(message: string, signature: string) {
    super(message);
    this.name = 'PaymentTimeoutError';
    this.signature = signature;
  }
}

export async function payUsdc(input: {
  from: Keypair; to: string; amountMicros: number; endpoint?: string;
}): Promise<{ signature: string; slot: number | null }> {
  const endpoint = input.endpoint ?? DEVNET_RPC;
  const blockhash = await getLatestBlockhash(endpoint);
  const message = buildUsdcTransfer({ from: input.from.address, to: input.to, amountMicros: input.amountMicros, blockhash });
  const { wire, signature } = signTransaction(message, input.from.seed);
  const submitted = await sendRawTransaction(wire, endpoint);
  const confirmation = await confirmSignature(submitted, { endpoint });
  if (!confirmation.confirmed) throw new PaymentTimeoutError(confirmation.error ?? 'This payment was not confirmed.', submitted || signature);
  return { signature: submitted || signature, slot: confirmation.slot };
}
