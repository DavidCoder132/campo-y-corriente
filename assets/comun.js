/* Cabecera, pie, tema claro/oscuro y render de fórmulas (KaTeX), comunes a todas las páginas. */
(function(){
  "use strict";

  var PAGINAS = [
    ["index.html","Inicio"],
    ["teoria.html","Teoría"],
    ["demostraciones.html","Demostraciones"],
    ["simuladores.html","Simuladores"],
    ["problemas.html","Problemas"],
    ["formulario.html","Formulario"],
    ["laboratorios.html","Laboratorios"]
  ];
  var actual = location.pathname.split("/").pop() || "index.html";

  var ICO_SOL = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="4.2"/><path d="M12 2v2.2M12 19.8V22M4.9 4.9l1.6 1.6M17.5 17.5l1.6 1.6M2 12h2.2M19.8 12H22M4.9 19.1l1.6-1.6M17.5 6.5l1.6-1.6"/></svg>';
  var ICO_LUNA = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.5 14.5A8.5 8.5 0 0 1 9.5 3.5a8.5 8.5 0 1 0 11 11z"/></svg>';
  var ICO_MENU = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 7h16M4 12h16M4 17h16"/></svg>';
  var LOGO = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2 5 13.5h6L10 22l8-11.5h-6z"/></svg>';

  function guardar(k,v){ try{ localStorage.setItem(k,v); }catch(e){} }
  function leer(k){ try{ return localStorage.getItem(k); }catch(e){ return null; } }

  function oscuroAhora(){
    return document.documentElement.getAttribute("data-theme")==="dark";
  }

  function cabecera(){
    var h=document.getElementById("cabecera"); if(!h) return;
    var links=PAGINAS.map(function(p){
      return '<a href="'+p[0]+'"'+(p[0]===actual?' aria-current="page"':'')+'>'+p[1]+'</a>';
    }).join("");
    h.className="top";
    h.innerHTML='<div class="env top-in">'+
      '<a class="marca" href="index.html"><span class="marca-logo">'+LOGO+'</span>'+
      '<span><b>Campo y Corriente</b><small>Física II · Electromagnetismo</small></span></a>'+
      '<nav class="nav" id="nav" aria-label="Principal">'+links+'</nav>'+
      '<button class="icon-btn" id="tema" type="button" aria-label="Cambiar tema claro u oscuro"></button>'+
      '<button class="icon-btn menu-btn" id="menu" type="button" aria-label="Abrir menú" aria-expanded="false" aria-controls="nav">'+ICO_MENU+'</button>'+
      '</div>';

    var bt=document.getElementById("tema");
    function pintaTema(){ bt.innerHTML=oscuroAhora()?ICO_SOL:ICO_LUNA; }
    pintaTema();
    bt.addEventListener("click",function(){
      var nuevo=oscuroAhora()?"light":"dark";
      document.documentElement.setAttribute("data-theme",nuevo);
      guardar("cc-tema",nuevo); pintaTema();
      document.dispatchEvent(new CustomEvent("cc-tema"));
    });

    var bm=document.getElementById("menu"), nav=document.getElementById("nav");
    bm.addEventListener("click",function(){
      var a=nav.classList.toggle("abierto");
      bm.setAttribute("aria-expanded",String(a));
    });
  }

  function pie(){
    var f=document.getElementById("pie"); if(!f) return;
    f.className="pie";
    f.innerHTML='<div class="env pie-in">'+
      '<span><b>Campo y Corriente</b> · guía de estudio de Física II · Alumno: <b>David Gustavo Vargas Espinoza</b></span>'+
      '<span><a href="formulario.html">Formulario</a> · <a href="simuladores.html">Simuladores</a> · '+
      '<a href="https://github.com/DavidCoder132/campo-y-corriente">Código en GitHub</a></span></div>';
  }

  /* Render de LaTeX: \( … \) en línea y \[ … \] en bloque. */
  function math(el){
    if(!window.renderMathInElement) return;
    window.renderMathInElement(el||document.body,{
      delimiters:[{left:"\\[",right:"\\]",display:true},{left:"\\(",right:"\\)",display:false}],
      throwOnError:false
    });
  }

  /* Lee un color de las variables CSS (para los canvas). */
  function color(nombre){
    return getComputedStyle(document.documentElement).getPropertyValue(nombre).trim();
  }

  window.CC={math:math,color:color,guardar:guardar,leer:leer};

  cabecera(); pie();
  if(window.renderMathInElement) math();
  else window.addEventListener("load",function(){ math(); });
})();
