/* ================= 증권사 리포트 ================= */
let repInited=false, repData=null, repTrendMetric='rev', repSeason=null, repPeriod='2Q26E', repType=null, repListSeason=null;
let repChart=null, repTrendQChart=null, repTrendYChart=null;
const REP_SEG_ORDER=['의료기기','화장품','의약품','기타'];
const REP_SEG_COLORS={'의료기기':'#4e9d46','화장품':'#d9536f','의약품':'#4a90d9','기타':'#c3ccd4'};
const REP_TYPE_COLORS={'실적리뷰':'#4a90d9','프리뷰':'#e0a13c','이슈':'#8f68c9','신규커버':'#2fa6a6'};
const repSeasonColor=(i,total)=>{const t=total<2?1:i/(total-1);return `hsl(112,${Math.round(28+t*27)}%,${Math.round(78-t*40)}%)`;}; // 연녹(과거)→진녹(최신)
const _rN=n=>n==null?'–':Math.round(n).toLocaleString();
const _rTp=n=>n==null?'–':(n/10000)+'만원';
const _rDir=d=>d==='상향'?'<span class="up">▲상향</span>':d==='하향'?'<span class="down">▼하향</span>':d==='신규'?'<span style="color:var(--green-d)">신규</span>':'유지';
const _rBdg=(a,c)=>{if(a==null||c==null||!c)return '';const p=(a/c-1)*100;return `<span class="rep-bdg ${p>=0?'up':'down'}">${p>=0?'+':''}${p.toFixed(1)}% ${p>=0?'상회':'하회'}</span>`;};

async function loadReports(){
  try{
    const r=await fetch('reports.json',{cache:'no-store'});
    if(!r.ok){document.getElementById('rep-list').innerHTML='<div class="na-msg">reports.json 없음</div>';return;}
    repData=await r.json();
    repSeason=repSeasons().slice(-1)[0];   // 기본: 최신 시즌
    repListSeason=repListSeasons().slice(-1)[0];   // 목록 기본 탭: 가장 최근 분류(Update 포함)
    const f=repFocusPeriod(repSeason);
    repPeriod=(/Earnings/i.test(repSeason)&&repNextQ(f))?repNextQ(f):f;  // 어닝 시즌=다음 분기 기본
    renderReports();
  }catch(e){document.getElementById('rep-list').innerHTML='<div class="na-msg">리포트 데이터를 불러오지 못했습니다</div>';}
}
function repSeasons(){
  if(repData.seasons) return repData.seasons;
  const m={};repData.reports.forEach(r=>{const d=m[r.season];m[r.season]=(!d||r.date<d)?r.date:d;});
  return Object.keys(m).sort((a,b)=>m[a].localeCompare(m[b]));
}
function repLatestPerBroker(rs){
  const m={};rs.forEach(r=>{if(!m[r.broker]||r.date>m[r.broker].date)m[r.broker]=r;});
  return Object.values(m);
}
// 추정치 집계 시즌: est_season(있으면) > season — 목록 분류(season)와 컨센 편입(est_season)을 분리
const repEstSeason=r=>r.est_season||r.season;
function repSeasonReports(season){return repLatestPerBroker(repData.reports.filter(r=>repEstSeason(r)===season));}
function repListSeasons(){  // 목록 탭용: 컨센 시즌 + 리포트에만 있는 분류(예: 26Q2 Update)를 날짜순 합집합
  const base=repSeasons(), m={};
  repData.reports.forEach(r=>{const d=m[r.season];m[r.season]=(!d||r.date<d)?r.date:d;});
  const extra=Object.keys(m).filter(s=>!base.includes(s)).sort((a,b)=>m[a].localeCompare(m[b]));
  return [...base,...extra];
}
function repCons(season,period,key){
  const v=repSeasonReports(season).map(r=>r.est&&r.est[period]&&r.est[period][key]).filter(x=>x!=null);
  return v.length?v.reduce((a,b)=>a+b,0)/v.length:null;
}
function repConsN(season,period,key){
  return repSeasonReports(season).filter(r=>r.est&&r.est[period]&&r.est[period][key]!=null).length;
}
function repSegCons(season,period,seg){
  const v=repSeasonReports(season).map(r=>r.est&&r.est[period]&&r.est[period].seg&&r.est[period].seg[seg]).filter(x=>x!=null);
  return v.length?v.reduce((a,b)=>a+b,0)/v.length:null;
}
function repDxCons(season,period,seg,dx){
  const v=repSeasonReports(season).map(r=>r.segdx&&r.segdx[period]&&r.segdx[period][seg]&&r.segdx[period][seg][dx]).filter(x=>x!=null);
  return v.length?{avg:v.reduce((a,b)=>a+b,0)/v.length,n:v.length}:null;
}
function repFocusPeriod(season){
  // 시즌명에서 대상 분기 도출: "26Q2 Preview" → "2Q26E"
  const m=/(\d{2})Q([1-4])/.exec(season||'');
  return m?`${m[2]}Q${m[1]}E`:'2026E';
}
function repNextQ(f){const q=/(\d)Q(\d{2})E/.exec(f||'');return q?(q[1]==='4'?`1Q${+q[2]+1}E`:`${+q[1]+1}Q${q[2]}E`):null;}
function repRemainQ(){  // 최신 시즌 대상 분기 이후의 당해년 잔여 분기
  const f=repFocusPeriod(repSeasons().slice(-1)[0]), q=/(\d)Q(\d{2})E/.exec(f), out=[];
  if(q)for(let i=+q[1]+1;i<=4;i++)out.push(`${i}Q${q[2]}E`);
  return out;
}
function repYears(){  // 당해년 + 2년
  const f=repFocusPeriod(repSeasons().slice(-1)[0]), q=/(\d)Q(\d{2})E/.exec(f), y=q?2000+ +q[2]:2026;
  return [`${y}E`,`${y+1}E`,`${y+2}E`];
}
function renderReports(){
  renderRepCards();renderRepTrend();renderRepEst();renderRepList();
  const n=document.getElementById('rep-note');
  if(n)n.textContent=`PDF 원문 + 부문별 매출 추정 · ${repData.updated} 기준 ${repData.reports.length}건 · 커버리지 ${new Set(repData.reports.map(r=>r.broker)).size}개사`;
}

/* ---- ① 요약 스트립 + 핵심 2패널 ---- */
function renderRepCards(){
  const seasons=repSeasons(), latest=seasons.slice(-1)[0];
  const prev=seasons.length>1?seasons[seasons.length-2]:null;
  const rs=repSeasonReports(latest), tps=rs.filter(r=>r.tp).map(r=>r.tp);
  const avg=tps.length?tps.reduce((a,b)=>a+b,0)/tps.length:null;
  const buy=rs.filter(r=>/buy|매수|overweight|비중확대/i.test(r.rating||'')).length;
  const focus=repFocusPeriod(latest), isEarn=/Earnings/i.test(latest||''), nq=repNextQ(focus);
  const q=/(\d)Q(\d{2})E/.exec(focus)||[];
  // 요약 스트립
  document.getElementById('rep-strip').innerHTML=
    `<span>최신 시즌 <b>${latest}</b> · ${rs.length}개사</span>`+
    (avg?`<span>평균 목표주가 <b class="lime">${Math.round(avg/10000)}만원</b> <i>(${Math.min(...tps)/10000}만~${Math.max(...tps)/10000}만)</i></span>`:'')+
    `<span>투자의견 <b>Buy ${buy}</b>${rs.length-buy?` <i>· 중립·기타 ${rs.length-buy}</i>`:' <i>· 전원 매수</i>'}</span>`+
    `<span><i>전체 ${repData.reports.length}건 · ${new Set(repData.reports.map(r=>r.broker)).size}개사 커버</i></span>`;
  // 패널 행 생성기
  const segRow=(nm,color,val,badge,ref,sub)=>
    `<div class="rep-row${color?'':' tot'}">`+
    `<span class="nm">${color?`<i class="co-dot" style="background:${color}"></i> `:''}${nm}</span>`+
    `<span class="val">${_rN(val)}<i>억</i></span>`+
    `<span class="bdg">${badge||''}</span>`+
    `<span class="ref">${ref||''}${sub?`<em>${sub}</em>`:''}</span></div>`;
  let A='',B='';
  if(isEarn&&prev){
    // A: 당기 실적 vs 프리뷰 컨센
    const rev=repCons(latest,focus,'rev'), op=repCons(latest,focus,'op');
    const revP=repCons(prev,focus,'rev'), opP=repCons(prev,focus,'op');
    A=`<div class="ph">${q[1]}Q${q[2]} 잠정실적 <span>vs 프리뷰 컨센</span></div>`+
      segRow('매출',null,rev,_rBdg(rev,revP),`컨센 ${_rN(revP)}억`)+
      segRow('영업이익',null,op,_rBdg(op,opP),`컨센 ${_rN(opP)}억`)+
      `<div class="rep-div"></div>`+
      ['의료기기','화장품','의약품'].map(s=>{
        const act=repSegCons(latest,focus,s), pre=repSegCons(prev,focus,s);
        return segRow(s,REP_SEG_COLORS[s],act,_rBdg(act,pre),`컨센 ${_rN(pre)}억`);
      }).join('');
    // B: 다음 분기 컨센
    const nRev=nq?repCons(latest,nq,'rev'):null, nOp=nq?repCons(latest,nq,'op'):null;
    const nN=nq?repConsN(latest,nq,'rev'):0;
    const qoq=(nRev!=null&&rev)?` <span class="${nRev>=rev?'up':'down'}">${nRev>=rev?'+':''}${((nRev/rev-1)*100).toFixed(1)}%</span>`:'';
    B=`<div class="ph">다음 분기 ${nq} 컨센 <span>${nN}곳 평균</span></div>`+
      segRow('매출',null,nRev,'',`${q[1]}Q 실적比${qoq}`)+
      segRow('영업이익',null,nOp,'',`OPM ${nRev?Math.round(nOp/nRev*100)+'%':'–'}`)+
      `<div class="rep-div"></div>`+
      ['의료기기','화장품','의약품'].map(s=>{
        const v=repSegCons(latest,nq,s);
        const d=repDxCons(latest,nq,s,'내수'), x=repDxCons(latest,nq,s,'수출');
        const dx=(d||x)?`내수 ${d?_rN(d.avg):'–'} · 수출 ${x?_rN(x.avg):'–'}`:'';
        return segRow(s,REP_SEG_COLORS[s],v,'',dx);
      }).join('');
  }else{
    // 프리뷰 시즌: 대상 분기 컨센 (직전 시즌비)
    const rev=repCons(latest,focus,'rev'), op=repCons(latest,focus,'op');
    const revP=prev?repCons(prev,focus,'rev'):null, opP=prev?repCons(prev,focus,'op'):null;
    const chg=(a,b)=>(a!=null&&b)?`<span class="rep-bdg ${a>=b?'up':'down'}">${a>=b?'+':''}${((a/b-1)*100).toFixed(1)}%</span>`:'';
    A=`<div class="ph">${focus} 컨센 <span>vs 직전 시즌</span></div>`+
      segRow('매출',null,rev,chg(rev,revP),prev?`직전 ${_rN(revP)}억`:'')+
      segRow('영업이익',null,op,chg(op,opP),prev?`직전 ${_rN(opP)}억`:'')+
      `<div class="rep-div"></div>`+
      ['의료기기','화장품','의약품'].map(s=>{
        const v=repSegCons(latest,focus,s), p=prev?repSegCons(prev,focus,s):null;
        return segRow(s,REP_SEG_COLORS[s],v,chg(v,p),prev?`직전 ${_rN(p)}억`:'');
      }).join('');
    const yr=repYears()[0];
    const yRev=repCons(latest,yr,'rev'), yOp=repCons(latest,yr,'op');
    B=`<div class="ph">연간 ${yr} 컨센 <span>${repConsN(latest,yr,'rev')}곳 평균</span></div>`+
      segRow('매출',null,yRev,'','')+segRow('영업이익',null,yOp,'',`OPM ${yRev?Math.round(yOp/yRev*100)+'%':'–'}`)+
      `<div class="rep-div"></div>`+
      ['의료기기','화장품','의약품'].map(s=>{
        const v=repSegCons(latest,yr,s);
        const d=repDxCons(latest,yr,s,'내수'), x=repDxCons(latest,yr,s,'수출');
        const dx=(d||x)?`내수 ${d?_rN(d.avg):'–'} · 수출 ${x?_rN(x.avg):'–'}`:'';
        return segRow(s,REP_SEG_COLORS[s],v,'',dx);
      }).join('');
  }
  document.getElementById('rep-hero').innerHTML=
    `<div class="rep-panel">${A}</div><div class="rep-panel">${B}</div>`;
}

/* ---- ② 컨센서스 추이 (시즌별 추정 변화: 잔여 분기 + 연간) ---- */
const repValLabel={id:'repVal',afterDatasetsDraw(c){
  const{ctx}=c;ctx.save();ctx.font='700 10px Pretendard,sans-serif';ctx.textAlign='center';
  c.data.datasets.forEach((ds,di)=>{
    const meta=c.getDatasetMeta(di);if(meta.hidden)return;
    meta.data.forEach((el,i)=>{const v=ds.data[i];if(v==null)return;
      ctx.fillStyle=di===c.data.datasets.length-1?'#2e6b2a':'#8a97a3';
      ctx.fillText(Math.round(v).toLocaleString(),el.x,el.y-4);});
  });ctx.restore();
}};
function setRepTrendMetric(m){repTrendMetric=m;renderRepTrend();}
function repTrendBar(ctxId,labels,metric){
  const seasons=repSeasons();
  const ds=seasons.map((s,i)=>({label:s,
    data:labels.map(p=>{const v=repCons(s,p,metric);return v==null?null:Math.round(v);}),
    backgroundColor:repSeasonColor(i,seasons.length),borderRadius:3,maxBarThickness:52}));
  return new Chart(document.getElementById(ctxId),{type:'bar',data:{labels,datasets:ds},
    options:{responsive:true,maintainAspectRatio:false,layout:{padding:{top:16}},
      plugins:{legend:{display:false},
        tooltip:{callbacks:{label:c=>`${c.dataset.label}: ${c.parsed.y==null?'–':c.parsed.y.toLocaleString()+'억'}`}}},
      scales:{x:{ticks:{color:'#67707b',font:{size:11,weight:'600'}},grid:{display:false}},
              y:{beginAtZero:true,ticks:{color:'#9aa4af',callback:v=>v.toLocaleString()},grid:{color:'#eef1f3'}}}},
    plugins:[repValLabel]});
}
function renderRepTrend(){
  const seasons=repSeasons(), rq=repRemainQ(), ys=repYears();
  // 지표 토글 + 시즌 범례
  document.getElementById('rep-trend-chips').innerHTML=
    [['rev','매출'],['op','영업이익']].map(([k,l])=>
      `<span class="filter-chip ${repTrendMetric===k?'on':''}" onclick="setRepTrendMetric('${k}')">${l}</span>`).join('')+
    `<span class="rep-legend">${seasons.map((s,i)=>
      `<span><i style="background:${repSeasonColor(i,seasons.length)}"></i>${s}</span>`).join('')}</span>`;
  if(repTrendQChart)repTrendQChart.destroy();
  if(repTrendYChart)repTrendYChart.destroy();
  const qBox=document.getElementById('rep-trend-qwrap');
  qBox.style.display=rq.length?'':'none';
  if(rq.length)repTrendQChart=repTrendBar('rep-trend-q',rq,repTrendMetric);
  repTrendYChart=repTrendBar('rep-trend-y',ys,repTrendMetric);
  // 변화율 칩: 직전 → 최신
  const el=document.getElementById('rep-trend-delta');
  const periods=[...rq,...ys];
  if(el&&seasons.length>1){
    const a=seasons[seasons.length-2],b=seasons[seasons.length-1];
    el.innerHTML=periods.map(p=>{
      const parts=[['매출','rev'],['영익','op']].map(([nm,k])=>{
        const va=repCons(a,p,k),vb=repCons(b,p,k);if(va==null||vb==null)return null;
        const d=(vb/va-1)*100;return `${nm} <b class="${d>=0?'up':'down'}">${d>=0?'+':''}${d.toFixed(1)}%</b>`;
      }).filter(Boolean);
      return parts.length?`<span class="filter-chip">${p} ${parts.join(' · ')}</span>`:`<span class="filter-chip zero">${p} –</span>`;
    }).join('')+`<span class="unit" style="margin-left:6px">${a} → ${b} 컨센 변화</span>`;
  }else if(el){el.innerHTML='';}
  // 금액 표: 기간 × 시즌 (매출·영익)
  const tEl=document.getElementById('rep-trend-table');
  if(tEl){
    const last=seasons[seasons.length-1], prevS=seasons.length>1?seasons[seasons.length-2]:null;
    tEl.innerHTML=`<table><thead><tr><th>기간</th>${seasons.map(s=>`<th>${s}</th>`).join('')}<th>Δ 직전→최신</th></tr></thead><tbody>`+
      periods.map(p=>{
        const cells=seasons.map(s=>{
          const r=repCons(s,p,'rev'),o=repCons(s,p,'op');
          return `<td>${r==null?'–':`<b>${_rN(r)}</b> · ${_rN(o)}`}</td>`;
        }).join('');
        let d='–';
        if(prevS){
          const dr=repCons(last,p,'rev'),pr=repCons(prevS,p,'rev'),dro=repCons(last,p,'op'),po=repCons(prevS,p,'op');
          const f=(x,y)=>(x!=null&&y)?`<span class="${x>=y?'up':'down'}">${x>=y?'+':''}${((x/y-1)*100).toFixed(1)}%</span>`:null;
          const ps=[f(dr,pr),f(dro,po)].filter(Boolean);
          if(ps.length)d=ps.join(' · ');
        }
        return `<tr><td><b>${p}</b></td>${cells}<td>${d}</td></tr>`;
      }).join('')+
      `</tbody></table><div class="unit" style="margin-top:4px">단위: 억 원 · 굵은 값 = 매출, 오른쪽 = 영업이익 · 시즌별 커버리지 증권사 평균</div>`;
  }
}

/* ---- ③ 부문별 매출 추정 (발표 시즌 × 기간 · 내수/수출 포함) ---- */
const repTotLabel={id:'repTot',afterDatasetsDraw(c){
  const{ctx}=c;ctx.save();ctx.font='700 10.5px Pretendard,sans-serif';ctx.fillStyle='#2b3138';ctx.textAlign='left';ctx.textBaseline='middle';
  const n=c.data.labels.length;
  for(let i=0;i<n;i++){
    let sum=0,mx=-1e9,my=null;
    c.data.datasets.forEach((ds,di)=>{const v=ds.data[i];if(v==null)return;sum+=v;
      const el=c.getDatasetMeta(di).data[i];if(el&&el.x>mx){mx=el.x;my=el.y;}});
    if(sum>0&&my!=null)ctx.fillText(Math.round(sum).toLocaleString(),mx+6,my);
  }ctx.restore();
}};
function setRepSeason(s){repSeason=s;renderRepEst();}
function setRepPeriod(p){repPeriod=p;renderRepEst();}
function renderRepEst(){
  document.getElementById('rep-season-chips').innerHTML=
    `<span class="chip-cap">발표 시즌</span>`+repSeasons().map(s=>
    `<span class="filter-chip ${repSeason===s?'on':''}" onclick="setRepSeason('${s}')">${s}</span>`).join('');
  const periods=['2Q26E','3Q26E','4Q26E','2026E','2027E','2028E'];
  document.getElementById('rep-period-chips').innerHTML=
    `<span class="chip-cap">추정 기간</span>`+periods.map(p=>
    `<span class="filter-chip ${repPeriod===p?'on':''}" onclick="setRepPeriod('${p}')">${p}</span>`).join('');
  // 컨센 합산 요약 라인
  const sEl=document.getElementById('rep-est-sum');
  if(sEl){
    const rev=repCons(repSeason,repPeriod,'rev'), op=repCons(repSeason,repPeriod,'op'), n=repConsN(repSeason,repPeriod,'rev');
    sEl.innerHTML=`<span class="sum-main">${repSeason} · ${repPeriod} 컨센</span>`+
      `<span>합산 매출 <b>${_rN(rev)}억</b></span><span>영업이익 <b>${_rN(op)}억</b></span>`+
      ['의료기기','화장품','의약품'].map(s=>{
        const v=repSegCons(repSeason,repPeriod,s);
        return v==null?'':`<span><i class="co-dot" style="background:${REP_SEG_COLORS[s]}"></i>${s} <b>${_rN(v)}억</b></span>`;
      }).join('')+`<span class="dim">${n}곳 평균</span>`;
  }
  const inSeason=repSeasonReports(repSeason);
  const rs=inSeason.filter(r=>r.est&&r.est[repPeriod]&&r.est[repPeriod].seg)
    .sort((a,b)=>(b.est[repPeriod].rev||0)-(a.est[repPeriod].rev||0));
  const ctx=document.getElementById('rep-est-chart');
  ctx.parentElement.style.height=(rs.length*36+90)+'px';   // 증권사 수만큼 확보
  if(repChart)repChart.destroy();
  repChart=new Chart(ctx,{type:'bar',
    data:{labels:rs.map(r=>r.broker),
      datasets:REP_SEG_ORDER.map(s=>({label:s,data:rs.map(r=>r.est[repPeriod].seg[s]||0),
        backgroundColor:REP_SEG_COLORS[s],stack:'s',borderColor:'#fff',borderWidth:1}))},
    options:{indexAxis:'y',responsive:true,maintainAspectRatio:false,layout:{padding:{right:52}},
      plugins:{legend:{position:'top',labels:{boxWidth:10,font:{size:11},color:'#67707b'}},
        tooltip:{callbacks:{label:c=>`${c.dataset.label} ${c.parsed.x.toLocaleString()}억`}}},
      scales:{x:{stacked:true,ticks:{color:'#9aa4af',callback:v=>v.toLocaleString()+'억'},grid:{color:'#eef1f3'}},
              y:{stacked:true,ticks:{color:'#67707b',font:{size:11},autoSkip:false},grid:{display:false}}}},
    plugins:[repTotLabel]});
  // 표: 부문별 합산 + 내수/수출
  const all=inSeason.filter(r=>r.est&&r.est[repPeriod]).sort((a,b)=>(b.est[repPeriod].rev||0)-(a.est[repPeriod].rev||0));
  const segCell=r=>REP_SEG_ORDER.map(s=>{
    const v=r.est[repPeriod].seg?r.est[repPeriod].seg[s]:null;
    const dx=r.segdx&&r.segdx[repPeriod]&&r.segdx[repPeriod][s];
    const sub=dx&&(dx['내수']!=null||dx['수출']!=null)?`<div class="dx">${_rN(dx['내수'])} · ${_rN(dx['수출'])}</div>`:'';
    return `<td>${v==null?'–':_rN(v)}${sub}</td>`;}).join('');
  const avgRow=()=>{
    const cells=REP_SEG_ORDER.map(s=>{
      const v=repSegCons(repSeason,repPeriod,s);
      const d=repDxCons(repSeason,repPeriod,s,'내수'), x=repDxCons(repSeason,repPeriod,s,'수출');
      const tot=(d?d.avg:0)+(x?x.avg:0), share=x&&tot?Math.round(x.avg/tot*100):null;
      const sub=(d||x)?`<div class="dx">${d?_rN(d.avg):'–'} · ${x?_rN(x.avg):'–'}${share!=null?` <span class="sh">수출 ${share}%</span>`:''}</div>`:'';
      return `<td>${v==null?'–':_rN(v)}${sub}</td>`;}).join('');
    return `<tr style="background:var(--panel2);font-weight:700"><td>컨센 (평균)</td><td>${_rN(repCons(repSeason,repPeriod,'rev'))}</td><td>${_rN(repCons(repSeason,repPeriod,'op'))}</td>${cells}<td></td></tr>`;
  };
  document.getElementById('rep-est-table').innerHTML=
    `<table><thead><tr><th>증권사</th><th>매출액</th><th>영업이익</th>${REP_SEG_ORDER.map(s=>`<th>${s}</th>`).join('')}<th>목표주가</th></tr></thead><tbody>`+
    all.map(r=>`<tr><td><b>${r.broker}</b></td><td><b>${_rN(r.est[repPeriod].rev)}</b></td><td>${_rN(r.est[repPeriod].op)}</td>${segCell(r)}<td><b>${_rTp(r.tp)}</b></td></tr>`).join('')+
    avgRow()+
    `</tbody></table><div class="unit" style="margin-top:4px">단위: 억 원 · ${repSeason} 시즌, 증권사당 최신 1건 · 부문 아래 작은 숫자 = 내수 · 수출 · – = 미제시</div>`;
}

/* ---- ④ 리포트 목록 (시즌 탭 + 유형 필터) ---- */
function setRepListSeason(s){repListSeason=s;renderRepList();}
function setRepType(t){repType=(repType===t)?null:t;renderRepList();}
function renderRepList(){
  const seasons=repListSeasons().slice().reverse();
  document.getElementById('rep-season-tabs').innerHTML=
    seasons.map(s=>{
      const n=repData.reports.filter(r=>r.season===s).length;
      return `<span class="filter-chip ${repListSeason===s?'on':''}" onclick="setRepListSeason('${s}')">${s} <span class="chip-n">${n}</span></span>`;
    }).join('')+
    `<span class="filter-chip ${repListSeason===null?'on':''}" onclick="setRepListSeason(null)">전체 <span class="chip-n">${repData.reports.length}</span></span>`;
  const pool=repData.reports.filter(r=>repListSeason===null||r.season===repListSeason);
  const types=[...new Set(pool.map(r=>r.type))];
  if(repType!==null&&!types.includes(repType))repType=null;
  document.getElementById('rep-type-chips').innerHTML=types.length>1?
    `<span class="filter-chip ${repType===null?'on':''}" onclick="setRepType(null)">전체 유형</span>`+
    types.map(t=>`<span class="filter-chip ${repType===t?'on':''}" onclick="setRepType('${t}')">${t}</span>`).join(''):'';
  const rs=pool.filter(r=>repType===null||r.type===repType)
    .slice().sort((a,b)=>b.date.localeCompare(a.date));
  document.getElementById('rep-cnt').textContent=(repListSeason||'전체')+' · '+rs.length+'건';
  document.getElementById('rep-list').innerHTML=rs.map(r=>
    `<div class="rep-item"><div class="top">`+
    `<span class="rep-broker">${r.broker}</span>`+
    `<span class="rep-type" style="background:${REP_TYPE_COLORS[r.type]||'#9aa4af'}">${r.type}</span>`+
    (r.file?`<a class="ttl" href="${r.file}" target="_blank" rel="noopener">${r.title}</a>`
           :`<span class="ttl" style="font-size:13px;font-weight:600">${r.title}</span><span class="rep-meta">(원문 미보유)</span>`)+
    `<span class="rep-meta">${r.date}${r.analyst?' · '+r.analyst:''}</span>`+
    `<span class="rep-tp">${r.rating||''} · TP ${_rTp(r.tp)} ${_rDir(r.tp_dir)}</span></div>`+
    `<div class="rep-sum">${r.summary}</div>`+
    (r.points&&r.points.length?`<ul class="rep-points">${r.points.map(p=>`<li>${p}</li>`).join('')}</ul>`:'')+
    `</div>`).join('')||'<div class="na-msg">해당 조건 리포트 없음</div>';
}
