/**
 * Drives the conversation-first web app in a real browser: both profiles, the fee poll,
 * the route comparison, invoice creation from a parked thread, and the acknowledgement
 * signature. Network calls to Solana devnet are stubbed so the check stays offline and
 * deterministic; the signing and encryption run for real.
 *
 * Run: node scripts/conversation-browser-check.cjs   (with the dev server on 5173)
 */
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright-core');
const assert = require('node:assert/strict');

const base = process.env.SANAD_URL || 'http://127.0.0.1:5173/';
const CHROME = process.env.CHROMIUM_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const WIDTHS = [320, 390, 768, 1000, 1440];

(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: CHROME });
  const context = await browser.newContext({ viewport: { width: 1280, height: 1000 }, reducedMotion: 'reduce' });
  const errors = [];
  const checks = [];
  context.on('page', (page) => page.on('pageerror', (error) => errors.push(error.message)));

  // Keep the check offline and deterministic. Devnet RPC is the only network the app
  // talks to, and each method is answered in its real response shape.
  const FAKE_SIGNATURE = '4uQeVj5tqViQh7yWWGStvkEG1Zmhx6uasJtWCJziofM1nrouKzrNhs9Fzr6WdWtQvJf7GEqPzZmqAy3fCUcvgWvC';
  await context.route('https://api.devnet.solana.com/**', async (route) => {
    const { method, id } = JSON.parse(route.request().postData() || '{}');
    const results = {
      getBalance: { context: { slot: 1 }, value: 1_500_000_000 },
      getTokenAccountBalance: { context: { slot: 1 }, value: { amount: '12500000', decimals: 6, uiAmountString: '12.5' } },
      getLatestBlockhash: { context: { slot: 1 }, value: { blockhash: '11111111111111111111111111111111', lastValidBlockHeight: 1 } },
      sendTransaction: FAKE_SIGNATURE,
      getSignatureStatuses: { context: { slot: 2 }, value: [{ slot: 2, confirmations: 1, err: null, confirmationStatus: 'confirmed' }] },
    };
    route.fulfill({
      status: 200, contentType: 'application/json',
      body: JSON.stringify({ jsonrpc: '2.0', id, result: results[method] ?? null }),
    });
  });

  const page = await context.newPage();
  const pass = (name) => checks.push(name);

  await page.goto(base);
  await page.getByRole('heading', { name: 'Conversations' }).waitFor();
  pass('conversations load as the home screen');

  // Seller sees both of her threads; the buyer's private thread is not among them.
  await page.getByText('Cedar Pantry Imports').waitFor();
  await page.getByText('Maghreb Foods Ltd').waitFor();
  assert.equal(await page.getByText('Atlas Argan Coop').count(), 0);
  pass('each profile sees only its own conversations');

  // The hero thread: seeded negotiation, fee poll and invoice.
  await page.getByRole('button', { name: /Cedar Pantry Imports/ }).click();
  await page.getByText('Who covers the intermediary deduction on this transfer?').waitFor();
  await page.getByText(/Agreed — the buyer covers downstream fees/).waitFor();
  pass('the fee poll shows a resolved decision');

  // The seller's side of the poll is stated as what she receives.
  const sellerOutcome = await page.getByRole('radio', { name: /The buyer covers them/ }).innerText();
  assert.match(sellerOutcome, /You receive/);
  pass('the poll frames the outcome from the seller\u2019s seat');

  // Route comparison, opened from the timeline card.
  await page.getByRole('button', { name: /Payment routes compared/ }).click();
  await page.getByRole('heading', { name: 'Payment routes' }).waitFor();
  const best = await page.locator('.best-route').innerText();
  assert.match(best, /USDC direct costs the least overall/);
  assert.match(best, /less lost to intermediaries than a bank wire/);
  pass('the comparison recommends the lowest total cost honestly');

  const routes = await page.locator('.route-option').allInnerTexts();
  assert.equal(routes.length, 4, 'the Canadian corridor quotes four routes');
  assert.ok(routes.every((text) => /Buyer pays/.test(text) && /Supplier receives/.test(text)));
  pass('every route shows both sides of the deal');

  // Switching the fee bearer must move the supplier's receipt.
  await page.getByRole('radio', { name: /Bank wire/ }).click();
  await page.locator('.fee-choice label', { hasText: 'Supplier' }).locator('input').check();
  await page.getByText(/The supplier could receive/).waitFor();
  await page.locator('.fee-choice label', { hasText: 'Buyer' }).locator('input').check();
  await page.getByText(/The supplier receives the full/).waitFor();
  pass('the fee bearer changes what the supplier receives');

  await page.getByRole('button', { name: 'Close dialog' }).click();

  // The seller's second thread is parked before invoicing and seeds the form.
  await page.getByRole('button', { name: 'Back to conversations' }).click();
  await page.getByRole('button', { name: /Maghreb Foods Ltd/ }).click();
  await page.getByText('Terms agreed. No invoice has been issued for this order yet.').waitFor();
  await page.getByRole('button', { name: 'Create the invoice' }).click();
  await page.getByRole('heading', { name: 'Create invoice' }).waitFor();
  assert.equal(await page.getByLabel('Customer business name').inputValue(), 'Maghreb Foods Ltd');
  assert.equal(await page.getByLabel('Invoice reference').inputValue(), 'SF-1052');
  const note = await page.getByLabel('Terms & context').inputValue();
  assert.match(note, /Agreed route/);
  assert.match(note, /covered by the buyer/);
  pass('invoice creation is prefilled with the agreed route and fee bearer');

  // Real signing: create, then verify the record renders with its fingerprint.
  await page.getByRole('button', { name: 'Create & sign invoice' }).click();
  await page.getByRole('heading', { name: 'SF-1052' }).waitFor({ timeout: 15000 });
  await page.getByText('Issuer signed').waitFor();
  await page.getByRole('button', { name: /View signature details/ }).click();
  const hash = await page.locator('.hash-line').first().innerText();
  assert.match(hash.trim(), /^[a-f0-9]{64}$/);
  pass('a created invoice is really signed and fingerprinted');

  // Tamper rejection, on a throwaway copy.
  await page.getByRole('button', { name: 'Test a tampered copy' }).click();
  await page.getByText(/Tampering rejected/).waitFor({ timeout: 15000 });
  pass('a tampered copy fails verification');

  // Switch to the importer and confirm the shared thread is visible from the other seat.
  await page.getByRole('button', { name: /Switch demo profile/ }).click();
  await page.getByRole('button', { name: /Bilal Mansouri/ }).click();
  await page.getByRole('heading', { name: 'Conversations' }).waitFor();
  await page.getByText('Atlas Argan Coop').waitFor();
  assert.equal(await page.getByText('Maghreb Foods Ltd').count(), 0);
  pass('switching profiles changes whose conversations are shown');

  await page.getByRole('button', { name: /Sfax Olive Co\./ }).click();
  const hinge = await page.locator('.hinge-row').innerText();
  assert.match(hinge, /You pay, at most/);
  pass('the same thread reads as outlay from the buyer\u2019s seat');

  // The buyer can sign the acknowledgement on the seeded invoice.
  await page.getByRole('button', { name: /Invoice SF-1048/ }).click();
  await page.getByRole('heading', { name: 'SF-1048' }).waitFor();
  await page.getByLabel(/I have reviewed and acknowledge/).check();
  await page.getByRole('button', { name: 'Sign acknowledgement' }).click();
  await page.getByText('Acknowledged').first().waitFor({ timeout: 15000 });
  pass('the customer signs an independent acknowledgement');

  // The exact bug report: click "Pay 1.00 USDC on devnet" and expect full feedback —
  // a modal that goes pending -> confirmed, with a signature, explorer link and the
  // recipient's live balance. Never silence.
  await page.getByRole('button', { name: /Pay 1\.00 USDC on devnet/ }).click();
  await page.getByRole('heading', { name: /Sending payment|Payment confirmed/ }).waitFor({ timeout: 2000 });
  pass('clicking Pay opens a result modal immediately, no silent click');

  await page.getByRole('heading', { name: 'Payment confirmed' }).waitFor({ timeout: 15000 });
  await page.getByText('Submitting to Solana devnet…').waitFor({ state: 'hidden' }).catch(() => {});
  const paymentBody = await page.locator('.dialog-body').innerText();
  assert.match(paymentBody, /1\.00\s*USDC/);
  assert.match(paymentBody, new RegExp(FAKE_SIGNATURE));
  assert.match(paymentBody, /Now holds .*USDC on devnet/);
  pass('the confirmed payment shows amount, signature and the recipient’s live balance');

  const explorerHref = await page.getByRole('link', { name: /View on Solana Explorer/ }).getAttribute('href');
  assert.match(explorerHref, /explorer\.solana\.com\/tx\//);
  assert.match(explorerHref, /cluster=devnet/);
  pass('a real explorer link is offered for the transaction');

  await page.getByRole('button', { name: 'Done' }).click();
  await page.getByRole('heading', { name: 'Payment confirmed' }).waitFor({ state: 'hidden' });
  pass('the payment modal closes on Done');

  // Devnet honesty: the wallet must name the network and disclaim value.
  await page.getByRole('button', { name: 'Wallet' }).first().click();
  await page.getByRole('heading', { name: 'Wallet', exact: true }).waitFor();
  await page.getByText(/These USDC test tokens have no financial value/).waitFor();
  const address = await page.locator('.wallet-receive code').innerText();
  assert.equal(address.trim(), '5sbdm8CMQfdZBiLHVJhukJUMTwbrwd5bQTFjKcnUBVg6');
  pass('the wallet shows the derived devnet address and a value disclaimer');

  // Balances must render from the RPC response, not be inferred or faked.
  await page.getByText('12.50').first().waitFor();
  await page.getByText('1.500000 SOL for network fees').waitFor();
  pass('SOL and USDC balances render from the devnet response');

  // No horizontal overflow at any supported width.
  for (const width of WIDTHS) {
    await page.setViewportSize({ width, height: 900 });
    await page.evaluate(() => document.fonts.ready);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
    assert.equal(overflow, false, `horizontal overflow at ${width}px`);
  }
  pass(`no horizontal overflow at ${WIDTHS.join(', ')}`);

  assert.deepEqual(errors, [], `uncaught browser errors: ${errors.join(' | ')}`);
  pass('no uncaught browser errors');

  await browser.close();
  console.log(checks.map((check, index) => `${index + 1}. ${check}`).join('\n'));
  console.log(`\n${checks.length}/${checks.length} checks passed.`);
})().catch((error) => { console.error(error); process.exit(1); });
