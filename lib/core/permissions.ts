import "server-only";
import {createClient} from "../../utils/supabase/server";
export function isCoreAdminId(id: string): boolean {
  const configured = (process.env.NEXUS_ADMIN_USER_ID || "").trim().toLowerCase();
  return configured.length > 0 && id.toLowerCase() === configured;
}
export async function getCoreAdmin(){
  const client=await createClient();
  const {data:{user},error}=await client.auth.getUser();
  return !error && user && isCoreAdminId(user.id) ? user : null;
}
