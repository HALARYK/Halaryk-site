import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"content-type, x-reputation-secret"};
function secretKey(){
  try{const keys=JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS")||"{}");if(keys.default)return keys.default}catch{}
  return Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")||"";
}
Deno.serve(async req=>{
  if(req.method==="OPTIONS")return new Response("ok",{headers:corsHeaders});
  try{
    if(req.method!=="POST")return Response.json({error:"POST requis"},{status:405,headers:corsHeaders});
    const expected=Deno.env.get("REPUTATION_SYNC_SECRET")||"";const provided=req.headers.get("x-reputation-secret")||"";if(!expected||provided!==expected)return Response.json({error:"Non autorisé"},{status:401,headers:corsHeaders});
    const body=await req.json();const twitch_login=String(body.twitch_login||"").trim().toLowerCase();const display_name=String(body.display_name||body.twitch_login||"").trim();const twitch_user_id=body.twitch_user_id?String(body.twitch_user_id):null;const avatar_url=body.avatar_url?String(body.avatar_url):null;const score=Number(body.score);
    if(!twitch_login||!Number.isInteger(score))return Response.json({error:"twitch_login et score entier requis"},{status:400,headers:corsHeaders});
    const db=createClient(Deno.env.get("SUPABASE_URL")!,secretKey());let existing:any=null;
    if(twitch_user_id){const{data}=await db.from("reputation_scores").select("id").eq("twitch_user_id",twitch_user_id).maybeSingle();existing=data}
    if(!existing){const{data}=await db.from("reputation_scores").select("id").ilike("twitch_login",twitch_login).maybeSingle();existing=data}
    const values={twitch_user_id,twitch_login,display_name,avatar_url,score,updated_at:new Date().toISOString()};
    const result=existing?await db.from("reputation_scores").update(values).eq("id",existing.id).select().single():await db.from("reputation_scores").insert(values).select().single();if(result.error)throw result.error;
    return Response.json({ok:true,reputation:result.data},{headers:corsHeaders});
  }catch(error){return Response.json({error:String(error?.message||error)},{status:500,headers:corsHeaders})}
});
