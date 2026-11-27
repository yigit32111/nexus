import test from "node:test";
import assert from "node:assert/strict";
import {validDocumentId} from "../lib/core/document-id.ts";
test("document deletion accepts generated IDs, not arbitrary patterns",()=>{
 assert.equal(validDocumentId("00000000-0000-4000-8000-000000000001"),true);
 assert.equal(validDocumentId("1760000000000-abcd123"),true);
 for(const v of [null,"","%","_","abc*","abc%","x_y","../foo","a".repeat(101)])assert.equal(validDocumentId(v),false);
});
