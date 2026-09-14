import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type"};
function secretKey(){
  try{const keys=JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS")||"{}");if(keys.default)return keys.default}catch{}
  return Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")||"";
}
async function twitchToken(clientId:string,clientSecret:string){
  const url=new URL("https://id.twitch.tv/oauth2/token");url.searchParams.set("client_id",clientId);url.searchParams.set("client_secret",clientSecret);url.searchParams.set("grant_type","client_credentials");
  const res=await fetch(url,{method:"POST"});if(!res.ok)throw new Error(`Twitch token error ${res.status}`);return (await res.json()).access_token as string;
}
Deno.serve(async req=>{
  if(req.method==="OPTIONS")return new Response("ok",{headers:corsHeaders});
  try{
    const supabaseUrl=Deno.env.get("SUPABASE_URL")!;const key=secretKey();if(!key)throw new Error("Clé Supabase secrète indisponible");
    const db=createClient(supabaseUrl,key);const{data:rows,error}=await db.from("collaborators").select("twitch_login,description,sort_order").eq("active",true).order("sort_order",{ascending:true}).order("created_at",{ascending:true});if(error)throw error;
    const collabs=rows||[];if(!collabs.length)return Response.json({collaborators:[]},{headers:{...corsHeaders,"Cache-Control":"public, max-age=60"}});
    const clientId=Deno.env.get("TWITCH_CLIENT_ID")!,clientSecret=Deno.env.get("TWITCH_CLIENT_SECRET")!;if(!clientId||!clientSecret)throw new Error("Secrets Twitch non configurés");const token=await twitchToken(clientId,clientSecret);
    const userUrl=new URL("https://api.twitch.tv/helix/users");const streamUrl=new URL("https://api.twitch.tv/helix/streams");for(const c of collabs){userUrl.searchParams.append("login",c.twitch_login);streamUrl.searchParams.append("user_login",c.twitch_login)}
    const headers={"Client-Id":clientId,"Authorization":`Bearer ${token}`};const[userRes,streamRes]=await Promise.all([fetch(userUrl,{headers}),fetch(streamUrl,{headers})]);if(!userRes.ok||!streamRes.ok)throw new Error("Erreur API Twitch");
    const users=(await userRes.json()).data||[],streams=(await streamRes.json()).data||[];const userMap=new Map(users.map((u:any)=>[u.login.toLowerCase(),u]));const streamMap=new Map(streams.map((s:any)=>[s.user_login.toLowerCase(),s]));
    const result=collabs.map(c=>{const u:any=userMap.get(c.twitch_login.toLowerCase())||{},s:any=streamMap.get(c.twitch_login.toLowerCase());return{login:u.login||c.twitch_login,display_name:u.display_name||c.twitch_login,profile_image_url:u.profile_image_url||null,description:c.description||null,is_live:Boolean(s),game_name:s?.game_name||null,title:s?.title||null,viewer_count:s?.viewer_count||null}});
    return Response.json({collaborators:result},{headers:{...corsHeaders,"Cache-Control":"public, max-age=60"}});
  }catch(error){return Response.json({error:String(error?.message||error)},{status:500,headers:corsHeaders})}
});
