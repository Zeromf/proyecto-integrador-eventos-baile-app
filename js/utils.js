
function formatPrecioARS(valor, moneda = "ARS") {
  if (!valor) return "Gratis";
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: moneda,
    minimumFractionDigits: 0
  }).format(valor);
}