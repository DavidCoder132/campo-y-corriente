/* Simuladores: campo de cargas, gaussiana, condensador y circuito RC. */
document.addEventListener("DOMContentLoaded",function(){
  "use strict";
  var K=8.9875e9, EPS0=8.854e-12;
  var redibujos=[];

  /* ---------- utilidades ---------- */
  function $(id){ return document.getElementById(id); }
  var PREF={"-12":"p","-9":"n","-6":"µ","-3":"m","0":"","3":"k","6":"M","9":"G"};
  function fmt(v,u){
    if(!isFinite(v)) return "∞ "+u;
    if(Math.abs(v)<1e-15) return "0 "+u;
    var e=Math.floor(Math.log10(Math.abs(v))/3)*3; e=Math.max(-12,Math.min(9,e));
    var m=Number((v/Math.pow(10,e)).toPrecision(3));
    return m.toLocaleString("es")+" "+PREF[e]+u;
  }
  function rgb(hex){
    hex=hex.replace("#","");
    if(hex.length===3) hex=hex.replace(/./g,"$&$&");
    var n=parseInt(hex,16); return [n>>16&255,n>>8&255,n&255];
  }
  function col(n){ return CC.color(n); }

  /* Ajusta un canvas a su tamaño en pantalla y llama a dibujar al cambiar. */
  function lienzo(cv,dibujar){
    var o={cv:cv,cx:cv.getContext("2d"),W:0,H:0};
    function tam(){
      var r=cv.getBoundingClientRect(); if(!r.width) return;
      var d=window.devicePixelRatio||1;
      o.W=r.width; o.H=r.height; cv.width=Math.round(o.W*d); cv.height=Math.round(o.H*d);
      o.cx.setTransform(d,0,0,d,0,0); dibujar();
    }
    if(window.ResizeObserver) new ResizeObserver(tam).observe(cv);
    else window.addEventListener("resize",tam);
    o.tam=tam; redibujos.push(tam);
    return o;
  }
  function flecha(cx,x1,y1,x2,y2,cabeza){
    var dx=x2-x1, dy=y2-y1, L=Math.hypot(dx,dy); if(L<1) return;
    var ux=dx/L, uy=dy/L, h=cabeza||6;
    cx.beginPath(); cx.moveTo(x1,y1); cx.lineTo(x2,y2); cx.stroke();
    cx.beginPath(); cx.moveTo(x2,y2);
    cx.lineTo(x2-ux*h-uy*h*.6,y2-uy*h+ux*h*.6); cx.lineTo(x2-ux*h+uy*h*.6,y2-uy*h-ux*h*.6);
    cx.closePath(); cx.fill();
  }
  function segmento(cont,attr,fn){
    var bs=[].slice.call(cont.querySelectorAll("button"));
    function marcar(v){ bs.forEach(function(b){ b.setAttribute("aria-pressed",String(b.dataset[attr]===v)); }); }
    bs.forEach(function(b){ b.addEventListener("click",function(){ marcar(b.dataset[attr]); fn(b.dataset[attr]); }); });
    return marcar;
  }

  /* Ejes y curvas para las gráficas. */
  function ejes(o,xmax,ymax,xlab,ylab,marcasX){
    var cx=o.cx, m={l:44,r:14,t:14,b:34}, w=o.W-m.l-m.r, h=o.H-m.t-m.b;
    var X=function(x){ return m.l+x/xmax*w; }, Y=function(y){ return m.t+h-y/ymax*h; };
    cx.clearRect(0,0,o.W,o.H);
    cx.strokeStyle=col("--line"); cx.lineWidth=1; cx.fillStyle=col("--ink2");
    cx.font="600 11px 'Plus Jakarta Sans',sans-serif"; cx.textAlign="center"; cx.textBaseline="top";
    (marcasX||[]).forEach(function(mk){
      cx.beginPath(); cx.moveTo(X(mk[0]),m.t); cx.lineTo(X(mk[0]),m.t+h); cx.stroke();
      cx.fillText(mk[1],X(mk[0]),m.t+h+5);
    });
    cx.textAlign="right"; cx.textBaseline="middle";
    [0,.5,1].forEach(function(f){
      var y=ymax*f; cx.beginPath(); cx.moveTo(m.l,Y(y)); cx.lineTo(m.l+w,Y(y)); cx.stroke();
      cx.fillText(Number(y.toPrecision(2)).toLocaleString("es"),m.l-6,Y(y));
    });
    cx.strokeStyle=col("--ink2"); cx.beginPath(); cx.moveTo(m.l,m.t); cx.lineTo(m.l,m.t+h); cx.lineTo(m.l+w,m.t+h); cx.stroke();
    cx.textAlign="right"; cx.textBaseline="bottom"; cx.fillText(xlab,m.l+w,o.H-2);
    cx.save(); cx.translate(11,m.t+h/2); cx.rotate(-Math.PI/2); cx.textAlign="center"; cx.textBaseline="middle";
    cx.fillText(ylab,0,0); cx.restore();
    return {X:X,Y:Y,m:m,w:w,h:h};
  }
  function curva(o,g,f,x0,x1,color,grosor,alfa){
    var cx=o.cx, n=200; cx.save();
    cx.beginPath(); cx.rect(g.m.l,g.m.t-2,g.w+2,g.h+4); cx.clip();
    cx.strokeStyle=color; cx.lineWidth=grosor||2.5; cx.globalAlpha=alfa||1; cx.lineJoin="round";
    cx.beginPath();
    for(var i=0;i<=n;i++){ var x=x0+(x1-x0)*i/n, y=f(x); if(i) cx.lineTo(g.X(x),g.Y(y)); else cx.moveTo(g.X(x),g.Y(y)); }
    cx.stroke(); cx.restore();
  }
  function punto(o,x,y,color){
    o.cx.fillStyle=color; o.cx.beginPath(); o.cx.arc(x,y,5.5,0,7); o.cx.fill();
    o.cx.strokeStyle=col("--card"); o.cx.lineWidth=2; o.cx.stroke();
  }

  /* ---------- pestañas ---------- */
  var tabs=[].slice.call(document.querySelectorAll(".pestanas button")),
      paneles=[].slice.call(document.querySelectorAll(".sim"));
  function abrir(id){
    if(!$(id)||!$(id).classList.contains("sim")) id="campo";
    paneles.forEach(function(p){ p.hidden=p.id!==id; });
    tabs.forEach(function(t){ t.setAttribute("aria-selected",String(t.dataset.s===id)); });
    if(location.hash!=="#"+id) history.replaceState(null,"","#"+id);
    requestAnimationFrame(function(){ redibujos.forEach(function(f){ f(); }); });
  }
  tabs.forEach(function(t){ t.addEventListener("click",function(){ abrir(t.dataset.s); }); });
  window.addEventListener("hashchange",function(){ abrir(location.hash.slice(1)); });

  /* =====================================================================
     1. CAMPO ELÉCTRICO
     ===================================================================== */
  (function(){
    var QC=1e-9, ANCHO=1;               // cada carga ±1 nC; el lienzo mide 1 m
    var cargas=[], arrastre=null, ultimoToque={t:0,i:-1}, pend=false;
    var oc=document.createElement("canvas"), ocx=oc.getContext("2d");
    var L=lienzo($("cv-campo"),pedir);
    var verL=$("ver-lineas"), verV=$("ver-vect"), verP=$("ver-pot"), lee=$("lee-campo");

    function esc(){ return L.W/ANCHO; }
    function alto(){ return L.H/esc(); }
    function campo(x,y){
      var ex=0,ey=0,v=0;
      for(var i=0;i<cargas.length;i++){
        var c=cargas[i], dx=x-c.x, dy=y-c.y, r2=dx*dx+dy*dy+1e-6, r=Math.sqrt(r2), kq=K*c.q*QC;
        ex+=kq*dx/(r2*r); ey+=kq*dy/(r2*r); v+=kq/r;
      }
      return [ex,ey,v];
    }
    function pedir(){ if(pend) return; pend=true; requestAnimationFrame(function(){ pend=false; dibuja(); }); }

    function mapaPotencial(){
      var p=4, w=Math.ceil(L.W/p), h=Math.ceil(L.H/p), s=esc();
      oc.width=w; oc.height=h;
      var img=ocx.createImageData(w,h), d=img.data, cp=rgb(col("--coral")), cn=rgb(col("--pri")),
          ink=rgb(col("--ink")), niv=new Int16Array(w*h), u=new Float32Array(w*h), i, x, y;
      for(y=0;y<h;y++) for(x=0;x<w;x++){
        var v=campo((x+.5)*p/s,(y+.5)*p/s)[2], a=Math.asinh(v/8);
        u[y*w+x]=a; niv[y*w+x]=Math.floor(a/.55);
      }
      for(y=0;y<h;y++) for(x=0;x<w;x++){
        i=y*w+x; var a2=u[i], c=a2>0?cp:cn, al=Math.min(1,Math.abs(a2)/5)*150;
        var borde=(x<w-1&&niv[i]!==niv[i+1])||(y<h-1&&niv[i]!==niv[i+w]);
        if(borde){ c=ink; al=70; }
        d[i*4]=c[0]; d[i*4+1]=c[1]; d[i*4+2]=c[2]; d[i*4+3]=al;
      }
      ocx.putImageData(img,0,0);
      L.cx.imageSmoothingEnabled=true;
      L.cx.drawImage(oc,0,0,w*p,h*p);
    }

    function lineas(){
      var cx=L.cx, s=esc(), H=alto(), pos=cargas.filter(function(c){return c.q>0;}),
          neg=cargas.filter(function(c){return c.q<0;}), fuentes=pos.length?pos:neg, sg=pos.length?1:-1,
          N=16, ds=.004;
      cx.strokeStyle=col("--ink"); cx.fillStyle=col("--ink"); cx.lineWidth=1.3; cx.globalAlpha=.6;
      fuentes.forEach(function(f){
        for(var k=0;k<N;k++){
          var an=2*Math.PI*(k+.5)/N, x=f.x+.014*Math.cos(an), y=f.y+.014*Math.sin(an), pts=[[x,y]];
          for(var n=0;n<1400;n++){
            var e=campo(x,y), m=Math.hypot(e[0],e[1]); if(!m) break;
            var xm=x+sg*e[0]/m*ds/2, ym=y+sg*e[1]/m*ds/2, e2=campo(xm,ym), m2=Math.hypot(e2[0],e2[1]); if(!m2) break;
            x+=sg*e2[0]/m2*ds; y+=sg*e2[1]/m2*ds; pts.push([x,y]);
            if(x<-.3||x>ANCHO+.3||y<-.3||y>H+.3) break;
            var fin=false, dest=sg>0?neg:pos;
            for(var j=0;j<dest.length;j++) if(Math.hypot(x-dest[j].x,y-dest[j].y)<.012){ fin=true; break; }
            if(fin) break;
          }
          cx.beginPath();
          pts.forEach(function(p,i){ if(i) cx.lineTo(p[0]*s,p[1]*s); else cx.moveTo(p[0]*s,p[1]*s); });
          cx.stroke();
          var mid=Math.floor(pts.length*.45);
          if(pts.length>12){
            var a=pts[mid], b=pts[mid+1];
            if(sg<0){ var t=a; a=b; b=t; }
            var ux=b[0]-a[0], uy=b[1]-a[1], l=Math.hypot(ux,uy)||1;
            flecha(cx,a[0]*s-ux/l*2,a[1]*s-uy/l*2,a[0]*s+ux/l*4,a[1]*s+uy/l*4,6);
          }
        }
      });
      cx.globalAlpha=1;
    }

    function vectores(){
      var cx=L.cx, s=esc(), paso=Math.max(24,L.W/22);
      cx.strokeStyle=col("--pri"); cx.fillStyle=col("--pri"); cx.lineWidth=1.5;
      for(var py=paso/2;py<L.H;py+=paso) for(var px=paso/2;px<L.W;px+=paso){
        var e=campo(px/s,py/s), m=Math.hypot(e[0],e[1]); if(!m) continue;
        var l=paso*.42, ux=e[0]/m, uy=e[1]/m;
        cx.globalAlpha=Math.min(1,.15+Math.log10(1+m/20)/2.5);
        flecha(cx,px-ux*l,py-uy*l,px+ux*l,py+uy*l,5);
      }
      cx.globalAlpha=1;
    }

    function dibuja(){
      if(!L.W) return;
      var cx=L.cx, s=esc();
      cx.clearRect(0,0,L.W,L.H);
      if(cargas.length){
        if(verP.checked) mapaPotencial();
        if(verV.checked) vectores();
        if(verL.checked) lineas();
      } else {
        cx.fillStyle=col("--ink2"); cx.font="600 15px 'Plus Jakarta Sans',sans-serif"; cx.textAlign="center";
        cx.fillText("Añade una carga con los botones",L.W/2,L.H/2);
      }
      cargas.forEach(function(c){
        var x=c.x*s, y=c.y*s;
        cx.fillStyle=col(c.q>0?"--coral":"--pri"); cx.beginPath(); cx.arc(x,y,14,0,7); cx.fill();
        cx.strokeStyle=col("--card"); cx.lineWidth=2.5; cx.stroke();
        cx.fillStyle="#fff"; cx.font="800 18px sans-serif"; cx.textAlign="center"; cx.textBaseline="middle";
        cx.fillText(c.q>0?"+":"−",x,y+1);
      });
    }

    function puntero(ev){
      var r=L.cv.getBoundingClientRect(), s=esc();
      return {x:(ev.clientX-r.left)/s, y:(ev.clientY-r.top)/s};
    }
    function cercana(p){
      var s=esc(), best=-1, bd=20/s;
      cargas.forEach(function(c,i){ var d=Math.hypot(c.x-p.x,c.y-p.y); if(d<bd){ bd=d; best=i; } });
      return best;
    }
    function leer(p){
      if(!L.W) return;
      if(!cargas.length){ lee.textContent="Sin cargas: E = 0, V = 0"; return; }
      var e=campo(p.x,p.y);
      lee.textContent="E = "+fmt(Math.hypot(e[0],e[1]),"N/C")+"   ·   V = "+fmt(e[2],"V");
    }
    L.cv.addEventListener("pointerdown",function(ev){
      var p=puntero(ev), i=cercana(p), ahora=Date.now();
      if(i>=0){
        if(ultimoToque.i===i&&ahora-ultimoToque.t<350){ cargas.splice(i,1); ultimoToque={t:0,i:-1}; pedir(); return; }
        ultimoToque={t:ahora,i:i};
        arrastre=i; L.cv.setPointerCapture(ev.pointerId); L.cv.style.cursor="grabbing";
      }
      leer(p);
    });
    L.cv.addEventListener("pointermove",function(ev){
      var p=puntero(ev);
      if(arrastre!==null){
        cargas[arrastre].x=Math.max(.02,Math.min(ANCHO-.02,p.x));
        cargas[arrastre].y=Math.max(.02,Math.min(alto()-.02,p.y));
        pedir();
      }
      leer(p);
    });
    function soltar(){ arrastre=null; L.cv.style.cursor="grab"; }
    L.cv.addEventListener("pointerup",soltar); L.cv.addEventListener("pointercancel",soltar);

    var PRE={
      dipolo:[[.36,.5,1],[.64,.5,-1]],
      iguales:[[.36,.5,1],[.64,.5,1]],
      cuadrupolo:[[.38,.32,1],[.62,.32,-1],[.62,.68,1],[.38,.68,-1]],
      una:[[.5,.5,1]]
    };
    var marcaPre=segmento($("presets"),"p",function(p){ preset(p); });
    function preset(p){
      var H=alto()||ANCHO*2/3;
      cargas=PRE[p].map(function(c){ return {x:c[0]*ANCHO,y:c[1]*H,q:c[2]}; }); pedir();
    }
    function nueva(q){
      var H=alto()||ANCHO*2/3, a=Math.random()*6.28;
      cargas.push({x:.5+.18*Math.cos(a),y:H/2+.12*Math.sin(a),q:q}); marcaPre(""); pedir();
    }
    $("mas-pos").addEventListener("click",function(){ nueva(1); });
    $("mas-neg").addEventListener("click",function(){ nueva(-1); });
    $("borrar").addEventListener("click",function(){ cargas=[]; marcaPre(""); pedir(); });
    [verL,verV,verP].forEach(function(c){ c.addEventListener("change",pedir); });
    marcaPre("dipolo"); cargas=PRE.dipolo.map(function(c){ return {x:c[0],y:c[1]*ANCHO*2/3,q:c[2]}; });
  })();

  /* =====================================================================
     2. LEY DE GAUSS
     ===================================================================== */
  (function(){
    var R=.1, Q=1e-9, E0=K*Q/(R*R), tipo="aislante";
    var rIn=$("g-r"), A=lienzo($("cv-gauss"),dibuja), G=lienzo($("cv-gauss-g"),dibuja);
    var puntos=[]; // posiciones fijas para dibujar la carga
    (function(){ var s=7; function rnd(){ s=(s*16807)%2147483647; return s/2147483647; }
      for(var i=0;i<70;i++){ var r=Math.sqrt(rnd())*.92, a=rnd()*6.283; puntos.push([r*Math.cos(a),r*Math.sin(a)]); } })();

    function qenc(x){ // x = r/R
      if(tipo==="aislante") return Q*Math.min(1,x*x*x);
      if(tipo==="conductor") return x<1?0:Q;
      return Q;
    }
    function Erel(x){ return x<=0?(tipo==="puntual"?Infinity:0):qenc(x)/Q/(x*x); }

    function dibuja(){
      var x=+rIn.value, r=x*R, q=qenc(x);
      $("g-r-o").textContent=(r*100).toFixed(1).replace(".",",")+" cm  ("+x.toFixed(2).replace(".",",")+" R)";
      $("g-q").textContent=fmt(q,"C");
      $("g-f").textContent=fmt(q/EPS0,"N·m²/C");
      $("g-e").textContent=fmt(K*q/(r*r),"N/C");
      var t={
        aislante: x<1?"Dentro de la esfera aislante la carga encerrada crece como r³ y el área como r², así que E crece linealmente con r: E = kQr/R³."
                     :"Fuera, toda la carga queda encerrada y la esfera se comporta como una carga puntual: E = kQ/r².",
        conductor: x<1?"En un conductor en equilibrio toda la carga está en la superficie. La gaussiana no encierra nada, así que E = 0 dentro."
                      :"Fuera, la esfera conductora también actúa como una carga puntual en el centro: E = kQ/r².",
        puntual:"Toda gaussiana centrada encierra la carga completa. El flujo es siempre Q/ε₀, aunque E cambia como 1/r²."
      };
      $("g-expl").textContent=t[tipo];

      /* corte */
      if(A.W){
        var cx=A.cx, W=A.W, H=A.H, c={x:W/2,y:H/2}, s=Math.min(W,H)/2/3.25;
        cx.clearRect(0,0,W,H);
        var lila=col("--lila"), coral=col("--coral");
        if(tipo==="aislante"){
          cx.fillStyle=col("--lila-sv"); cx.beginPath(); cx.arc(c.x,c.y,s,0,7); cx.fill();
          cx.fillStyle=coral; puntos.forEach(function(p){ cx.beginPath(); cx.arc(c.x+p[0]*s,c.y+p[1]*s,2.2,0,7); cx.fill(); });
        } else if(tipo==="conductor"){
          cx.fillStyle=col("--bg"); cx.strokeStyle=col("--ink2"); cx.lineWidth=2;
          cx.beginPath(); cx.arc(c.x,c.y,s,0,7); cx.fill(); cx.stroke();
          cx.fillStyle=coral; for(var i=0;i<28;i++){ var a=i/28*6.283; cx.beginPath(); cx.arc(c.x+Math.cos(a)*s,c.y+Math.sin(a)*s,2.6,0,7); cx.fill(); }
        } else {
          cx.strokeStyle=col("--line"); cx.setLineDash([3,4]); cx.lineWidth=1;
          cx.beginPath(); cx.arc(c.x,c.y,s,0,7); cx.stroke(); cx.setLineDash([]);
          cx.fillStyle=coral; cx.beginPath(); cx.arc(c.x,c.y,7,0,7); cx.fill();
        }
        /* gaussiana */
        cx.strokeStyle=lila; cx.lineWidth=2.5; cx.setLineDash([7,6]);
        cx.beginPath(); cx.arc(c.x,c.y,x*s,0,7); cx.stroke(); cx.setLineDash([]);
        /* flechas de E sobre la gaussiana */
        var e=Erel(x);
        if(e>0&&isFinite(e)){
          var l=Math.min(1.4,e)*s*.55+6; cx.strokeStyle=lila; cx.fillStyle=lila; cx.lineWidth=2;
          for(var k=0;k<12;k++){ var b=k/12*6.283+.13, x0=c.x+Math.cos(b)*x*s, y0=c.y+Math.sin(b)*x*s;
            flecha(cx,x0,y0,x0+Math.cos(b)*l,y0+Math.sin(b)*l,7); }
        }
        cx.fillStyle=col("--ink2"); cx.font="700 12px 'Plus Jakarta Sans',sans-serif"; cx.textAlign="left";
        cx.fillText("R",c.x+s*.71+4,c.y-s*.71-4);
        cx.fillStyle=lila; cx.fillText("gaussiana r",Math.min(W-90,c.x+x*s*.71+6),Math.min(H-8,c.y+x*s*.71+16));
      }
      /* gráfica */
      if(G.W){
        var g=ejes(G,3,1.5,"r / R","E / (kQ/R²)",[[1,"R"],[2,"2R"],[3,"3R"]]);
        curva(G,g,function(t){ var v=Erel(t); return isFinite(v)?Math.min(v,3):3; },.001,3,col("--lila"),2.5);
        var ev=Erel(x); if(isFinite(ev)&&ev<=1.5) punto(G,g.X(x),g.Y(ev),col("--coral"));
      }
    }
    segmento($("g-tipo"),"t",function(t){ tipo=t; dibuja(); })("aislante");
    rIn.addEventListener("input",dibuja);
    dibuja();
  })();

  /* =====================================================================
     3. CONDENSADOR
     ===================================================================== */
  (function(){
    var geo="plano", bat="con";
    var P={
      plano:[["Área de las placas A","cm²",10,1000,10,100],["Separación d","mm",.5,10,.1,1]],
      cil:[["Radio interior a","cm",.5,5,.1,1],["Radio exterior b","cm",1,10,.1,2],["Largo H","cm",1,100,1,20]],
      esf:[["Radio interior a","cm",1,20,.5,12],["Radio exterior b","cm",2,30,.5,15]]
    };
    var ins=[$("c-p1"),$("c-p2"),$("c-p3")], lbs=[$("c-l1"),$("c-l2"),$("c-l3")];
    var kIn=$("c-k"), vIn=$("c-v0"), D=lienzo($("cv-cond"),dibuja), st={};

    function poner(){
      P[geo].forEach(function(p,i){
        ins[i].min=p[2]; ins[i].max=p[3]; ins[i].step=p[4]; ins[i].value=p[5];
      });
      $("c-c3").hidden=P[geo].length<3;
      calcula();
    }
    function calcula(){
      var v=ins.map(function(x){ return +x.value; }), C0;
      if(geo==="cil"||geo==="esf"){ if(v[1]<=v[0]+.05){ v[1]=+(v[0]+.1).toFixed(2); ins[1].value=v[1]; } }
      P[geo].forEach(function(p,i){
        lbs[i].innerHTML=p[0]+' <output>'+String(v[i]).replace(".",",")+" "+p[1]+'</output>';
      });
      if(geo==="plano") C0=EPS0*(v[0]*1e-4)/(v[1]*1e-3);
      else if(geo==="cil") C0=2*Math.PI*EPS0*(v[2]/100)/Math.log(v[1]/v[0]);
      else C0=4*Math.PI*EPS0*(v[0]/100)*(v[1]/100)/((v[1]-v[0])/100);
      var Kd=+kIn.value, V0=+vIn.value, C=Kd*C0, Q, V;
      if(bat==="con"){ V=V0; Q=C*V0; } else { Q=C0*V0; V=V0/Kd; }
      var U=.5*Q*V;
      $("c-k-o").textContent=Kd.toFixed(1).replace(".",",");
      $("c-v0-o").textContent=V0+" V";
      $("c-c0").textContent=fmt(C0,"F"); $("c-c").textContent=fmt(C,"F");
      $("c-q").textContent=fmt(Q,"C"); $("c-v").textContent=fmt(V,"V"); $("c-u").textContent=fmt(U,"J");
      st={v:v,K:Kd,Q:Q,Q0:C0*V0,V:V,V0:V0};
      dibuja();
    }
    function signos(cx,pts,s){
      cx.font="800 13px sans-serif"; cx.textAlign="center"; cx.textBaseline="middle";
      pts.forEach(function(p){ cx.fillText(s,p[0],p[1]); });
    }
    function dibuja(){
      if(!D.W||!st.v) return;
      var cx=D.cx, W=D.W, H=D.H, sol=col("--sol"), al=(st.K-1)/9,
          nS=Math.max(3,Math.min(18,Math.round(5*Math.sqrt(st.Q/st.Q0)))), fE=st.V/st.V0;
      cx.clearRect(0,0,W,H);
      cx.lineWidth=2;
      if(geo==="plano"){
        var gap=Math.max(40,Math.min(W*.5,st.v[1]*24)), x1=W/2-gap/2, x2=W/2+gap/2, y1=H*.15, y2=H*.85;
        cx.fillStyle=sol; cx.globalAlpha=.08+al*.45; cx.fillRect(x1,y1,gap,y2-y1); cx.globalAlpha=1;
        cx.fillStyle=col("--coral"); cx.fillRect(x1-8,y1-6,8,y2-y1+12);
        cx.fillStyle=col("--pri"); cx.fillRect(x2,y1-6,8,y2-y1+12);
        var pts=[],ptn=[]; for(var i=0;i<nS;i++){ var y=y1+(i+.5)*(y2-y1)/nS; pts.push([x1-20,y]); ptn.push([x2+20,y]); }
        cx.fillStyle=col("--coral"); signos(cx,pts,"+"); cx.fillStyle=col("--pri"); signos(cx,ptn,"−");
        cx.strokeStyle=col("--ink2"); cx.fillStyle=col("--ink2"); cx.lineWidth=1.6;
        var nl=Math.max(2,Math.round(7*fE)), L=Math.max(8,(gap-16));
        for(var j=0;j<nl;j++){ var yy=y1+(j+.5)*(y2-y1)/nl; flecha(cx,W/2-L/2,yy,W/2+L/2,yy,6); }
        cx.font="600 12px 'Plus Jakarta Sans',sans-serif"; cx.textAlign="center"; cx.fillStyle=col("--ink2");
        cx.fillText("d",W/2,y2+18);
      } else {
        var c={x:W/2,y:H/2}, s=Math.min(W,H)*.42/st.v[1], ra=st.v[0]*s, rb=st.v[1]*s;
        cx.fillStyle=sol; cx.globalAlpha=.08+al*.45; cx.beginPath(); cx.arc(c.x,c.y,rb,0,7); cx.arc(c.x,c.y,ra,0,7,true); cx.fill(); cx.globalAlpha=1;
        cx.strokeStyle=col("--pri"); cx.lineWidth=5; cx.beginPath(); cx.arc(c.x,c.y,rb,0,7); cx.stroke();
        cx.fillStyle=col("--coral"); cx.beginPath(); cx.arc(c.x,c.y,ra,0,7); cx.fill();
        var nr=Math.max(4,Math.round(14*Math.min(1.4,fE)));
        cx.strokeStyle=col("--ink2"); cx.fillStyle=col("--ink2"); cx.lineWidth=1.6;
        for(var k=0;k<nr;k++){ var a=k/nr*6.283; if(rb-ra>18) flecha(cx,c.x+Math.cos(a)*(ra+4),c.y+Math.sin(a)*(ra+4),c.x+Math.cos(a)*(rb-6),c.y+Math.sin(a)*(rb-6),6); }
        cx.fillStyle="#fff"; cx.font="800 14px sans-serif"; cx.textAlign="center"; cx.textBaseline="middle";
        if(ra>12) cx.fillText("+",c.x,c.y+1);
        cx.fillStyle=col("--ink2"); cx.font="600 12px 'Plus Jakarta Sans',sans-serif";
        cx.fillText(geo==="cil"?"corte transversal del cilindro":"corte de la esfera",c.x,H-12);
      }
      cx.fillStyle=col("--ink2"); cx.font="600 12px 'Plus Jakarta Sans',sans-serif"; cx.textAlign="left"; cx.textBaseline="top";
      cx.fillText("K = "+st.K.toFixed(1).replace(".",",")+(st.K>1?"  (dieléctrico)":"  (vacío)"),10,10);
    }
    segmento($("c-geo"),"g",function(g){ geo=g; poner(); })("plano");
    var marcaBat=segmento($("c-bat"),"b",function(b){ bat=b; calcula(); }); marcaBat("con");
    ins.concat([kIn,vIn]).forEach(function(i){ i.addEventListener("input",calcula); });
    var marcaGeo=null;
    $("c-ej").addEventListener("click",function(){
      geo="esf"; [].forEach.call($("c-geo").querySelectorAll("button"),function(b){ b.setAttribute("aria-pressed",String(b.dataset.g==="esf")); });
      poner(); ins[0].value=12; ins[1].value=15; kIn.value=5; vIn.value=300; bat="con"; marcaBat("con"); calcula();
    });
    poner();
  })();

  /* =====================================================================
     4. CIRCUITO RC
     ===================================================================== */
  (function(){
    var modo="carga", x=0, corriendo=false, t0=0, x0=0, DUR=6000;
    var rIn=$("r-r"), cIn=$("r-c"), eIn=$("r-e"), play=$("r-play"), G=lienzo($("cv-rc"),dibuja);
    function vals(){ return {R:1e3*Math.pow(10,+rIn.value), C:1e-6*Math.pow(10,+cIn.value), e:+eIn.value}; }
    function dibuja(){
      var v=vals(), tau=v.R*v.C, ex=Math.exp(-x), qn=modo==="carga"?1-ex:ex, in_=ex;
      $("r-r-o").textContent=fmt(v.R,"Ω"); $("r-c-o").textContent=fmt(v.C,"F");
      $("r-e-o").textContent=String(v.e).replace(".",",")+" V";
      $("r-tau").textContent=fmt(tau,"s"); $("r-t").textContent=fmt(x*tau,"s")+"  ("+x.toFixed(2).replace(".",",")+" τ)";
      $("r-q").textContent=fmt(v.C*v.e*qn,"C");
      $("r-i").textContent=fmt((modo==="carga"?1:-1)*v.e/v.R*in_,"A");
      /* energía */
      var E=v.C*v.e*v.e, f,uc,wr;
      if(modo==="carga"){ f=E*(1-ex); uc=.5*E*(1-ex)*(1-ex); wr=f-uc; }
      else { f=0; uc=.5*E*ex*ex; wr=.5*E*(1-ex*ex); }
      var filas=[["Fuente entrega",f,"--pri"],["En el condensador",uc,"--rosa"],["Calor en R",wr,"--sol"]];
      $("r-barras").innerHTML=filas.map(function(r){
        return '<div><span>'+r[0]+'</span><s><i style="width:'+(100*r[1]/E).toFixed(1)+'%;background:var('+r[2]+')"></i></s><b>'+fmt(r[1],"J")+'</b></div>';
      }).join("");
      if(!G.W) return;
      var g=ejes(G,5,1,"t (en unidades de τ)","fracción del máximo",[[1,"τ"],[2,"2τ"],[3,"3τ"],[4,"4τ"],[5,"5τ"]]);
      var fq=modo==="carga"?function(t){return 1-Math.exp(-t);}:function(t){return Math.exp(-t);},
          fi=function(t){return Math.exp(-t);};
      curva(G,g,fq,0,5,col("--rosa"),2,.25); curva(G,g,fi,0,5,col("--pri"),2,.25);
      if(x>0){ curva(G,g,fq,0,x,col("--rosa"),3); curva(G,g,fi,0,x,col("--pri"),3); }
      punto(G,g.X(x),g.Y(fq(x)),col("--rosa")); punto(G,g.X(x),g.Y(fi(x)),col("--pri"));
      var cx=G.cx; cx.font="700 12px 'Plus Jakarta Sans',sans-serif"; cx.textAlign="right"; cx.textBaseline="top";
      cx.fillStyle=col("--rosa"); cx.fillText("carga q / Cε",g.m.l+g.w,g.m.t+2);
      cx.fillStyle=col("--pri"); cx.fillText(modo==="carga"?"corriente i / (ε/R)":"|corriente| / (ε/R)",g.m.l+g.w,g.m.t+18);
      if(modo==="carga"){ cx.fillStyle=col("--ink2"); cx.textAlign="left"; cx.fillText("63 %",g.X(1)+5,g.Y(.632)+4); }
    }
    function paso(ts){
      if(!corriendo) return;
      x=Math.min(5,x0+(ts-t0)/DUR*5); dibuja();
      if(x>=5){ corriendo=false; play.textContent="Repetir"; return; }
      requestAnimationFrame(paso);
    }
    play.addEventListener("click",function(){
      if(corriendo){ corriendo=false; play.textContent="Seguir"; return; }
      if(x>=5) x=0;
      corriendo=true; x0=x; play.textContent="Pausa";
      requestAnimationFrame(function(ts){ t0=ts; paso(ts); });
    });
    $("r-reset").addEventListener("click",function(){ corriendo=false; x=0; play.textContent="Iniciar"; dibuja(); });
    segmento($("r-modo"),"m",function(m){ modo=m; corriendo=false; x=0; play.textContent="Iniciar"; dibuja(); })("carga");
    [rIn,cIn,eIn].forEach(function(i){ i.addEventListener("input",dibuja); });
    dibuja();
  })();

  document.addEventListener("cc-tema",function(){ redibujos.forEach(function(f){ f(); }); });
  abrir(location.hash.slice(1));
});
