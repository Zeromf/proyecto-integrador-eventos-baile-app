/* ===========================
   Eventbrite – SIN Node
   =========================== */

// ⚠️ El token queda visible en el front 
const TOKEN  = "4VNDIVBJAW6OUHOTOWVL";   //token
const ORG_ID = "2892465566371";          //organización

// + forzamos locale a es-AR
const API_BASE = `https://www.eventbriteapi.com/v3/organizations/${ORG_ID}/events/?expand=venue&status=all&order_by=start_asc&locale=es_AR`;

// Si te choca CORS en el navegador, activá esta línea y comentá la de arriba (solo pruebas)
// const API_BASE = `https://cors.isomorphic-git.org/https://www.eventbriteapi.com/v3/organizations/${ORG_ID}/events/?expand=venue&status=all&order_by=start_asc&locale=es_AR`;

/* --------- Fallback si la API falla --------- */
const FALLBACK_IMAGES = {
  salsa:  "https://www.chassedance.es/wp-content/uploads/2024/06/Como-bailar-bachata.jpg",
  bachata:"https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcS_vD8WpIciJ8b9pCeDP4erfalp02n5oUiK1Q&s",
  kizomba:"https://images.unsplash.com/photo-1519741497674-611481863552?q=80&w=1200&auto=format&fit=crop",
  zumba:  "https://images.unsplash.com/photo-1520974769355-4f2d6d3a31a5?q=80&w=1200&auto=format&fit=crop",
  default:"https://via.placeholder.com/1200x675?text=Evento"
};

function setTime(date, hh, mm=0){ const d=new Date(date); d.setHours(hh,mm,0,0); return d; }
function capitalize(s){ return s? s.charAt(0).toUpperCase()+s.slice(1): s; }

/* --------- fechas en español --------- */
function formatDateTime(iso){
  if(!iso) return "Fecha a confirmar";
  const d = new Date(iso);
  const f = d.toLocaleDateString("es-AR",{weekday:"short",day:"2-digit",month:"short"});
  const h = d.toLocaleTimeString("es-AR",{hour:"2-digit",minute:"2-digit"});
  return `${f} • ${h}`;
}

/* --------- filtro en memoria (opcional por palabra/fecha/ubicación) --------- */
function filtrarEventos(events, { q, fecha, ubic }) {
  let out = Array.isArray(events) ? events : [];

  if (q) {
    const k = q.toLowerCase();
    out = out.filter(e =>
      (e.name?.text || "").toLowerCase().includes(k) ||
      (e.summary || "").toLowerCase().includes(k)
    );
  }
  if (ubic) {
    const k = ubic.toLowerCase();
    out = out.filter(e =>
      (e.venue?.address?.localized_address_display || "").toLowerCase().includes(k)
    );
  }
  if (fecha) {
    const now=new Date(), start=new Date(), end=new Date();
    if (fecha==="today"){ start.setHours(0,0,0,0); end.setHours(23,59,59,999); }
    else if (fecha==="this_week"){ const day=now.getDay(); start.setHours(0,0,0,0); end.setDate(now.getDate()+(7-day)); end.setHours(23,59,59,999); }
    else if (fecha==="next_week"){
      const day=now.getDay();
      const nextMon=new Date(now);
      nextMon.setDate(now.getDate()+(8-(day||7)));
      nextMon.setHours(0,0,0,0);
      const nextSun=new Date(nextMon);
      nextSun.setDate(nextMon.getDate()+6);
      nextSun.setHours(23,59,59,999);
      start.setTime(nextMon.getTime());
      end.setTime(nextSun.getTime());
    }
    out = out.filter(e => {
      const w=e.start?.utc||e.start?.local;
      if(!w) return false;
      const d=new Date(w);
      return d>=start && d<=end;
    });
  }
  return out;
}

/* --------- estados en español --------- */
const STATUS_ES = {
  draft:     "Borrador",
  live:      "Publicado",
  started:   "En curso",
  ended:     "Finalizado",
  canceled:  "Cancelado",
  completed: "Completado"
};

function estadoChip(status){
  if(!status) return "";
  const label = STATUS_ES[status] || status; // fallback si aparece uno nuevo
  return `<span class="chip chip-${status}">${label}</span>`;
}

/* --------- chip de precio (Gratis / Pago) --------- */
function precioChip(evt){
  if (evt?.is_free === true) {
    return `<span class="chip chip-free">Gratis</span>`;
  }
  // Si querés solo "Pago" sin precio:
  return `<span class="chip chip-paid">Pago</span>`;

  // Si más adelante querés mostrar precio real, podés leer:
  // evt.ticket_availability?.minimum_ticket_price?.major_value / currency
  // y armar un label con Intl.NumberFormat("es-AR", { style: "currency", currency })
}

/* --------- render --------- */
function renderEventos(arr){
  const $res = $("#resultados").empty();
  if (!arr || !arr.length) return $res.html(`<p class="empty">No se encontraron eventos.</p>`);

  arr.slice(0, 20).forEach(evt => {
    const img    = evt.logo?.url || FALLBACK_IMAGES.default;
    const fecha  = formatDateTime(evt.start?.local || evt.start?.utc);
    const lugar  = evt.venue?.address?.localized_address_display || "Online / Sin dirección";
    const estado = evt.status; // 'draft' | 'live' | 'started' | 'ended' | 'canceled' ...

    $res.append(`
      <article class="evento">
        <img loading="lazy" src="${img}" alt="${evt.name?.text || 'Evento'}">
        <div class="content">
          <div class="tags">
            ${estadoChip(estado)}
            ${precioChip(evt)}
          </div>
          <h3>${evt.name?.text || 'Evento'}</h3>
          <ul class="evento-meta">
            <li>🗓️ ${fecha}</li>
            <li>📍 ${lugar}</li>
          </ul>
          <a class="btn" href="${evt.url || '#'}" target="_blank" rel="noopener">Ver más</a>
        </div>
      </article>
    `);
  });
}

function renderPaginacion(){ $("#paginacion").empty(); }

/* --------- flujo principal --------- */
function buscarEventos(query="", _page=1, fecha="", ubic=""){
  $.ajax({
    url: API_BASE,
    method: "GET",
    dataType: "json",
    timeout: 12000,
    headers: { "Authorization": `Bearer ${TOKEN}` },
    success: (data) => {
      const filtrados = filtrarEventos(data?.events, { q: query, fecha, ubic });
      renderEventos(filtrados);
      renderPaginacion();
    },
    error: (_xhr, _status, err) => {
      console.warn("Fallo llamada directa a Eventbrite:", err);
      // Fallback simple con la palabra buscada
      const baseImg = query && FALLBACK_IMAGES[query] ? query : "default";
      const hoy = new Date();
      const addDays = (n) => new Date(hoy.getTime() + n*864e5);
      const fmt = (d) => d.toISOString().slice(0,16);
      const fake = ["a","b","c"].map((_,i)=>({
        id:"fb"+i,
        name:{text:`${capitalize(query||"Bachata")} demo ${i+1}`},
        start:{local:fmt(setTime(addDays(i+1), 19+i, 0))},
        url:"#",
        logo:{url:FALLBACK_IMAGES[baseImg]},
        venue:{address:{localized_address_display:"Demo venue"}}
      }));
      renderEventos(fake);
      renderPaginacion();
    }
  });
}

/* --------- Listeners --------- */
$(document).on("click", ".filtro", function(e){
  e.preventDefault();
  const cat = $(this).data("cat");
  $("#txtBuscar").val(cat);
  buscarEventos(cat);
});
$("#btnBuscar").on("click", function(){
  const q = $("#txtBuscar").val().trim();
  const fecha = $("#selFecha").val();
  const ubic  = $("#selUbicacion").val();
  buscarEventos(q, 1, fecha, ubic);
});
$("#txtBuscar").on("keydown", e => { if (e.key === "Enter") $("#btnBuscar").click(); });

/* Primera carga */
$(function(){ buscarEventos(""); });
