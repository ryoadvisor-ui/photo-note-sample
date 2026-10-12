(() => {
  'use strict';
  const STORAGE_KEY='official-photo-ui-zoom-v1';
  const levels=[70,80,90,100];

  function read(){const value=Number(localStorage.getItem(STORAGE_KEY)||100);return levels.includes(value)?value:100}
  function apply(value){const level=levels.includes(Number(value))?Number(value):100;const zoom=level/100;const compensation=zoom>0?1/zoom:1;document.documentElement.style.setProperty('--app-ui-zoom',String(zoom));document.documentElement.style.setProperty('--app-ui-line-compensation',String(compensation));localStorage.setItem(STORAGE_KEY,String(level));return level}
  function attach(){const control=document.createElement('label');control.className='app-zoom-control no-print';control.innerHTML='<span>表示倍率</span><select aria-label="画面の表示倍率"><option value="70">70%</option><option value="80">80%</option><option value="90">90%</option><option value="100">100%</option></select>';document.body.appendChild(control);const select=control.querySelector('select');select.value=String(apply(read()));select.onchange=()=>apply(select.value)}

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',attach);else attach();
})();
