document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("btnCerrarModal").addEventListener("click", () => {
    document.getElementById("modalDetalle").style.display = "none";
  });

  document.querySelectorAll(".evento").forEach((card, index) => {
    card.addEventListener("click", () => abrirDetalleEvento(1));
  });
});

//Renderiza Precio
async function renderPrecio(eventoId, container, evento) {
  try {
    const res = await fetch(`https://www.eventbriteapi.com/v3/events/${eventoId}/ticket_classes/?token=${TOKEN}`);
    const data = await res.json();

    let precioHtml = "<p><strong>Precio:</strong> Gratis</p>";
    let precioNumerico = 0;

    if (data.ticket_classes?.length) {
      const pagos = data.ticket_classes.filter(tc => !tc.free && tc.cost);
      if (pagos.length) {
        const primero = pagos[0]; // tomo el primer ticket pago
        precioNumerico = parseFloat(primero.cost.major_value);
        precioHtml = `<p><strong>Precio:</strong> ${formatPrecioARS(precioNumerico, primero.cost.currency)}</p>`;
      }
    }

    // Guardamos precio crudo en el evento para carrito
    evento.ticket_price = precioNumerico;

    container.insertAdjacentHTML("beforeend", precioHtml);
  } catch {
    container.insertAdjacentHTML("beforeend", "<p><strong>Precio:</strong> No disponible</p>");
  }
}

// Renderiza mapa con Leaflet
function renderMapa(evento, lugar) {
  const mapaDiv = document.getElementById("mapaEvento");
  if (evento.venue?.latitude && evento.venue?.longitude) {
    const lat = parseFloat(evento.venue.latitude);
    const lng = parseFloat(evento.venue.longitude);
    const mapa = L.map(mapaDiv).setView([lat, lng], 15);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap'
    }).addTo(mapa);

    L.marker([lat, lng]).addTo(mapa)
      .bindPopup(`<b>${evento.name?.text}</b><br>${lugar}`)
      .openPopup();
  } else {
    mapaDiv.innerHTML = "<p>No hay coordenadas disponibles para este evento.</p>";
  }
}

// Formatea precio a ARS
function formatPrecioARS(valor, moneda = "ARS") {
  if (!valor) return "Gratis";
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: moneda,
    minimumFractionDigits: 0
  }).format(valor);
}

async function abrirDetalleEvento(eventoId) {
  const evento = window._pagination.data.find(e => String(e.id) === String(eventoId));
  if (!evento) return alert("No se encontró el evento");

  const detalleDiv = document.getElementById("detalleEvento");

  const fecha = formatDateTime(evento.start?.local || evento.start?.utc);
  const lugar = evento.venue?.address?.localized_address_display || "Online / Sin dirección";
  const desc  = evento.description?.text || evento.summary || "Sin descripción";

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
        <div class="icon-btns">
            <a href="https://www.google.com/calendar/render?..." class="icon-btn" target="_blank" title="Agregar al calendario">
            <i class="fa-regular fa-calendar"></i>
            </a>
            <a href="https://wa.me/?text=..." class="icon-btn" target="_blank" title="Compartir con un amigo">
            <i class="fa-brands fa-whatsapp"></i>
            </a>
        </div>
    </div>
  `;

    const precioContainer = detalleDiv.querySelector("#precioContainer");
    await renderPrecio(evento.id, precioContainer, evento);

   detalleDiv.querySelector(".btn-comprar").addEventListener("click", () => {
    agregarAlCarrito(evento);
    mostrarToast(`✅ "${evento.name?.text}" se agregó al carrito`);
  });

  // Mostrar modal
  document.getElementById("modalDetalle").style.display = "flex";

  // Renderizar mapa
  renderMapa(evento, lugar);
}
