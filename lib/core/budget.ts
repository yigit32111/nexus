import "server-only";
import {createAdminClient} from "../../utils/supabase/admin";
export async function reserveRequest(userId:string,feature:"chat"|"image",cost:number){
  if(!Number.isSafeInteger(cost)||cost<0||cost>100000000)return false;
  const {data,error}=await createAdminClient().rpc("nexus_reserve_request",{p_user:userId,p_feature:feature,p_cost:cost});
  if(error)throw new Error("CORE_QUOTA_UNAVAILABLE");
  return data===true;
}
export function reportedCost(usage:any):number|undefined {
  const cost=usage?.cost;
  if(typeof cost!=="number"||!Number.isFinite(cost)||cost<0||cost>1000000)return undefined;
  return Math.ceil(cost*1e6);
}
