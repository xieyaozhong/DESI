(() => {
  'use strict';

  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = matchMedia('(pointer:fine)').matches;
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
  const cursorText = cursorRing?.querySelector('span');
  const pageGlow = document.querySelector('.page-glow');
  const heroDisc = document.querySelector('.hero-disc');
  const themeMeta = document.querySelector('meta[name="theme-color"]');
  const pointer = { x: innerWidth*.5, y: innerHeight*.5, rx: innerWidth*.5, ry: innerHeight*.5, active:false };
  let activeIndex = 0;
  let latestScroll = scrollY;

  function openMenu(){
    menu?.classList.add('open');
    menu?.setAttribute('aria-hidden','false');
    menuOpen?.setAttribute('aria-expanded','true');
    document.body.style.overflow='hidden';
  }
  function closeMenu(){
    menu?.classList.remove('open');
    menu?.setAttribute('aria-hidden','true');
    menuOpen?.setAttribute('aria-expanded','false');
    document.body.style.overflow='';
  }
  menuOpen?.addEventListener('click',openMenu);
  menuClose?.addEventListener('click',closeMenu);
  menu?.querySelectorAll('a').forEach(a=>a.addEventListener('click',closeMenu));
  addEventListener('keydown',e=>{ if(e.key==='Escape') closeMenu(); });

  addEventListener('pointermove', e => {
    pointer.x=e.clientX; pointer.y=e.clientY; pointer.active=true;
    if(cursorDot) cursorDot.style.transform=`translate3d(${e.clientX-3}px,${e.clientY-3}px,0)`;
    if(pageGlow && !reduced){
      const gx=(e.clientX/innerWidth-.5)*36;
      const gy=(e.clientY/innerHeight-.5)*28;
      pageGlow.style.transform=`translate3d(${gx}px,${gy}px,0)`;
    }
  }, {passive:true});
  addEventListener('pointerleave',()=>pointer.active=false);

  function setCursor(label='', isLink=false){
    if(!cursorRing) return;
    cursorRing.classList.toggle('hot',Boolean(label));
    cursorRing.classList.toggle('link-hot',isLink);
    if(cursorText) cursorText.textContent=label;
  }
  document.querySelectorAll('.tilt-card').forEach(el=>{
    el.addEventListener('pointerenter',()=>setCursor(el.dataset.cursor||'VIEW',false));
    el.addEventListener('pointerleave',()=>setCursor());
  });
  document.querySelectorAll('a,button').forEach(el=>{
    if(el.closest('.tilt-card')) return;
    el.addEventListener('pointerenter',()=>setCursor('OPEN',true));
    el.addEventListener('pointerleave',()=>setCursor());
  });

  function animateCursor(){
    if(cursorRing){
      pointer.rx+=(pointer.x-pointer.rx)*.16;
      pointer.ry+=(pointer.y-pointer.ry)*.16;
      const size=cursorRing.classList.contains('hot')?64:42;
      cursorRing.style.transform=`translate3d(${pointer.rx-size/2}px,${pointer.ry-size/2}px,0)`;
    }
    requestAnimationFrame(animateCursor);
  }
  if(!reduced && finePointer) animateCursor();

  function activate(i){
    if(i<0 || i>=sections.length) return;
    activeIndex=i;
    const section=sections[i];
    const theme=section.dataset.theme;
    const accent=section.dataset.accent;
    document.body.style.backgroundColor=theme;
    document.documentElement.style.setProperty('--paper',theme);
    document.documentElement.style.setProperty('--accent',accent);
    themeMeta?.setAttribute('content',theme);
    railLinks.forEach((a,n)=>a.classList.toggle('active',n===i));
    if(progress) progress.style.width=`${((i+1)/sections.length)*100}%`;
    if(statusIndex) statusIndex.textContent=section.dataset.index;
    if(statusName) statusName.textContent=section.dataset.name;
  }

  const sectionObserver=new IntersectionObserver(entries=>{
    const visible=entries.filter(e=>e.isIntersecting).sort((a,b)=>b.intersectionRatio-a.intersectionRatio)[0];
    if(!visible) return;
    const i=sections.indexOf(visible.target);
    if(i!==-1) activate(i);
  },{threshold:[.2,.36,.52,.68]});
  sections.forEach(s=>sectionObserver.observe(s));
  railLinks.forEach((a,i)=>a.addEventListener('click',()=>activate(i)));

  const revealObserver=new IntersectionObserver(entries=>{
    entries.forEach(e=>{ if(e.isIntersecting){e.target.classList.add('in');revealObserver.unobserve(e.target);} });
  },{threshold:.12,rootMargin:'0px 0px -6%'});
  document.querySelectorAll('.reveal').forEach(el=>revealObserver.observe(el));

  if(finePointer && !reduced){
    document.querySelectorAll('.magnetic').forEach(el=>{
      el.addEventListener('pointermove',e=>{
        const r=el.getBoundingClientRect();
        const x=(e.clientX-r.left-r.width/2)*.16;
        const y=(e.clientY-r.top-r.height/2)*.16;
        el.style.transform=`translate3d(${x}px,${y}px,0)`;
      });
      el.addEventListener('pointerleave',()=>el.style.transform='translate3d(0,0,0)');
    });
    document.querySelectorAll('.tilt-card').forEach(card=>{
      card.addEventListener('pointermove',e=>{
        const r=card.getBoundingClientRect();
        const nx=(e.clientX-r.left)/r.width-.5;
        const ny=(e.clientY-r.top)/r.height-.5;
        card.style.transform=`perspective(1100px) rotateX(${ny*-3.5}deg) rotateY(${nx*4.5}deg) translate3d(0,-2px,0)`;
      });
      card.addEventListener('pointerleave',()=>{
        card.style.transition='transform .7s cubic-bezier(.2,.7,.2,1)';
        card.style.transform='perspective(1100px) rotateX(0) rotateY(0) translate3d(0,0,0)';
        setTimeout(()=>card.style.transition='',720);
      });
    });
  }

  addEventListener('scroll',()=>{
    latestScroll=scrollY;
    const intro=document.querySelector('.intro');
    if(intro && scrollY<intro.offsetHeight*.62){
      document.body.style.backgroundColor='#d8b4c0';
      document.documentElement.style.setProperty('--paper','#d8b4c0');
      document.documentElement.style.setProperty('--accent','#8b3558');
      themeMeta?.setAttribute('content','#d8b4c0');
    }
    if(heroDisc && !reduced){
      const shift=Math.min(90,scrollY*.07);
      heroDisc.style.translate=`0 ${shift}px`;
    }
  },{passive:true});

  class ArtField {
    constructor(canvas, mode){
      this.canvas=canvas;
      this.ctx=canvas.getContext('2d');
      this.mode=mode;
      this.w=1;this.h=1;this.dpr=1;this.visible=false;
      this.points=[];this.seed=Math.random()*999;
      this.ro=new ResizeObserver(()=>this.resize());
      this.ro.observe(canvas.parentElement);
      this.makePoints();
    }
    makePoints(){
      const count=this.mode==='flow'?150:92;
      this.points=Array.from({length:count},(_,i)=>({
        x:Math.random(),y:Math.random(),vx:(Math.random()-.5)*.001,vy:(Math.random()-.5)*.001,
        phase:Math.random()*Math.PI*2,r:.8+Math.random()*2.2,index:i
      }));
    }
    resize(){
      const r=this.canvas.getBoundingClientRect();
      this.dpr=Math.min(devicePixelRatio||1,1.6);
      this.w=Math.max(1,r.width);this.h=Math.max(1,r.height);
      this.canvas.width=Math.round(this.w*this.dpr);this.canvas.height=Math.round(this.h*this.dpr);
      this.ctx.setTransform(this.dpr,0,0,this.dpr,0,0);
      this.draw(performance.now()/1000);
    }
    localPointer(){
      const r=this.canvas.getBoundingClientRect();
      return {x:pointer.x-r.left,y:pointer.y-r.top,inside:pointer.active&&pointer.x>=r.left&&pointer.x<=r.right&&pointer.y>=r.top&&pointer.y<=r.bottom};
    }
    clear(){
      const c=this.ctx;
      c.clearRect(0,0,this.w,this.h);
      const g=c.createLinearGradient(0,0,this.w,this.h);
      g.addColorStop(0,'rgba(255,255,255,.14)');
      g.addColorStop(.48,'rgba(255,255,255,.025)');
      g.addColorStop(1,'rgba(15,15,15,.075)');
      c.fillStyle=g;c.fillRect(0,0,this.w,this.h);
    }
    draw(t){
      this.clear();
      if(this.mode==='nodes')this.nodes(t);
      else if(this.mode==='ribbons')this.ribbons(t);
      else if(this.mode==='grid')this.grid(t);
      else if(this.mode==='flow')this.flow(t);
      else this.orbit(t);
    }
    nodes(t){
      const c=this.ctx,p=this.localPointer(),cx=this.w*.52,cy=this.h*.5;
      const coords=this.points.map((pt,i)=>{
        const ring=i%5;
        const a=pt.phase+t*(.04+(ring*.008));
        const rad=Math.min(this.w,this.h)*(.10+ring*.07)+(i%11)*2.5;
        let x=cx+Math.cos(a*(1.1+ring*.12))*rad+Math.sin(pt.phase*2+t*.24)*13;
        let y=cy+Math.sin(a*(.92+ring*.09))*rad*.78+Math.cos(pt.phase+t*.2)*11;
        if(p.inside){const dx=x-p.x,dy=y-p.y,d=Math.hypot(dx,dy);if(d<160&&d>1){const f=Math.pow(1-d/160,2)*76;x+=dx/d*f;y+=dy/d*f;}}
        return{x,y,ring};
      });
      c.lineWidth=.7;
      for(let i=0;i<coords.length;i++){
        for(let j=i+1;j<coords.length;j++){
          const a=coords[i],b=coords[j],d=Math.hypot(a.x-b.x,a.y-b.y);
          if(d<76){c.strokeStyle=`rgba(18,18,18,${.16*(1-d/76)})`;c.beginPath();c.moveTo(a.x,a.y);c.lineTo(b.x,b.y);c.stroke();}
        }
      }
      coords.forEach((q,i)=>{c.fillStyle=i%13===0?'rgba(18,18,18,.92)':'rgba(18,18,18,.5)';c.beginPath();c.arc(q.x,q.y,i%13===0?3.5:1.35,0,Math.PI*2);c.fill();});
      c.strokeStyle='rgba(18,18,18,.28)';c.beginPath();c.arc(cx,cy,Math.min(this.w,this.h)*.29,0,Math.PI*2);c.stroke();
      c.font='600 9px monospace';c.fillStyle='rgba(18,18,18,.52)';c.fillText('SIGNAL  /  STRUCTURE  /  DECISION',22,this.h-24);
    }
    ribbons(t){
      const c=this.ctx,p=this.localPointer();
      c.lineCap='round';
      for(let band=0;band<18;band++){
        c.beginPath();
        const y0=this.h*(.09+band*.047);
        for(let x=-30;x<=this.w+30;x+=7){
          const d=p.inside?Math.hypot(x-p.x,y0-p.y):999;
          const influence=Math.max(0,1-d/210);
          const y=y0+Math.sin(x*.011+t*.55+band*.48)*25+Math.sin(x*.022-t*.24+band)*8-influence*48*Math.sin((x-p.x)*.023);
          x===-30?c.moveTo(x,y):c.lineTo(x,y);
        }
        c.strokeStyle=`rgba(20,20,20,${.11+band*.012})`;c.lineWidth=band%5===0?2.4:.75;c.stroke();
      }
      c.save();c.translate(this.w*.72,this.h*.42);c.rotate(-.18+Math.sin(t*.24)*.035);
      const g=c.createLinearGradient(-90,-130,90,130);g.addColorStop(0,'rgba(255,255,255,.18)');g.addColorStop(1,'rgba(20,20,20,.07)');c.fillStyle=g;c.fillRect(-86,-125,172,250);c.strokeStyle='rgba(20,20,20,.55)';c.lineWidth=1;c.strokeRect(-86,-125,172,250);c.restore();
      c.font='italic 58px Georgia';c.fillStyle='rgba(20,20,20,.14)';c.fillText('Aa',28,this.h*.76);
    }
    grid(t){
      const c=this.ctx,p=this.localPointer(),step=Math.max(30,Math.min(this.w,this.h)/14);
      for(let x=-step;x<this.w+step;x+=step){c.beginPath();for(let y=-step;y<this.h+step;y+=6){let xx=x+Math.sin(y*.015+t*.28+x*.008)*2.5;if(p.inside){const dx=xx-p.x,dy=y-p.y,d=Math.hypot(dx,dy);if(d<190&&d>1)xx+=dx/d*Math.pow(1-d/190,2)*72;}y===-step?c.moveTo(xx,y):c.lineTo(xx,y);}c.strokeStyle='rgba(18,18,18,.2)';c.lineWidth=.75;c.stroke();}
      for(let y=-step;y<this.h+step;y+=step){c.beginPath();for(let x=-step;x<this.w+step;x+=6){let yy=y+Math.sin(x*.014-t*.25+y*.008)*2.5;if(p.inside){const dx=x-p.x,dy=yy-p.y,d=Math.hypot(dx,dy);if(d<190&&d>1)yy+=dy/d*Math.pow(1-d/190,2)*72;}x===-step?c.moveTo(x,yy):c.lineTo(x,yy);}c.strokeStyle='rgba(18,18,18,.2)';c.lineWidth=.75;c.stroke();}
      const px=p.inside?p.x:this.w*.68,py=p.inside?p.y:this.h*.43;c.strokeStyle='rgba(18,18,18,.65)';c.beginPath();c.arc(px,py,22+Math.sin(t*1.3)*3,0,Math.PI*2);c.stroke();c.fillStyle='rgba(18,18,18,.9)';c.beginPath();c.arc(px,py,3.5,0,Math.PI*2);c.fill();
    }
    flow(t){
      const c=this.ctx,p=this.localPointer();
      c.strokeStyle='rgba(18,18,18,.26)';c.lineWidth=.8;c.strokeRect(this.w*.12,this.h*.14,this.w*.76,this.h*.72);
      for(let i=1;i<5;i++){c.beginPath();c.moveTo(this.w*.12,this.h*(.14+.144*i));c.lineTo(this.w*.88,this.h*(.14+.144*i));c.strokeStyle='rgba(18,18,18,.1)';c.stroke();}
      this.points.forEach((pt,i)=>{
        if(!reduced){pt.x+=.0006+(i%7)*.000055;if(pt.x>1.05)pt.x=-.05;}
        let x=pt.x*this.w,y=pt.y*this.h+Math.sin(t*.68+pt.phase+pt.x*9)*20;
        if(p.inside){const dx=x-p.x,dy=y-p.y,d=Math.hypot(dx,dy);if(d<135&&d>1){x+=dx/d*(135-d)*.42;y+=dy/d*(135-d)*.42;}}
        c.strokeStyle='rgba(18,18,18,.12)';c.beginPath();c.moveTo(x-34-(i%7)*5,y);c.lineTo(x,y);c.stroke();
        c.fillStyle=i%17===0?'rgba(18,18,18,.94)':'rgba(18,18,18,.46)';c.beginPath();c.arc(x,y,i%17===0?3.5:1.2,0,Math.PI*2);c.fill();
      });
      c.font='600 9px monospace';c.fillStyle='rgba(18,18,18,.52)';c.fillText('INPUT → CONTEXT → REASON → ACTION',22,this.h-24);
    }
    orbit(t){
      const c=this.ctx,p=this.localPointer(),cx=this.w*.5,cy=this.h*.48,base=Math.min(this.w,this.h);
      const glow=c.createRadialGradient(cx,cy,0,cx,cy,base*.33);glow.addColorStop(0,'rgba(255,255,255,.25)');glow.addColorStop(.2,'rgba(18,18,18,.04)');glow.addColorStop(1,'rgba(18,18,18,0)');c.fillStyle=glow;c.beginPath();c.arc(cx,cy,base*.34,0,Math.PI*2);c.fill();
      c.save();c.translate(cx,cy);
      for(let i=0;i<12;i++){
        const rx=base*(.055+i*.026),ry=rx*(.38+(i%4)*.11),rot=i*.31+t*.024*(i%2?1:-1);
        c.save();c.rotate(rot);c.strokeStyle=`rgba(18,18,18,${.11+i*.012})`;c.lineWidth=i%4===0?1.3:.7;c.beginPath();c.ellipse(0,0,rx,ry,0,0,Math.PI*2);c.stroke();const a=t*(.22+i*.009)+i*.77;c.fillStyle='rgba(18,18,18,.7)';c.beginPath();c.arc(Math.cos(a)*rx,Math.sin(a)*ry,i%4===0?2.8:1.3,0,Math.PI*2);c.fill();c.restore();
      }
      c.fillStyle='rgba(18,18,18,.92)';c.beginPath();c.arc(0,0,6+Math.sin(t*.9)*1.3,0,Math.PI*2);c.fill();c.restore();
      if(p.inside){c.strokeStyle='rgba(18,18,18,.4)';c.beginPath();c.arc(p.x,p.y,28+Math.sin(t*2)*6,0,Math.PI*2);c.stroke();}
    }
  }

  const fields=[...document.querySelectorAll('.art-canvas')].map(canvas=>new ArtField(canvas,canvas.closest('.expertise').dataset.mode));
  const visualObserver=new IntersectionObserver(entries=>entries.forEach(e=>{
    const f=fields.find(v=>v.canvas===e.target);if(f)f.visible=e.isIntersecting;
  }),{rootMargin:'25% 0px',threshold:.01});
  fields.forEach(f=>visualObserver.observe(f.canvas));

  function frame(ms){
    const t=ms/1000;
    fields.forEach(f=>{if(f.visible)f.draw(t)});
    requestAnimationFrame(frame);
  }
  if(reduced) fields.forEach(f=>f.draw(0)); else requestAnimationFrame(frame);

  activate(0);
})();
