import test from "node:test";import assert from "node:assert/strict";import {safeInternalPath} from "../lib/core/navigation.ts";
test("valid private navigation paths",()=>{assert.equal(safeInternalPath("/workspace?tab=research"),"/workspace?tab=research");assert.equal(safeInternalPath("/admin"),"/admin")});
test("reject external and malformed redirect paths",()=>{for(const value of ["https://example.org","//example.org","/\\example.org","/%2f%2fexample.org","/%5cexample.org","/\n/example.org","javascript:alert(1)","/login",null])assert.equal(safeInternalPath(value),"/",String(value))});
