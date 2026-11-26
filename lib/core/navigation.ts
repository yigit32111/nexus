export function safeInternalPath(raw:unknown):string {
 if(typeof raw!=="string"||!raw.startsWith("/")||raw.startsWith("//")||/[\\\u0000-\u001f\u007f]/.test(raw)||/%(?:2f|5c|0[0-9a-f]|1[0-9a-f]|7f)/i.test(raw))return "/";
 try{
  const url=new URL(raw,"https://nexus.invalid");
  if(url.origin!=="https://nexus.invalid"||!["/","/workspace","/admin"].includes(url.pathname))return "/";
  return url.pathname+url.search+url.hash;
 }catch{return "/"}
}
