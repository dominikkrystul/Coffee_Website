# T3 Coffee

Team T3’s customer ordering demo for the HSLU Robot Coffee Cup. Orders and tracking are simulated in the browser.

## Run locally

With Node.js 22.18 or newer:

```sh
npm ci
npm run dev
```

Open [Table T1](http://localhost:3100/table/T1) or [development tools](http://localhost:3100/dev).

For a phone on the same network, use the Network URL printed by Next.js with `/table/T1` appended. The project npm config uses its own cache. In VS Code, select **TypeScript: Select TypeScript Version → Use Workspace Version** if prompted.

For browser tests, run `npx playwright install chromium` once, then `npm test`.

## Deploy and print QR codes

Import this repository into Vercel with its Next.js preset and Node.js 22.18 or newer. Once deployed, pass its public HTTPS origin to the QR generator:

```sh
npm run qr -- https://your-vercel-domain.vercel.app
```

Open and print the generated `qr-tables.html`.
