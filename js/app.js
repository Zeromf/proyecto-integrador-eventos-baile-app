const TOKEN = "4VNDIVBJAW6OUHOTOWVL"; // tu token
const API = "https://www.eventbriteapi.com/v3/events/search/";

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
  const fmt = (d) => d.toISOString().slice(0,16); // YYYY-MM-DDTHH:mm

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

function setTime(date, hh, mm=0){ const d = new Date(date); d.setHours(hh, mm, 0, 0); return d; }
function capitalize(s){ return s.charAt(0).toUpperCase()+s.slice(1); }

/* --------- helpers --------- */
function buildUrl(q, page = 1, fecha = "", ubic = "") {
  const params = new URLSearchParams({
    q,
    "location.address": ubic || "Argentina",
    "location.within": "300km",
    expand: "venue",
    sort_by: "date",
    page: String(page),
    token: TOKEN
  });
  // fecha: usa keywords válidos para Eventbrite (today, this_week, next_week)
  if (fecha) params.append("start_date.keyword", fecha);
  return `${API}?${params.toString()}`;
}

function formatDateTime(isoLocal){
  if(!isoLocal) return "Fecha a confirmar";
  const d = new Date(isoLocal);
  const fecha = d.toLocaleDateString(undefined, { weekday:"short", day:"2-digit", month:"short" });
  const hora  = d.toLocaleTimeString(undefined, { hour:"2-digit", minute:"2-digit" });
  return `${fecha} • ${hora}`;
}

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
        <img loading="lazy" src="${img}" alt="${evt.name.text}">
        <div class="content">
          <h3>${evt.name.text}</h3>
          <p>🗓️ ${fecha}</p>
          <p>📍 ${lugar}</p>
          <a class="btn" href="${evt.url}" target="_blank" rel="noopener">Ver más</a>
        </div>
      </article>
    `);
  });
}

function renderPaginacion(pagination, q, fecha, ubic){
  const $p = $("#paginacion").empty();
  if (!pagination || pagination.page_count <= 1) return;

  const { page_number, has_more_items } = pagination;
  if (page_number > 1) $p.append(`<button id="prevPage">Anterior</button>`);
  if (has_more_items)  $p.append(`<button id="nextPage">Siguiente</button>`);

  $("#prevPage").on("click", () => buscarEventos(q, page_number - 1, fecha, ubic));
  $("#nextPage").on("click", () => buscarEventos(q, page_number + 1, fecha, ubic));
}

/* --------- flujo principal --------- */
function buscarEventos(query, page = 1, fecha = "", ubic = "") {
  $("#qActual").val(query);
  $.ajax({
    url: buildUrl(query, page, fecha, ubic),
    method: "GET",
    dataType: "json",
    success: (data) => {
      renderEventos(data?.events);
      renderPaginacion(data?.pagination, query, fecha, ubic);
    },
    error: (xhr) => {
      console.warn("API error:", xhr.status, xhr.responseText);
      renderEventos(fallbackData(query));
      $("#paginacion").empty();
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
