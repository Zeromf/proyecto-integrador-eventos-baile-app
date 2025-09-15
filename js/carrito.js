// Obtener carrito de localStorage
function getCarrito() {
  return JSON.parse(localStorage.getItem("carrito")) || [];
}

// Guardar carrito
function setCarrito(carrito) {
  localStorage.setItem("carrito", JSON.stringify(carrito));
}

// Renderizar carrito 
function renderCarrito() {
  const carrito = getCarrito();
  const carritoDiv = document.getElementById("carrito");

   if (!carrito.length) {
    // Carrito vacío
    carritoDiv.innerHTML = `
      <header>
        <h2>Tu carrito</h2>
        <span class="cerrar" onclick="cerrarCarrito()">&times;</span>
      </header>
      <p>Tu carrito está vacío</p>
    `;
    return; 
  }

  // caarrito con items 
 const itemsHTML = carrito.map((item, index) => `
  <div class="item">
    <div class="item-info">
      <p>${item.nombre}</p>
      <small>${item.fecha} - ${item.lugar}</small>
      <p>${formatPrecioARS(item.precio)}</p>
    </div>
    <button class="btn-eliminar" onclick="eliminarDelCarrito(${index})" title="Eliminar">
      <i class="fa-solid fa-trash"></i>
    </button>
  </div>
`).join("");

 // total
  const total = carrito.reduce((acc, i) => acc + (i.precio || 0), 0);

  carritoDiv.innerHTML = `
  <div class="carrito-content">
    <header>
      <h2>🛒 Tu carrito</h2>
      <span class="cerrar" onclick="cerrarCarrito()">&times;</span>
    </header>

    <div class="carrito-items">
      ${itemsHTML}
    </div>

    <footer>
      <div class="total">Total: ${formatPrecioARS(total)}</div>
      <div class="carrito-actions">
        <button class="btn-vaciar" onclick="vaciarCarrito()">Vaciar</button>
        <button class="btn-checkout">Finalizar</button>
      </div>
    </footer>
  </div>
`;
}

// Agregar evento al carrito
function agregarAlCarrito(evento) {
  const carrito = getCarrito();
  carrito.push({
    id: evento.id,
    nombre: evento.name?.text || "Evento",
    fecha: formatDateTime(evento.start?.local || evento.start?.utc),
    lugar: evento.venue?.address?.localized_address_display || "Online / Sin dirección",
    precio: evento.ticket_price || 0
  });
  setCarrito(carrito);
  renderCarrito();
}

function eliminarDelCarrito(index) {
  const carrito = getCarrito();
  carrito.splice(index, 1); 
  setCarrito(carrito);
  renderCarrito();
  mostrarToast("🗑️ Evento eliminado del carrito");
}

function vaciarCarrito() {
  setCarrito([]); 
  renderCarrito();
  mostrarToast("🗑️ Se vació el carrito");
}

// Carrito: abrir/cerrar sidebar
const carritoAside = document.getElementById("carrito");

function abrirCarrito() {
  carritoAside.classList.add("open");
}

function cerrarCarrito() {
  carritoAside.classList.remove("open");
}

// Render inicial al cargar
document.addEventListener("DOMContentLoaded", renderCarrito);