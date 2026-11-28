import test from "node:test";
import assert from "node:assert/strict";
import {PRO_MODELS} from "../lib/core/plans.ts";
import {parseFreeCatalog} from "../lib/core/free-catalog.ts";
test("Pro models remain excluded from the free catalog",()=>{
 const data=PRO_MODELS.map(id=>({id,context_length:128000,architecture:{input_modalities:["text"],output_modalities:["text"]},pricing:{prompt:"0.001",completion:"0.001"}}));
 assert.deepEqual(parseFreeCatalog({data}),[]);
});

