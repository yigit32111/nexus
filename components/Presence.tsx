"use client";
import {useEffect} from "react";
import {usePathname,useRouter} from "next/navigation";
import {createClient} from "../utils/supabase/client";

export function Presence(){
  const path=usePathname();
  const router=useRouter();
  useEffect(()=>{
    if (!["/", "/workspace", "/admin"].includes(path)) return;
    const db=createClient();
    let active=true;
    async function pulse(){
      if(document.visibilityState!=="visible") return;
      const {data}=await db.auth.getSession();
      if(!active || !data.session) return;
      await db.rpc("nexus_touch_presence");
      if(active && path==="/admin") router.refresh();
    }
    void pulse();
    const timer=window.setInterval(pulse,60000);
    document.addEventListener("visibilitychange",pulse);
    return ()=>{active=false;clearInterval(timer);document.removeEventListener("visibilitychange",pulse)};
  },[path,router]);
  return null;
}
