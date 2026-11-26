import "server-only";
import {createClient} from "../../utils/supabase/server";
export async function getCoreAdmin(){
  const client=await createClient();
  const {data:{user},error}=await client.auth.getUser();
  const configured=(process.env.NEXUS_ADMIN_USER_ID||"").trim().toLowerCase();
  return !error&&user&&configured&&user.id.toLowerCase()===configured?user:null;
}
