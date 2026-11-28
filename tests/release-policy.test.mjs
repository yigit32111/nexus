import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync, existsSync} from "node:fs";
import {BILLING_RELEASE,PRO_OFFER} from "../lib/core/plans.ts";
const read=p=>readFileSync(new URL("../"+p,import.meta.url),"utf8");
test("5.1 release policy keeps premium and real payments disabled",()=>{
 assert.deepEqual(BILLING_RELEASE,{targetMajor:10,paymentsEnabled:false,premiumEnabled:false});
 assert.equal(PRO_OFFER.monthlyBudgetMicrousd,5_000_000);
 assert.equal(PRO_OFFER.priceTry,249);
 const preview=read("components/ProPaymentPreview.tsx");
 assert.match(preview,/<button[^>]*disabled/);
 assert.doesNotMatch(preview + read("app/plans/page.tsx"),/<(?:form|input|textarea)\b/);
 assert.equal(existsSync(new URL("../app/api/payment",import.meta.url)),false);
 assert.equal(existsSync(new URL("../app/api/checkout",import.meta.url)),false);
});
test("retired image route has no provider integration",()=>{
 const image=read("app/api/image/route.ts");
 assert.match(image,/status:410/);
 assert.doesNotMatch(image,/fetch\(|process\.env|HF_TOKEN|reserveRequest|writeUsageLog/);
 assert.doesNotMatch(read("app/page.tsx"),/fetch\(["']\/api\/image/);
});
test("release manifest and package lock versions match",()=>{
 const pkg=JSON.parse(read("package.json")),lock=JSON.parse(read("package-lock.json"));
 const manifest=JSON.parse(read("public/manifest.webmanifest"));
 assert.equal(pkg.version,"5.1.2");
 assert.equal(lock.version,pkg.version);
 assert.equal(lock.packages[""].version,pkg.version);
 assert.equal(manifest.name,`NEXUS AI ${pkg.version}`);
});
