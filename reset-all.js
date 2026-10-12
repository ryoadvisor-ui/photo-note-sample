(() => {
  'use strict';
  const targets=()=>[['official-photo-ledger-v1','documents',BusinessManager.documentKey()],['completion-photo-ledger-v1','documents',BusinessManager.documentKey()]];
  function clearDb([name,store,key]){return new Promise(resolve=>{const request=indexedDB.open(name);request.onerror=()=>resolve();request.onupgradeneeded=()=>{request.transaction.abort();resolve()};request.onsuccess=()=>{const db=request.result;if(!db.objectStoreNames.contains(store)){db.close();resolve();return}const tx=db.transaction(store,'readwrite');tx.objectStore(store).delete(key);tx.oncomplete=()=>{db.close();resolve()};tx.onerror=()=>{db.close();resolve()}}})}
  async function reset(){const approved=await AppDialog.confirm(`「${BusinessManager.current().name}」の表紙・工事経過・竣工写真をすべて初期化しますか？\n写真や文章を含む、この事業所の保存データが削除されます。`,'全ページ初期化',true);if(!approved)return;const clearLocal=()=>{localStorage.removeItem(BusinessManager.storageKey('official-photo-cover-v1'));localStorage.removeItem('official-photo-ledger-guide-v1')};clearLocal();await Promise.all(targets().map(clearDb));await new Promise(resolve=>setTimeout(resolve,450));clearLocal();await Promise.all(targets().map(clearDb));await AppDialog.alert('現在の事業所を全ページ初期化しました。');location.reload()}
  function attach(id='resetAllButton'){const button=document.getElementById(id);if(button)button.addEventListener('click',reset)}
  window.AllPageReset={attach,reset};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>attach());else attach();
})();
