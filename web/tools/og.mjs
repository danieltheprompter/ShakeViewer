import { chromium } from 'playwright';
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1200, height: 630 } });
await p.goto('http://localhost:8080/', { waitUntil: 'networkidle' }); await p.waitForTimeout(2500);
await p.screenshot({ path: process.argv[2] }); await b.close();
