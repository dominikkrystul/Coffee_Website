import { writeFile } from "node:fs/promises";
import QRCode from "qrcode";
import { tableIds } from "../lib/catalog.ts";

const configured = process.argv[2] ?? process.env.T3_COFFEE_BASE_URL;
let base;
try {
  base = new URL(configured);
} catch {
  throw new Error("Set T3_COFFEE_BASE_URL or pass an HTTPS deployment URL to npm run qr --.");
}

if (
  base.protocol !== "https:" ||
  !/^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z](?:[a-z0-9-]*[a-z0-9])$/.test(base.hostname) ||
  /(?:^|\.)(?:localhost|local|test|invalid|example|internal)$/.test(base.hostname) ||
  base.username || base.password || base.pathname !== "/" || base.hash || base.search
) {
  throw new Error("Use the public HTTPS origin of the T3 Coffee deployment.");
}

const entries = await Promise.all(tableIds.map(async (id) => {
  const url = new URL(`/table/${id}`, base).href;
  const qr = await QRCode.toString(url, { type: "svg", errorCorrectionLevel: "M", margin: 4 });
  return `<section><h2>Table ${id}</h2>${qr}<p>${url}</p></section>`;
}));

const destination = new URL("../qr-tables.html", import.meta.url);
await writeFile(destination, `<!doctype html>
<html lang="en">
<meta charset="utf-8">
<title>T3 Coffee table QR codes</title>
<style>
body{font:16px system-ui,sans-serif;margin:24px;color:#222}
h1{font-size:25px}
main{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px}
section{border:1px solid #bbb;text-align:center;padding:10px 8px;break-inside:avoid}
svg{width:min(100%,45mm);height:auto} h2{margin:0;font-size:20px} p{font-size:11px;overflow-wrap:anywhere}
</style>
<h1>T3 Coffee · Table QR codes</h1>
<main>${entries.join("\n")}</main>
</html>
`);
console.log("Created qr-tables.html. Open it in a browser and print.");
