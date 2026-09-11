/* Multi-touch controls that avoid native text selection and long-press menus. */
(() => {
  'use strict';
  window.bindRaceControl=function(element,onChange){
    const pointers=new Set();
    const update=()=>{const active=pointers.size>0;element.classList.toggle('held',active);element.setAttribute('aria-pressed',String(active));onChange(active);};
    element.onpointerdown=e=>{e.preventDefault();pointers.add(e.pointerId);element.setPointerCapture(e.pointerId);update();};
    element.onpointerup=element.onpointercancel=element.onlostpointercapture=e=>{pointers.delete(e.pointerId);update();};
    element.oncontextmenu=e=>e.preventDefault();element.ondragstart=e=>e.preventDefault();element.onselectstart=e=>e.preventDefault();
    return ()=>{pointers.clear();update();};
  };
})();
