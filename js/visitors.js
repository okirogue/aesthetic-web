/* ================= 방한 외국인 × 피부과 소비 (visitors.json · visitors_insights.json) ================= */
let visitorsInited=false, visData=null, visIns=null, visInsMonth=null, visCharts={};
let visShareSel='recent6';   // 'recent6' | 'ytd' | 'YYYYMM'
const VIS_NAT_COLORS={"중국":"#d9536f","미국":"#4a90d9","일본":"#8f68c9","대만":"#e0a13c","홍콩":"#2fa6a6","기타":"#9aa4af"};
const VIS_CONT_COLORS={"아시아":"#4e9d46","아메리카":"#4a90d9","유럽":"#8f68c9","오세아니아":"#e0a13c","기타":"#9aa4af"};
const _vLab=ym=>`${ym.slice(2,4)}.${ym.slice(4)}`;
const _vChart=(id,cfg)=>{const ctx=document.getElementById(id);if(visCharts[id])visCharts[id].destroy();visCharts[id]=new Chart(ctx,cfg);};
const _vLegend={labels:{color:'#67707b',font:{size:11},boxWidth:18}};
function _vYoY(yms,vals,i){const prev=yms.indexOf((+yms[i].slice(0,4)-1)+yms[i].slice(4));return prev<0?null:(vals[i]/vals[prev]-1)*100;}
async function loadVisitors(){
  try{const r=await fetch('visitors.json',{cache:'no-store'});if(r.ok)visData=await r.json();}catch(e){}
  try{const r=await fetch('visitors_insights.json',{cache:'no-store'});if(r.ok)visIns=await r.json();}catch(e){}
  if(!visData){document.getElementById('vis-cards').innerHTML='<div class="na-msg">visitors.json이 아직 없습니다 — ir-bot 수집 대기</div>';return;}
  renderVisCards();renderVisMed();renderVisNat();renderVisShare();renderVisArr();renderVisCont();renderVisInsights();
  const note=document.getElementById('vis-note');
  if(note&&visData.updated)note.textContent=`데이터랩(신한카드·한국관광통계) · ${visData.updated} 수집 · 매월 11일 갱신`;
}
function renderVisCards(){
  const m=visData.med,a=visData.arr;
  const i=m.ym.length-1,j=a.ym.length-1;
  const yA=_vYoY(a.ym,a.n,j),yT=_vYoY(m.ym,m.tot,i),yD=_vYoY(m.ym,m.derm,i);
  const rate=m.derm[i]/m.tot[i]*100, rate0=m.derm[0]/m.tot[0]*100;
  const f=v=>v==null?'':`<span class="${v>=0?'up':'down'}">${v>=0?'▲':'▼'} ${Math.abs(v).toFixed(1)}%</span> YoY`;
  document.getElementById('vis-cards').innerHTML=
    `<div class="card"><div class="k">방한 외국인 · ${_vLab(a.ym[j])}</div><div class="v">${(a.n[j]/1e4).toFixed(1)}<span style="font-size:14px;font-weight:600">만 명</span></div><div class="s">${f(yA)}</div></div>`+
    `<div class="card"><div class="k">외국인 의료소비 · ${_vLab(m.ym[i])}</div><div class="v">${Math.round(m.tot[i]/100).toLocaleString()}<span style="font-size:14px;font-weight:600">억 원</span></div><div class="s">${f(yT)}</div></div>`+
    `<div class="card"><div class="k">피부과 소비액 · ${_vLab(m.ym[i])}</div><div class="v lime">${Math.round(m.derm[i]/100).toLocaleString()}<span style="font-size:14px;font-weight:600">억 원</span></div><div class="s">${f(yD)}</div></div>`+
    `<div class="card"><div class="k">의료소비 중 피부과 비중</div><div class="v">${rate.toFixed(1)}<span style="font-size:14px;font-weight:600">%</span></div><div class="s">${_vLab(m.ym[0])} ${rate0.toFixed(1)}% → 상승 추세</div></div>`;
}
function renderVisMed(){
  const m=visData.med,labels=m.ym.map(_vLab);
  _vChart('vis-med-chart',{type:'line',data:{labels,datasets:[
    {label:'의료소비 전체',data:m.tot.map(v=>Math.round(v/100)),borderColor:'#4a90d9',borderWidth:2.2,backgroundColor:'transparent',pointRadius:0,tension:.15},
    {label:'피부과',data:m.derm.map(v=>Math.round(v/100)),borderColor:'#e07b28',borderWidth:2.2,backgroundColor:'rgba(224,123,40,.08)',fill:true,pointRadius:0,tension:.15}
  ]},options:{responsive:true,maintainAspectRatio:false,interaction:{mode:'index',intersect:false},plugins:{legend:_vLegend},scales:{x:{ticks:{color:'#9aa4af',maxTicksLimit:14},grid:{display:false}},y:{ticks:{color:'#9aa4af',callback:v=>v.toLocaleString()+'억'},grid:{color:'#eef1f3'}}}}});
}
function _visNatSeries(){
  const g=visData.med;const nats=(visData.medNat||[]).filter(c=>c.ym&&c.ym.length);
  const top=['중국','미국','일본','대만','홍콩'].map(nm=>nats.find(c=>c.nm===nm)).filter(Boolean);
  if(!top.length)return null;
  const yms=top[0].ym;
  const other=yms.map((y,i)=>{const gi=g.ym.indexOf(y);const gv=gi<0?0:g.derm[gi];return Math.max(0,gv-top.reduce((s,c)=>s+(c.amt[i]||0),0));});
  return {yms,top,other};
}
function renderVisNat(){
  const s=_visNatSeries();if(!s)return;
  const ds=[...s.top.map(c=>({label:c.nm,data:c.amt.map(v=>Math.round(v/100)),backgroundColor:VIS_NAT_COLORS[c.nm],borderRadius:2})),
    {label:'기타',data:s.other.map(v=>Math.round(v/100)),backgroundColor:VIS_NAT_COLORS['기타'],borderRadius:2}];
  _vChart('vis-nat-chart',{type:'bar',data:{labels:s.yms.map(_vLab),datasets:ds},options:{responsive:true,maintainAspectRatio:false,interaction:{mode:'index',intersect:false},plugins:{legend:_vLegend},scales:{x:{stacked:true,ticks:{color:'#9aa4af'},grid:{display:false}},y:{stacked:true,ticks:{color:'#9aa4af',callback:v=>v.toLocaleString()+'억'},grid:{color:'#eef1f3'}}}}});
}
function setVisShare(v){visShareSel=v;renderVisShare();}
function renderVisShare(){
  const s=_visNatSeries();if(!s)return;
  const yms=s.yms, last=yms[yms.length-1], y=last.slice(0,4);
  // 칩: 최근 6개월 · 연 누계 · 최근 12개월(월별)
  const chips=document.getElementById('vis-share-chips');
  if(chips){
    const ms=yms.slice(-12).reverse();
    const c=(v,l)=>`<span class="filter-chip ${visShareSel===v?'on':''}" onclick="setVisShare('${v}')">${l}</span>`;
    chips.innerHTML=c('recent6','최근 6개월')+c('ytd',`${y}년 누계`)+ms.map(m=>c(m,_vLab(m))).join('');
  }
  // 선택 구간의 인덱스 집합
  let idx, ttl;
  if(visShareSel==='ytd'){
    idx=yms.map((m,i)=>m.slice(0,4)===y?i:-1).filter(i=>i>=0);
    ttl=`${y}년 누계(~${_vLab(last)})`;
  }else if(yms.includes(visShareSel)){
    idx=[yms.indexOf(visShareSel)];
    ttl=`${_vLab(visShareSel)} 월간`;
  }else{
    const n=Math.min(6,yms.length);
    idx=yms.map((m,i)=>i).slice(-n);
    ttl=`최근 6개월(${_vLab(yms[yms.length-n])}~${_vLab(last)})`;
  }
  const sum=arr=>idx.reduce((a,i)=>a+(arr[i]||0),0);
  const rows=[...s.top.map(c=>({nm:c.nm,v:sum(c.amt)})),{nm:'기타',v:sum(s.other)}]
    .filter(r=>r.v>0).sort((a,b)=>b.v-a.v);
  const tot=rows.reduce((a,r)=>a+r.v,0)||1;
  document.getElementById('vis-share-ttl').textContent=`국가별 피부과 소비 비중 · ${ttl} 합계 ${Math.round(tot/100).toLocaleString()}억 원`;
  _vChart('vis-share-chart',{type:'bar',data:{labels:rows.map(r=>r.nm),datasets:[{data:rows.map(r=>Math.round(r.v/100)),backgroundColor:rows.map(r=>VIS_NAT_COLORS[r.nm]),borderRadius:3}]},options:{indexAxis:'y',responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false},tooltip:{callbacks:{label:c=>`${c.raw.toLocaleString()}억 원 (${(c.raw/(tot/100)*100).toFixed(1)}%)`}}},scales:{x:{ticks:{color:'#9aa4af',callback:v=>v.toLocaleString()+'억'},grid:{color:'#eef1f3'}},y:{ticks:{color:'#67707b',font:{size:12}},grid:{display:false}}}}});
}
function renderVisArr(){
  const a=visData.arr;
  _vChart('vis-arr-chart',{type:'line',data:{labels:a.ym.map(_vLab),datasets:[{label:'방한 외국인(만 명)',data:a.n.map(v=>+(v/1e4).toFixed(1)),borderColor:'#4e9d46',borderWidth:2.2,backgroundColor:'rgba(78,157,70,.08)',fill:true,pointRadius:0,tension:.15}]},options:{responsive:true,maintainAspectRatio:false,interaction:{mode:'index',intersect:false},plugins:{legend:_vLegend},scales:{x:{ticks:{color:'#9aa4af',maxTicksLimit:14},grid:{display:false}},y:{ticks:{color:'#9aa4af',callback:v=>v+'만'},grid:{color:'#eef1f3'}}}}});
}
function renderVisCont(){
  const c=visData.cont;if(!c)return;
  const yms=c.yms;
  const named=['아시아','아메리카','유럽','오세아니아'];
  const ds=named.map(nm=>({label:nm,data:yms.map(y=>+((c.series[nm]&&c.series[nm][y]||0)/1e4).toFixed(1)),backgroundColor:VIS_CONT_COLORS[nm],borderRadius:2}));
  const etc=yms.map(y=>{let s=0;Object.keys(c.series).forEach(k=>{if(!named.includes(k))s+=c.series[k][y]||0;});return +(s/1e4).toFixed(1);});
  ds.push({label:'기타',data:etc,backgroundColor:VIS_CONT_COLORS['기타'],borderRadius:2});
  _vChart('vis-cont-chart',{type:'bar',data:{labels:yms.map(_vLab),datasets:ds},options:{responsive:true,maintainAspectRatio:false,interaction:{mode:'index',intersect:false},plugins:{legend:_vLegend},scales:{x:{stacked:true,ticks:{color:'#9aa4af'},grid:{display:false}},y:{stacked:true,ticks:{color:'#9aa4af',callback:v=>v+'만'},grid:{color:'#eef1f3'}}}}});
}
function renderVisInsights(){
  const box=document.getElementById('vis-insights'),chips=document.getElementById('vis-ins-months');
  if(!visIns||!visIns.months||!Object.keys(visIns.months).length){box.innerHTML='<div class="na-msg">아직 월간 분석이 없습니다 — 매월 12일 자동 작성</div>';return;}
  const months=Object.keys(visIns.months).sort().reverse();
  if(!visInsMonth||!visIns.months[visInsMonth])visInsMonth=visIns.latest||months[0];
  chips.innerHTML=months.map(mo=>`<span class="filter-chip ${mo===visInsMonth?'on':''}" onclick="setVisInsMonth('${mo}')">${mo.replace('-','.')}</span>`).join('');
  const d=visIns.months[visInsMonth];if(!d){box.innerHTML='';return;}
  const note=document.getElementById('vis-ins-note');
  if(note)note.textContent=`데이터 기준 ${visInsMonth.replace('-','.')} · ${d.updated||''} 작성`;
  const sec=(t,b)=>b?`<div class="rev" style="margin-bottom:10px"><div class="top"><span style="font-size:13px;font-weight:800;color:var(--green-d)">${t}</span></div><div style="font-size:13px">${b}</div></div>`:'';
  box.innerHTML=(d.summary?`<div class="rev" style="border-left:3px solid var(--lime);background:var(--lime-bg);margin-bottom:10px"><div style="font-size:13px">${d.summary}</div></div>`:'')+
    sec('피부과 소비',d.med)+sec('국가별',d.nat)+sec('방한 추이',d.arr);
}
function setVisInsMonth(m){visInsMonth=m;renderVisInsights();}

