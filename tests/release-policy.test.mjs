import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync, existsSync} from "node:fs";
import {offers} from "../lib/billing/offers.ts";
const read=p=>readFileSync(new URL("../"+p,import.meta.url),"utf8");
test("checkout prices and model allowances are bounded and separate",()=>{
 assert.equal(offers.pro.price,249);
 assert.ok(offers.plus.price > offers.pro.price && offers.plus.allowance > offers.pro.allowance);
 assert.ok(offers.extra.price > 0 && offers.extra.allowance > 0);
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

