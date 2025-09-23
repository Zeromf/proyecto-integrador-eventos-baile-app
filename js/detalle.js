document.addEventListener("DOMContentLoaded", () => {
  // Cerrar modal
  document.getElementById("btnCerrarModal").addEventListener("click", () => {
    document.getElementById("modalDetalle").style.display = "none";
  });

  // Abrir detalle con el id correcto (botones con .btn-detalle y data-id)
  document.addEventListener("click", (e) => {
    const btn = e.target.closest(".btn-detalle");
    if (btn) {
      const eventoId = btn.getAttribute("data-id");
      abrirDetalleEvento(eventoId);
      document.getElementById("modalDetalle").style.display = "flex";
    }
  });
});

// ===================
// Ayudas de formato
// ===================
function toUTCStamp(iso) {
  const d = new Date(iso);
  return d.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
}
function addHours(iso, h = 2) {
  const d = new Date(iso || Date.now());
  d.setHours(d.getHours() + h);
  return d.toISOString();
}

// ===================
// Precio (Eventbrite)
// ===================
async function renderPrecio(eventoId, container, evento) {
  try {
    const res = await fetch(`https://www.eventbriteapi.com/v3/events/${eventoId}/ticket_classes/?token=${TOKEN}`);
    const data = await res.json();

    let precioHtml = "<p><strong>Precio:</strong> Gratis</p>";
    let precioNumerico = 0;

    if (data.ticket_classes?.length) {
      const pagos = data.ticket_classes.filter(tc => !tc.free && tc.cost);
      if (pagos.length) {
        const primero = pagos[0]; // primer ticket pago
        precioNumerico = parseFloat(primero.cost.major_value);
        precioHtml = `<p><strong>Precio:</strong> ${formatPrecioARS(precioNumerico, primero.cost.currency)}</p>`;
      }
    }

    // Guardamos precio crudo en el objeto del evento (para carrito)
    evento.ticket_price = precioNumerico;

    container.insertAdjacentHTML("beforeend", precioHtml);
  } catch {
    container.insertAdjacentHTML("beforeend", "<p><strong>Precio:</strong> No disponible</p>");
  }
}

// ===================
// Mapa (Leaflet)
// ===================
function renderMapa(evento, lugar) {
  const mapaDiv = document.getElementById("mapaEvento");
  if (evento.venue?.latitude && evento.venue?.longitude) {
    const lat = parseFloat(evento.venue.latitude);
    const lng = parseFloat(evento.venue.longitude);
    const mapa = L.map(mapaDiv).setView([lat, lng], 15);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap",
    }).addTo(mapa);

    L.marker([lat, lng]).addTo(mapa)
      .bindPopup(`<b>${evento.name?.text}</b><br>${lugar}`)
      .openPopup();
  } else {
    mapaDiv.innerHTML = "<p>No hay coordenadas disponibles para este evento.</p>";
  }
}

// ===================
// Detalle del evento
// ===================
async function abrirDetalleEvento(eventoId) {
  const evento = window._pagination?.data?.find(e => String(e.id) === String(eventoId));
  if (!evento) {
    alert("No se encontró el evento");
    return;
  }

  const detalleDiv = document.getElementById("detalleEvento");

  const fecha = formatDateTime(evento.start?.local || evento.start?.utc);
  const lugar = evento.venue?.address?.localized_address_display || "Online / Sin dirección";
  const desc  = evento.description?.text || evento.summary || "Sin descripción";

  // --- Google Calendar ---
  const startUtc = toUTCStamp(evento.start?.utc || evento.start?.local);
  const endUtc   = toUTCStamp(evento.end?.utc || addHours(evento.start?.utc || evento.start?.local, 2));
  const gcalUrl  = `https://www.google.com/calendar/render?action=TEMPLATE&text=${
    encodeURIComponent(evento.name?.text || "Evento")
  }&dates=${startUtc}/${endUtc}&details=${
    encodeURIComponent((desc || "") + (evento.url ? `\n\nMás info: ${evento.url}` : ""))
  }&location=${encodeURIComponent(lugar)}&sf=true&output=xml`;

  // --- WhatsApp ---
  const waMsg =
    `Hola! Te comparto este evento:\n\n` +
    `*Nombre:* ${evento.name?.text || "Evento"}\n` +
    `*Fecha:* ${fecha}\n` +
    `*Lugar:* ${lugar}`;
  const waUrl = `https://wa.me/?text=${encodeURIComponent(waMsg)}`;

  // --- Encuesta: construir URL con datos del evento ---
  const encuestaUrl = new URL("encuesta.html", location.href);
  encuestaUrl.searchParams.set("evento", evento.name?.text || "Evento");
  encuestaUrl.searchParams.set("fecha", fecha);
  encuestaUrl.searchParams.set("lugar", lugar);

  // --- Render del modal ---
  detalleDiv.innerHTML = `
    <h3>${evento.name?.text || "Evento"}</h3>



    <div id="mapaEvento" style="width: 100%; height: 250px; border-radius: 8px; margin-top: 1rem;"></div>
    <p><strong>Fecha:</strong> ${fecha}</p>
    <p><strong>Ubicación:</strong> ${lugar}</p>
    <p><strong>Descripción:</strong> ${desc}</p>
    <div id="precioContainer"></div>

    <div class="highlights">
      ${precioChip(evento)}
      ${estadoChip(evento.status)}
    </div>

    <div class="detalle-actions">
      <div class="btn-comprar-container">
        <button class="btn btn-comprar" data-id="${evento.id}">
          <i class="fa-solid fa-cart-plus"></i> Agregar al carrito
        </button>
      </div>

      <!-- Botón Encuesta -->
      <a class="btn btn-primary btn-encuesta" href="${encuestaUrl.toString()}" title="Completar encuesta">
        <i class="fa-regular fa-clipboard"></i> Encuesta
      </a>

      <div class="icon-btns">
        <a href="${gcalUrl}" class="icon-btn" target="_blank" title="Agregar al calendario">
          <i class="fa-regular fa-calendar"></i>
        </a>
        <a href="${waUrl}" class="icon-btn" target="_blank" title="Compartir con un amigo">
          <i class="fa-brands fa-whatsapp"></i>
        </a>
      </div>
    </div>
  `;

  // Precio
  const precioContainer = detalleDiv.querySelector("#precioContainer");
  await renderPrecio(evento.id, precioContainer, evento);

  // Agregar al carrito
  detalleDiv.querySelector(".btn-comprar").addEventListener("click", () => {
    agregarAlCarrito(evento);
    mostrarToast(`✅ "${evento.name?.text}" se agregó al carrito`);
  });

  // cerrar modal al ir a encuesta
  detalleDiv.querySelector(".btn-encuesta")?.addEventListener("click", () => {
    document.getElementById("modalDetalle").style.display = "none";
  });

  // Mostrar modal (por si fue llamado sin el listener global)
  document.getElementById("modalDetalle").style.display = "flex";

  // Renderizar mapa
  renderMapa(evento, lugar);

  // Toast automático pidiendo completar la encuesta
mostrarToast("📋 Tu opinión es importante. Completá la encuesta desde el botón 'Encuesta'. ¡Solo te llevará 5 minutos!");
}
