const { chromium } = require('playwright');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
(async () => {
 const browser = await chromium.launch({executablePath: '/usr/bin/chromium', headless: true, args: ['--no-sandbox']});
 try {
  const page = await browser.newPage();
  await page.route('https://fixture.test/**', route => route.fulfill({contentType:'text/html; charset=utf-8',body:`<title>إدارة الطلبات</title><h1>طلبات البيع</h1><div class="o_web_client"></div><label>العميل<input value="PRIVATE_CUSTOMER"></label><label>PIN<input name="pin" value="PRIVATE_PIN"></label><label>كلمة المرور<input type="password" value="PRIVATE_PASSWORD"></label><button>حفظ</button><button hidden>HIDDEN_ACTION</button><a href="/orders?token=PRIVATE_TOKEN#PRIVATE_FRAGMENT">الطلبات</a><a href="javascript:alert(1)">BAD_LINK</a><textarea>PRIVATE_TEXTAREA</textarea>`}));
  await page.goto('https://fixture.test/orders?secret=PRIVATE_QUERY#PRIVATE_HASH');
  await page.addScriptTag({path:path.join(__dirname,'../analyzer.js')});
  const result = await page.evaluate(() => analyzePage());
  assert.equal(result.odoo,true);
  assert.equal(result.url,'https://fixture.test/orders');
  assert.deepEqual(result.buttons,['حفظ']);
  assert.equal(result.fields.length,2);
  assert.deepEqual(result.links,[{label:'الطلبات',url:'https://fixture.test/orders'}]);
  assert.ok(!JSON.stringify(result).includes('PRIVATE_'));
  assert.ok(!JSON.stringify(result).includes('HIDDEN_ACTION'));
  console.log('PASS: analyzer detects UI; excludes sensitive fields, values, hidden elements, URL query/fragment and unsafe links.');
  const panel = await browser.newPage({acceptDownloads:true});
  await panel.addInitScript(({result}) => {
   window.chrome = {storage:{local:{get:async()=>({siteGuidePages:[]}),set:async data=>{window.saved=data},remove:async()=>{window.saved=null}}},tabs:{query:async()=>[{id:1}]},scripting:{executeScript:async()=>[{result}]}};
  },{result});
  await panel.route('https://panel.test/**', route => {
   const name = new URL(route.request().url()).pathname.slice(1) || 'panel.html';
   const types = {html:'text/html; charset=utf-8',js:'application/javascript',css:'text/css'};
   return route.fulfill({contentType:types[name.split('.').pop()],body:fs.readFileSync(path.join(__dirname,'..',name))});
  });
  await panel.goto('https://panel.test/panel.html');
  await panel.locator('#analyze').click();
  await panel.waitForFunction(()=>document.getElementById('count').textContent==='1');
  assert.match(await panel.locator('#result').innerText(),/طلبات البيع/);
  await panel.locator('#analyze').click();
  await panel.waitForFunction(()=>document.getElementById('status').textContent.includes('تم التحليل'));
  assert.equal(await panel.locator('#count').innerText(),'1');
  const downloadPromise = panel.waitForEvent('download');
  await panel.locator('#export').click();
  const download = await downloadPromise;
  const report=JSON.parse(fs.readFileSync(await download.path(),'utf8'));
  assert.equal(report.pages.length,1);
  assert.ok(!JSON.stringify(report).includes('PRIVATE_'));
  panel.once('dialog',dialog=>dialog.accept());
  await panel.locator('#clear').click();
  await panel.waitForFunction(()=>document.getElementById('count').textContent==='0');
  await panel.evaluate(()=>{chrome.scripting.executeScript=async()=>{throw new Error('denied')}});
  await panel.locator('#analyze').click();
  await panel.waitForFunction(()=>document.getElementById('status').textContent.includes('تعذّر'));
  console.log('PASS: panel analysis, local save, deduplication, JSON export, clear and permission-error handling.');
 } finally { await browser.close(); }
})().catch(e=>{console.error(e);process.exitCode=1});
