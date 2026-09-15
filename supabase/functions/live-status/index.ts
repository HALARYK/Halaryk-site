const cors={
  "Access-Control-Allow-Origin":"*",
  "Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type"
};

async function token(id:string,secret:string){
  const u=new URL("https://id.twitch.tv/oauth2/token");
  u.searchParams.set("client_id",id);
  u.searchParams.set("client_secret",secret);
  u.searchParams.set("grant_type","client_credentials");
  const r=await fetch(u,{method:"POST"});
  if(!r.ok)throw new Error(`Twitch token ${r.status}`);
  return (await r.json()).access_token;
}

Deno.serve(async req=>{
  if(req.method==="OPTIONS")return new Response("ok",{headers:cors});
  if(req.method!=="POST")return Response.json({error:"POST requis"},{status:405,headers:cors});

  try{
    const id=Deno.env.get("TWITCH_CLIENT_ID");
    const secret=Deno.env.get("TWITCH_CLIENT_SECRET");
    if(!id||!secret)throw new Error("Secrets Twitch non configurés");

    // V4.2.2 : le visiteur ne choisit plus le compte Twitch interrogé.
    // La fonction ne peut servir que de passerelle vers la chaîne configurée côté serveur.
    const login=(Deno.env.get("TWITCH_CHANNEL_LOGIN")||"halaryk").trim().toLowerCase();

    const t=await token(id,secret);
    const u=new URL("https://api.twitch.tv/helix/streams");
    u.searchParams.set("user_login",login);
    const r=await fetch(u,{headers:{"Client-Id":id,Authorization:`Bearer ${t}`}});
    if(!r.ok)throw new Error(`Twitch API ${r.status}`);
    const s=(await r.json()).data?.[0];

    return Response.json(
      s?{is_live:true,title:s.title,game_name:s.game_name,viewer_count:s.viewer_count,started_at:s.started_at}:{is_live:false},
      {headers:{...cors,"Cache-Control":"public, max-age=30"}}
    );
  }catch(e){
    return Response.json({error:String(e?.message||e)},{status:500,headers:cors});
  }
});
