import test from "node:test";
import assert from "node:assert/strict";
import {canRetryFreeModel,retryAfterSeconds} from "../lib/core/chat-profiles.ts";
test("shared account limits do not cause a second upstream call",()=>{
 for(const status of [401,402,403,429])assert.equal(canRetryFreeModel(status),false);
 for(const status of [408,500,502,503,504])assert.equal(canRetryFreeModel(status),true);
});
test("only bounded numeric Retry-After values are forwarded",()=>{
 for(const [value,expected] of [["1","1"],["60","60"],["0030","30"],["3600","3600"]])assert.equal(retryAfterSeconds(value),expected);
 for(const v of [null,undefined,30,"","0","-1","1.5","3601","999999999999","60\nX-Test: x","Fri, 27 Nov 2026 06:00:00 GMT"])assert.equal(retryAfterSeconds(v),undefined);
});
