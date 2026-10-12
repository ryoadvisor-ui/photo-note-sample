(() => {
  'use strict';
  const LIST_KEY = 'official-business-list-v1';
  const CURRENT_KEY = 'official-current-business-v1';
  const DEFAULT_ID = 'default';

  function readList() {
    try {
      const saved = JSON.parse(localStorage.getItem(LIST_KEY) || 'null');
      if (Array.isArray(saved) && saved.length) return saved.map(item => ({ id: String(item.id), name: String(item.name || '事業所') }));
    } catch (error) { console.warn(error); }
    return [{ id: DEFAULT_ID, name: '事業所1' }];
  }

  let list = readList();
  let currentId = localStorage.getItem(CURRENT_KEY) || list[0].id;
  if (!list.some(item => item.id === currentId)) currentId = list[0].id;
  function save() { localStorage.setItem(LIST_KEY, JSON.stringify(list)); localStorage.setItem(CURRENT_KEY, currentId); }
  function current() { return list.find(item => item.id === currentId) || list[0]; }
  function storageKey(base) { return currentId === DEFAULT_ID ? base : `${base}::${currentId}`; }
  function documentKey() { return currentId === DEFAULT_ID ? 'current' : `business:${currentId}`; }
  function uid() { return `office_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`; }
  function escapeText(value) { const div = document.createElement('div'); div.textContent = value; return div.innerHTML; }
  function openDb(name) { return new Promise((resolve, reject) => { const request = indexedDB.open(name, 1); request.onupgradeneeded = () => { if (!request.result.objectStoreNames.contains('documents')) request.result.createObjectStore('documents'); }; request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error); }); }
  function blobToDataUrl(blob) { return new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = () => reject(reader.error); reader.readAsDataURL(blob); }); }
  function dataUrlToBlob(dataUrl) { const [meta, data] = String(dataUrl || '').split(','), mime = meta.match(/data:([^;]+)/)?.[1] || 'image/jpeg', binary = atob(data || ''), bytes = new Uint8Array(binary.length); for (let index = 0; index < binary.length; index++) bytes[index] = binary.charCodeAt(index); return new Blob([bytes], { type: mime }); }
  function safeFileName(value) { return String(value || '事業所').replace(/[\\/:*?"<>|]/g, '_').slice(0, 80) || '事業所'; }
  function uniqueOfficeName(baseName) {
    const base = String(baseName || '読み込み事業所').trim() || '読み込み事業所';
    if (!list.some(item => item.name === base)) return base;
    let number = 2;
    while (list.some(item => item.name === `${base} (${number})`)) number += 1;
    return `${base} (${number})`;
  }
  async function readDocument(dbName, key = documentKey()) {
    try {
      const db = await openDb(dbName);
      if (!db.objectStoreNames.contains('documents')) { db.close(); return null; }
      const value = await new Promise((resolve, reject) => { const request = db.transaction('documents', 'readonly').objectStore('documents').get(key); request.onsuccess = () => resolve(request.result || null); request.onerror = () => reject(request.error); });
      db.close(); return value;
    } catch (error) { console.warn(error); return null; }
  }
  async function writeDocument(dbName, value, key = documentKey()) {
    const db = await openDb(dbName);
    await new Promise((resolve, reject) => { const tx = db.transaction('documents', 'readwrite'); tx.objectStore('documents').put(value, key); tx.oncomplete = resolve; tx.onerror = () => reject(tx.error); });
    db.close();
  }
  async function serializePhotos(value, property) {
    if (!value || !Array.isArray(value[property])) return value || null;
    return { ...value, [property]: await Promise.all(value[property].map(async item => ({ ...item, imageBlob: undefined, imageData: item.imageBlob instanceof Blob ? await blobToDataUrl(item.imageBlob) : (item.imageData || null), imageType: item.imageBlob?.type || item.imageType || '' }))) };
  }
  function restorePhotos(value, property) {
    if (!value || !Array.isArray(value[property])) return value || null;
    return { ...value, [property]: value[property].map(item => { const restored = { ...item, imageBlob: item.imageData ? dataUrlToBlob(item.imageData) : null }; delete restored.imageData; return restored; }) };
  }
  async function createOfficePackage() {
    let cover = null;
    try { cover = JSON.parse(localStorage.getItem(storageKey('official-photo-cover-v1')) || 'null'); } catch (error) { console.warn(error); }
    const progress = await serializePhotos(await readDocument('official-photo-ledger-v1'), 'blocks');
    const completion = await serializePhotos(await readDocument('completion-photo-ledger-v1'), 'entries');
    return { format: 'official-photo-ledger-office', version: 1, exportedAt: new Date().toISOString(), office: { name: current().name }, pages: { cover, progress, completion } };
  }
  async function exportCurrentJson() {
    const output = await createOfficePackage(), blob = new Blob([JSON.stringify(output, null, 2)], { type: 'application/json' }), url = URL.createObjectURL(blob), anchor = document.createElement('a');
    anchor.href = url; anchor.download = `${safeFileName(current().name)}_写真帳一式.json`; anchor.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
    return output;
  }
  async function importCurrentJson(file) {
    const raw = JSON.parse(await file.text());
    if (raw?.format !== 'official-photo-ledger-office' || !raw.pages || typeof raw.pages !== 'object') throw new Error('事業所一括JSONではありません');
    const fileName = String(file?.name || '').replace(/_写真帳一式\.json$/i, '').replace(/\.json$/i, '').trim();
    const importedName = String(raw.office?.name || fileName || '読み込み事業所').trim() || '読み込み事業所';
    const sameName = list.find(item => item.name === importedName);
    let target;
    if (sameName) {
      const overwrite = await AppDialog.confirm(`「${importedName}」は事業所一覧にあります。保存済みデータを上書きしますか？\n\n「キャンセル」を選ぶと、既存データを残して別の事業所として追加します。`, '同じ名前の事業所があります', true);
      if (overwrite) target = sameName;
      else {
        target = { id: uid(), name: uniqueOfficeName(importedName) };
        list.push(target);
      }
    } else {
      target = { id: uid(), name: importedName };
      list.push(target);
    }
    currentId = target.id;
    save();
    if (raw.pages.cover) localStorage.setItem(storageKey('official-photo-cover-v1'), JSON.stringify(raw.pages.cover)); else localStorage.removeItem(storageKey('official-photo-cover-v1'));
    if (raw.pages.progress) await writeDocument('official-photo-ledger-v1', restorePhotos(raw.pages.progress, 'blocks')); else await clearDocument('official-photo-ledger-v1');
    if (raw.pages.completion) await writeDocument('completion-photo-ledger-v1', restorePhotos(raw.pages.completion, 'entries')); else await clearDocument('completion-photo-ledger-v1');
    save(); return true;
  }
  async function clearDocument(dbName, key = documentKey()) {
    try { const db = await openDb(dbName); if (db.objectStoreNames.contains('documents')) await new Promise(resolve => { const tx = db.transaction('documents', 'readwrite'); tx.objectStore('documents').delete(key); tx.oncomplete = resolve; tx.onerror = resolve; }); db.close(); } catch (error) { console.warn(error); }
  }

  async function clearCurrentData(id = currentId) {
    localStorage.removeItem(id === DEFAULT_ID ? 'official-photo-cover-v1' : `official-photo-cover-v1::${id}`);
    const key = id === DEFAULT_ID ? 'current' : `business:${id}`;
    for (const name of ['official-photo-ledger-v1', 'completion-photo-ledger-v1']) {
      try {
        const db = await openDb(name);
        if (db.objectStoreNames.contains('documents')) await new Promise(resolve => { const tx = db.transaction('documents', 'readwrite'); tx.objectStore('documents').delete(key); tx.oncomplete = resolve; tx.onerror = resolve; });
        db.close();
      } catch (error) { console.warn(error); }
    }
  }

  function render() {
    const host = document.getElementById('businessSwitcher');
    if (!host) return;
    host.className = 'business-switcher';
    host.innerHTML = `<label>事業所 <select aria-label="事業所を選択">${list.map(item => `<option value="${item.id.replace(/"/g, '')}">${escapeText(item.name)}</option>`).join('')}</select></label><button type="button" data-add title="事業所を追加">＋</button><button type="button" data-rename title="事業所名を変更">名</button><button type="button" data-delete title="事業所を削除">削</button>`;
    const select = host.querySelector('select');
    select.value = currentId;
    select.onchange = () => { currentId = select.value; save(); location.reload(); };
    host.querySelector('[data-add]').onclick = async () => {
      const name = await AppDialog.prompt('追加する事業所名を入力してください', '新しい事業所', '事業所を追加');
      if (!name?.trim()) return;
      const item = { id: uid(), name: name.trim() };
      list.push(item); currentId = item.id; save(); location.reload();
    };
    host.querySelector('[data-rename]').onclick = async () => {
      const name = await AppDialog.prompt('事業所名を変更してください', current().name, '事業所名を変更');
      if (!name?.trim()) return;
      current().name = name.trim(); save(); render();
    };
    host.querySelector('[data-delete]').onclick = async () => {
      const item = current();
      if (!await AppDialog.confirm(`「${item.name}」の表紙・工事経過・竣工写真を削除しますか？`, '事業所を削除', true)) return;
      await clearCurrentData(item.id);
      if (list.length === 1) { list = [{ id: DEFAULT_ID, name: '事業所1' }]; currentId = DEFAULT_ID; }
      else { list = list.filter(value => value.id !== item.id); currentId = list[0].id; }
      save(); location.reload();
    };
  }

  function attach() { save(); render(); }
  window.BusinessManager = { current, storageKey, documentKey, clearCurrentData, createOfficePackage, exportCurrentJson, importCurrentJson, attach };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', attach); else attach();
})();
