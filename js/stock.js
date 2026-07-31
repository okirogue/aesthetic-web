/* ================= 주가 추이 ================= */
let stockCompanies = ["파마리서치","휴젤","클래시스","엘앤씨바이오","한스바이오메드"];
let activeStock = stockCompanies[0];
let stockDays = 252;                 // 12개월
let priceChart=null, flowChart=null, aggChart=null;
let stockData = null;                 // stock.json의 companies (실데이터)
let stockKosdaq = null;               // stock.json의 kosdaq {dates, close}
let stockNowData = null;              // stock_now.json — 장중 10분 갱신 현재가 (봇 커밋)
let stockInited = false;
const _stockCache = {};
function getStock(name){ return (stockData && stockData[name]) ? stockData[name] : null; }
async function loadStockJson(){
  try{
    const r=await fetch('stock.json',{cache:'no-store'});
    if(!r.ok) return;
    const d=await r.json();
    stockData=d.companies||{};
    stockKosdaq=d.kosdaq||null;
    if(stockInited){ renderStockCompanies(); renderStockCharts(); }
  }catch(e){ /* stock.json 없음 → N/A */ }
  loadStockNow();
}
async function loadStockNow(){ // 장중 현재가 (stock_now.json, 봇이 10분마다 커밋) — 새로고침 시마다 최신값
  try{
    const r=await fetch('stock_now.json',{cache:'no-store'});
    if(!r.ok) return;
    stockNowData=await r.json();
    if(stockInited) renderStockQuote();
  }catch(e){ /* 파일 없음 → 종가 기준 유지 */ }
}
function _cumsum(a){ let s=0; return a.map(v=>s+=v); }
function _naToggle(cid,nid,show){ const c=document.getElementById(cid),n=document.getElementById(nid); if(c)c.style.display=show?'none':''; if(n)n.style.display=show?'':'none'; }
const _lineAxes={x:{ticks:{color:'#9aa4af',maxTicksLimit:12,autoSkip:true},grid:{color:'#eef1f3'}}};

function _rng(seed){ let s=seed%2147483647; if(s<=0)s+=2147483646; return ()=>{ s=(s*16807)%2147483647; return (s-1)/2147483646; }; }
function genStock(name){
  if(_stockCache[name]) return _stockCache[name];
  const seed=[...name].reduce((a,c)=>a+c.charCodeAt(0),0)*7+13;
  const rnd=_rng(seed);
  const N=252;
  // 영업일 날짜 (오늘부터 역산)
  const dts=[]; let d=new Date(2026,6,23);
  while(dts.length<N){ const w=d.getDay(); if(w!==0&&w!==6) dts.push(`${String(d.getFullYear()).slice(2)}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`); d=new Date(d.getTime()-86400000); }
  dts.reverse();
  const eps0=10000+rnd()*8000;
  const bands={10:[],15:[],20:[],25:[],30:[]};
  const price=[]; let p=eps0*20*(0.8+rnd()*0.5);
  const flow={inst:[],frgn:[],indv:[]}; let ci=0,cf=0,cp=0;
  const own=[]; let o=10+rnd()*6;
  for(let i=0;i<N;i++){
    const eps=eps0*(1+i/N*0.25);
    [10,15,20,25,30].forEach(m=>bands[m].push(Math.round(eps*m)));
    const fair=eps*(16+rnd()*8);
    p+=(fair-p)*0.015+(rnd()-0.5)*p*0.055; p=Math.max(p,eps*8);
    price.push(Math.round(p));
    ci+=(rnd()-0.5)*380; cf+=(rnd()-0.47)*420; cp+=(rnd()-0.53)*380;
    flow.inst.push(Math.round(ci)); flow.frgn.push(Math.round(cf)); flow.indv.push(Math.round(cp));
    o+=(rnd()-0.5)*0.6; o=Math.max(4,Math.min(23,o)); own.push(+o.toFixed(1));
  }
  return _stockCache[name]={dates:dts,price,bands,flow,own};
}
function _tail(arr,n){ return arr.slice(Math.max(0,arr.length-n)); }

function renderStockCompanies(){
  document.getElementById('stock-companies').innerHTML=stockCompanies.map(c=>{
    const on=c===activeStock;
    return `<span class="filter-chip ${on?'on':''}" onclick="setStockCompany('${c}')">${c}</span>`;
  }).join('');
}
function setStockCompany(c){ activeStock=c; renderStockCompanies(); renderStockCharts(); }

function renderPriceChart(){
  const s=getStock(activeStock);
  document.getElementById('price-title').textContent=`주가 흐름 추이 · ${activeStock||'-'}`;
  if(!s){ if(priceChart){priceChart.destroy();priceChart=null;} _naToggle('priceChart','priceNA',true); return; }
  _naToggle('priceChart','priceNA',false);
  const labels=_tail(s.dates,stockDays);
  const ds=[{label:'종가',data:_tail(s.price,stockDays),borderColor:'#4e9d46',borderWidth:2.2,backgroundColor:'rgba(78,157,70,.07)',fill:true,pointRadius:0,tension:.12}];
  const ctx=document.getElementById('priceChart');
  if(priceChart)priceChart.destroy();
  priceChart=new Chart(ctx,{type:'line',data:{labels,datasets:ds},options:{responsive:true,maintainAspectRatio:false,interaction:{mode:'index',intersect:false},plugins:{legend:{labels:{color:'#67707b',font:{size:11},boxWidth:18}}},scales:{x:_lineAxes.x,y:{ticks:{color:'#9aa4af',callback:v=>(v/1000)+'천'},grid:{color:'#eef1f3'}}}}});
}
// 에스테틱 5사 합산 시총 = Σ(일별 종가 × 상장주식수) / 1조
const AEST5=["파마리서치","휴젤","클래시스","엘앤씨바이오","한스바이오메드"];
function renderAggChart(){
  const comps=AEST5.map(getStock).filter(Boolean);
  if(!comps.length){ if(aggChart){aggChart.destroy();aggChart=null;} return; }
  const N=Math.min(...comps.map(c=>c.price.length));
  const dates=comps[0].dates.slice(comps[0].dates.length-N);
  const sum=new Array(N).fill(0);
  comps.forEach(c=>{ const off=c.price.length-N; for(let i=0;i<N;i++) sum[i]+=c.price[off+i]*c.shares/1e12; });
  const labels=_tail(dates,stockDays);
  const capData=_tail(sum,stockDays).map(v=>+v.toFixed(2));
  const datasets=[{label:'5사 합산 시총(조원)',data:capData,borderColor:'#4e9d46',borderWidth:2.2,backgroundColor:'rgba(78,157,70,.08)',fill:true,pointRadius:0,tension:.15,yAxisID:'y'}];
  const scales={x:_lineAxes.x, y:{position:'left',ticks:{color:'#9aa4af',callback:v=>v+'조'},grid:{color:'#eef1f3'}}};
  if(stockKosdaq && stockKosdaq.dates){
    const kmap={}; stockKosdaq.dates.forEach((d,i)=>kmap[d]=stockKosdaq.close[i]);
    const kData=labels.map(d=> d in kmap ? kmap[d] : null);
    datasets.push({label:'KOSDAQ(pt)',data:kData,borderColor:'#8f68c9',borderWidth:1.8,borderDash:[5,3],backgroundColor:'transparent',pointRadius:0,tension:.15,yAxisID:'y1',spanGaps:true});
    scales.y1={position:'right',ticks:{color:'#8f68c9'},grid:{drawOnChartArea:false},title:{display:true,text:'KOSDAQ(pt)',color:'#8f68c9',font:{size:10}}};
  }
  const ctx=document.getElementById('aggChart');
  if(aggChart)aggChart.destroy();
  aggChart=new Chart(ctx,{type:'line',data:{labels,datasets},options:{responsive:true,maintainAspectRatio:false,interaction:{mode:'index',intersect:false},plugins:{legend:{labels:{color:'#67707b',font:{size:11},boxWidth:18}}},scales}});
}
/* ---- 수급 기간 선택 (이번달 / 3·6·12개월 / 기간설정) ---- */
let flowMode='month';                  // 'month' | 63 | 126 | 252 | 'custom'
let flowCustom={from:null,to:null};    // 'YYYY-MM-DD'
function _flowRange(s){                // 선택 모드 → [시작idx, 끝idx] (끝 포함), 없으면 null
  const n=s.dates.length; if(!n) return null;
  if(flowMode==='month'){
    const pfx=s.dates[n-1].slice(0,5);                       // 최신 데이터의 'YY-MM'
    let i0=n-1; while(i0>0 && s.dates[i0-1].slice(0,5)===pfx) i0--;
    return [i0,n-1,'이번달(20'+pfx.replace('-','.')+')'];
  }
  if(flowMode==='custom'){
    const f=flowCustom.from, t=flowCustom.to;
    let i0=0, i1=n-1;
    if(f) i0=s.dates.findIndex(d=>('20'+d)>=f);
    if(i0<0) return null;
    if(t){ i1=-1; for(let i=n-1;i>=0;i--){ if(('20'+s.dates[i])<=t){ i1=i; break; } } }
    if(i1<0||i1<i0) return null;
    return [i0,i1,'20'+s.dates[i0]+' ~ 20'+s.dates[i1]];
  }
  const days=+flowMode||252;
  const i0=Math.max(0,n-days);
  return [i0,n-1,{63:'3개월',126:'6개월',252:'12개월'}[days]||days+'영업일'];
}
function _fmtSign(v){ const r=Math.round(v); return (r>0?'+':'')+r.toLocaleString(); }
function renderFlowChart(){
  const s=getStock(activeStock);
  const sumEl=document.getElementById('flow-sum');
  if(!s){ if(flowChart){flowChart.destroy();flowChart=null;} _naToggle('flowChart','flowNA',true); if(sumEl)sumEl.textContent=''; return; }
  const rng=_flowRange(s);
  if(!rng){ if(flowChart){flowChart.destroy();flowChart=null;} _naToggle('flowChart','flowNA',true); if(sumEl)sumEl.textContent='선택 기간 내 거래일 데이터가 없습니다'; return; }
  _naToggle('flowChart','flowNA',false);
  const [i0,i1,plabel]=rng;
  const labels=s.dates.slice(i0,i1+1);
  const cum={inst:_cumsum(s.flow.inst.slice(i0,i1+1)),frgn:_cumsum(s.flow.frgn.slice(i0,i1+1)),indv:_cumsum(s.flow.indv.slice(i0,i1+1))};
  if(sumEl){
    const w=(t,v,c)=>`<span style="margin-right:14px">${t} <b style="color:${c}">${_fmtSign(v)}</b></span>`;
    sumEl.innerHTML=`<span style="color:var(--dim);margin-right:14px">${plabel} 누적(억원)</span>`
      +w('기관',cum.inst[cum.inst.length-1]||0,'#4e9d46')
      +w('외국인',cum.frgn[cum.frgn.length-1]||0,'#4a90d9')
      +w('개인',cum.indv[cum.indv.length-1]||0,'#d9536f');
  }
  const ds=[
    {label:'기관',data:cum.inst,borderColor:'#4e9d46',borderWidth:2.2,backgroundColor:'transparent',pointRadius:0,tension:.2},
    {label:'외국인',data:cum.frgn,borderColor:'#4a90d9',borderWidth:2.2,backgroundColor:'transparent',pointRadius:0,tension:.2},
    {label:'개인',data:cum.indv,borderColor:'#d9536f',borderWidth:2.2,backgroundColor:'transparent',pointRadius:0,tension:.2},
  ];
  const ctx=document.getElementById('flowChart');
  if(flowChart)flowChart.destroy();
  flowChart=new Chart(ctx,{type:'line',data:{labels,datasets:ds},options:{responsive:true,maintainAspectRatio:false,interaction:{mode:'index',intersect:false},plugins:{legend:{labels:{color:'#67707b',font:{size:11},boxWidth:18}}},scales:{x:_lineAxes.x,y:{ticks:{color:'#9aa4af',callback:v=>v.toLocaleString()},grid:{color:'#eef1f3'},title:{display:true,text:'누적 순매수(억원)',color:'#9aa4af',font:{size:10}}}}}});
}
/* 현재가 카드 — stock.json 최신 종가 기준 (전일대비·52주 밴드·시총) */
function renderStockQuote(){
  const el=document.getElementById('stock-quote'); if(!el) return;
  const s=getStock(activeStock);
  if(!s||!s.price||s.price.length<2){ el.innerHTML=''; return; }
  const n=s.price.length;
  const nq=(stockNowData&&stockNowData.prices)?stockNowData.prices[activeStock]:null;   // 장중 현재가 우선
  const live=!!(nq&&nq.price>0);
  const cur=live?nq.price:s.price[n-1];
  const prev=live?(nq.price-(nq.change||0)):s.price[n-2];
  const d=cur-prev, pct=prev?(d/prev*100):0;
  const up=d>0, flat=d===0;
  const c=flat?'var(--sub)':up?'#d9534f':'#4a90d9';     // 국내 관례: 상승 빨강 · 하락 파랑
  const arrow=flat?'—':up?'▲':'▼';
  const yr=s.price.slice(-252), hi=Math.max(...yr,cur), lo=Math.min(...yr,cur);
  const cap=s.shares?((cur*s.shares)/1e12).toFixed(2)+'조원':'—';
  const date=live?`${stockNowData.updated} 현재 · 장중 10분 갱신`:'20'+(s.dates[n-1]||'')+' 종가 기준';
  const cell=(k,v)=>`<div style="min-width:118px"><div style="font-size:11px;color:var(--dim)">${k}</div><div style="font-size:14px;font-weight:700">${v}</div></div>`;
  el.innerHTML=`<div class="card" style="border-top-color:${c}">
    <div style="display:flex;justify-content:space-between;align-items:flex-end;flex-wrap:wrap;gap:14px">
      <div>
        <div class="k" style="color:var(--txt)">${activeStock} <span style="color:var(--dim);font-weight:400">${s.code||''} · ${date}</span></div>
        <div style="font-size:32px;font-weight:800;letter-spacing:-.5px;color:${c};line-height:1.1">${cur.toLocaleString()}<span style="font-size:14px;font-weight:600"> 원</span></div>
        <div style="font-size:13px;font-weight:700;color:${c};margin-top:3px">전일대비 ${arrow} ${Math.abs(d).toLocaleString()} · ${pct>=0?'+':''}${pct.toFixed(2)}%</div>
      </div>
      <div style="display:flex;gap:18px;flex-wrap:wrap;padding-bottom:4px">
        ${cell('전일',prev.toLocaleString())}
        ${cell('52주 최고','<span style=\"color:#d9534f\">'+hi.toLocaleString()+'</span>')}
        ${cell('52주 최저','<span style=\"color:#4a90d9\">'+lo.toLocaleString()+'</span>')}
        ${cell('시가총액',cap)}
      </div>
    </div></div>`;
}
function renderStockCharts(){ renderStockQuote(); renderPriceChart(); renderFlowChart(); renderAggChart(); }
document.querySelectorAll('#period-stock button').forEach(b=>b.onclick=()=>{document.querySelectorAll('#period-stock button').forEach(x=>x.classList.remove('active'));b.classList.add('active');stockDays=+b.dataset.days;renderStockCharts();});
function applyCustomPeriod(){ const v=parseInt(document.getElementById('period-input').value,10); if(v>0){ stockDays=Math.round(v*21); document.querySelectorAll('#period-stock button').forEach(x=>x.classList.remove('active')); renderStockCharts(); } }

/* 수급 기간 칩 · 기간설정 */
document.querySelectorAll('#period-flow button').forEach(b=>b.onclick=()=>{
  document.querySelectorAll('#period-flow button').forEach(x=>x.classList.remove('active'));
  b.classList.add('active');
  const v=b.dataset.fp;
  const box=document.getElementById('flow-custom');
  if(box) box.style.display=(v==='custom')?'':'none';
  if(v==='custom'){
    const s=getStock(activeStock);                       // 기본값: 데이터 전체 구간
    const f=document.getElementById('flow-from'), t=document.getElementById('flow-to');
    if(s&&s.dates.length){ if(f&&!f.value) f.value='20'+s.dates[0]; if(t&&!t.value) t.value='20'+s.dates[s.dates.length-1]; }
    applyFlowCustom(); return;
  }
  flowMode=(v==='month')?'month':+v;
  renderFlowChart();
});
function applyFlowCustom(){
  const f=document.getElementById('flow-from'), t=document.getElementById('flow-to');
  flowCustom.from=(f&&f.value)||null;
  flowCustom.to=(t&&t.value)||null;
  flowMode='custom';
  document.querySelectorAll('#period-flow button').forEach(x=>x.classList.toggle('active',x.dataset.fp==='custom'));
  renderFlowChart();
}

