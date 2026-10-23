(() => {
  "use strict";
  const $ = s => document.querySelector(s);
  const area=$("#luaSource"), status=$("#editorStatus"), stats=$("#editorStats"), cursor=$("#editorCursor"), filename=$("#editorFilename");
  let cm=null, currentName="untitled.lua";
  const setStatus=(message,error=false)=>{status.textContent=message;status.style.color=error?"#fca5a5":"";};
  const getValue=()=>cm?cm.getValue():area.value;
  const setValue=value=>{if(cm)cm.setValue(value);else area.value=value;updateStats();};
  function updateStats(){const value=getValue(), lines=value.split("\n").length;stats.textContent=lines+" line"+(lines===1?"":"s")+" · "+value.length+" chars";if(cm){const p=cm.getCursor();cursor.textContent="Ln "+(p.line+1)+", Col "+(p.ch+1);}else cursor.textContent="Text mode";}
  function safeName(name){return String(name||"untitled.lua").replace(/[^a-zA-Z0-9._-]/g,"_").slice(0,100)||"untitled.lua";}
  if(window.CodeMirror){cm=window.CodeMirror.fromTextArea(area,{mode:"lua",theme:"material-darker",lineNumbers:true,matchBrackets:true,indentUnit:4,tabSize:4,indentWithTabs:false,lineWrapping:false,viewportMargin:Infinity});cm.setSize("100%","min(66vh, 700px)");cm.on("change",updateStats);cm.on("cursorActivity",updateStats);}
  else area.addEventListener("input",updateStats);
  $("#editorNew").addEventListener("click",()=>{if(getValue().trim()&&!confirm("Start a new file? Download or copy your current work first."))return;currentName="untitled.lua";filename.textContent=currentName;setValue("");setStatus("New file ready.");if(cm)cm.focus();else area.focus();});
  $("#editorImport").addEventListener("click",()=>$("#editorFileInput").click());
  $("#editorFileInput").addEventListener("change",async e=>{const file=e.target.files?.[0];if(!file)return;if(file.size>2_000_000){setStatus("File is larger than 2 MB.",true);e.target.value="";return;}try{setValue(await file.text());currentName=safeName(file.name);filename.textContent=currentName;setStatus("Imported "+currentName+".");}catch{setStatus("Could not read that file.",true);}e.target.value="";});
  $("#editorCopy").addEventListener("click",async()=>{try{await navigator.clipboard.writeText(getValue());setStatus("Copied all source to clipboard.");}catch{const ta=document.createElement("textarea");ta.value=getValue();document.body.append(ta);ta.select();const ok=document.execCommand("copy");ta.remove();setStatus(ok?"Copied all source to clipboard.":"Copy failed — select the text and copy manually.",!ok);}});
  $("#editorDownload").addEventListener("click",()=>{const blob=new Blob([getValue()],{type:"text/plain;charset=utf-8"}),url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download=safeName(currentName.endsWith(".lua")||currentName.endsWith(".luau")?currentName:currentName+".lua");a.click();URL.revokeObjectURL(url);setStatus("Downloaded "+a.download+".");});
  const savedTheme=(()=>{try{return JSON.parse(localStorage.getItem("voidDevelopment.theme.v1")||'"mono"');}catch{return"mono";}})();document.documentElement.dataset.theme=savedTheme;
  updateStats();
})();