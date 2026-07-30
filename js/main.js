/* 탭 */
document.querySelectorAll('.tab').forEach(t=>{
  t.onclick=()=>{
    document.querySelectorAll('.tab').forEach(x=>x.classList.remove('active'));
    document.querySelectorAll('.view').forEach(x=>x.classList.remove('active'));
    t.classList.add('active');
    document.getElementById('view-'+t.dataset.view).classList.add('active');
    if(t.dataset.view==='stock'&&!stockInited){stockInited=true;renderStockCompanies();renderStockCharts();}
    if(t.dataset.view==='buzz')renderBuzzTrends();
    if(t.dataset.view==='trend')loadEU();
    if(t.dataset.view==='export'&&!expInited){expInited=true;loadExports();}
    if(t.dataset.view==='visitors'&&!visitorsInited){visitorsInited=true;loadVisitors();}
    if(t.dataset.view==='reports'&&!repInited){repInited=true;loadReports();}
  };
});
// 공시 이벤트 (봇이 events.json으로 누적 → 캘린더 연동)
async function loadEventsJson(){
  try{
    const r=await fetch('events.json',{cache:'no-store'});
    if(!r.ok) return;
    const j=await r.json();
    (j.events||[]).forEach(e=>{
      if(!e.co||!e.date||!e.title) return;
      const list=(companyEvents[e.co]=companyEvents[e.co]||[]);
      if(!list.some(x=>x.date===e.date&&x.title===e.title))
        list.push({date:e.date,type:e.type||'filing',title:e.title,url:e.url||null});
    });
    // 중복 정리: 같은 공시 원문(URL)은 최신 항목(백필 최신본) 하나만 유지
    Object.keys(companyEvents).forEach(co=>{
      const evs=companyEvents[co], seen={}, keep=[];
      for(let i=evs.length-1;i>=0;i--){
        const key=evs[i].url || ('t:'+evs[i].title+'|'+evs[i].date);
        if(seen[key]) continue;
        seen[key]=1; keep.unshift(evs[i]);
      }
      companyEvents[co]=keep;
    });
    // IR 월 넘김: [MM/DD~MM/DD] 행사가 이벤트 월을 넘어가면 다음달에도 표시
    Object.keys(companyEvents).forEach(co=>{
      const extra=[];
      companyEvents[co].forEach(e=>{
        const m=e.title.match(/[\[\(](\d{2})\/(\d{2})\s*~\s*(\d{2})\/(\d{2})[\]\)]/);
        if(!m||!e.date) return;
        const y=+e.date.slice(0,4), evM=+e.date.slice(5,7);
        const sm=+m[1], em=+m[3];
        if(em!==evM){
          const ey = em<evM ? y+1 : y;                       // 12월→1월 보정
          const dd = (sm===em) ? m[2] : '01';                // 다음달에 시작하면 시작일, 걸치면 1일
          const nd = `${ey}-${String(em).padStart(2,'0')}-${dd}`;
          if(!companyEvents[co].some(x=>x.date===nd&&x.title===e.title)&&!extra.some(x=>x.date===nd&&x.title===e.title))
            extra.push({...e,date:nd});
        }
      });
      companyEvents[co].push(...extra);
    });
    renderCalendar(); renderUpcoming();
  }catch(e){}
}

/* 섹션 접기/펼치기 — .sec-h[data-clps] 제목 클릭 시 대상 토글 */
function makeCollapsible(){
  document.querySelectorAll('.sec-h[data-clps]').forEach(h=>{
    if(h.dataset.bound) return; h.dataset.bound='1';
    const tgt=document.getElementById(h.dataset.clps); if(!tgt) return;
    const l=h.querySelector('.l');
    const caret=document.createElement('span'); caret.textContent='▾'; caret.style.cssText='color:var(--dim);font-size:13px';
    l.appendChild(caret); l.style.cursor='pointer'; l.title='클릭하여 접기/펼치기';
    l.onclick=()=>{
      const open=tgt.style.display!=='none';
      tgt.style.display=open?'none':'';
      caret.textContent=open?'▸':'▾';
      if(!open) window.dispatchEvent(new Event('resize'));   // 차트 리사이즈 복구
    };
  });
}

// init
makeCollapsible();
renderNews();
renderWatchlist();renderCalendar();renderUpcoming();
loadBuzzJson();
loadInsights();

// 실데이터 로드 + 5분마다 자동 새로고침 (열어둔 채로 최신 뉴스 반영)
loadNewsJson();
setInterval(loadNewsJson, 5*60*1000);
renderNewsDates();   // "오늘" 칩 기본 표시
loadNewsIndex();
loadStockJson();
loadEventsJson();
