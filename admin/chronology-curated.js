import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.112.4/+esm";
import { CONFIG, BACKEND_CONFIGURED } from "../config.js";
import { CURATED_EVENTS } from "../v5.2-curated-data.js";
import { EVENT_CONTEXT } from "../v5.2-event-context.js";

const $=(s,c=document)=>c.querySelector(s);
const $$=(s,c=document)=>[...c.querySelectorAll(s)];
const esc=(v="")=>String(v).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));
const TAGS=["CAS","ENG","LAN","BRA","HAB","TUR","MOS"];
const db=BACKEND_CONFIGURED?createClient(CONFIG.SUPABASE_URL,CONFIG.SUPABASE_PUBLISHABLE_KEY,{auth:{persistSession:true,detectSessionInUrl:false}}):null;
let currentEventId=null,participants=[],overrides=new Map(),activeTag="CAS";

function toast(message){const e=document.createElement("div");e.className="admin-toast";e.textContent=message;document.body.appendChild(e);setTimeout(()=>e.remove(),3200)}
function key(tag,date){return `${tag}|${date}`}
function extKey(tag,date){return `curated:${tag}:${date}`}
function factsToText(facts=[]){return facts.map(([k,v])=>`${k} :: ${v}`).join("\n")}
function textToFacts(value=""){return String(value).split(/\r?\n/).map(x=>x.trim()).filter(Boolean).map(line=>{const i=line.indexOf("::");return i<0?[line,""]:[line.slice(0,i).trim(),line.slice(i+2).trim()]}).filter(([k,v])=>k&&v)}
function merged(tag,ev){
  const ov=overrides.get(key(tag,ev.date)),data=ov?.data||{},ctx=data.context||EVENT_CONTEXT[key(tag,ev.date)]||null;
  return {...ev,type:ov?.entry_type||ev.type,title:ov?.title||ev.title,summary:ov?.summary??ev.summary,facts:data.facts||ev.facts||[],context:ctx,overrideId:ov?.id||null};
}
function participantFor(tag){return participants.find(p=>p.participant_key===tag)}
function countryName(tag){return participantFor(tag)?.title||tag}

async function load(){
  const host=$("#event-curated-chronology-admin"),sel=$("#event-admin-select");if(!host||!db||!sel?.value)return;
  currentEventId=sel.value;
  const [{data:event},{data:pr},{data:rows}]=await Promise.all([
    db.from("site_events").select("slug").eq("id",currentEventId).maybeSingle(),
    db.from("site_event_participants").select("id,participant_key,title,player_name,sort_order").eq("event_id",currentEventId).order("sort_order"),
    db.from("site_event_entries").select("id,external_key,entry_type,title,summary,world_date,data,participant_id").eq("event_id",currentEventId).eq("source_type","curated_override")
  ]);
  const legacy=$("#event-legacy-chronology-card");
  if(event?.slug!=="ppo-europe"){if(legacy)legacy.classList.remove("hidden");host.innerHTML="<p>Cet éditeur détaillé est réservé aux Chroniques de l’Europe.</p>";return}
  if(legacy)legacy.classList.add("hidden");
  participants=pr||[];overrides=new Map();
  for(const row of rows||[]){const m=String(row.external_key||"").match(/^curated:([^:]+):(\d{4}-\d{2}-\d{2})$/);if(m)overrides.set(key(m[1],m[2]),row)}
  if(!TAGS.includes(activeTag))activeTag="CAS";render();
}
function render(){
  const host=$("#event-curated-chronology-admin");if(!host)return;
  const events=(CURATED_EVENTS[activeTag]||[]).map(ev=>merged(activeTag,ev));
  host.innerHTML=`<div class="curated-country-tabs">${TAGS.map(tag=>`<button type="button" data-curated-country="${tag}" class="${tag===activeTag?"active":""}"><strong>${esc(countryName(tag))}</strong><small>${(CURATED_EVENTS[tag]||[]).length} dates</small></button>`).join("")}</div>
  <div class="curated-admin-summary"><strong>${esc(countryName(activeTag))}</strong><span>${events.length} événements publiés · les fiches modifiées dans l’admin sont signalées.</span></div>
  <div class="curated-admin-list">${events.map((ev,i)=>card(ev,i)).join("")}</div>`;
  $$("[data-curated-country]",host).forEach(b=>b.onclick=()=>{activeTag=b.dataset.curatedCountry;render()});
  $$("[data-save-curated]",host).forEach(b=>b.onclick=()=>save(Number(b.dataset.saveCurated)));
  $$("[data-reset-curated]",host).forEach(b=>b.onclick=()=>reset(Number(b.dataset.resetCurated)));
}
function card(ev,i){
  const ctx=ev.context||{},noHistory=!ctx.history;
  return `<article class="admin-item curated-event-card ${ev.overrideId?"is-overridden":""}" data-curated-index="${i}">
    <div class="admin-item-head"><div><small>${esc(ev.date)} · ${esc(ev.type)}</small><h2>${esc(ev.title)}</h2></div><span class="event-public-state ${ev.overrideId?"is-public":"is-draft"}">${ev.overrideId?"Modifié dans l’admin":"Données importées"}</span></div>
    <div class="admin-two-cols"><label>Type<input class="curated-type" value="${esc(ev.type)}"></label><label>Date<input class="curated-date" type="date" value="${esc(ev.date)}" disabled></label></div>
    <label>Titre<input class="curated-title" value="${esc(ev.title)}"></label>
    <label>Résumé<textarea class="curated-summary" rows="3">${esc(ev.summary||"")}</textarea></label>
    <label>Faits vérifiés <small>Une ligne par information : Libellé :: valeur</small><textarea class="curated-facts" rows="6">${esc(factsToText(ev.facts))}</textarea></label>
    <div class="admin-section-title curated-context-title"><h3>Contexte du dossier</h3><p>Si aucun lien historique sérieux n’existe, écris simplement « Pas de lien historique. ».</p></div>
    <label>Lien historique<textarea class="curated-history" rows="4">${esc(ctx.history||"Pas de lien historique.")}</textarea></label>
    <label>Importance dans la partie / le RP<textarea class="curated-campaign" rows="4">${esc(ctx.campaign||"")}</textarea></label>
    <label>Source / précision de jeu<textarea class="curated-game" rows="3">${esc(ctx.game||"")}</textarea></label>
    <div class="admin-actions"><button type="button" data-save-curated="${i}">Enregistrer la fiche</button>${ev.overrideId?`<button type="button" class="danger-action" data-reset-curated="${i}">Revenir aux données importées</button>`:""}</div>
  </article>`;
}
function currentEvent(i){return (CURATED_EVENTS[activeTag]||[])[i]}
async function save(i){
  const base=currentEvent(i),el=$(`[data-curated-index="${i}"]`);if(!base||!el)return;
  const p=participantFor(activeTag);if(!p)return toast("Participant introuvable.");
  const existing=overrides.get(key(activeTag,base.date));
  const history=$(".curated-history",el).value.trim()||"Pas de lien historique.";
  const context={status:/^pas de lien historique/i.test(history)?"Pas de lien historique":(EVENT_CONTEXT[key(activeTag,base.date)]?.status||"Contexte édité"),history,campaign:$(".curated-campaign",el).value.trim(),game:$(".curated-game",el).value.trim()};
  const payload={event_id:currentEventId,participant_id:p.id,external_key:extKey(activeTag,base.date),entry_type:$(".curated-type",el).value.trim()||base.type,title:$(".curated-title",el).value.trim()||base.title,summary:$(".curated-summary",el).value.trim()||null,world_date:base.date,world_year:Number(base.date.slice(0,4)),world_date_label:base.date,source_type:"curated_override",importance:"major",review_status:"approved",public:true,featured:false,sort_order:0,data:{curated_override:true,participant_key:activeTag,facts:textToFacts($(".curated-facts",el).value),context}};
  const q=existing?db.from("site_event_entries").update(payload).eq("id",existing.id):db.from("site_event_entries").insert(payload);
  const {error}=await q;if(error)return toast(error.message);toast("Fiche chronologique enregistrée.");await load();
}
async function reset(i){
  const base=currentEvent(i),existing=base&&overrides.get(key(activeTag,base.date));if(!existing)return;
  if(!confirm("Supprimer les modifications admin et revenir aux données importées ?"))return;
  const {error}=await db.from("site_event_entries").delete().eq("id",existing.id);if(error)return toast(error.message);toast("Modifications retirées.");await load();
}
$("#event-admin-select")?.addEventListener("change",()=>setTimeout(load,120));
document.querySelector('[data-admin-tab="events"]')?.addEventListener("click",()=>setTimeout(load,180));
setTimeout(load,900);
