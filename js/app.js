/* ===========================
   Eventbrite + Calendario (Google) + Paginación
   =========================== */

/* ========== Config ========== */
const TOKEN  = "4VNDIVBJAW6OUHOTOWVL";   // token personal (demo)
const ORG_ID = "2892465566371";          // organización
const API_BASE = `https://www.eventbriteapi.com/v3/organizations/${ORG_ID}/events/?expand=venue&status=all&order_by=start_asc&locale=es_AR`;
// const API_BASE = `https://cors.isomorphic-git.org/https://www.eventbriteapi.com/v3/organizations/${ORG_ID}/events/?expand=venue&status=all&order_by=start_asc&locale=es_AR`; // pruebas sin CORS

/* ========== Estado de paginación ========== */
const PAGE_SIZE = 3;
window._pagination = {
  data: [],
  page: 1,
  pageSize: PAGE_SIZE
};

/* ========== Fallback imágenes si la API falla ========== */
const FALLBACK_IMAGES = {
  salsa:  "https://www.chassedance.es/wp-content/uploads/2024/06/Como-bailar-bachata.jpg",
  bachata:"https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcS_vD8WpIciJ8b9pCeDP4erfalp02n5oUiK1Q&s",
  kizomba:"https://images.unsplash.com/photo-1519741497674-611481863552?q=80&w=1200&auto=format&fit=crop",
  zumba:  "https://images.unsplash.com/photo-1520974769355-4f2d6d3a31a5?q=80&w=1200&auto=format&fit=crop",
  default:"https://via.placeholder.com/1200x675?text=Evento"
};

/* ========== Helpers generales ========== */
function setTime(date, hh, mm=0){ const d=new Date(date); d.setHours(hh,mm,0,0); return d; }
function capitalize(s){ return s? s.charAt(0).toUpperCase()+s.slice(1): s; }
function clamp(n,min,max){ return Math.max(min, Math.min(max, n)); }

/* --------- fechas legibles en español --------- */
function formatDateTime(iso){
  if(!iso) return "Fecha a confirmar";
  const d = new Date(iso);
  const f = d.toLocaleDateString("es-AR",{weekday:"short",day:"2-digit",month:"short"});
  const h = d.toLocaleTimeString("es-AR",{hour:"2-digit",minute:"2-digit"});
  return `${f} • ${h}`;
}

/* --------- filtro en memoria --------- */
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
  const label = STATUS_ES[status] || status;
  return `<span class="chip chip-${status}">${label}</span>`;
}

/* --------- chip de precio (Gratis / Pago) --------- */
function precioChip(evt){
  if (evt?.is_free === true) return `<span class="chip chip-free">Gratis</span>`;
  return `<span class="chip chip-paid">Pago</span>`;
}

/* ========== Helpers Calendario (Google) ========== */
function toUTCStamp(iso){
  const d = new Date(iso);
  return d.toISOString().replace(/[-:]/g,"").split(".")[0]+"Z";
}
function addHours(iso, h=2){
  const d = new Date(iso || Date.now());
  d.setHours(d.getHours()+h);
  return d.toISOString();
}

/* ========== Render tarjetas de una página ========== */
function renderEventos(arr, page=1, pageSize=PAGE_SIZE){
  const $res = $("#resultados").empty();
  if (!arr || !arr.length) {
    $("#paginacion").empty();
    return $res.html(`<p class="empty">No se encontraron eventos.</p>`);
  }

  const total = arr.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const current = clamp(page, 1, totalPages);
  const start = (current - 1) * pageSize;
  const end = start + pageSize;
  const pageItems = arr.slice(start, end);

  pageItems.forEach(evt => {
    const img    = evt.logo?.url || FALLBACK_IMAGES.default;
    const fecha  = formatDateTime(evt.start?.local || evt.start?.utc);
    const lugar  = evt.venue?.address?.localized_address_display || "Online / Sin dirección";
    const estado = evt.status;

    // Google Calendar
    const startUtc = toUTCStamp(evt.start?.utc || evt.start?.local);
    const endUtc   = toUTCStamp(evt.end?.utc   || addHours(evt.start?.utc || evt.start?.local, 2));
    const gcalUrl  = `https://www.google.com/calendar/render?action=TEMPLATE&text=${
      encodeURIComponent(evt.name?.text || 'Evento')
    }&dates=${startUtc}/${endUtc}&details=${
      encodeURIComponent((evt.summary || "") + (evt.url ? `\n\nMás info: ${evt.url}` : ""))
    }&location=${encodeURIComponent(lugar)}&sf=true&output=xml`;

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
          <div class="evento-actions">
            <a class="btn btn-detalle" data-id="${evt.id}">Ver más</a>
             <div class="quick-actions">
            <!-- Calendario -->
            <a href="${gcalUrl}" class="icon-btn" target="_blank" rel="noopener" title="Agregar al calendario">
              <i class="fa-regular fa-calendar"></i>
            </a>
            <!-- Compartir con amigo (WhatsApp / link) -->
            <a href="https://wa.me/?text=${encodeURIComponent(evt.name?.text + ' ' + evt.url)}" 
              class="icon-btn" target="_blank" rel="noopener" title="Compartir con un amigo">
              <i class="fa-brands fa-whatsapp"></i>
            </a>
          </div>
          </div>
        </div>
      </article>
    `);
    
  });

  renderPaginacion(totalPages, current);
}

/* ========== Render paginación ========== */
function renderPaginacion(totalPages=1, current=1){
  const $p = $("#paginacion").empty();

  // si querés ocultar los controles cuando hay 1 página, dejá esta línea:
  if (totalPages <= 1) return;

  const btn = (label, page, isActive=false, isDisabled=false) => `
    <button class="page-btn ${isActive ? 'is-active' : ''}" data-page="${page}" ${isDisabled?'disabled':''}>
      ${label}
    </button>`;

  let html = "";
  html += btn("« Anterior", Math.max(1, current-1), false, current===1);

  for (let i = 1; i <= totalPages; i++) {
    html += btn(String(i), i, i===current);
  }

  html += btn("Siguiente »", Math.min(totalPages, current+1), false, current===totalPages);
  $p.html(html);
}



/* ========== Flujo principal ========== */
function buscarEventos(query="", _page=1, fecha="", ubic=""){
  $.ajax({
    url: API_BASE,
    method: "GET",
    dataType: "json",
    timeout: 12000,
    headers: { "Authorization": `Bearer ${TOKEN}` },
    success: (data) => {
      const filtrados = filtrarEventos(data?.events, { q: query, fecha, ubic });
      window._pagination.data = filtrados;
      window._pagination.page = 1;
      renderEventos(window._pagination.data, window._pagination.page, window._pagination.pageSize);
    },
    error: (_xhr, _status, err) => {
      console.warn("Fallo llamada directa a Eventbrite:", err);
      const baseImg = query && FALLBACK_IMAGES[query] ? query : "default";
      const hoy = new Date();
      const addDays = (n) => new Date(hoy.getTime() + n*864e5);
      const fmt = (d) => d.toISOString().slice(0,16);
      const fake = Array.from({length:15}, (_,i)=>({
        id:"fb"+i,
        name:{text:`${capitalize(query||"Bachata")} demo ${i+1}`},
        start:{local:fmt(setTime(addDays(i+1), 19+(i%3), 0))},
        url:"#",
        logo:{url:FALLBACK_IMAGES[baseImg]},
        venue:{address:{localized_address_display:"Demo venue"}}
      }));
      window._pagination.data = fake;
      window._pagination.page = 1;
      renderEventos(window._pagination.data, window._pagination.page, window._pagination.pageSize);
    }
  });
}

/* ========== Listeners ========== */
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
$(document).on("click", "#paginacion .page-btn", function(){
  const raw = $(this).data("page");
  const totalPages = Math.max(1, Math.ceil((window._pagination.data?.length || 0) / window._pagination.pageSize));
  let next = parseInt(raw, 10);
  if (isNaN(next)) return;
  next = clamp(next, 1, totalPages);
  if (next === window._pagination.page) return;
  window._pagination.page = next;
  renderEventos(window._pagination.data, window._pagination.page, window._pagination.pageSize);
});

$(document).on("click", ".btn-detalle", function(e){
  e.preventDefault();
  const id = $(this).data("id");
  abrirDetalleEvento(id);
});

/* Primera carga */
$(function(){ buscarEventos(""); });
