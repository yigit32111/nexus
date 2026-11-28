import "server-only";
import {createHmac, timingSafeEqual} from "node:crypto";
import {createAdminClient} from "../../utils/supabase/admin";
import {offerIds, type Offer} from "./offers";

export function variant(id: Offer) { return process.env["LEMON_VARIANT_" + id.toUpperCase()] || ""; }
export function configured() {
  const variants = offerIds.map(variant);
  return ["test","live"].includes(process.env.NEXUS_BILLING_MODE || "") &&
    Boolean(process.env.LEMON_API_KEY && process.env.LEMON_STORE_ID && process.env.LEMON_WEBHOOK_SECRET) &&
    variants.every(v => /^\d+$/.test(v)) && new Set(variants).size === variants.length;
}
export function signature(input: string) {
  return createHmac("sha256", process.env.LEMON_WEBHOOK_SECRET!).update(input).digest("hex");
}
export function matches(input: string, supplied: unknown) {
  return typeof supplied === "string" && /^[\da-f]{64}$/.test(supplied) &&
    timingSafeEqual(Buffer.from(signature(input),"hex"), Buffer.from(supplied,"hex"));
}
export async function lemon(path: string, body?: object) {
  const response = await fetch("https://api.lemonsqueezy.com/v1/" + path, {
    method:body ? "POST":"GET", cache:"no-store", redirect:"error", signal:AbortSignal.timeout(12000),
    headers:{Authorization:"Bearer " + process.env.LEMON_API_KEY, Accept:"application/vnd.api+json","Content-Type":"application/vnd.api+json"},
    ...(body ? {body:JSON.stringify(body)} : {}),
  });
  if (!response.ok) throw new Error("BILLING_PROVIDER");
  return (await response.json()).data;
}
export async function balance(user: string) {
  if (!configured()) return {pro:false, monthly:0, extra:0, pending:0};
  await checkEnvironment();
  const {data,error} = await createAdminClient().rpc("nexus_billing_balance",{p_user:user});
  if (error) throw new Error("BILLING_DATABASE");
  return data as {pro:boolean; monthly:number; extra:number; pending:number};
}

export async function checkEnvironment(){
  const {data,error}=await createAdminClient().rpc("nexus_billing_mode",{p_mode:process.env.NEXUS_BILLING_MODE});
  if(error || data!==true) throw new Error("Billing environment mismatch");
}
