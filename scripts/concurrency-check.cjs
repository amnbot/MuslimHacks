const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
(async () => {
  const browser = await chromium.launch({ headless: true, ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}) });
  try {
    const context = await browser.newContext();
    // Introduce latency without mocking the actual signature, to expose races.
    await context.addInitScript(() => {
      const nativeSign = crypto.subtle.sign.bind(crypto.subtle);
      crypto.subtle.sign = async (...args) => { await new Promise(r => setTimeout(r, 500)); return nativeSign(...args); };
    });
    const buyer = await context.newPage();
    const supplier = await context.newPage();
    const url = process.env.SANAD_URL || 'http://127.0.0.1:5173/';
    const room = `race-${Date.now()}`;
    await buyer.goto(`${url}?room=${room}&role=buyer#finance`);
    await supplier.goto(`${url}?room=${room}&role=supplier#finance`);
    await buyer.getByRole('button', { name: 'Review agreement', exact: true }).click();
    await supplier.getByRole('button', { name: 'Sign as Amira', exact: true }).waitFor();
    await buyer.getByRole('checkbox').check();
    await supplier.getByRole('checkbox').check();
    await Promise.all([
      buyer.getByRole('button', { name: 'Sign as Bilal', exact: true }).click(),
      supplier.getByRole('button', { name: 'Sign as Amira', exact: true }).click(),
    ]);
    await Promise.all([buyer, supplier].map(page => page.getByRole('heading', { name: 'Agreed. And worth keeping.' }).waitFor()));
    assert.equal(await buyer.locator('.signature-slot.signed').count(), 2);
    assert.equal(await supplier.locator('.hash-strip code').innerText(), await buyer.locator('.hash-strip code').innerText());
    await buyer.getByRole('button', { name: 'Verify or test a change' }).click();
    await buyer.getByRole('button', { name: 'Test a changed amount' }).click();
    await buyer.getByRole('heading', { name: 'This record did not pass verification.' }).waitFor();
    assert.match(await buyer.locator('.verification-result p').innerText(), /content changed/);
    await buyer.getByRole('button', { name: 'Check original' }).click();
    await buyer.getByRole('heading', { name: 'Record intact. Both signatures valid.' }).waitFor();
    await buyer.getByRole('button', { name: 'Close dialog' }).click();
    await buyer.getByRole('button', { name: 'Reset demo', exact: true }).click();
    await buyer.getByRole('dialog').getByRole('button', { name: 'Reset demo', exact: true }).click();
    await buyer.getByRole('button', { name: 'Review agreement', exact: true }).click();
    await supplier.getByRole('button', { name: 'Sign as Amira', exact: true }).waitFor();
    await buyer.getByRole('checkbox').check();
    await buyer.getByRole('button', { name: 'Sign as Bilal', exact: true }).click();
    await supplier.getByRole('button', { name: 'Reset demo', exact: true }).click();
    await supplier.getByRole('dialog').getByRole('button', { name: 'Reset demo', exact: true }).click();
    await buyer.waitForTimeout(900); // Must outlive delayed native signing.
    assert.equal(await buyer.getByRole('heading', { name: 'How should this invoice be paid?' }).isVisible(), true);
    assert.equal(await supplier.getByRole('heading', { name: 'How should this invoice be paid?' }).isVisible(), true);
    const result = { status: 'passed', checked: ['simultaneous two-tab signatures converge', 'consistent changed amount fails fingerprint', 'original still verifies', 'remote reset invalidates pending signature'] };
    await fs.writeFile('test-results/concurrency-check.json', JSON.stringify(result, null, 2));
    console.log(JSON.stringify(result));
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
