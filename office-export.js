(() => {
  'use strict';
  if (!window.officeBridge) return;
  const pageType = location.pathname.endsWith('cover.html') ? 'cover' : location.pathname.endsWith('completion.html') ? 'completion' : 'progress';
  const pageLabel = { cover: '表紙', progress: '工事経過', completion: '竣工写真' }[pageType];
  const pageFiles = { cover: 'cover.html', progress: 'index.html', completion: 'completion.html' };
  const host = document.querySelector('.top-actions,.actions');
  if (!host) return;

  const button = document.createElement('button');
  button.id = 'officeExportButton'; button.className = 'button'; button.type = 'button'; button.textContent = 'Word・Excel';
  const dialog = document.createElement('dialog'); dialog.className = 'office-export-dialog';
  dialog.innerHTML = `<section class="office-export-card"><h2>Word・Excelデータ出力</h2><p>どうしても編集できるデータが必要な場合の補助出力です。保存後のレイアウト調整は各自で行ってください。完成した形で印刷・PDF保存する場合は「印刷見本」を使用します。</p><fieldset class="office-page-choice"><legend>出力するページ</legend><label><input type="radio" name="office-page" value="cover" ${pageType==='cover'?'checked':''}>表紙</label><label><input type="radio" name="office-page" value="progress" ${pageType==='progress'?'checked':''}>施工写真</label><label><input type="radio" name="office-page" value="completion" ${pageType==='completion'?'checked':''}>竣工写真</label></fieldset><div class="office-selected-page">現在の選択：<b data-selected-page>${pageLabel}</b></div><div class="office-export-actions"><button type="button" data-word class="primary">選択したページをWordで保存<small>編集用の .docx データを作成します。仕上げの整形はWordで行ってください。</small></button><button type="button" data-excel>選択したページをExcelで保存<small>編集用の .xlsx データを作成します。仕上げの整形はExcelで行ってください。</small></button></div><div class="office-export-footer"><button type="button" class="button" data-close>閉じる</button></div></section>`;
  host.insertBefore(button, host.querySelector('#printButton') || null); document.body.appendChild(dialog);

  const officeKey = selectedType => ({ pageType: selectedType, officeId: BusinessManager.current().id, officeName: BusinessManager.current().name });
  function cropImageData(dataUrl) {
    if (!dataUrl) return Promise.resolve('');
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => {
        const width = 1280, height = 780, canvas = document.createElement('canvas'), context = canvas.getContext('2d');
        canvas.width = width; canvas.height = height; context.fillStyle = '#fff'; context.fillRect(0, 0, width, height);
        const scale = Math.max(width / image.naturalWidth, height / image.naturalHeight), sourceWidth = width / scale, sourceHeight = height / scale;
        const sourceX = (image.naturalWidth - sourceWidth) / 2, sourceY = (image.naturalHeight - sourceHeight) / 2;
        context.drawImage(image, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', .94));
      };
      image.onerror = () => reject(new Error('Office出力用の写真を準備できませんでした。'));
      image.src = dataUrl;
    });
  }
  async function normalizeOfficePhotos(data) {
    for (const key of ['blocks', 'entries']) {
      if (!Array.isArray(data[key])) continue;
      data[key] = await Promise.all(data[key].map(async item => ({ ...item, imageData: item.imageData ? await cropImageData(item.imageData) : '' })));
    }
    return data;
  }
  async function dataFromPage(selectedType, forExcel) {
    if (selectedType === pageType) {
      if (typeof window.PhotoLedgerOfficeData !== 'function') throw new Error('ページの保存データを準備できませんでした。');
      return window.PhotoLedgerOfficeData({ forExcel });
    }
    const frame = document.createElement('iframe');
    frame.className = 'office-export-loader';
    frame.setAttribute('aria-hidden', 'true');
    document.body.appendChild(frame);
    try {
      await new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error('選択したページの読み込みに時間がかかっています。もう一度お試しください。')), 15000);
        frame.onload = () => { clearTimeout(timer); resolve(); };
        frame.onerror = () => { clearTimeout(timer); reject(new Error('選択したページを読み込めませんでした。')); };
        frame.src = new URL(pageFiles[selectedType], location.href).href;
      });
      for (let count = 0; count < 300; count += 1) {
        const ready = frame.contentDocument?.documentElement?.dataset?.officeReady;
        if (ready === 'error') throw new Error('選択したページの保存データを読み込めませんでした。');
        if (ready === 'true' && typeof frame.contentWindow?.PhotoLedgerOfficeData === 'function') return await frame.contentWindow.PhotoLedgerOfficeData({ forExcel });
        await new Promise(resolve => setTimeout(resolve, 50));
      }
      throw new Error('選択したページの保存データを準備できませんでした。');
    } finally { frame.remove(); }
  }
  async function payload(selectedType, forExcel = false) {
    return normalizeOfficePhotos({ ...officeKey(selectedType), ...(await dataFromPage(selectedType, forExcel)) });
  }
  async function run(action) {
    dialog.classList.add('office-busy');
    try {
      const selectedType = dialog.querySelector('input[name="office-page"]:checked')?.value || pageType;
      const result = await window.officeBridge[action](await payload(selectedType, action === 'exportExcel'));
      if (result?.canceled) return;
      if (!result?.ok) throw new Error(result?.error || 'Office出力に失敗しました。');
      await AppDialog.alert(`保存しました。\n${result.path || ''}`, 'Office出力');
    } catch (error) { console.error(error); await AppDialog.alert(error.message || String(error), 'Office出力エラー'); }
    finally { dialog.classList.remove('office-busy'); }
  }
  const selectedPage = dialog.querySelector('[data-selected-page]');
  dialog.querySelectorAll('input[name="office-page"]').forEach(input => input.onchange = () => { selectedPage.textContent = { cover: '表紙', progress: '施工写真', completion: '竣工写真' }[input.value]; });
  button.onclick = () => dialog.showModal();
  dialog.querySelector('[data-close]').onclick = () => dialog.close();
  dialog.querySelector('[data-word]').onclick = () => run('exportWord');
  dialog.querySelector('[data-excel]').onclick = () => run('exportExcel');
})();
