(() => {
  'use strict';
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const canvas = document.getElementById('field');
  const ctx = canvas.getContext('2d', { alpha:false });
  const fieldStateEl = document.getElementById('field-state');
  const progressBar = document.getElementById('progress-bar');
  const menu = document.getElementById('menu');
  const menuOpen = document.getElementById('menu-open');
  const menuClose = document.getElementById('menu-close');
  const cursor = document.querySelector('.cursor');
  const ring = document.querySelector('.cursor-ring');

  let W=0,H=0,dpr=1,last=performance.now(),activeMode='orbit';
  const pointer={x:-9999,y:-9999,tx:-9999,ty:-9999,vx:0,vy:0,active:false};
  const particles=[];
  const TAU=Math.PI*2;

  function resize(){
    dpr=Math.min(devicePixelRatio||1,1.6);
    W=innerWidth;H=innerHeight;
    canvas.width=Math.round(W*dpr);canvas.height=Math.round(H*dpr);
    canvas.style.width=W+'px';canvas.style.height=H+'px';
    ctx.setTransform(dpr,0,0,dpr,0,0);
    seed();
  }

  function seed(){
    particles.length=0;
    const count=Math.min(1500,Math.max(420,Math.floor(W*H/1100)));
    for(let i=0;i<count;i++){
      const a=Math.random()*TAU;
      const r=Math.pow(Math.random(),.56)*Math.min(W,H)*.37;
      particles.push({x:W/2+Math.cos(a)*r,y:H/2+Math.sin(a)*r,vx:0,vy:0,phase:Math.random()*TAU,seed:Math.random(),size:.45+Math.random()*1.15,alpha:.18+Math.random()*.64});
    }
  }

  function targetFor(p,i,time){
    const cx=W*.5,cy=H*.5;
    if(activeMode==='wave'){
      const cols=Math.max(30,Math.floor(W/18));
      const gx=(i%cols)/(cols-1);
      const gy=Math.floor(i/cols)/Math.max(1,Math.ceil(particles.length/cols)-1);
      const x=gx*W;
      const amp=36+58*Math.sin(time*.00035+p.seed*3);
      const y=gy*H+Math.sin(gx*TAU*3.4+time*.0011+p.phase)*amp;
      return [x,y];
    }
    if(activeMode==='spiral'){
      const q=i/particles.length;
      const a=q*TAU*10.5+time*.00013;
      const r=22+q*Math.min(W,H)*.49;
      return [cx+Math.cos(a)*r,cy+Math.sin(a)*r*.72];
    }
    if(activeMode==='fractal'){
      const q=i/particles.length;
      const branch=i%5;
      const a=q*TAU*7+branch*1.256+Math.sin(time*.0002+p.phase)*.2;
      const r=(.09+.42*Math.abs(Math.sin(q*TAU*3+p.phase)))*Math.min(W,H);
      const split=1+.22*Math.sin(a*2.2);
      return [cx+Math.cos(a)*r*split,cy+Math.sin(a)*r*.62];
    }
    if(activeMode==='calm'){
      const cols=Math.max(22,Math.floor(W/24));
      const x=((i%cols)+.5)/cols*W;
      const rows=Math.ceil(particles.length/cols);
      const y=((Math.floor(i/cols)+.5)/rows)*H;
      return [x,y];
    }
    const q=i/particles.length;
    const band=(i%4)-1.5;
    const a=q*TAU*6+time*.00016*(band%2?1:-1);
    const r=(.18+.26*((i%83)/83))*Math.min(W,H);
    return [cx+Math.cos(a)*r,cy+Math.sin(a)*r*(.34+Math.abs(band)*.18)];
  }

  function updateParticle(p,i,time){
    const target=targetFor(p,i,time);
    let ax=(target[0]-p.x)*.0052;
    let ay=(target[1]-p.y)*.0052;
    const dx=p.x-pointer.x,dy=p.y-pointer.y;
    const dist2=dx*dx+dy*dy;
    const radius=155;
    if(pointer.active&&dist2<radius*radius){
      const dist=Math.sqrt(dist2)||1;
      const power=(1-dist/radius)*1.9;
      ax+=(dx/dist)*power+pointer.vx*.018*power;
      ay+=(dy/dist)*power+pointer.vy*.018*power;
    }
    p.vx=(p.vx+ax)*.92;
    p.vy=(p.vy+ay)*.92;
    p.x+=p.vx;p.y+=p.vy;
  }

  function draw(time){
    const dt=Math.min(34,time-last);last=time;
    ctx.fillStyle='#070707';ctx.fillRect(0,0,W,H);
    pointer.vx=(pointer.tx-pointer.x)*.22;pointer.vy=(pointer.ty-pointer.y)*.22;
    pointer.x+=pointer.vx;pointer.y+=pointer.vy;
    const grd=ctx.createRadialGradient(W*.5,H*.46,0,W*.5,H*.46,Math.max(W,H)*.65);
    grd.addColorStop(0,'rgba(24,24,24,.55)');grd.addColorStop(.55,'rgba(10,10,10,.22)');grd.addColorStop(1,'rgba(7,7,7,0)');
    ctx.fillStyle=grd;ctx.fillRect(0,0,W,H);
    ctx.globalCompositeOperation='lighter';
    for(let i=0;i<particles.length;i++){
      const p=particles[i];
      if(!reduced)updateParticle(p,i,time);else{const q=targetFor(p,i,time);p.x=q[0];p.y=q[1];}
      const speed=Math.min(1,Math.hypot(p.vx,p.vy)/5);
      ctx.fillStyle=`rgba(236,236,230,${p.alpha*(.42+speed*.35)})`;
      ctx.fillRect(p.x,p.y,p.size+speed*1.8,p.size+speed*1.8);
    }
    ctx.globalCompositeOperation='source-over';
    if(!document.hidden)requestAnimationFrame(draw);
  }

  function setMode(mode){
    if(mode===activeMode)return;
    activeMode=mode;
    fieldStateEl.textContent='FIELD / '+mode.toUpperCase();
  }

  const modeObserver=new IntersectionObserver(entries=>{
    const visible=entries.filter(e=>e.isIntersecting).sort((a,b)=>b.intersectionRatio-a.intersectionRatio)[0];
    if(visible)setMode(visible.target.dataset.field||'orbit');
  },{threshold:[.2,.4,.6,.8]});
  document.querySelectorAll('[data-field]').forEach(el=>modeObserver.observe(el));

  const revealObserver=new IntersectionObserver(entries=>{
    entries.forEach(e=>{if(e.isIntersecting){e.target.classList.add('in');revealObserver.unobserve(e.target);}});
  },{threshold:.12});
  document.querySelectorAll('.reveal').forEach(el=>revealObserver.observe(el));

  addEventListener('scroll',()=>{
    const max=document.documentElement.scrollHeight-innerHeight;
    const q=max>0?scrollY/max:0;
    progressBar.style.width=(q*100).toFixed(2)+'%';
  },{passive:true});

  addEventListener('pointermove',e=>{
    pointer.tx=e.clientX;pointer.ty=e.clientY;pointer.active=true;
    cursor.style.transform=`translate3d(${e.clientX}px,${e.clientY}px,0)`;
    ring.style.transform=`translate3d(${e.clientX}px,${e.clientY}px,0)`;
  },{passive:true});
  addEventListener('pointerleave',()=>pointer.active=false);
  document.querySelectorAll('.hot').forEach(el=>{
    el.addEventListener('mouseenter',()=>ring.classList.add('hot'));
    el.addEventListener('mouseleave',()=>ring.classList.remove('hot'));
  });

  function openMenu(){menu.classList.add('open');menu.setAttribute('aria-hidden','false');menuOpen.setAttribute('aria-expanded','true');document.body.style.overflow='hidden';}
  function closeMenu(){menu.classList.remove('open');menu.setAttribute('aria-hidden','true');menuOpen.setAttribute('aria-expanded','false');document.body.style.overflow='';}
  menuOpen.addEventListener('click',openMenu);menuClose.addEventListener('click',closeMenu);
  menu.querySelectorAll('a').forEach(a=>a.addEventListener('click',closeMenu));
  addEventListener('keydown',e=>{if(e.key==='Escape')closeMenu();});
  document.addEventListener('visibilitychange',()=>{if(!document.hidden){last=performance.now();requestAnimationFrame(draw);}});
  addEventListener('resize',resize,{passive:true});
  resize();requestAnimationFrame(draw);
})();