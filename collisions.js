/* Swept road-space collision test. Positions use lateral X and forward distance S. */
(() => {
  'use strict';
  window.trafficContact=function(previous,current){
    const half={x:1.92,s:4.55};
    let enter=0,leave=1,axis=null;
    for(const key of ['x','s']){
      const delta=current[key]-previous[key];
      if(Math.abs(delta)<1e-9){if(Math.abs(previous[key])>half[key])return null;continue;}
      let a=(-half[key]-previous[key])/delta,b=(half[key]-previous[key])/delta;
      if(a>b)[a,b]=[b,a];
      if(a>enter){enter=a;axis=key;}leave=Math.min(leave,b);
      if(enter>leave)return null;
    }
    if(leave<0||enter>1)return null;
    // Already overlapping: separate along the shallowest penetration.
    if(!axis)axis=half.x-Math.abs(previous.x)<half.s-Math.abs(previous.s)?'x':'s';
    const at=previous[axis]+(current[axis]-previous[axis])*enter;
    const sign=Math.sign(at)||Math.sign(previous[axis]-current[axis])||1;
    return {x:axis==='x'?sign:0,s:axis==='s'?sign:0,time:enter};
  };
})();
