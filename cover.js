(() => {
  'use strict';

  const STORAGE_BASE_KEY='official-photo-cover-v1',storageKey=()=>BusinessManager.storageKey(STORAGE_BASE_KEY);
  const $=selector=>document.querySelector(selector);
  const blank=()=>({version:1,fiscalYear:'令和8年度',coverTitle:'工事写真',photographer:'',workNumber:'',workName:'',workLocation:'',contractorAddress:'',contractorName:'',representative:'',contractAmount:'',updatedAt:new Date().toISOString()});
  const fields=['fiscalYear','coverTitle','photographer','workNumber','workName','workLocation','contractorAddress','contractorName','representative','contractAmount'];
  let state=blank(),saveTimer=null,toastTimer=null,previewWasHidden=false;
  const refs={status:$('#saveStatus'),preview:$('#previewPanel'),printBook:$('#printBook'),confirm:$('#confirmDialog'),toast:$('#toast')};

  function normalize(raw){const base=blank(),value=raw&&typeof raw==='object'?raw:{};const result={...base,...value};fields.forEach(key=>result[key]=String(result[key]??''));return result}
  function escapeHtml(value){const div=document.createElement('div');div.textContent=String(value??'');return div.innerHTML}
  function load(){try{state=normalize(JSON.parse(localStorage.getItem(storageKey())||'null'))}catch(error){console.error(error);state=blank()}}
  function scheduleSave(){state.updatedAt=new Date().toISOString();refs.status.textContent='保存中…';clearTimeout(saveTimer);saveTimer=setTimeout(saveNow,300)}
  function saveNow(){try{localStorage.setItem(storageKey(),JSON.stringify(state));refs.status.textContent='この端末に保存しました'}catch(error){console.error(error);refs.status.textContent='保存できませんでした';toast('自動保存に失敗しました')}}
  const fittedCoverFields=['workNumber','workName','workLocation','contractAmount'];
  function fitText(element,maxPt=11,minPt=7){if(!element)return;element.style.fontSize=`${maxPt}pt`;let size=maxPt,guard=20;while(guard--&&size>minPt&&(element.scrollWidth>element.clientWidth+1||element.scrollHeight>element.clientHeight+1)){size-=.25;element.style.fontSize=`${size}pt`}}
  function fitEditorText(){fittedCoverFields.forEach(key=>fitText($(`#${key}`)))}
  function fitPrintText(){refs.printBook.querySelectorAll('.cover-row:not(.contractor) .cover-value').forEach(element=>fitText(element))}
  function render(){fields.forEach(key=>{$(`#${key}`).value=state[key]});requestAnimationFrame(fitEditorText)}
  function toast(message){refs.toast.textContent=message;refs.toast.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>refs.toast.classList.remove('show'),2200)}

  function coverMarkup(){return `<section class="cover-page"><article class="cover-sheet"><header class="cover-title-area"><div class="cover-year">${escapeHtml(state.fiscalYear)}</div><div class="cover-main-title">${escapeHtml(state.coverTitle||'工事写真')}</div><div class="cover-photographer"><span>撮影者名</span>${escapeHtml(state.photographer)}</div></header><section class="cover-row work-number"><div class="cover-label">工事番号</div><div class="cover-value">${escapeHtml(state.workNumber)}</div></section><section class="cover-row work-name"><div class="cover-label">工事名</div><div class="cover-value">${escapeHtml(state.workName)}</div></section><section class="cover-row work-location"><div class="cover-label">施工箇所</div><div class="cover-value">${escapeHtml(state.workLocation).replace(/\n/g,'<br>')}</div></section><section class="cover-row contractor"><div class="cover-label">施工者</div><div class="cover-value"><div class="contractor-address">${escapeHtml(state.contractorAddress)}</div><div class="contractor-name">${escapeHtml(state.contractorName)}</div><div class="contractor-representative">${state.representative?`<span>代表者　</span>${escapeHtml(state.representative)}`:''}</div></div></section><section class="cover-row amount"><div class="cover-label">請負額</div><div class="cover-value">${escapeHtml(state.contractAmount)}</div></section></article></section>`}
  function buildPrint(){refs.printBook.innerHTML=coverMarkup()}
  function openPreview(){buildPrint();refs.preview.hidden=false;fitPrintText();document.body.classList.add('preview-open');refs.preview.scrollTop=0}
  function closePreview(){refs.preview.hidden=true;document.body.classList.remove('preview-open');refs.printBook.replaceChildren()}
  function beforePrint(){previewWasHidden=refs.preview.hidden;if(previewWasHidden){refs.preview.hidden=false;buildPrint()}fitPrintText()}
  function afterPrint(){if(previewWasHidden){refs.preview.hidden=true;refs.printBook.replaceChildren()}previewWasHidden=false}

  async function exportJson(){try{clearTimeout(saveTimer);saveNow();await BusinessManager.exportCurrentJson();toast('現在の事業所を1つのJSONに保存しました')}catch(error){console.error(error);toast('事業所JSONを保存できませんでした')}}
  async function importJson(file){try{if(await BusinessManager.importCurrentJson(file))location.reload()}catch(error){console.error(error);toast('読み込めない事業所JSONです')}}
  function reset(){state=blank();localStorage.removeItem(storageKey());saveNow();render();refs.confirm.close();toast('表紙を初期化しました')}

  function bind(){fields.forEach(key=>{$(`#${key}`).oninput=event=>{state[key]=event.target.value;if(fittedCoverFields.includes(key))fitText(event.target);scheduleSave()}});$('#saveButton').onclick=exportJson;$('#loadInput').onchange=event=>{const file=event.target.files[0];if(file)importJson(file);event.target.value=''};$('#printButton').onclick=openPreview;$('#closePreview').onclick=closePreview;$('#doPrint').onclick=()=>window.print();$('#resetButton').onclick=()=>refs.confirm.showModal();$('#cancelReset').onclick=()=>refs.confirm.close();$('#confirmReset').onclick=reset;window.addEventListener('beforeprint',beforePrint);window.addEventListener('afterprint',afterPrint);document.addEventListener('keydown',event=>{if(event.key==='Escape'&&!refs.preview.hidden)closePreview()})}
  window.PhotoLedgerOfficeData=async()=>({fileName:`${state.workName||'工事写真'}_表紙`,cover:{...state}});
  load();bind();render();refs.status.textContent=localStorage.getItem(storageKey())?'保存済みの表紙を開きました':'この端末に自動保存します';document.documentElement.dataset.officeReady='true';
})();
