/* ===========================
   Eventbrite – Demo
   =========================== */

// token queda visible en el front 
const TOKEN  = "4VNDIVBJAW6OUHOTOWVL";
const ORG_ID = "2892465566371";

// se puede usar la búsqueda general o por organización
const API = `https://www.eventbriteapi.com/v3/organizations/${ORG_ID}/events/?expand=venue&status=all`;

/* --------- Fallback local si la API falla --------- */
const FALLBACK_IMAGES = {
  salsa:  "https://www.chassedance.es/wp-content/uploads/2024/06/Como-bailar-bachata.jpg",
  bachata:"https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcS_vD8WpIciJ8b9pCeDP4erfalp02n5oUiK1Q&s",
  kizomba:"https://images.unsplash.com/photo-1519741497674-611481863552?q=80&w=1200&auto=format&fit=crop",
  zumba:  "https://images.unsplash.com/photo-1520974769355-4f2d6d3a31a5?q=80&w=1200&auto=format&fit=crop",
  default:"https://via.placeholder.com/1200x675?text=Clase+de+baile"
};

function fallbackData(tipo = "salsa") {
  const baseImg = FALLBACK_IMAGES[tipo] || FALLBACK_IMAGES.default;
  const hoy = new Date();
  const addDays = (n) => new Date(hoy.getTime() + n*24*60*60*1000);
  const fmt = (d) => d.toISOString().slice(0,16);

  return [
    {
      id: "fb1",
      name: { text: `Clase de ${capitalize(tipo)} Inicial` },
      start: { local: fmt(setTime(addDays(1), 19, 0)) },
      url: "#",
      logo: { url: baseImg },
      venue: { address: { localized_address_display: "Estudio Centro, La Plata" } }
    },
    {
      id: "fb2",
      name: { text: `Taller Intensivo de ${capitalize(tipo)}` },
      start: { local: fmt(setTime(addDays(3), 20, 30)) },
      url: "#",
      logo: { url: baseImg },
      venue: { address: { localized_address_display: "Sala 2, City Bell" } }
    },
    {
      id: "fb3",
      name: { text: `Práctica guiada de ${capitalize(tipo)}` },
      start: { local: fmt(setTime(addDays(5), 18, 0)) },
      url: "#",
      logo: { url: baseImg },
      venue: { address: { localized_address_display: "Club Social, Tolosa" } }
    }
  ];
}

/* --------- filtros en memoria --------- */
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
    const now = new Date();
    const start = new Date();
    const end = new Date();

    if (fecha === "today") {
      start.setHours(0,0,0,0);
      end.setHours(23,59,59,999);
    } else if (fecha === "this_week") {
      const day = now.getDay(); // 0=dom
      start.setHours(0,0,0,0);
      end.setDate(now.getDate() + (7 - day));
      end.setHours(23,59,59,999);
    } else if (fecha === "next_week") {
      const day = now.getDay();
      const nextMon = new Date(now);
      nextMon.setDate(now.getDate() + (8 - (day || 7)));
      nextMon.setHours(0,0,0,0);
      const nextSun = new Date(nextMon);
      nextSun.setDate(nextMon.getDate() + 6);
      nextSun.setHours(23,59,59,999);
      start.setTime(nextMon.getTime());
      end.setTime(nextSun.getTime());
    }

    if (fecha === "today" || fecha === "this_week" || fecha === "next_week") {
      out = out.filter(e => {
        const when = e.start?.utc || e.start?.local;
        if (!when) return false;
        const d = new Date(when);
        return d >= start && d <= end;
      });
    }
  }

  return out;
}

function setTime(date, hh, mm=0){ const d = new Date(date); d.setHours(hh, mm, 0, 0); return d; }
function capitalize(s){ return s ? s.charAt(0).toUpperCase()+s.slice(1) : s; }

function formatDateTime(isoLocal){
  if(!isoLocal) return "Fecha a confirmar";
  const d = new Date(isoLocal);
  const fecha = d.toLocaleDateString(undefined, { weekday:"short", day:"2-digit", month:"short" });
  const hora  = d.toLocaleTimeString(undefined, { hour:"2-digit", minute:"2-digit" });
  return `${fecha} • ${hora}`;
}

/* --------- render --------- */
function renderEventos(arr){
  const $res = $("#resultados").empty();
  if (!arr || arr.length === 0) {
    $res.html(`<p class="empty">No se encontraron eventos.</p>`);
    return;
  }

  arr.slice(0,10).forEach(evt => {
    const img   = evt.logo?.url || FALLBACK_IMAGES.default;
    const fecha = formatDateTime(evt.start?.local);
    const lugar = evt.venue?.address?.localized_address_display || "Online / Lugar no disponible";

    $res.append(`
      <article class="evento">
        <img loading="lazy" src="${img}" alt="${evt.name?.text || 'Evento'}">
        <div class="content">
          <h3>${evt.name?.text || 'Evento'}</h3>
          <p>🗓️ ${fecha}</p>
          <p>📍 ${lugar}</p>
          <a class="btn" href="${evt.url || '#'}" target="_blank" rel="noopener">Ver más</a>
        </div>
      </article>
    `);
  });
}

function renderPaginacion(){ $("#paginacion").empty(); } // listamos todo junto

/* --------- flujo principal --------- */
function buscarEventos(query, _page = 1, fecha = "", ubic = "") {
  $.ajax({
    url: API,
    method: "GET",
    dataType: "json",
    timeout: 12000,
    headers: {
      "Authorization": `Bearer ${TOKEN}`
    },
    success: (data) => {
      const filtrados = filtrarEventos(data?.events, { q: query, fecha, ubic });
      renderEventos(filtrados);
      renderPaginacion();
    },
    error: (_xhr, _status, err) => {
      // Si falla (CORS/401/etc.), mostramos fallback para no romper la UX
      console.warn("Fallo la llamada directa a Eventbrite:", err);
      renderEventos(fallbackData(query));
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
  const q = $("#txtBuscar").val().trim() || "salsa";
  const fecha = $("#selFecha").val();
  const ubic  = $("#selUbicacion").val();
  buscarEventos(q, 1, fecha, ubic);
});

$("#txtBuscar").on("keydown", function(e){
  if (e.key === "Enter") $("#btnBuscar").click();
});

/* Primera carga */
$(function(){ buscarEventos("salsa"); });
