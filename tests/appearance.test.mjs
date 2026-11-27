import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {ACCENTS,normalizeAppearance} from "../lib/core/appearance.ts";
test("appearance defaults and older preferences",()=>{
 for(const v of [undefined,null,[],false,0,"sage",{}])assert.deepEqual(normalizeAppearance(v),{accent:"ocean",density:"comfortable",motion:"normal"});
});
test("validated finite palette and settings",()=>{
 assert.deepEqual(ACCENTS.map(x=>x.id),["ocean","lavender","sage"]);
 assert.deepEqual(normalizeAppearance({accent:"lavender",density:"compact",motion:"reduced",extra:"ignored"}),{accent:"lavender",density:"compact",motion:"reduced"});
 assert.deepEqual(normalizeAppearance({accent:"url(https://example.invalid)",density:"other",motion:1}),{accent:"ocean",density:"comfortable",motion:"normal"});
});
test("appearance is scoped to UI",()=>{
 const page=readFileSync(new URL("../app/page.tsx",import.meta.url),"utf8");
 const css=readFileSync(new URL("../app/globals.css",import.meta.url),"utf8");
 assert.match(page,/appearance:normalizeAppearance\(source\.appearance\)/);
 assert.match(page,/data-accent=\{appearance\.accent\}/);
 assert.match(css,/\.nexus-app\[data-motion="reduced"\]/);
});
