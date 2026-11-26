const assert = require('node:assert/strict');
const { once } = require('node:events');
const { readFileSync, readdirSync, mkdtempSync } = require('node:fs');
const { randomBytes, randomUUID } = require('node:crypto');
const { spawn } = require('node:child_process');
const { join } = require('node:path');
const { tmpdir } = require('node:os');
const { chromium, expect } = require(join(process.cwd(), 'node_modules/@playwright/test'));
const { createConsole } = require(join(process.cwd(), '../ditec_hs26_team_03/ros2_website/server'));

const secret = randomBytes(32).toString('base64url');
const app = createConsole({root:mkdtempSync(join(tmpdir(), 't3-live-smoke-')), orderSecret:secret});
const host = '127.0.0.1';
const websitePort = 3212;
const website = 'http://' + host + ':' + websitePort;
const oldId = randomUUID();
let next, browser;
const listen = async (server, port=0) => {
  server.listen(port, host);
  await once(server, 'listening');
  return server.address().port;
};
const close = server => new Promise((resolve, reject) => {
  server.close(error => error ? reject(error) : resolve());
  server.closeAllConnections();
});
async function action(origin, id, action) {
  const response = await fetch(origin+'/api/operator/orders/'+id, {method:'POST',headers:{'Content-Type':'application/json',Origin:origin},body:JSON.stringify({action})});
  assert.equal(response.status, 200);
}
async function main() {
  const consoleOrigin = 'http://' + host + ':' + await listen(app.server);
  const orderPort = await listen(app.orderServer);
  const orderOrigin = 'http://' + host + ':' + orderPort;
  const env = {...process.env, VERCEL_ENV:'production', COFFEE_ORDER_API_URL:orderOrigin, COFFEE_ORDER_API_SECRET:secret};
  async function launch(mode) {
    if (mode) env.COFFEE_ORDER_MODE=mode; else delete env.COFFEE_ORDER_MODE;
    next = spawn(process.execPath, ['node_modules/next/dist/bin/next','start','--hostname',host,'--port',String(websitePort)], {env,stdio:'ignore'});
    await expect.poll(async () => fetch(website).then(r=>r.status).catch(()=>null), {timeout:10000}).toBe(200);
  }
  async function stop() {
    const exited = once(next,'exit');
    next.kill();
    await exited;
    next=undefined;
  }
  browser = await chromium.launch();
  const page = await browser.newPage({viewport:{width:390,height:844}});
  await page.addInitScript(({oldId}) => {
    const key = 't3-coffee:v1:T4';
    if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify({
      cart:null, latestOrderId:oldId, orders:{[oldId]:{id:oldId,tableId:'T4',status:'received'}},
    }));
  },{oldId});
  await launch();
  await page.goto(website+'/table/T4');
  await page.getByRole('link',{name:/^Espresso /}).click();
  await page.getByRole('button',{name:/^Add to Cart/}).click();
  await page.getByRole('link',{name:'Continue to Checkout'}).click();
  await expect(page.getByText('Order service unavailable',{exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Place Order',exact:true}).click();
  await expect(page.locator('main [role=alert]')).toContainText('unavailable');
  await expect(page).toHaveURL(/checkout$/);
  await stop();
  await launch('live');
  await page.goto(website+'/table/T4');
  await expect(page.getByText('Track your latest demo order')).toHaveCount(0);
  await page.goto(website+'/table/T4/order/'+oldId+'/confirmation');
  await expect(page.getByRole('heading',{name:'Order unavailable'})).toBeVisible();
  await page.goto(website+'/table/T4/checkout');
  await expect(page.getByText('Coffee Cup checkout')).toBeVisible();
  await close(app.orderServer);
  await page.getByRole('button',{name:'Place Order',exact:true}).click();
  await expect(page.locator('main [role=alert]')).toContainText('unavailable');
  await expect(page).toHaveURL(/checkout$/);
  await listen(app.orderServer,orderPort);
  const accepted = page.waitForResponse(r=>r.url()===website+'/api/orders' && r.status()===201);
  await page.getByRole('button',{name:'Place Order',exact:true}).click();
  const response = await accepted;
  const {order} = await response.json();
  await expect(page.getByRole('heading',{name:'Order received!'})).toBeVisible();
  await expect(page.getByText('The café received your order.',{exact:false})).toBeVisible();
  const queue = await (await fetch(consoleOrigin+'/api/operator/orders')).json();
  assert.equal(queue.orders.length,1);
  assert.equal(queue.orders[0].id,order.id);
  assert.equal(queue.orders[0].tableId,'T4');
  assert.equal(queue.orders[0].productId,'espresso');
  const replay = await fetch(website+'/api/orders',{method:'POST',headers:{'Content-Type':'application/json'},body:response.request().postData()});
  assert.equal(replay.status,200);
  assert.equal((await replay.json()).order.id,order.id);
  await page.getByRole('link',{name:'Track Order'}).click();
  const step = page.locator('[aria-current="step"]');
  await expect(step).toContainText('Order received');
  await action(consoleOrigin,order.id,'prepare');
  await expect(step).toContainText('Preparing coffee');
  await page.reload();
  await expect(step).toContainText('Preparing coffee');
  await close(app.orderServer);
  await expect(page.locator('main [role=alert]')).toContainText('Connection lost');
  await expect(step).toContainText('Preparing coffee');
  await action(consoleOrigin,order.id,'loaded');
  await listen(app.orderServer,orderPort);
  await expect(step).toContainText('Ready for delivery');
  await expect(page.locator('main [role=alert]')).toHaveCount(0);
  const pickupDeadline = Date.now() + 5000;
  let serverAdvance=0;
  let trackingOrder = { ...order, status:'arrived', execution:'robot', tableArrivalAt:new Date(pickupDeadline - 5000).toISOString(),
    pickupDeadline, departureWait:'spotter_clearance' };
  await page.route('**/api/orders/' + order.id, route =>
    route.fulfill({json:{order:{...trackingOrder,serverTime:Date.now()+serverAdvance}}}));
  await page.reload();
  await expect(page.getByText('Your coffee has arrived!')).toBeVisible();
  const timer=page.getByRole('timer');
  await expect(timer).toBeVisible();
  const initialSeconds=parseInt(await timer.textContent(),10);
  await page.clock.install();
  serverAdvance+=2000;
  await page.clock.fastForward(2000);
  await page.reload();
  await expect(timer).toBeVisible();
  assert.ok(parseInt(await timer.textContent(),10)<initialSeconds);
  serverAdvance+=5000;
  await page.clock.fastForward(5000);
  await expect(page.getByText('The robot is waiting until the platform and area are clear.')).toBeVisible();
  await expect(step).toContainText('At your table');
  trackingOrder={...trackingOrder,status:'delivered',departureWait:undefined};
  await page.clock.fastForward(2500);
  await expect(step).toContainText('Delivered');
  await expect(timer).toHaveCount(0);

  for (const file of readdirSync('.next/static',{recursive:true}).filter(file=>file.endsWith('.js'))) {
    const chunk=readFileSync(join('.next/static',file),'utf8');
    for (const value of [secret,orderOrigin,'COFFEE_ORDER_API_SECRET','COFFEE_ORDER_API_URL']) assert.ok(!chunk.includes(value));
  }
  console.log('Production build passed: missing mode, live mode, old demo data, retry, accepted order and queue ID, idempotency, poll, refresh, disconnect, reconnect, pickup timer, safety wait, Delivered, no credential in client chunks.');
}
main().catch(e=>{console.error(e);process.exitCode=1;}).finally(async()=>{
  if (browser) await browser.close();
  if (next) next.kill();
  for (const server of [app.server,app.orderServer]) if (server.listening) await close(server);
});
