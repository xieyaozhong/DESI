(() => {
  'use strict';

  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const sections = [...document.querySelectorAll('.expertise')];
  const railLinks = [...document.querySelectorAll('.expertise-rail a')];
  const progress = document.getElementById('rail-progress');
  const statusIndex = document.getElementById('status-index');
  const statusName = document.getElementById('status-name');
  const menu = document.getElementById('menu');
  const menuOpen = document.getElementById('menu-open');
  const menuClose = document.getElementById('menu-close');
  const cursorDot = document.querySelector('.cursor-dot');
  const cursorRing = document.querySelector('.cursor-ring');
  const themeMeta = document.querySelector('meta[name="theme-color"]');
  const pointer = { x: -9999, y: -9999, rx: -9999, ry: -9999, active: false };
  let activeIndex = 0;

  function openMenu(){
    menu.classList.add('open');
    menu.setAttribute('aria-hidden','false');
    menuOpen.setAttribute('aria-expanded','true');
    document.body.style.overflow='hidden';
  }
  function closeMenu(){
    menu.classList.remove('open');
    menu.setAttribute('aria-hidden','true');
    menuOpen.setAttribute('aria-expanded','false');
    document.body.style.overflow='';
  }
  menuOpen?.addEventListener('click',openMenu);
  menuClose?.addEventListener('click',closeMenu);
  menu?.querySelectorAll('a').forEach(a=>a.addEventListener('click',closeMenu));
  addEventListener('keydown',e=>{ if(e.key==='Escape') closeMenu(); });

  addEventListener('pointermove', e => {
    pointer.x=e.clientX; pointer.y=e.clientY; pointer.active=true;
    if(cursorDot){ cursorDot.style.transform=`translate(${e.clientX-3.5}px,${e.clientY-3.5}px)`; }
  }, {passive:true});
  addEventListener('pointerleave',()=>pointer.active=false);

  const hotTargets='a,button';
  document.querySelectorAll(hotTargets).forEach(el=>{
    el.addEventListener('pointerenter',()=>cursorRing?.classList.add('hot'));
    el.addEventListener('pointerleave',()=>cursorRing?.classList.remove('hot'));
  });

  function animateCursor(){
    if(cursorRing){
      pointer.rx += (pointer.x-pointer.rx)*.14;
      pointer.ry += (pointer.y-pointer.ry)*.14;
      cursorRing.style.transform=`translate(${pointer.rx-17}px,${pointer.ry-17}px)`;
    }
    requestAnimationFrame(animateCursor);
  }
  if(!reduced) animateCursor();

  function activate(i){
    if(i<0 || i>=sections.length) return;
    activeIndex=i;
    const section=sections[i];
    const theme=section.dataset.theme;
    document.body.style.backgroundColor=theme;
    themeMeta?.setAttribute('content',theme);
    railLinks.forEach((a,n)=>a.classList.toggle('active',n===i));
    if(progress) progress.style.width=`${((i+1)/sections.length)*100}%`;
    if(statusIndex) statusIndex.textContent=section.dataset.index;
    if(statusName) statusName.textContent=section.dataset.name;
  }

  const observer=new IntersectionObserver(entries=>{
    const visible=entries.filter(e=>e.isIntersecting).sort((a,b)=>b.intersectionRatio-a.intersectionRatio)[0];
    if(!visible) return;
    const i=sections.indexOf(visible.target);
    if(i!==-1) activate(i);
  },{threshold:[.3,.5,.7]});
  sections.forEach(s=>observer.observe(s));

  addEventListener('scroll',()=>{
    const intro=document.querySelector('.intro');
    if(intro && scrollY < intro.offsetHeight*.55){
      document.body.style.backgroundColor='#d3a4b3';
      themeMeta?.setAttribute('content','#d3a4b3');
    }
  },{passive:true});

  railLinks.forEach((a,i)=>a.addEventListener('click',()=>activate(i)));

  class ArtField {
    constructor(canvas, mode){
      this.canvas=canvas;
      this.ctx=canvas.getContext('2d');
      this.mode=mode;
      this.w=1; this.h=1; this.dpr=1; this.t=0;
      this.visible=false;
      this.seed=Math.random()*1000;
      this.points=[];
      this.resizeObserver=new ResizeObserver(()=>this.resize());
      this.resizeObserver.observe(canvas.parentElement);
      this.makePoints();
    }
    makePoints(){
      const count=this.mode==='flow'?100:68;
      this.points=Array.from({length:count},(_,i)=>({
        x:Math.random(),y:Math.random(),vx:(Math.random()-.5)*.002,vy:(Math.random()-.5)*.002,
        r:1+Math.random()*2,phase:Math.random()*Math.PI*2,index:i
      }));
    }
    resize(){
      const r=this.canvas.getBoundingClientRect();
      this.dpr=Math.min(devicePixelRatio||1,1.5);
      this.w=Math.max(1,r.width); this.h=Math.max(1,r.height);
      this.canvas.width=Math.round(this.w*this.dpr);
      this.canvas.height=Math.round(this.h*this.dpr);
      this.ctx.setTransform(this.dpr,0,0,this.dpr,0,0);
      this.draw(performance.now()/1000);
    }
    localPointer(){
      const r=this.canvas.getBoundingClientRect();
      return {x:pointer.x-r.left,y:pointer.y-r.top,inside:pointer.active&&pointer.x>=r.left&&pointer.x<=r.right&&pointer.y>=r.top&&pointer.y<=r.bottom};
    }
    clear(){
      this.ctx.clearRect(0,0,this.w,this.h);
      this.ctx.fillStyle='rgba(18,18,18,.08)';
      this.ctx.fillRect(0,0,this.w,this.h);
    }
    draw(time){
      this.t=time;
      this.clear();
      if(this.mode==='nodes') this.nodes(time);
      else if(this.mode==='ribbons') this.ribbons(time);
      else if(this.mode==='grid') this.grid(time);
      else if(this.mode==='flow') this.flow(time);
      else this.orbit(time);
    }
    nodes(t){
      const c=this.ctx,p=this.localPointer();
      const coords=this.points.map((pt,i)=>{
        const a=(i/this.points.length)*Math.PI*2+t*.08;
        const rad=Math.min(this.w,this.h)*(.18+.18*((i%7)/7));
        let x=this.w*.52+Math.cos(a*1.9+pt.phase)*rad+Math.sin(t*.45+pt.phase)*22;
        let y=this.h*.48+Math.sin(a*1.27+pt.phase)*rad*.78+Math.cos(t*.36+pt.phase)*18;
        if(p.inside){const dx=x-p.x,dy=y-p.y,d=Math.hypot(dx,dy);if(d<150&&d>0){const f=(150-d)/150*54;x+=dx/d*f;y+=dy/d*f;}}
        return {x,y};
      });
      c.lineWidth=1;
      for(let i=0;i<coords.length;i++) for(let j=i+1;j<coords.length;j++){
        const a=coords[i],b=coords[j],d=Math.hypot(a.x-b.x,a.y-b.y);
        if(d<92){c.strokeStyle=`rgba(17,17,17,${.2*(1-d/92)})`;c.beginPath();c.moveTo(a.x,a.y);c.lineTo(b.x,b.y);c.stroke();}
      }
      coords.forEach((q,i)=>{c.fillStyle=i%9===0?'rgba(17,17,17,.95)':'rgba(17,17,17,.55)';c.beginPath();c.arc(q.x,q.y,i%9===0?4:1.7,0,Math.PI*2);c.fill();});
      c.font='600 10px monospace';c.fillStyle='rgba(17,17,17,.55)';c.fillText('STRUCTURE / SIGNAL / DECISION',20,28);
    }
    ribbons(t){
      const c=this.ctx,p=this.localPointer();
      c.lineCap='round';
      for(let band=0;band<14;band++){
        c.beginPath();
        const y0=this.h*(.16+band*.052);
        for(let x=-20;x<=this.w+20;x+=8){
          const influence=p.inside?Math.max(0,1-Math.hypot(x-p.x,y0-p.y)/210):0;
          const y=y0+Math.sin(x*.012+t*.7+band*.52)*28+Math.sin(x*.024-t*.3)*9-influence*42*Math.sin((x-p.x)*.025);
          x===-20?c.moveTo(x,y):c.lineTo(x,y);
        }
        c.strokeStyle=`rgba(20,20,20,${.18+band*.018})`;c.lineWidth=band%4===0?3:1.2;c.stroke();
      }
      c.save();c.translate(this.w*.72,this.h*.32);c.rotate(-.22+Math.sin(t*.3)*.04);c.strokeStyle='rgba(20,20,20,.7)';c.lineWidth=1.5;c.strokeRect(-72,-108,144,216);c.restore();
    }
    grid(t){
      const c=this.ctx,p=this.localPointer(),step=Math.max(26,Math.min(this.w,this.h)/16);
      c.lineWidth=1;
      for(let x=-step;x<this.w+step;x+=step){
        c.beginPath();
        for(let y=-step;y<this.h+step;y+=7){
          let xx=x+Math.sin(y*.018+t*.35+x*.01)*3;
          if(p.inside){const dx=xx-p.x,dy=y-p.y,d=Math.hypot(dx,dy);if(d<170&&d>1)xx+=dx/d*(170-d)*.28;}
          y===-step?c.moveTo(xx,y):c.lineTo(xx,y);
        }
        c.strokeStyle='rgba(15,15,15,.22)';c.stroke();
      }
      for(let y=-step;y<this.h+step;y+=step){
        c.beginPath();
        for(let x=-step;x<this.w+step;x+=7){
          let yy=y+Math.sin(x*.017-t*.3+y*.01)*3;
          if(p.inside){const dx=x-p.x,dy=yy-p.y,d=Math.hypot(dx,dy);if(d<170&&d>1)yy+=dy/d*(170-d)*.28;}
          x===-step?c.moveTo(x,yy):c.lineTo(x,yy);
        }
        c.strokeStyle='rgba(15,15,15,.22)';c.stroke();
      }
      c.fillStyle='rgba(15,15,15,.9)';c.beginPath();c.arc(p.inside?p.x:this.w*.68,p.inside?p.y:this.h*.46,5,0,Math.PI*2);c.fill();
    }
    flow(t){
      const c=this.ctx,p=this.localPointer();
      this.points.forEach((pt,i)=>{
        if(!reduced){pt.x+=.0008+(i%5)*.00012;pt.y+=Math.sin(t*.6+pt.phase)*.00012;if(pt.x>1.05)pt.x=-.05;}
        let x=pt.x*this.w,y=pt.y*this.h+Math.sin(t*.8+pt.phase+pt.x*8)*24;
        if(p.inside){const dx=x-p.x,dy=y-p.y,d=Math.hypot(dx,dy);if(d<120&&d>1){x+=dx/d*(120-d)*.45;y+=dy/d*(120-d)*.45;}}
        c.strokeStyle='rgba(15,15,15,.16)';c.lineWidth=1;c.beginPath();c.moveTo(x-28-(i%6)*7,y);c.lineTo(x,y);c.stroke();
        c.fillStyle=i%11===0?'rgba(15,15,15,.95)':'rgba(15,15,15,.5)';c.beginPath();c.arc(x,y,i%11===0?3.8:1.5,0,Math.PI*2);c.fill();
      });
      c.strokeStyle='rgba(15,15,15,.45)';c.strokeRect(this.w*.16,this.h*.18,this.w*.68,this.h*.64);
      for(let i=1;i<4;i++){c.beginPath();c.moveTo(this.w*.16,this.h*(.18+.16*i));c.lineTo(this.w*.84,this.h*(.18+.16*i));c.strokeStyle='rgba(15,15,15,.12)';c.stroke();}
    }
    orbit(t){
      const c=this.ctx,p=this.localPointer(),cx=this.w*.52,cy=this.h*.49;
      c.save();c.translate(cx,cy);
      for(let i=0;i<9;i++){
        const rx=Math.min(this.w,this.h)*(.08+i*.037),ry=rx*(.5+(i%3)*.16),rot=i*.28+t*.035*(i%2?1:-1);
        c.save();c.rotate(rot);c.strokeStyle=`rgba(15,15,15,${.16+i*.018})`;c.lineWidth=i%3===0?1.7:1;c.beginPath();c.ellipse(0,0,rx,ry,0,0,Math.PI*2);c.stroke();
        const a=t*(.28+i*.015)+i*.92;let x=Math.cos(a)*rx,y=Math.sin(a)*ry;
        c.fillStyle='rgba(15,15,15,.82)';c.beginPath();c.arc(x,y,i%3===0?3.5:2,0,Math.PI*2);c.fill();c.restore();
      }
      c.fillStyle='rgba(15,15,15,.95)';c.beginPath();c.arc(0,0,7+Math.sin(t)*2,0,Math.PI*2);c.fill();c.restore();
      if(p.inside){c.strokeStyle='rgba(15,15,15,.45)';c.beginPath();c.arc(p.x,p.y,34+Math.sin(t*2)*8,0,Math.PI*2);c.stroke();}
    }
  }

  const fields=[...document.querySelectorAll('.art-canvas')].map(canvas=>new ArtField(canvas,canvas.closest('.expertise').dataset.mode));
  const visualObserver=new IntersectionObserver(entries=>entries.forEach(e=>{
    const f=fields.find(v=>v.canvas===e.target); if(f) f.visible=e.isIntersecting;
  }),{rootMargin:'20% 0px',threshold:.01});
  fields.forEach(f=>visualObserver.observe(f.canvas));

  function frame(ms){
    const t=ms/1000;
    fields.forEach(f=>{if(f.visible)f.draw(t)});
    if(!reduced) requestAnimationFrame(frame);
  }
  if(reduced) fields.forEach(f=>f.draw(0)); else requestAnimationFrame(frame);

  activate(0);
})();