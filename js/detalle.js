function abrirDetalleEvento(eventoId) {
  const evento = window._pagination.data.find(e => String(e.id) === String(eventoId));
  if (!evento) return alert("No se encontró el evento");

  const detalleDiv = document.getElementById("detalleEvento");

  const img   = evento.logo?.url || FALLBACK_IMAGES.default;
  const fecha = formatDateTime(evento.start?.local || evento.start?.utc);
  const lugar = evento.venue?.address?.localized_address_display || "Online / Sin dirección";
  const desc  = evento.description?.text || evento.summary || "Sin descripción";

  // Google Calendar
  const startUtc = toUTCStamp(evento.start?.utc || evento.start?.local);
  const endUtc   = toUTCStamp(evento.end?.utc || addHours(evento.start?.utc || evento.start?.local, 2));
  const gcalUrl  = `https://www.google.com/calendar/render?action=TEMPLATE&text=${
    encodeURIComponent(evento.name?.text || 'Evento')
  }&dates=${startUtc}/${endUtc}&details=${
    encodeURIComponent((evento.summary || "") + (evento.url ? `\n\nMás info: ${evento.url}` : ""))
  }&location=${encodeURIComponent(lugar)}&sf=true&output=xml`;

  // WhatsApp Share
  const shareUrl = `https://wa.me/?text=${encodeURIComponent(evento.name?.text + ' ' + evento.url)}`;

  detalleDiv.innerHTML = `
    <h3>${evento.name?.text || "Evento"}</h3>
    <img src="${img}" alt="${evento.name?.text || "Evento"}" class="evento-imagen"/>
    <p><strong>Fecha:</strong> ${fecha}</p>
    <p><strong>Ubicación:</strong> ${lugar}</p>
    <p><strong>Descripción:</strong> ${desc}</p>
    <div class="highlights">
      ${precioChip(evento)}
      ${estadoChip(evento.status)}
    </div>
    <div class="detalle-actions">
    <div class="btn-comprar-container">
        <button class="btn btn-comprar">Agregar al carrito</button>
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

  document.getElementById("modalDetalle").style.display = "flex";
}

// Abrir modal con detalles


// Cerrar modal
document.getElementById("btnCerrarModal").addEventListener("click", () => {
  document.getElementById("modalDetalle").style.display = "none";
});

document.querySelectorAll(".evento").forEach((card, index) => {
  card.addEventListener("click", () => abrirDetalleEvento(1));
});
