const esc=(v="")=>String(v).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));

function inlineFormat(value=""){
  let s=esc(value);
  s=s.replace(/\*\*([^*\n]+)\*\*/g,"<strong>$1</strong>");
  s=s.replace(/__([^_\n]+)__/g,"<u>$1</u>");
  s=s.replace(/~~([^~\n]+)~~/g,"<del>$1</del>");
  s=s.replace(/\*([^*\n]+)\*/g,"<em>$1</em>");
  s=s.replace(/_([^_\n]+)_/g,"<em>$1</em>");
  return s;
}

export function renderRichText(value=""){
  const text=String(value||"").replace(/\r\n?/g,"\n").trim();
  if(!text)return "";
  const blocks=text.split(/\n{2,}/);
  return blocks.map(block=>{
    const lines=block.split("\n").map(x=>x.trimEnd());
    if(lines.length===1&&/^---+$/.test(lines[0].trim()))return "<hr>";
    if(lines.length===1&&/^###\s+/.test(lines[0]))return `<h4>${inlineFormat(lines[0].replace(/^###\s+/,""))}</h4>`;
    if(lines.length===1&&/^##\s+/.test(lines[0]))return `<h3>${inlineFormat(lines[0].replace(/^##\s+/,""))}</h3>`;
    if(lines.length===1&&/^#\s+/.test(lines[0]))return `<h2>${inlineFormat(lines[0].replace(/^#\s+/,""))}</h2>`;
    if(lines.every(line=>/^[-•]\s+/.test(line.trim())))return `<ul>${lines.map(line=>`<li>${inlineFormat(line.trim().replace(/^[-•]\s+/,""))}</li>`).join("")}</ul>`;
    if(lines.every(line=>/^>\s?/.test(line.trim())))return `<blockquote>${lines.map(line=>inlineFormat(line.trim().replace(/^>\s?/,""))).join("<br>")}</blockquote>`;
    return `<p>${lines.map(line=>inlineFormat(line)).join("<br>")}</p>`;
  }).join("");
}

export function plainExcerpt(value="",max=240){
  const text=String(value||"")
    .replace(/\*\*|__|~~|\*/g,"")
    .replace(/^#{1,3}\s+/gm,"")
    .replace(/^[-•>]\s*/gm,"")
    .replace(/\s+/g," ")
    .trim();
  if(text.length<=max)return text;
  return `${text.slice(0,max).replace(/\s+\S*$/,"")}…`;
}
