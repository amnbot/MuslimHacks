const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright-core');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const base = process.env.SANAD_URL || 'http://127.0.0.1:5173/';
const storage = 'sanad.business.v1';
const wallet = '7YttLkHDoNj9wyDur5TQKkLBwZWfw46RaD52r13fMwpW';

(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROMIUM_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe' });
  const errors = []; const external = []; const checks = [];
  const contexts = await Promise.all([browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' }), browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' })]);
  for (const context of contexts) { context.on('page', page => page.on('pageerror', error => errors.push(error.message))); context.on('request', request => { if (!request.url().startsWith(base) && !request.url().startsWith('blob:') && !request.url().startsWith('data:')) external.push(request.url()); }); }
  const [issuer, customer] = await Promise.all(contexts.map(context => context.newPage()));
  async function openWorkspace(page, business) { await page.goto(base); await page.getByLabel('Your business name').fill(business); await page.getByRole('button', { name: 'Create workspace' }).click(); await page.getByRole('heading', { name: 'Invoices', exact: true }).waitFor(); }
  async function noOverflow(page) { assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false); }
  async function screenshot(page, name) { await page.evaluate(() => document.fonts.ready); await page.locator('.toast').waitFor({ state: 'hidden', timeout: 6000 }); await page.evaluate(() => scrollTo(0, 0)); await noOverflow(page); await page.screenshot({ path: `.impeccable/review/${name}.png`, fullPage: true }); }
  async function currentRecord(page) { return page.evaluate(key => JSON.parse(localStorage.getItem(key)).records[0], storage); }
  async function share(page) { await page.getByRole('button', { name: 'Share encrypted invoice' }).click(); const key = await page.getByLabel('Private decryption key').inputValue(); const downloadPromise = page.waitForEvent('download'); await page.getByRole('button', { name: 'Download encrypted invoice' }).click(); const download = await downloadPromise; const text = await fs.readFile(await download.path(), 'utf8'); await page.getByRole('button', { name: 'Close dialog' }).click(); return { key, text }; }
  async function importText(page, text, key = '') { await page.getByRole('button', { name: /^(Import invoice|Import acknowledgement)$/ }).click(); await page.getByLabel('Or paste the record').fill(text); await page.getByLabel('Decryption key', { exact: true }).fill(key); await page.getByRole('button', { name: 'Verify & import' }).click(); }
  await fs.mkdir('.impeccable/review', { recursive: true }); await fs.mkdir('test-results', { recursive: true });
  try {
    await Promise.all([openWorkspace(issuer, 'Atlas Studio'), openWorkspace(customer, 'Northstar Retail')]);
    checks.push('independent business onboarding with no persona controls');
    assert.doesNotMatch(await issuer.locator('body').innerText(), /Review as|Sign as Bilal|Local prototype|Bank wire|olive oil/);
    await screenshot(issuer, 'business-desktop-empty'); await screenshot(customer, 'business-mobile-empty');
    await issuer.getByRole('button', { name: 'Create invoice', exact: true }).click();
    await issuer.getByLabel('Bill to').fill('Northstar Retail'); await issuer.getByLabel('Invoice reference').fill('INV-042'); await issuer.getByLabel('Payment due').fill('2026-09-30');
    await issuer.getByLabel('Item 1 description').fill('Packaging materials'); await issuer.getByLabel('Item 1 quantity').fill('120'); await issuer.getByLabel('Item 1 unit price').fill('2.40');
    await issuer.getByRole('button', { name: 'Add line item' }).click(); await issuer.getByLabel('Item 2 description').fill('Design services · hours'); await issuer.getByLabel('Item 2 quantity').fill('2.5'); await issuer.getByLabel('Item 2 unit price').fill('85');
    await issuer.getByLabel('Receiving Solana wallet').fill('invalid'); await issuer.getByRole('button', { name: 'Create & sign invoice' }).click(); await issuer.getByRole('alert').waitFor(); checks.push('invalid receiving address rejected before signing');
    await issuer.getByLabel('Receiving Solana wallet').fill(wallet); await issuer.getByLabel('Terms & notes').fill('Brand production and materials. Delivery by September 30.');
    await screenshot(issuer, 'business-desktop-builder'); await issuer.setViewportSize({ width: 390, height: 844 }); await screenshot(issuer, 'business-mobile-builder'); await issuer.setViewportSize({ width: 1440, height: 1000 });
    await issuer.getByRole('button', { name: 'Create & sign invoice' }).click(); await issuer.getByRole('heading', { name: 'INV-042', exact: true }).waitFor();
    const first = await currentRecord(issuer); assert.equal(first.invoice.totalMicros, 500500000); assert.equal(first.signatures.length, 1); checks.push('multi-line goods and services invoice totals exactly 500.50 USDC and signs');
    const uri = await issuer.getByRole('link', { name: 'Open in Solana wallet' }).getAttribute('href'); assert.ok(uri.startsWith(`solana:${wallet}?`)); assert.match(uri, /amount=500.5/); assert.match(uri, /spl-token=EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v/); checks.push('payment request binds exact amount and native Solana USDC mint');
    const encrypted = await share(issuer); assert.ok(!encrypted.text.includes('Atlas Studio')); assert.ok(!encrypted.text.includes(encrypted.key)); checks.push('encrypted export excludes plaintext and separate key');
    await importText(customer, encrypted.text, 'A'.repeat(43)); await customer.locator('dialog [role=alert]').waitFor(); assert.equal((await customer.evaluate(key => JSON.parse(localStorage.getItem(key)).records.length, storage)), 0); checks.push('wrong decryption key cannot import invoice');
    await customer.getByLabel('Decryption key', { exact: true }).fill(encrypted.key); await customer.getByRole('button', { name: 'Verify & import' }).click(); await customer.getByRole('heading', { name: 'INV-042', exact: true }).waitFor();
    await screenshot(customer, 'business-mobile-detail');
    await customer.getByRole('button', { name: 'Acknowledge terms' }).click(); await customer.getByText('Terms acknowledged', { exact: true }).waitFor();
    const acknowledged = await currentRecord(customer); assert.equal(acknowledged.signatures.length, 2); assert.notDeepEqual(acknowledged.signatures[0].publicKeyJwk, acknowledged.signatures[1].publicKeyJwk); checks.push('independent customer key acknowledges imported issuer record');
    const back = await share(customer); await importText(issuer, back.text, back.key); await issuer.getByText('Terms acknowledged', { exact: true }).waitFor(); assert.equal((await currentRecord(issuer)).signatures.length, 2); checks.push('returning encrypted acknowledgement merges both signatures');
    const tampered = JSON.parse(JSON.stringify(acknowledged)); tampered.invoice.note = 'Changed payment terms'; await importText(issuer, JSON.stringify(tampered)); await issuer.locator('dialog [role=alert]').waitFor(); assert.equal((await currentRecord(issuer)).hash, acknowledged.hash); checks.push('tampered signed record rejected without replacing saved terms'); await issuer.getByRole('button', { name: 'Close dialog' }).click();
    await issuer.reload(); await issuer.getByRole('heading', { name: 'Invoices', exact: true }).waitFor(); assert.equal((await currentRecord(issuer)).signatures.length, 2); checks.push('verified invoices and profile survive reload');
    await screenshot(issuer, 'business-desktop'); await customer.getByRole('button', { name: 'All invoices', exact: true }).click(); await screenshot(customer, 'business-mobile');
    await customer.getByRole('button', { name: 'Wallet', exact: true }).click(); await customer.getByLabel('Solana wallet address').fill(wallet); await customer.getByRole('button', { name: 'Save address' }).click(); assert.equal(await customer.evaluate(key => JSON.parse(localStorage.getItem(key)).profile.wallet, storage), wallet);
    assert.equal(await customer.locator('.provider-row').count(), 4); await customer.getByText('Understand Solana network costs', { exact: true }).click(); assert.match(await customer.locator('body').innerText(), /0.000005 SOL/); assert.match(await customer.locator('body').innerText(), /no checkout is connected/); checks.push('wallet address persists; funding providers and gas costs are separated honestly');
    await screenshot(customer, 'business-mobile-wallet');
    for (const width of [320, 768, 1000]) { await customer.setViewportSize({ width, height: 900 }); await noOverflow(customer); } checks.push('320px, 390px, 768px, 1000px and 1440px layouts have no horizontal overflow');
    assert.deepEqual(errors, []); assert.deepEqual(external, []); checks.push('no uncaught browser errors or third-party requests during workflow');
    await fs.writeFile('test-results/business-browser.json', JSON.stringify({ passed: checks.length, checks, errors, externalRequests: external }, null, 2)); console.log(JSON.stringify({ passed: checks.length, checks }, null, 2));
  } catch (error) { await issuer.screenshot({ path: 'test-results/business-failure-desktop.png', fullPage: true }); await customer.screenshot({ path: 'test-results/business-failure-mobile.png', fullPage: true }); throw error; }
  finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
