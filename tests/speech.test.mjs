import test from "node:test";
import assert from "node:assert/strict";
import {speechError, speechText} from "../lib/core/speech.ts";

test("speech snapshots preserve all phrases and tolerate missing alternatives",()=>{
  assert.equal(speechText([{0:{transcript:" merhaba "}}, {}, {0:{transcript:"NEXUS"}}]),"merhaba NEXUS");
});
test("permission and service failures get distinct recovery messages",()=>{
  assert.equal(speechError("NotAllowedError"),speechError("not-allowed"));
  assert.notEqual(speechError("network"),speechError("audio-capture"));
});
