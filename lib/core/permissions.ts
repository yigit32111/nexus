import "server-only";
import {createClient} from "../../utils/supabase/server";
export function isCoreAdminId(id: string): boolean {
  const normalizedId = id.toLowerCase();
  if (!/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/.test(normalizedId)) return false;
  const primary = process.env.NEXUS_ADMIN_USER_ID || "";
  const additional = (process.env.NEXUS_ADDITIONAL_ADMIN_USER_IDS || "").split(",");
  return [primary, ...additional].some((value) => value.trim().toLowerCase() === normalizedId);
}
export async function getCoreAdmin(){
  const client=await createClient();
  const {data:{user},error}=await client.auth.getUser();
  return !error && user && isCoreAdminId(user.id) ? user : null;
}
