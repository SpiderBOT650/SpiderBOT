/*
================================================================================
  SpiderBOT — AI 자동 투자 수익 분배 플랫폼
  Template: templatemo-623-novapay (한국어 적용)
  Designed by TemplateMo (https://templatemo.com)
================================================================================
*/

/* 1. 실시간 시세 티커 */
const tickerData=[
  {sym:'BTC/KRW', price:'84,320,000원', chg:'+2.14%', up:true},
  {sym:'ETH/KRW', price:'3,920,000원',  chg:'+1.87%', up:true},
  {sym:'KOSPI',   price:'2,641.85',      chg:'-0.43%', up:false},
  {sym:'KOSDAQ',  price:'846.72',        chg:'+0.62%', up:true},
  {sym:'XAU/KRW', price:'3,140,000원',  chg:'+0.96%', up:true},
  {sym:'USD/KRW', price:'1,378원',       chg:'-0.21%', up:false},
  {sym:'BTC 도미', price:'54.2%',        chg:'+0.80%', up:true},
  {sym:'ETH/BTC', price:'0.04641',       chg:'-0.32%', up:false},
  {sym:'SOL/KRW', price:'172,400원',     chg:'+3.21%', up:true},
  {sym:'USDT/KRW','price':'1,377원',     chg:'-0.07%', up:false},
];
const track=document.getElementById('tickerTrack');
[...tickerData,...tickerData].forEach(t=>{
  const el=document.createElement('div');
  el.className='ticker-item';
  el.innerHTML=`<span class="ticker-sym">${t.sym}</span><span class="ticker-price">${t.price}</span><span class="${t.up?'ticker-up':'ticker-dn'}">${t.chg}</span>`;
  track.appendChild(el);
});

/* 2. 투자 플랜 로고 트랙 */
const logos=['스타터','브론즈','실버','골드','플래티넘','다이아몬드','로열','임페리얼','다이너스티','레거시','스타터','브론즈'];
const lt=document.getElementById('logosTrack');
[...logos,...logos].forEach(l=>{
  const el=document.createElement('div');
  el.className='logo-item';
  el.textContent=l;
  lt.appendChild(el);
});

/* 3. 네비 스크롤 */
const nav=document.getElementById('mainNav');
window.addEventListener('scroll',()=>{
  nav.classList.toggle('scrolled',window.scrollY>10);
});
window.addEventListener('load',()=>{
  document.querySelectorAll('.hero-content,.hero-visual').forEach((el,i)=>{
    setTimeout(()=>el.classList.add('visible'),i*150+100);
  });
});

/* 4. 모바일 메뉴 */
const hamburger=document.getElementById('hamburger');
const mobileMenu=document.getElementById('mobileMenu');
let scrollY=0;
hamburger.addEventListener('click',()=>{
  const open=mobileMenu.classList.contains('open');
  if(open){
    mobileMenu.classList.remove('open');
    hamburger.classList.remove('open');
    hamburger.setAttribute('aria-expanded','false');
    document.body.style.position='';
    document.body.style.top='';
    window.scrollTo({top:scrollY,behavior:'instant'});
  } else {
    scrollY=window.scrollY;
    document.body.style.position='fixed';
    document.body.style.top=`-${scrollY}px`;
    mobileMenu.classList.add('open');
    hamburger.classList.add('open');
    hamburger.setAttribute('aria-expanded','true');
  }
});
mobileMenu.querySelectorAll('a').forEach(a=>{
  a.addEventListener('click',()=>{
    mobileMenu.classList.remove('open');
    hamburger.classList.remove('open');
    hamburger.setAttribute('aria-expanded','false');
    document.body.style.position='';
    document.body.style.top='';
    window.scrollTo({top:scrollY,behavior:'instant'});
  });
});

/* 5. 대시보드 기간 전환 */
function switchPeriod(btn,period){
  document.querySelectorAll('.dp-period-btn').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
  const configs={
    '7d': {val:'5,000,000원',  change:'▲ +200,000원 (4.0%) 오늘'},
    '1m': {val:'5,000,000원',  change:'▲ +6,000,000원 (120.0%) 이번 달'},
    '3m': {val:'5,000,000원',  change:'▲ +18,000,000원 (360.0%) 3개월'},
    '1y': {val:'5,000,000원',  change:'▲ +72,000,000원 (1440.0%) 1년'},
  };
  const c=configs[period];
  document.getElementById('dpChartVal').textContent=c.val;
  document.getElementById('dpChartChange').textContent=c.change;
}

/* 6. 스파크라인 */
const sparkBars=[60,75,50,90,65,85,70,95];
document.getElementById('sparkline').innerHTML=sparkBars.map(h=>`<div class="pm-spark-bar" style="height:${h}%"></div>`).join('');

/* 7. 피처 스티키 스택 */
const stickyCards=document.querySelectorAll('.sticky-card');
const panelViews=document.querySelectorAll('.panel-view');
const panelLabel=document.getElementById('panelLabel');
const panelLabels=['AI 거래','수익 정산','투자 플랜','보안'];
stickyCards.forEach((card,i)=>{
  card.addEventListener('click',()=>{
    stickyCards.forEach(c=>c.classList.remove('active'));
    panelViews.forEach(p=>p.classList.remove('active'));
    card.classList.add('active');
    document.getElementById('panel-'+i).classList.add('active');
    panelLabel.textContent=panelLabels[i];
  });
});

const observer=new IntersectionObserver((entries)=>{
  entries.forEach(e=>{
    if(e.isIntersecting){
      stickyCards.forEach((card,i)=>{
        const rect=card.getBoundingClientRect();
        const viewH=window.innerHeight;
        if(rect.top<viewH*0.6&&rect.bottom>viewH*0.3){
          stickyCards.forEach(c=>c.classList.remove('active'));
          panelViews.forEach(p=>p.classList.remove('active'));
          card.classList.add('active');
          document.getElementById('panel-'+i).classList.add('active');
          panelLabel.textContent=panelLabels[i];
        }
      });
    }
  });
},{threshold:0.3});
stickyCards.forEach(c=>observer.observe(c));

/* 8. 통계 카운터 */
const statNums=document.querySelectorAll('.stat-num[data-target]');
const statsObs=new IntersectionObserver((entries)=>{
  entries.forEach(e=>{
    if(e.isIntersecting){
      const el=e.target;
      const target=parseFloat(el.dataset.target);
      const suffix=el.dataset.suffix||'';
      const decimal=parseInt(el.dataset.decimal)||0;
      const prefix=el.dataset.prefix||'';
      let start=0,duration=1800,startTime=null;
      function animate(ts){
        if(!startTime)startTime=ts;
        const progress=Math.min((ts-startTime)/duration,1);
        const ease=1-Math.pow(1-progress,3);
        const val=start+(target-start)*ease;
        el.textContent=prefix+(decimal?val.toFixed(decimal):Math.round(val))+suffix;
        if(progress<1)requestAnimationFrame(animate);
      }
      requestAnimationFrame(animate);
      const bar=el.closest('.stat-block').querySelector('.stat-bar');
      if(bar){setTimeout(()=>{bar.style.width=bar.dataset.width;},200);}
      statsObs.unobserve(el);
    }
  });
},{threshold:0.5});
statNums.forEach(el=>statsObs.observe(el));

/* 9. 투자 플랜 토글 (일간 ROI / 월간 ROI) */
let isAnnual=false;
function togglePricing(){
  isAnnual=!isAnnual;
  document.getElementById('pricingToggle').classList.toggle('on',isAnnual);
  document.querySelectorAll('.price-num').forEach(el=>{
    el.textContent=isAnnual?el.dataset.annual:el.dataset.monthly;
  });
  document.querySelectorAll('.period-label').forEach(el=>{
    el.textContent=isAnnual?'월간':'일간';
  });
  document.querySelectorAll('.price-alt-monthly').forEach(el=>{
    el.style.display=isAnnual?'none':'inline';
  });
  document.querySelectorAll('.price-alt-annual').forEach(el=>{
    el.style.display=isAnnual?'inline':'none';
  });
}

/* 10. FAQ */
const faqs=[
  {
    q:'SpiderBOT은 어떻게 수익을 만드나요?',
    a:'SpiderBOT의 AI 봇이 BTC, ETH 등 암호화폐 시장에서 24시간 자동으로 거래하며 수익을 창출합니다. 발생한 수익은 매일 오전 10시에 투자자 계좌로 자동 분배됩니다.'
  },
  {
    q:'최소 투자금은 얼마인가요?',
    a:'스타터 플랜 기준 최소 10,000원부터 시작할 수 있습니다. 투자금 규모에 따라 Starter(2%/일)부터 Legacy(15%/일)까지 10단계 플랜이 자동 적용됩니다.'
  },
  {
    q:'수익은 언제, 어떻게 받을 수 있나요?',
    a:'수익은 매일 오전 10시에 자동으로 계좌에 정산됩니다. 정산된 수익은 USDT(TRC20/ERC20), BTC, ETH 등 암호화폐로 즉시 출금 신청할 수 있으며, 영업일 기준 1~2일 내 처리됩니다.'
  },
  {
    q:'투자금은 언제든지 출금할 수 있나요?',
    a:'네, 투자금과 수익금은 언제든지 출금 신청할 수 있습니다. 플랜 중도 해지 시에도 원금 손실 없이 전액 출금 가능하며, 처리 기간은 영업일 기준 1~2일입니다.'
  },
  {
    q:'SpiderBOT의 보안은 믿을 수 있나요?',
    a:'투자자 자산은 AES-256 군사급 암호화로 보호되며, 운영 자금과 완전히 분리 보관됩니다. 2단계 인증(2FA)이 필수 적용되고, 24시간 보안 모니터링과 AI 이상 거래 탐지 시스템이 상시 운영됩니다.'
  },
  {
    q:'플랜은 언제든 변경할 수 있나요?',
    a:'투자금을 조정하면 해당 금액에 맞는 플랜이 자동으로 변경됩니다. 상위 플랜으로 변경 시 추가 투자금을 입금하면 되며, 변경 즉시 새 ROI가 적용됩니다.'
  },
  {
    q:'수익 계산기는 어디서 확인할 수 있나요?',
    a:'대시보드 내 수익 계산기에서 투자 금액과 기간을 입력하면 예상 수익을 실시간으로 확인할 수 있습니다. 플랜별 정확한 ROI를 기반으로 일간·월간·기간 수익이 자동 계산됩니다.'
  },
];
const faqList=document.getElementById('faqList');
faqs.forEach((f,i)=>{
  const item=document.createElement('div');
  item.className='faq-item';
  item.innerHTML=`<div class="faq-q"><span class="faq-q-text">${f.q}</span><svg class="faq-chevron" viewBox="0 0 24 24"><polyline points="6,9 12,15 18,9"/></svg></div><div class="faq-a">${f.a}</div>`;
  item.querySelector('.faq-q').addEventListener('click',()=>{
    item.classList.toggle('open');
  });
  faqList.appendChild(item);
});

let allExpanded=false;
function toggleAllFaq(){
  allExpanded=!allExpanded;
  document.querySelectorAll('.faq-item').forEach(el=>{
    allExpanded?el.classList.add('open'):el.classList.remove('open');
  });
  document.getElementById('faqToggleLabel').textContent=allExpanded?'전체 접기':'전체 펼치기';
  const icon=document.getElementById('faqToggleIcon');
  icon.innerHTML=allExpanded
    ?'<line x1="5" y1="12" x2="19" y2="12"/>'
    :'<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>';
}

/* 11. 투자자 후기 캐러셀 */
const testimonials=[
  {q:'SpiderBOT 덕분에 매달 안정적인 수익을 받고 있어요. 자동으로 정산되니 신경 쓸 일이 없어서 너무 편합니다.',name:'김민준',role:'직장인 투자자 · 골드 플랜',init:'김'},
  {q:'처음엔 반신반의했는데 3개월 운용 후 수익이 실제로 들어오는 걸 보고 놀랐어요. 지금은 레거시 플랜으로 올렸습니다.',name:'이서연',role:'프리랜서 디자이너 · 레거시 플랜',init:'이'},
  {q:'수익 계산기로 예상 수익을 미리 확인할 수 있는 게 정말 좋아요. 투명하게 운영된다는 신뢰감이 생겼습니다.',name:'박도현',role:'소상공인 · 실버 플랜',init:'박'},
  {q:'매일 오전 10시에 알림이 오면서 수익이 들어올 때마다 기분이 너무 좋아요. 플랫폼이 안정적이에요.',name:'최지아',role:'주부 투자자 · 브론즈 플랜',init:'최'},
  {q:'은퇴 후 안정적인 수익원을 찾다가 SpiderBOT을 알게 됐어요. 다이아몬드 플랜으로 노후 준비를 하고 있습니다.',name:'정유진',role:'은퇴자 · 다이아몬드 플랜',init:'정'},
  {q:'대학교 재학 중인데 용돈 관리 겸 투자로 시작했어요. 스타터 플랜으로 소액부터 시작했고 지금은 실버로 올렸어요.',name:'한지호',role:'대학생 · 실버 플랜',init:'한'},
];
const tt=document.getElementById('testiTrack');
[...testimonials,...testimonials].forEach(t=>{
  const el=document.createElement('div');
  el.className='testi-card';
  el.innerHTML=`<div class="testi-stars">${[...Array(5)].map(()=>'<svg viewBox="0 0 24 24"><polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"/></svg>').join('')}</div><p class="testi-quote">"${t.q}"</p><div class="testi-author"><div class="testi-avatar">${t.init}</div><div><div class="testi-name">${t.name}</div><div class="testi-role">${t.role}</div></div></div>`;
  tt.appendChild(el);
});

let testiPaused=false;
function toggleTestimonials(){
  testiPaused=!testiPaused;
  tt.style.animationPlayState=testiPaused?'paused':'running';
  const icon=document.getElementById('testiIcon');
  const label=document.getElementById('testiLabel');
  const btn=document.getElementById('testiToggle');
  if(testiPaused){
    icon.innerHTML='<polygon points="6,4 20,12 6,20"/>';
    label.textContent='재생';
    btn.setAttribute('aria-label','후기 재생');
  } else {
    icon.innerHTML='<rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/>';
    label.textContent='일시 정지';
    btn.setAttribute('aria-label','후기 일시 정지');
  }
}

document.getElementById('testiToggle').addEventListener('mouseenter',function(){
  this.style.borderColor='var(--sky)';
  this.style.color='var(--sky)';
});
document.getElementById('testiToggle').addEventListener('mouseleave',function(){
  this.style.borderColor='var(--border2)';
  this.style.color='var(--text2)';
});

/* 12. 스무스 스크롤 */
document.querySelectorAll('a[href^="#"]').forEach(a=>{
  a.addEventListener('click',e=>{
    const href=a.getAttribute('href');
    if(href==='#')return;
    e.preventDefault();
    const target=document.querySelector(href);
    if(target)target.scrollIntoView({behavior:'smooth'});
  });
});

/* 13. 실크 리빌 애니메이션 */
const revealObs=new IntersectionObserver((entries)=>{
  entries.forEach(e=>{
    if(e.isIntersecting){
      e.target.classList.add('visible');
      revealObs.unobserve(e.target);
    }
  });
},{threshold:0.12});
document.querySelectorAll('.silk-reveal,.silk-reveal-left,.silk-reveal-right').forEach((el,i)=>{
  el.style.animationDelay=(i%4)*0.08+'s';
  revealObs.observe(el);
});

const statBlocks=document.querySelectorAll('.stat-block');
statBlocks.forEach((el,i)=>{
  el.style.opacity='0';
  el.style.transform='translateY(20px)';
  el.style.transition=`opacity .8s var(--silk) ${i*0.1}s, transform .8s var(--silk) ${i*0.1}s, border-color .6s var(--silk), box-shadow .6s var(--silk)`;
});
const statObs2=new IntersectionObserver((entries)=>{
  entries.forEach(e=>{
    if(e.isIntersecting){
      e.target.style.opacity='1';
      e.target.style.transform='translateY(0)';
      statObs2.unobserve(e.target);
    }
  });
},{threshold:0.2});
statBlocks.forEach(el=>statObs2.observe(el));

const sectionHeaders=document.querySelectorAll('.section-title,.section-tag,.section-sub');
sectionHeaders.forEach(el=>{
  el.style.opacity='0';
  el.style.transform='translateY(16px)';
  el.style.transition='opacity .8s var(--silk), transform .8s var(--silk)';
});
const headerObs=new IntersectionObserver((entries)=>{
  entries.forEach(e=>{
    if(e.isIntersecting){
      e.target.style.opacity='1';
      e.target.style.transform='translateY(0)';
      headerObs.unobserve(e.target);
    }
  });
},{threshold:0.3});
sectionHeaders.forEach(el=>headerObs.observe(el));

/* 14. 폰 3D 틸트 */
const phoneFrame=document.getElementById('phoneFrame');
if(phoneFrame){
  let targetX=0,targetY=0,currentX=0,currentY=0,rafId=null;
  const MAX_TILT=16;
  function animate(){
    currentX+=(targetX-currentX)*.06;
    currentY+=(targetY-currentY)*.06;
    phoneFrame.style.transform=`rotateX(${currentY}deg) rotateY(${currentX}deg) translateZ(0)`;
    if(Math.abs(targetX-currentX)>.02||Math.abs(targetY-currentY)>.02){
      rafId=requestAnimationFrame(animate);
    } else {
      rafId=null;
    }
  }
  function kick(){if(!rafId)rafId=requestAnimationFrame(animate);}
  window.addEventListener('mousemove',e=>{
    targetX=(e.clientX/window.innerWidth-.5)*MAX_TILT*4;
    targetY=-(e.clientY/window.innerHeight-.5)*MAX_TILT*2;
    kick();
  });
  window.addEventListener('mouseleave',()=>{targetX=0;targetY=0;kick();});
}
