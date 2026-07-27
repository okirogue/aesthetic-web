let buzzChartObjs={}, buzzData=null;
const BUZZ_COLORS=['#e0a13c','#4a90d9','#57c00a','#d9536f','#8f68c9','#2fa6a6','#c96f9f','#6b8e23'];
const axisOpt={x:{ticks:{color:'#9aa4af',maxTicksLimit:14,autoSkip:true},grid:{color:'#eef1f3'}},y:{ticks:{color:'#9aa4af'},grid:{color:'#eef1f3'}}};
async function loadBuzzJson(){
  try{
    const r=await fetch('buzz.json',{cache:'no-store'});
    if(!r.ok) return;
    buzzData=await r.json();
    try{ // 검색지수 최신성 표시: 최신 주(데이터 기간)와 갱신 시각, 8일 이상 지연 시 경고
      const el=document.getElementById('buzz-idx-note');
      const g=Object.values(buzzData.groups||{})[0];
      if(el&&g&&g.labels&&g.labels.length){
        const l=g.labels[g.labels.length-1];
        const st=new Date('20'+l+'T00:00:00Z'), en=new Date(st); en.setUTCDate(st.getUTCDate()+6);
        const f=d=>`${d.getUTCMonth()+1}/${d.getUTCDate()}`;
        const stale=(Date.now()-en.getTime())/864e5>8;
        el.textContent=`주단위(월~일) · 최신 주 ${f(st)}~${f(en)}${buzzData.updated?` · ${buzzData.updated} 갱신`:''}${stale?' · ⚠ 갱신 지연 — 봇 확인 필요':''}`;
      }
    }catch(e){}
    if(document.getElementById('view-buzz').classList.contains('active')) renderBuzzTrends();
  }catch(e){}
}
let buzzWeeksN=52, buzzRangeDates=null;
function _sliceBuzz(group){
  if(!group||!group.labels) return null;
  let idx;
  if(buzzRangeDates){
    idx=group.labels.map((l,i)=>(l>=buzzRangeDates[0]&&l<=buzzRangeDates[1])?i:-1).filter(i=>i>=0);
  }else{
    idx=group.labels.map((_,i)=>i); idx=idx.slice(Math.max(0,idx.length-buzzWeeksN));
  }
  const labels=idx.map(i=>group.labels[i]);
  const series={}; Object.keys(group.series).forEach(k=>series[k]=idx.map(i=>group.series[k][i]));
  return {labels,series};
}
function _wkEnd(l){ // '26-07-20'(주 시작 월요일) -> '26-07-26'(주 종료 일요일) 표시용
  try{ const d=new Date('20'+l+'T00:00:00Z'); d.setUTCDate(d.getUTCDate()+6);
    return `${String(d.getUTCFullYear()).slice(2)}-${String(d.getUTCMonth()+1).padStart(2,'0')}-${String(d.getUTCDate()).padStart(2,'0')}`;
  }catch(e){ return l; } }
function _buzzChart(canvasId,group,chartRef){
  const ctx=document.getElementById(canvasId); if(!ctx||!group) return chartRef;
  const ds=Object.keys(group.series).map((k,i)=>({label:k,data:group.series[k],borderColor:BUZZ_COLORS[i%BUZZ_COLORS.length],backgroundColor:'transparent',tension:.3,borderWidth:1.8,pointRadius:0}));
  if(chartRef)chartRef.destroy();
  return new Chart(ctx,{type:'line',data:{labels:group.labels.map(_wkEnd),datasets:ds},options:{responsive:true,maintainAspectRatio:false,interaction:{mode:'index',intersect:false},plugins:{legend:{labels:{color:'#67707b',font:{size:11},boxWidth:18}}},scales:{x:axisOpt.x,y:{...axisOpt.y,min:0,max:100}}}});
}
function renderBuzzTrends(){
  const groups=buzzData&&buzzData.groups?buzzData.groups:{};
  const cont=document.getElementById('buzz-charts'); if(!cont) return;
  const keys=Object.keys(groups);
  if(!keys.length){ cont.innerHTML='<div class="na-msg">데이터 수집 전 — 봇 배포 후 자동 생성됩니다</div>'; return; }
  const na=cont.querySelector('.na-msg'); if(na) na.remove();
  keys.forEach(k=>{
    if(!document.getElementById('bc-'+k)){
      const g=groups[k];
      const sec=document.createElement('div');
      sec.innerHTML=`<div class="sec-h"><div class="l"><h2>검색지수 · ${g.title}</h2></div><span class="note">${Object.keys(g.series||{}).join('·')} · DATALAB 주단위</span></div><div class="chart-box"><canvas id="bc-${k}"></canvas></div>`;
      cont.appendChild(sec);
    }
  });
  keys.forEach(k=>{ buzzChartObjs[k]=_buzzChart('bc-'+k,_sliceBuzz(groups[k]),buzzChartObjs[k]); });
}
function applyBuzzRange(){
  const f=document.getElementById('buzz-from').value, t=document.getElementById('buzz-to').value;
  if(f&&t&&f<=t){ buzzRangeDates=[f.slice(2),t.slice(2)]; document.querySelectorAll('#period-buzz button').forEach(x=>x.classList.remove('active')); renderBuzzTrends(); }
}
document.querySelectorAll('#period-buzz button').forEach(b=>b.onclick=()=>{document.querySelectorAll('#period-buzz button').forEach(x=>x.classList.remove('active'));b.classList.add('active');buzzWeeksN=+b.dataset.w;buzzRangeDates=null;renderBuzzTrends();});
/* 제품별 정성 분석 (buzz_insights.json · 주차별 누적 · Claude 주간 요약) */
let insightDoc=null, insightWeek=null;
async function loadInsights(){
  try{
    const r=await fetch('buzz_insights.json',{cache:'no-store'});
    if(!r.ok) return;
    insightDoc=await r.json();
    if(insightDoc.weeks){
      insightWeek=insightDoc.latest||Object.keys(insightDoc.weeks).sort().pop();
      renderInsightWeeks(); renderInsights(insightDoc.weeks[insightWeek]);
    }else{ renderInsights(insightDoc); }   // 구버전(단일) 호환
  }catch(e){}
}
function isoWeekRange(w){ // '2026-W30' -> '7/20~7/26' (월~일)
  const m=/^(\d{4})-W(\d{1,2})$/.exec(w); if(!m) return w;
  const y=+m[1], wk=+m[2];
  const jan4=new Date(Date.UTC(y,0,4));
  const dow=jan4.getUTCDay()||7;
  const mon=new Date(jan4); mon.setUTCDate(jan4.getUTCDate()-dow+1+(wk-1)*7);
  const sun=new Date(mon); sun.setUTCDate(mon.getUTCDate()+6);
  const f=d=>`${d.getUTCMonth()+1}/${d.getUTCDate()}`;
  return `${f(mon)}~${f(sun)}`;
}
function renderInsightWeeks(){
  const el=document.getElementById('insight-weeks'); if(!el||!insightDoc||!insightDoc.weeks) return;
  const weeks=Object.keys(insightDoc.weeks).sort().reverse();
  el.innerHTML=weeks.map((w,i)=>{
    const range=isoWeekRange(w);
    const label=i===0?`이번주(${range})`:i===1?`지난주(${range})`:range;
    return `<span class="filter-chip ${w===insightWeek?'on':''}" onclick="setInsightWeek('${w}')">${label}</span>`;
  }).join('');
}
function setInsightWeek(w){ insightWeek=w; renderInsightWeeks(); renderInsights(insightDoc.weeks[w]); }
function renderInsights(d){
  const note=document.getElementById('insight-note');
  if(note&&d.updated) note.textContent=`네이버 카페·블로그 · 데이터 기간 ${isoWeekRange(insightWeek)}(월~일) · ${d.updated} 요약`;
  const sm=document.getElementById('insight-summary');
  if(sm&&d.summary){
    const isLatest=insightDoc&&insightDoc.weeks&&insightWeek===(insightDoc.latest||Object.keys(insightDoc.weeks).sort().pop());
    const lbl=(isLatest?'이번주':'주간')+(insightWeek&&insightWeek.includes('-W')?`(${isoWeekRange(insightWeek)})`:'')+' 요약'+(d.estimated?' · 검색지수 기반 소급':'');
    sm.innerHTML=`<div class="rev" style="border-left:3px solid var(--lime);background:var(--lime-bg)"><div class="top"><span class="src" style="color:var(--green-d);font-weight:700">${lbl}</span></div><div class="body">${d.summary}</div></div>`;
  }
  const el=document.getElementById('insights');
  const prods=(d.products||[]).slice().sort((a,b)=>(b.count||b.idx||0)-(a.count||a.idx||0));  // 리뷰 많은 순
  if(!prods.length) return;
  el.innerHTML=prods.map(p=>{
    if(p.idx!==undefined&&p.idx!==null&&!(p.count>0)){  // 검색지수 기반 소급 주간
      const wc=p.wow>=0?'up':'down', ws=p.wow>=0?'▲':'▼';
      const notes=(p.notes||[]).map(t=>`<div style="font-size:13px;margin:3px 0"><span style="color:var(--dim);font-weight:700">·</span> ${t}</div>`).join('');
      return `<div class="rev" style="margin-bottom:10px"><div class="top">
        <span style="font-size:14px;font-weight:800">${p.name} <span style="font-size:11px;color:var(--dim);font-weight:400">${p.brand||''}</span></span>
        <span class="src">검색지수 ${p.idx}${p.wow!=null?` · WoW <span class="${wc}" style="font-weight:700">${ws} ${Math.abs(p.wow)}%</span>`:''}</span></div>${notes}</div>`;
    }
    if(!(p.count>0)) return `<div class="rev" style="margin-bottom:8px;opacity:.7"><div class="top"><span style="font-size:14px;font-weight:700">${p.name} <span style="font-size:11px;color:var(--dim);font-weight:400">${p.brand||''}</span></span><span class="src">${p.obs?`유효 0건${p.sample?` (${p.sample})`:''}`:'수집 대기'}</span></div><div style="font-size:12px;color:var(--dim)">${p.obs||'다음 /buzzraw 수집 후 분석됩니다'}</div></div>`;
    const pos=(p.pos||[]).map(t=>`<div style="font-size:13px;margin:3px 0"><span style="color:var(--up);font-weight:700">▲</span> ${t}</div>`).join('');
    const neg=(p.neg||[]).map(t=>`<div style="font-size:13px;margin:3px 0"><span style="color:var(--down);font-weight:700">▼</span> ${t}</div>`).join('');
    const keys=(p.keys||[]).map(k=>`<span class="filter-chip" style="cursor:default;padding:2px 9px;font-size:11px">${k}</span>`).join(' ');
    return `<div class="rev" style="margin-bottom:10px"><div class="top">
      <span style="font-size:14px;font-weight:800">${p.name} <span style="font-size:11px;color:var(--dim);font-weight:400">${p.brand||''}</span></span>
      <span class="src">~${(p.count||0).toLocaleString()}건${p.sample?` (샘플 ${p.sample})`:''}</span></div>
      ${pos}${neg}
      <div style="margin-top:7px;display:flex;gap:5px;flex-wrap:wrap;align-items:center"><span style="font-size:10px;color:var(--green-d);font-weight:800">KEY</span> ${keys}</div>
      ${p.obs?`<div style="margin-top:6px;font-size:12px;color:var(--dim)">※ ${p.obs}</div>`:''}</div>`;
  }).join('');
}

