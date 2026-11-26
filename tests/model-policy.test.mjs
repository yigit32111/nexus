import test from "node:test";import assert from "node:assert/strict";import {chooseModel,estimateReservation,parsePrice} from "../lib/core/model-policy.ts";
const mk=(id,extra={})=>({id,context:64000,vision:false,prompt:0,completion:0,request:0,image:0,supported:[],...extra});
test("auto excludes paid and vision-incompatible models",()=>assert.equal(chooseModel([mk("paid",{vision:true,prompt:.001}),mk("text"),mk("vision",{vision:true})],"auto","","",1,100).id,"vision"));
test("invalid manual selection rejected",()=>assert.equal(chooseModel([mk("text")],"bad","","",0,100),undefined));
test("context limit enforced",()=>assert.equal(chooseModel([mk("text",{context:4000})],"auto","","",0,100),undefined));
test("free reservation and paid/web estimate",()=>{assert.equal(estimateReservation(mk("free"),100,0,false),0);assert.ok(estimateReservation(mk("free"),100,0,true)>=50000);});
test("bad pricing rejected",()=>{for(const v of [null,"",undefined,-1,"NaN",Infinity])assert.equal(parsePrice(v),null);});
