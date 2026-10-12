(() => {
  'use strict';
  let dialog;

  function ensure() {
    if (dialog) return dialog;
    dialog = document.createElement('dialog');
    dialog.className = 'app-dialog';
    dialog.innerHTML = '<form class="app-dialog-form" method="dialog"><h2 class="app-dialog-title"></h2><p class="app-dialog-message"></p><input class="app-dialog-input" type="text"><div class="app-dialog-actions"><button class="app-dialog-button cancel" type="button">キャンセル</button><button class="app-dialog-button primary ok" type="submit">決定</button></div></form>';
    document.body.appendChild(dialog);
    return dialog;
  }

  function show({ title = '確認', message = '', value = '', input = false, cancel = true, danger = false, okText = '決定', cancelText = 'キャンセル' } = {}) {
    const box = ensure();
    const titleEl = box.querySelector('.app-dialog-title');
    const messageEl = box.querySelector('.app-dialog-message');
    const inputEl = box.querySelector('.app-dialog-input');
    const cancelButton = box.querySelector('.cancel');
    const okButton = box.querySelector('.ok');
    titleEl.textContent = title;
    messageEl.textContent = message;
    messageEl.hidden = !message;
    inputEl.hidden = !input;
    inputEl.value = value;
    cancelButton.hidden = !cancel;
    cancelButton.textContent = cancelText;
    okButton.textContent = okText;
    okButton.classList.toggle('danger', danger);
    okButton.classList.toggle('primary', !danger);

    return new Promise(resolve => {
      let settled = false;
      const finish = result => {
        if (settled) return;
        settled = true;
        box.close();
        resolve(result);
      };
      const onSubmit = event => {
        event.preventDefault();
        finish(input ? inputEl.value : true);
      };
      const onCancel = event => {
        event.preventDefault();
        finish(input ? null : false);
      };
      box.querySelector('form').onsubmit = onSubmit;
      cancelButton.onclick = onCancel;
      box.oncancel = onCancel;
      box.showModal();
      requestAnimationFrame(() => (input ? inputEl : okButton).focus());
      if (input) inputEl.select();
    });
  }

  window.AppDialog = {
    prompt(message, value = '', title = '入力') { return show({ title, message, value, input: true }); },
    confirm(message, title = '確認', danger = false) { return show({ title, message, danger, okText: danger ? '削除する' : '実行する' }); },
    choice(message, title = '確認', okText = 'はい', cancelText = 'いいえ') { return show({ title, message, okText, cancelText }); },
    alert(message, title = 'お知らせ') { return show({ title, message, cancel: false, okText: '閉じる' }); }
  };
})();
