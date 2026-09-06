import test from 'node:test';
import assert from 'node:assert/strict';
import { decodeBase58, encodeBase58, decodePublicKey } from '../src/lib/base58.ts';
import {
  ASSOCIATED_TOKEN_PROGRAM_ID, DEVNET_USDC_MINT, SYSTEM_PROGRAM_ID, TOKEN_PROGRAM_ID, USDC_DECIMALS,
  buildUsdcTransfer, compileMessage, deriveAta, encodeLength, getSolBalance, getUsdcBalance,
  isOnCurve, keypairFromSeed, seedFromLabel, signTransaction, transferCheckedInstruction, u64le,
} from '../src/lib/solana.ts';

const BLOCKHASH = '11111111111111111111111111111112';

test('base58 round trips real Solana addresses and rejects invalid input', () => {
  for (const address of [TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID, DEVNET_USDC_MINT, SYSTEM_PROGRAM_ID]) {
    const bytes = decodeBase58(address);
    assert.ok(bytes, `${address} should decode`);
    assert.equal(bytes.length, 32);
    assert.equal(encodeBase58(bytes), address);
  }
  // The system program is 32 zero bytes, so every character is a leading '1'.
  assert.equal(encodeBase58(new Uint8Array(32)), SYSTEM_PROGRAM_ID);
  assert.equal(decodeBase58(SYSTEM_PROGRAM_ID)!.every((byte) => byte === 0), true);

  // 0, I, O and l are outside the alphabet and must not decode to something close.
  for (const invalid of ['0OIl', 'not base58!', '', ' ']) assert.equal(decodeBase58(invalid), null);
  assert.throws(() => decodePublicKey('abc'), TypeError);
});

test('compact-u16 and little-endian encodings match the wire format', () => {
  assert.deepEqual([...encodeLength(0)], [0]);
  assert.deepEqual([...encodeLength(1)], [1]);
  assert.deepEqual([...encodeLength(127)], [127]);
  assert.deepEqual([...encodeLength(128)], [128, 1]);
  assert.deepEqual([...encodeLength(300)], [172, 2]);
  assert.deepEqual([...encodeLength(0xffff)], [255, 255, 3]);
  assert.throws(() => encodeLength(0x10000), RangeError);

  assert.deepEqual([...u64le(0)], [0, 0, 0, 0, 0, 0, 0, 0]);
  assert.deepEqual([...u64le(1_000_000)], [64, 66, 15, 0, 0, 0, 0, 0]);
  assert.throws(() => u64le(-1), RangeError);
});

test('associated token accounts match addresses observed on chain', () => {
  // Verified against Solana devnet: this owner's real USDC token account.
  assert.equal(
    deriveAta('GrNg1XM2ctzeE2mXxXCfhcTUbejM8Z4z4wNVTy2FjMEz', DEVNET_USDC_MINT),
    'J5PpXvvkf9zRkyQZdVh5defDBrznDWw7cFMWAbGx59tt',
  );
  // A derived account is a program address, so it must be off the ed25519 curve,
  // while an ordinary wallet key is on it.
  const wallet = keypairFromSeed(seedFromLabel('sanad-demo-devnet-v1:amira'));
  assert.equal(isOnCurve(decodePublicKey(wallet.address)), true);
  assert.equal(isOnCurve(decodePublicKey(deriveAta(wallet.address, DEVNET_USDC_MINT))), false);
});

test('demo wallets derive reproducibly from their published labels', () => {
  const first = keypairFromSeed(seedFromLabel('sanad-demo-devnet-v1:bilal'));
  const second = keypairFromSeed(seedFromLabel('sanad-demo-devnet-v1:bilal'));
  assert.equal(first.address, second.address);
  assert.equal(first.address, '5sbdm8CMQfdZBiLHVJhukJUMTwbrwd5bQTFjKcnUBVg6');
  assert.notEqual(first.address, keypairFromSeed(seedFromLabel('sanad-demo-devnet-v1:amira')).address);
  assert.throws(() => keypairFromSeed(new Uint8Array(16)), TypeError);
});

test('TransferChecked carries the amount and the mint decimals', () => {
  const instruction = transferCheckedInstruction({
    owner: 'So11111111111111111111111111111111111111112',
    source: 'J5PpXvvkf9zRkyQZdVh5defDBrznDWw7cFMWAbGx59tt',
    destination: 'J5PpXvvkf9zRkyQZdVh5defDBrznDWw7cFMWAbGx59tt',
    mint: DEVNET_USDC_MINT,
    amountMicros: 1_500_000,
    decimals: USDC_DECIMALS,
  });
  assert.equal(instruction.programId, TOKEN_PROGRAM_ID);
  // Instruction 12, then the u64 amount, then the decimals the mint must agree with.
  assert.deepEqual([...instruction.data], [12, 96, 227, 22, 0, 0, 0, 0, 0, 6]);
  assert.equal(instruction.keys.length, 4);
  assert.deepEqual(instruction.keys.map((key) => key.isSigner), [false, false, false, true]);
  assert.deepEqual(instruction.keys.map((key) => key.isWritable), [true, false, true, false]);
});

test('a compiled message orders accounts by privilege with the payer first', () => {
  const payer = keypairFromSeed(seedFromLabel('sanad-demo-devnet-v1:bilal')).address;
  const recipient = keypairFromSeed(seedFromLabel('sanad-demo-devnet-v1:amira')).address;
  const message = buildUsdcTransfer({ from: payer, to: recipient, amountMicros: 1_000_000, blockhash: BLOCKHASH });

  // Header: one required signature, no readonly signers, five readonly unsigned accounts.
  assert.deepEqual([...message.subarray(0, 3)], [1, 0, 5]);
  assert.equal(message[3], 8, 'eight distinct accounts');

  const keys: string[] = [];
  for (let index = 0; index < 8; index++) keys.push(encodeBase58(message.subarray(4 + index * 32, 36 + index * 32)));
  assert.equal(keys[0], payer, 'the fee payer must come first');
  // Both token accounts are writable non-signers; their relative order is free.
  assert.deepEqual(
    [...keys.slice(1, 3)].sort(),
    [deriveAta(payer, DEVNET_USDC_MINT), deriveAta(recipient, DEVNET_USDC_MINT)].sort(),
  );
  assert.deepEqual(keys.slice(3), [recipient, DEVNET_USDC_MINT, SYSTEM_PROGRAM_ID, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID]);

  // The blockhash follows the account table, then the instruction count.
  assert.equal(encodeBase58(message.subarray(260, 292)), BLOCKHASH);
  assert.equal(message[292], 2, 'create-if-missing, then transfer');

  assert.throws(() => buildUsdcTransfer({ from: payer, to: payer, amountMicros: 1, blockhash: BLOCKHASH }), /different wallets/);
  assert.throws(() => buildUsdcTransfer({ from: payer, to: recipient, amountMicros: 0, blockhash: BLOCKHASH }), RangeError);
});

test('a key used twice keeps the strongest privilege either reference asked for', () => {
  const payer = keypairFromSeed(seedFromLabel('sanad-demo-devnet-v1:bilal')).address;
  const other = keypairFromSeed(seedFromLabel('sanad-demo-devnet-v1:amira')).address;
  const message = compileMessage(payer, [{
    programId: TOKEN_PROGRAM_ID,
    // The payer appears again as a readonly non-signer; it must stay a writable signer.
    keys: [{ pubkey: payer, isSigner: false, isWritable: false }, { pubkey: other, isSigner: false, isWritable: true }],
    data: new Uint8Array([9]),
  }], BLOCKHASH);
  assert.deepEqual([...message.subarray(0, 3)], [1, 0, 1]);
  assert.equal(message[3], 3);
  assert.equal(encodeBase58(message.subarray(4, 36)), payer);
});

test('an unreadable balance response never becomes a NaN balance', async () => {
  const address = keypairFromSeed(seedFromLabel('sanad-demo-devnet-v1:amira')).address;
  const original = globalThis.fetch;
  const reply = (result: unknown) => {
    globalThis.fetch = (async () => new Response(JSON.stringify({ jsonrpc: '2.0', id: 1, result }), {
      status: 200, headers: { 'Content-Type': 'application/json' },
    })) as typeof fetch;
  };
  try {
    // A malformed shape must be refused outright rather than rendered as NaN.
    reply({ context: { slot: 1 }, value: null });
    await assert.rejects(() => getSolBalance(address), /unreadable SOL balance/);

    reply({ context: { slot: 1 }, value: { amount: 'not-a-number' } });
    assert.equal(await getUsdcBalance(address), 0);

    reply({ context: { slot: 1 }, value: { amount: '12500000' } });
    assert.equal(await getUsdcBalance(address), 12_500_000);

    reply({ context: { slot: 1 }, value: 1_500_000_000 });
    assert.equal(await getSolBalance(address), 1_500_000_000);
  } finally {
    globalThis.fetch = original;
  }
});

test('signing produces a 64-byte signature in a single-signature wire transaction', () => {
  const payer = keypairFromSeed(seedFromLabel('sanad-demo-devnet-v1:bilal'));
  const recipient = keypairFromSeed(seedFromLabel('sanad-demo-devnet-v1:amira')).address;
  const message = buildUsdcTransfer({ from: payer.address, to: recipient, amountMicros: 1_000_000, blockhash: BLOCKHASH });
  const { wire, signature } = signTransaction(message, payer.seed);

  const bytes = Buffer.from(wire, 'base64');
  assert.equal(bytes[0], 1, 'one signature');
  assert.equal(bytes.length, 1 + 64 + message.length);
  assert.deepEqual(new Uint8Array(bytes.subarray(65)), message);
  assert.equal(decodeBase58(signature)!.length, 64);
  // Signing is deterministic for ed25519, so the same message signs identically.
  assert.equal(signTransaction(message, payer.seed).wire, wire);
});
