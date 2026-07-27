function renderWatchlist(){
  let html=`<span class="filter-chip ${calCo===null?'on':''}" onclick="setCalCo(null)">전체</span>`;
  html+=watchlist.map(c=>`<span class="filter-chip ${calCo===c?'on':''}" onclick="setCalCo('${c}')">${c}</span>`).join('');
  document.getElementById('watchlist').innerHTML=html;
}
function setCalCo(c){ calCo=(calCo===c)?null:c; renderWatchlist(); renderCalendar(); renderUpcoming(); }
function renderCalendar(){
  const y=calDate.getFullYear(),m=calDate.getMonth();
  document.getElementById('cal-month').textContent=`${y}. ${String(m+1).padStart(2,'0')}`;
  document.getElementById('cal-dow').innerHTML=['일','월','화','수','목','금','토'].map(d=>`<div class="dow">${d}</div>`).join('');
  const evs=collectEvents(),first=new Date(y,m,1).getDay(),days=new Date(y,m+1,0).getDate();
  const todayStr=new Date().toISOString().slice(0,10);
  let cells='';
  for(let i=0;i<first;i++)cells+='<div class="cell empty"></div>';
  for(let d=1;d<=days;d++){
    const ds=`${y}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const dayEvs=evs.filter(e=>e.date===ds);
    const MAXEV=3;
    let evHtml=dayEvs.slice(0,MAXEV).map(e=>{
      const c=CO_COLORS[e.co]||'#9aa4af';
      const click=e.url?` onclick="window.open('${e.url}','_blank')" style="cursor:pointer;border-color:${c};color:${c};background:${c}18"`:` style="border-color:${c};color:${c};background:${c}18"`;
      return `<div class="ev"${click} title="${e.co} · ${e.title}${e.url?' (클릭 시 공시 원문)':''}">${e.title}</div>`;
    }).join('');
    if(dayEvs.length>MAXEV){
      const rest=dayEvs.slice(MAXEV).map(e=>`${e.co} · ${e.title}`).join('\n');
      evHtml+=`<div class="ev" style="border-color:var(--dim);color:var(--dim);background:var(--panel2)" title="${rest}">+${dayEvs.length-MAXEV}건 더</div>`;
    }
    cells+=`<div class="cell ${ds===todayStr?'today':''}"><div class="d">${d}</div>${evHtml}</div>`;
  }
  document.getElementById('cal-grid').innerHTML=cells;
  // 범례: 기업별 색
  const lg=document.querySelector('#view-calendar .legend');
  if(lg) lg.innerHTML=Object.keys(CO_COLORS).map(co=>`<span><i class="dot" style="background:${CO_COLORS[co]}"></i> ${co}</span>`).join('');
}
function moveMonth(n){calDate.setMonth(calDate.getMonth()+n);renderCalendar();renderUpcoming();}
function renderUpcoming(){
  const today=new Date();today.setHours(0,0,0,0);
  const labels={ir:"IR",earn:"실적",filing:"공시",meeting:"주총"};
  const ym=`${calDate.getFullYear()}-${String(calDate.getMonth()+1).padStart(2,'0')}`;
  const evs=collectEvents()
    .filter(e=>e.date&&e.date.startsWith(ym))
    .sort((a,b)=>new Date(a.date)-new Date(b.date)).slice(0,30);
  document.getElementById('upcoming').innerHTML=evs.map(e=>{
    const dt=new Date(e.date); const c=CO_COLORS[e.co]||'#9aa4af';
    const open=e.url?` onclick="window.open('${e.url}','_blank')" style="cursor:pointer"`:'';
    return `<div class="up-row"${open}><span class="date">${dt.getMonth()+1}/${dt.getDate()}</span><span><div class="title">${e.title}</div><div class="co" style="color:${c};font-weight:600">${e.co}</div></span><span class="tag">${labels[e.type]||'공시'}</span></div>`;
  }).join('')||'<div style="color:var(--dim)">이번 달 이벤트 없음</div>';
}

/* 버즈 — 네이버 DATALAB 검색지수 (buzz.json) */
