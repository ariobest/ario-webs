import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const db = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });
const cors = { "Access-Control-Allow-Origin":"*", "Access-Control-Allow-Headers":"authorization, apikey, content-type", "Access-Control-Allow-Methods":"GET, POST, OPTIONS", "Vary":"Origin" };
function json(data: unknown,status=200){return new Response(JSON.stringify(data),{status,headers:{...cors,"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store","X-Content-Type":"nosniff"}})}
function clean(v:unknown,max=180){return typeof v==="string"?v.trim().slice(0,max):""}
function randomHex(bytes=16){return Array.from(crypto.getRandomValues(new Uint8Array(bytes)),b=>b.toString(16).padStart(2,"0")).join("")}
function randomArioKey(){const chars="ABCDEFGHJKLMNPQRSTUVWXYZ23456789";const r=()=>Array.from(crypto.getRandomValues(new Uint8Array(4)),b=>chars[b%chars.length]).join("");return `VOID-${r().slice(0,2)}-${r().slice(0,3)}-${r().slice(0,4)}`}
async function hash(value:string){const bytes=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(value));return Array.from(new Uint8Array(bytes),b=>b.toString(16).padStart(2,"0")).join("")}
async function requireAdmin(req:Request){const token=req.headers.get("Authorization")?.match(/^Bearer\s+(.+)$/i)?.[1];if(!token)return{error:"Sign in as an administrator first.",status:401 as const};const {data,error}=await db.auth.getUser(token);if(error||!data.user)return{error:"Your session is invalid or expired.",status:401 as const};const {data:role,error:re}=await db.from("user_roles").select("role").eq("user_id",data.user.id).eq("role","admin").maybeSingle();if(re||!role)return{error:"Administrator access required.",status:403 as const};return{user:data.user}}
async function checkKey(key:string,slug:string){
 if(!key||!slug)return{error:"Enter both the key and script slug.",code:"INVALID_REQUEST",status:400 as const,protected:true};
 if(!/^(?:VOID|ARIO)-[A-Z0-9]{2}-[A-Z0-9]{3}-[A-Z0-9]{4}$/.test(key))return{error:"WRONG KEY",code:"KEY_NOT_FOUND",status:401 as const,protected:true};
 const key_hash=await hash(key);
 const {data:grant,error}=await db.from("script_keys").select("id,script_id,expires_at,revoked_at,max_uses,use_count").eq("key_hash",key_hash).maybeSingle();
 if(error){console.error("key lookup failed",error);return{error:"Key service could not check the database. Please try again.",code:"BACKEND_ERROR",status:500 as const,protected:true}}
 if(!grant)return{error:"WRONG KEY",code:"KEY_NOT_FOUND",status:401 as const,protected:true};
 if(grant.revoked_at)return{error:"This key has been revoked. Request a new key.",code:"KEY_REVOKED",status:403 as const,protected:true};
 if(grant.expires_at&&Date.parse(grant.expires_at)<=Date.now())return{error:"This key has expired. Request a new key.",code:"KEY_EXPIRED",status:401 as const,protected:true};
 if(grant.max_uses!==null&&grant.use_count>=grant.max_uses)return{error:"This key has reached its usage limit.",code:"KEY_LIMIT_REACHED",status:403 as const,protected:true};
 const {data:script,error:se}=await db.from("scripts").select("id,name,slug,status,content").eq("id",grant.script_id).maybeSingle();
 if(se){console.error("script lookup failed",se);return{error:"Key service could not check the script. Please try again.",code:"BACKEND_ERROR",status:500 as const,protected:true}}
 if(!script)return{error:"The script authorized by this key no longer exists.",code:"SCRIPT_NOT_FOUND",status:404 as const,protected:true};
 if(script.slug!==slug)return{error:"This key is not authorized for the requested script.",code:"WRONG_SCRIPT",status:403 as const,protected:true};
 if(script.status!=="published")return{error:"This script is not published.",code:"SCRIPT_UNPUBLISHED",status:403 as const,protected:true};
 return{grant,script};
}
async function loadWithKey(key:string,slug:string){const checked=await checkKey(key,slug);if("error"in checked)return checked; if(typeof checked.script.content!=="string"||!checked.script.content.trim())return{error:"The script has no source content yet. Contact the script owner.",code:"SCRIPT_SOURCE_EMPTY",status:404 as const,protected:true}; const next=checked.grant.use_count+1;const {data:updated,error:ue}=await db.from("script_keys").update({use_count:next,last_used_at:new Date().toISOString()}).eq("id",checked.grant.id).eq("use_count",checked.grant.use_count).is("revoked_at",null).select("id").maybeSingle();if(ue||!updated)return{error:"Key was used concurrently or revoked.",code:"KEY_CONFLICT",status:409 as const};await db.from("script_events").insert({script_id:checked.script.id,event_type:"download"});return{content:checked.script.content,status:200 as const}}
Deno.serve(async(req:Request)=>{
 try {
 if(req.method==="OPTIONS")return new Response(null,{status:204,headers:cors});
 const url=new URL(req.url);
 if(req.method==="GET"){
   const action=url.searchParams.get("action");
   if(action==="health")return json({ok:true,service:"VOID DEVELOPMENT Script API",version:4,timestamp:new Date().toISOString()});
   if(action==="load"){
     const result=await loadWithKey(clean(url.searchParams.get("key"),180),clean(url.searchParams.get("script"),120));
     if("error"in result)return json({error:result.error,code:result.code||"KEY_INVALID",protected:true},result.status);
     return new Response(result.content,{status:200,headers:{...cors,"Content-Type":"text/plain; charset=utf-8","Cache-Control":"no-store, max-age=0","Pragma":"no-cache","X-Content-Type-Options":"nosniff"}});
   }
   return json({error:"Use ?action=load&script=SCRIPT_SLUG&key=VOID-XX-XXX-XXXX or the POST API."},400);
 }
 if(req.method!=="POST")return json({error:"Use POST with JSON."},405);
 let body:Record<string,unknown>;try{body=await req.json()}catch{return json({error:"Expected a JSON request body."},400)}
 const action=clean(body.action,40);
 if(action==="start-key"){
   const requestedSlug=clean(body.script,120);
   const clientId=clean(body.client_id,128);if(!/^[a-f0-9]{48}$/i.test(clientId))return json({error:"Refresh the page and try again."},400);
   const clientHash=await hash(clientId),today=new Date().toISOString().slice(0,10);
   const {data:used,error:usedError}=await db.from("void_daily_key_claims").select("id").eq("client_hash",clientHash).eq("claim_date",today).limit(1);
   if(usedError)return json({error:"Daily key limit could not be checked. Please try again later."},500);
   if(used?.length)return json({error:"You have already received your one key for today. Come back tomorrow."},429);
   let scriptQuery=db.from("scripts").select("id,slug,status").eq("status","published");if(requestedSlug)scriptQuery=scriptQuery.eq("slug",requestedSlug);const {data:script,error}=await scriptQuery.order("created_at",{ascending:true}).limit(1).maybeSingle();
   if(error||!script)return json({error:"No published scripts are available for key generation."},404);
   const token=randomHex(24),token_hash=await hash(token),readyAt=new Date(Date.now()+2000),expiresAt=new Date(Date.now()+120000);
   const {error:insertError}=await db.from("script_key_challenges").insert({token_hash,script_id:script.id,ready_at:readyAt.toISOString(),expires_at:expiresAt.toISOString()});
   if(insertError)return json({error:"Could not start key verification."},500);
   return json({ok:true,token,script:script.slug,client_id:clientId,client_hash:clientHash,claim_date:today,ready_at:readyAt.toISOString(),wait_seconds:3,expires_at:expiresAt.toISOString()});
 }
 if(action==="claim-key"){
   const token=clean(body.token,160);const slug=clean(body.script,120);const clientId=clean(body.client_id,128);if(!token||!slug||!/^[a-f0-9]{48}$/i.test(clientId))return json({error:"Missing key challenge. Please start again."},400);
   const token_hash=await hash(token);const {data:challenge,error}=await db.from("script_key_challenges").select("id,script_id,ready_at,expires_at,consumed_at,scripts(slug,status)").eq("token_hash",token_hash).maybeSingle();
   if(error||!challenge||challenge.consumed_at||Date.parse(challenge.expires_at)<=Date.now()||Date.parse(challenge.ready_at)>Date.now()||challenge.scripts?.slug!==slug||challenge.scripts?.status!=="published")return json({error:"Key verification is not ready or has expired."},403);
   const key=randomArioKey(),key_hash=await hash(key);const {data:record,error:keyError}=await db.from("script_keys").insert({script_id:challenge.script_id,key_hash,key_prefix:key.slice(0,9),label:"Website visitor key",created_by:null,expires_at:new Date(Date.now()+86400000).toISOString(),max_uses:null}).select("id,script_id,expires_at,max_uses,use_count,created_at").single();
   if(keyError)return json({error:"Could not issue a key."},500);
   const clientHash=await hash(clientId);
   const claimDate=new Date().toISOString().slice(0,10);
   const networkHash=await hash(req.headers.get("cf-connecting-ip")||clientId);
   const {error:dailyError}=await db.from("void_daily_key_claims").insert({client_hash:clientHash,network_hash:networkHash,claim_date:claimDate,key_id:record.id});
   if(dailyError){await db.from("script_keys").delete().eq("id",record.id);return json({error:dailyError.code==="23505"?"You have already received your one key for today. Come back tomorrow.":"Could not verify your daily key limit."},dailyError.code==="23505"?429:500)}
   const {data:consumed}=await db.from("script_key_challenges").update({consumed_at:new Date().toISOString()}).eq("id",challenge.id).is("consumed_at",null).select("id").maybeSingle();
   if(!consumed){await db.from("script_keys").delete().eq("id",record.id);await db.from("void_daily_key_claims").delete().eq("key_id",record.id);return json({error:"This key request was already completed. Start again."},409)}
   return json({ok:true,key,expires_at:record.expires_at,max_uses:record.max_uses,script:slug});
 }
 if(action==="create-key"){
   const access=await requireAdmin(req);if("error"in access)return json({error:access.error},access.status);
   const script_id=clean(body.script_id,80),label=clean(body.label,80)||"Access key",days=body.expires_in_days===null||body.expires_in_days===""?null:Number(body.expires_in_days),maxUses=body.max_uses===null||body.max_uses===""?null:Number(body.max_uses);
   if(!/^[0-9a-f-]{36}$/i.test(script_id))return json({error:"Choose a valid script."},400);if(days!==null&&(!Number.isInteger(days)||days<1||days>3650))return json({error:"Expiry must be 1–3650 days or blank."},400);if(maxUses!==null&&(!Number.isInteger(maxUses)||maxUses<1||maxUses>1000000))return json({error:"Usage limit must be 1–1,000,000 or blank."},400);
   const {data:script,error:se}=await db.from("scripts").select("id,status").eq("id",script_id).maybeSingle();if(se||!script||script.status!=="published")return json({error:"Only published scripts can have access keys."},400);
   const key=randomArioKey(),key_hash=await hash(key),expires_at=days===null?null:new Date(Date.now()+days*86400000).toISOString();const {data,error}=await db.from("script_keys").insert({script_id,key_hash,key_prefix:key.slice(0,9),label,created_by:access.user.id,expires_at,max_uses:maxUses}).select("id,key_prefix,label,script_id,expires_at,max_uses,use_count,created_at").single();if(error)return json({error:"Could not create key: "+error.message},500);return json({key,record:data});
 }
 if(action==="list-keys"){const access=await requireAdmin(req);if("error"in access)return json({error:access.error},access.status);const {data,error}=await db.from("script_keys").select("id,key_prefix,label,script_id,expires_at,revoked_at,max_uses,use_count,created_at,last_used_at,scripts(name,slug)").order("created_at",{ascending:false}).limit(100);if(error)return json({error:"Could not load keys."},500);return json({keys:data||[]})}
 if(action==="revoke-key"){const access=await requireAdmin(req);if("error"in access)return json({error:access.error},access.status);const id=clean(body.id,80);const {data,error}=await db.from("script_keys").update({revoked_at:new Date().toISOString()}).eq("id",id).is("revoked_at",null).select("id").maybeSingle();if(error)return json({error:"Could not revoke key."},500);if(!data)return json({error:"Key was not found or already revoked."},404);return json({ok:true})}
 if(action==="validate"){
   const key=clean(body.key,180),slug=clean(body.script,120),result=await checkKey(key,slug);
   if("error"in result)return json({valid:false,error:result.error,code:result.code||"KEY_INVALID",protected:true},result.status);
   return json({valid:true,script:{slug:result.script.slug,name:result.script.name},expires_at:result.grant.expires_at,remaining_uses:result.grant.max_uses===null?null:Math.max(0,result.grant.max_uses-result.grant.use_count)});
 }
 if(action==="load"){
   const key=clean(body.key,180),slug=clean(body.script,120),result=await loadWithKey(key,slug);
   if("error"in result)return json({error:result.error,protected:true},result.status);
   return new Response(result.content,{status:200,headers:{...cors,"Content-Type":"text/plain; charset=utf-8","Cache-Control":"no-store, max-age=0","Pragma":"no-cache","X-Content-Type-Options":"nosniff"}});
 }
 return json({error:"Unknown action."},400);
 } catch (error) {
   console.error("script-api unhandled request error", error);
   return json({error:"The key service hit an internal error. Please try again shortly."},500);
 }
});