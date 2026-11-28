"use client";
import {useState} from "react";
import type {Offer} from "../lib/billing/offers";

export function BillingButton({offer,enabled,label}:{offer:Offer|"portal";enabled:boolean;label:string}){
  const [busy,setBusy]=useState(false),[error,setError]=useState("");
  async function open(){
    setBusy(true);setError("");
    try{
      const r=await fetch("/api/billing/checkout?offer="+offer,{method:"POST"});
      if(r.status===401){location.assign("/login");return;}
      const data=await r.json();
      if(!r.ok || !data.url) throw new Error(data.error || "İşlem başlatılamadı.");
      location.assign(data.url);
    }catch(e){setError(e instanceof Error?e.message:"Bağlantı hatası.");setBusy(false);}
  }
  return <><button className="plans-action plans-primary" disabled={!enabled || busy} onClick={open}>{busy?"Açılıyor…":label}</button>{error && <p role="alert">{error}</p>}</>;
}
