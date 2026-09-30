function buildMap(cfg){
  var svg=document.getElementById(cfg.svg); if(!svg||svg.childNodes.length) return;
  var L=34,R=350,T=26,B=336, W=R-L, H=B-T;
  var sx=function(x){return L+(x-1)/4*W;}, sy=function(y){return T+(y-1)/4*H;};
  var ns='http://www.w3.org/2000/svg';
  function el(t,a,txt){var e=document.createElementNS(ns,t);for(var k in a)e.setAttribute(k,a[k]);if(txt!=null)e.textContent=txt;return e;}
  for(var g=1;g<=5;g++){
    svg.appendChild(el('line',{x1:sx(g),y1:T,x2:sx(g),y2:B,stroke:'#453729','stroke-width':1}));
    svg.appendChild(el('line',{x1:L,y1:sy(g),x2:R,y2:sy(g),stroke:'#453729','stroke-width':1}));
  }
  svg.appendChild(el('text',{x:L,y:B+16,fill:'#a89880','font-size':10},cfg.xl));
  svg.appendChild(el('text',{x:R,y:B+16,fill:'#a89880','font-size':10,'text-anchor':'end'},cfg.xr));
  svg.appendChild(el('text',{x:(L+R)/2,y:B+30,fill:'#a89880','font-size':10.5,'text-anchor':'middle'},cfg.xt));
  svg.appendChild(el('text',{x:12,y:T+4,fill:'#a89880','font-size':10,transform:'rotate(-90 12 '+(T+4)+')','text-anchor':'end'},cfg.yt));
  svg.appendChild(el('text',{x:12,y:B,fill:'#a89880','font-size':10,transform:'rotate(-90 12 '+B+')'},cfg.yb));
  var tip=document.getElementById('mapTip');
  var seen={};
  cfg.data.forEach(function(d){
    var k=d.x+','+d.y; seen[k]=(seen[k]||0)+1; var n=seen[k]-1;
    var off=[[0,0],[14,-10],[-14,10],[14,10]][n]||[0,0];
    var cx=sx(d.x)+off[0], cy=sy(d.y)+off[1];
    var c=cfg.origin[d.o][1];
    var grp=el('g',{cursor:d.id?'pointer':'default'});
    grp.appendChild(el('circle',{cx:cx,cy:cy,r:9.5,fill:'#221b16'}));
    if(d.v===2) grp.appendChild(el('circle',{cx:cx,cy:cy,r:7.5,fill:c}));
    else if(d.v===1){ grp.appendChild(el('circle',{cx:cx,cy:cy,r:7.5,fill:'none',stroke:c,'stroke-width':2}));
      grp.appendChild(el('path',{d:'M'+cx+' '+(cy-7.5)+' A7.5 7.5 0 0 1 '+cx+' '+(cy+7.5)+' Z',fill:c})); }
    else if(d.v===-1) grp.appendChild(el('circle',{cx:cx,cy:cy,r:7.5,fill:'none',stroke:c,'stroke-width':1.5,'stroke-dasharray':'3 2'}));
    else grp.appendChild(el('circle',{cx:cx,cy:cy,r:7.5,fill:'none',stroke:c,'stroke-width':2}));
    grp.appendChild(el('text',{x:cx,y:cy+3,fill:'#e8ddcf','font-size':String(d.no).length>1?7:8,'text-anchor':'middle','font-weight':600},d.no));
    grp.appendChild(el('circle',{cx:cx,cy:cy,r:14,fill:'transparent'}));
    grp.addEventListener('mousemove',function(ev){tip.style.display='block';tip.innerHTML='<b>'+(typeof d.no==='number'?'No.'+d.no+' ':'')+d.name+'</b><br>'+cfg.origin[d.o][0]+' · '+d.note;tip.style.left=Math.min(ev.clientX+12,window.innerWidth-232)+'px';tip.style.top=(ev.clientY+12)+'px';});
    grp.addEventListener('mouseleave',function(){tip.style.display='none';});
    if(d.id) grp.addEventListener('click',function(){tip.style.display='none';openDetail(d.id);});
    svg.appendChild(grp);
  });
  var lg=document.getElementById(cfg.legend);
  for(var o in cfg.origin){var s=document.createElement('span');s.innerHTML='<i style="background:'+cfg.origin[o][1]+'"></i>'+cfg.origin[o][0];lg.appendChild(s);}
  var tb=document.getElementById(cfg.table); var vt={'-1':'미기입','0':'아님','1':'보류','2':'좋음'};
  var html='<tr><th>'+cfg.col+'</th><th>'+(cfg.noCol||'No.')+'</th><th>이름</th><th>'+(cfg.vCol||'판정')+'</th></tr>';
  Object.keys(cfg.origin).forEach(function(o){cfg.data.filter(function(d){return d.o===o;}).forEach(function(d,i){
    html+='<tr'+(d.id?' onclick="openDetail(\''+d.id+'\')"':'')+'><td class="dim">'+(i?'':cfg.origin[o][0])+'</td><td class="dim">'+d.no+'</td><td>'+d.name+'</td><td class="dim">'+vt[String(d.v)]+(d.id?' ›':'')+'</td></tr>';});});
  tb.innerHTML=html;
}

function openDetail(id){
  var el=document.getElementById(id); if(!el) return;
  document.getElementById('listSec').classList.add('hidden');
  document.querySelectorAll('.detail').forEach(function(d){d.classList.add('hidden');});
  el.classList.remove('hidden');
  if(history.replaceState) history.replaceState(null,'','#'+id);
  window.scrollTo(0,0);
}
function closeDetail(){
  document.querySelectorAll('.detail').forEach(function(d){d.classList.add('hidden');});
  document.getElementById('listSec').classList.remove('hidden');
  if(history.replaceState) history.replaceState(null,'',location.pathname);
  window.scrollTo(0,0);
}
document.addEventListener('DOMContentLoaded',function(){
  var id=location.hash.replace('#','');
  if(id && document.getElementById(id)) openDetail(id);
});
