import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders={
  "Access-Control-Allow-Origin":"*",
  "Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type",
};

function publishableKey(){
  try{
    const keys=JSON.parse(Deno.env.get("SUPABASE_PUBLISHABLE_KEYS")||"{}");
    if(keys.default)return keys.default;
  }catch{}
  return Deno.env.get("SUPABASE_ANON_KEY")||"";
}

async function twitchToken(clientId:string,clientSecret:string){
  const url=new URL("https://id.twitch.tv/oauth2/token");
  url.searchParams.set("client_id",clientId);
  url.searchParams.set("client_secret",clientSecret);
  url.searchParams.set("grant_type","client_credentials");
  const res=await fetch(url,{method:"POST"});
  if(!res.ok)throw new Error(`Twitch token error ${res.status}`);
  return (await res.json()).access_token as string;
}

Deno.serve(async req=>{
  if(req.method==="OPTIONS")return new Response("ok",{headers:corsHeaders});
  try{
    const key=publishableKey();
    if(!key)throw new Error("Clé Supabase publishable indisponible");
    const sb=createClient(Deno.env.get("SUPABASE_URL")!,key,{
      global:{headers:{Authorization:req.headers.get("Authorization")||""}},
    });
    const{data:admin,error:adminError}=await sb.rpc("current_is_admin");
    if(adminError||!admin){
      return Response.json({error:"Accès administrateur requis"},{status:403,headers:corsHeaders});
    }

    const{query,id}=await req.json();
    const q=String(query||"").trim();
    const igdbId=Number(id||0);
    if(!igdbId&&q.length<2)throw new Error("Recherche trop courte");

    const clientId=Deno.env.get("TWITCH_CLIENT_ID")||"";
    const clientSecret=Deno.env.get("TWITCH_CLIENT_SECRET")||"";
    if(!clientId||!clientSecret)throw new Error("Secrets Twitch non configurés");

    const token=await twitchToken(clientId,clientSecret);
    const safe=q.replace(/["\\]/g,"");
    const fields="fields id,name,slug,summary,first_release_date,genres.name,platforms.name,cover.image_id,involved_companies.developer,involved_companies.company.name;";
    const body=igdbId?`${fields} where id = ${Math.trunc(igdbId)}; limit 1;`:`search "${safe}"; ${fields} limit 8;`;
    const res=await fetch("https://api.igdb.com/v4/games",{
      method:"POST",
      headers:{"Client-ID":clientId,"Authorization":`Bearer ${token}`,"Content-Type":"text/plain"},
      body,
    });
    if(!res.ok)throw new Error(`IGDB error ${res.status}`);

    const games=(await res.json()).map((g:any)=>({
      id:g.id,
      name:g.name,
      slug:g.slug,
      release_date:g.first_release_date?new Date(g.first_release_date*1000).toISOString().slice(0,10):null,
      release_year:g.first_release_date?new Date(g.first_release_date*1000).getUTCFullYear():null,
      genres:(g.genres||[]).map((x:any)=>x.name),
      platforms:(g.platforms||[]).map((x:any)=>x.name),
      summary:g.summary||null,
      developer:(g.involved_companies||[]).find((x:any)=>x.developer)?.company?.name||null,
      cover_url:g.cover?.image_id?`https://images.igdb.com/igdb/image/upload/t_cover_big_2x/${g.cover.image_id}.jpg`:null,
    }));

    return Response.json({games},{headers:corsHeaders});
  }catch(error){
    return Response.json({error:String(error?.message||error)},{status:500,headers:corsHeaders});
  }
});
