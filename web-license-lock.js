(() => {
  'use strict';

  const message = 'GitHub版では印刷およびWord・Excel出力を利用できません。\n製品版は10,000円（税込・修正／サポート込み）です。';

  async function showLockNotice() {
    if (window.AppDialog?.alert) {
      await window.AppDialog.alert(message, '製品版限定機能');
      return;
    }
    window.alert(message);
  }

  function lockPrintButtons() {
    ['previewPrintButton', 'doPrint'].forEach(id => {
      const button = document.getElementById(id);
      if (!button) return;
      button.textContent = '🔒 この内容を印刷';
      button.classList.add('web-locked-action');
      button.setAttribute('aria-disabled', 'true');
      button.title = '印刷は製品版で利用できます';
      button.addEventListener('click', event => {
        event.preventDefault();
        event.stopImmediatePropagation();
        showLockNotice();
      }, true);
    });
  }

  function addLockedOfficeButton() {
    if (document.getElementById('officeExportButton')) return;
    const host = document.querySelector('.top-actions,.actions');
    if (!host) return;
    const button = document.createElement('button');
    button.id = 'officeExportButton';
    button.className = 'button web-locked-action';
    button.type = 'button';
    button.textContent = '🔒 Word・Excel';
    button.title = 'Word・Excel出力は製品版で利用できます';
    button.onclick = showLockNotice;
    host.insertBefore(button, host.querySelector('#printButton') || null);
  }

  function addLicenseBadge() {
    const host = document.querySelector('.right-sidebar,.sidebar,.top-actions,.actions');
    if (!host || host.querySelector('.web-license-badge')) return;
    const badge = document.createElement('div');
    badge.className = 'web-license-badge';
    badge.textContent = 'GitHub体験版：印刷・Word・Excelは製品版限定';
    host.appendChild(badge);
  }

  function addPrintLockSheet() {
    if (document.getElementById('webPrintLockSheet')) return;
    const sheet = document.createElement('div');
    sheet.id = 'webPrintLockSheet';
    sheet.textContent = 'GitHub版では帳票を印刷できません。製品版をご利用ください。';
    document.body.appendChild(sheet);
  }

  window.print = showLockNotice;
  document.addEventListener('keydown', event => {
    if ((event.ctrlKey || event.metaKey) && String(event.key).toLowerCase() === 'p') {
      event.preventDefault();
      showLockNotice();
    }
  }, true);

  document.addEventListener('DOMContentLoaded', () => {
    lockPrintButtons();
    addLockedOfficeButton();
    addLicenseBadge();
    addPrintLockSheet();
  });
})();
