// === Utiles ===
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

const letrasRegex = /^[A-Za-zÁÉÍÓÚÜáéíóúüÑñ\s]+$/; // nombres/apellidos
const fechaRegex  = /^(0[1-9]|[12][0-9]|3[01])-(0[1-9]|1[0-2])-\d{4}$/; // dd-mm-aaaa
const emailRegex  = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/; // email simple

function setError(id, msg){ const el = $(`#err-${id}`); if(el) el.textContent = msg || ""; }
function clearErrors(){ ["nombre","apellido","fecha","sexo","valoracion","email"].forEach(id => setError(id,"")); }

function parseFechaDDMMYYYY(s){
  // s = dd-mm-aaaa -> Date válido
  const [dd,mm,yyyy] = s.split("-").map(Number);
  const d = new Date(yyyy, mm-1, dd);
  // validar que coincida (evita 31-02-2020)
  const ok = d.getFullYear()===yyyy && (d.getMonth()+1)===mm && d.getDate()===dd;
  return ok ? d : null;
}

function getRadioValue(name){
  const r = document.querySelector(`input[name="${name}"]:checked`);
  return r ? r.value : "";
}

// === Validación principal (Ejercicio 2) ===
function validar(){
  clearErrors();
  let ok = true;

  const nombre = $("#nombre").value.trim();
  const apellido = $("#apellido").value.trim();
  const fecha = $("#fecha").value.trim();
  const sexo = getRadioValue("sexo");
  const valoracion = getRadioValue("valoracion");
  const email = $("#email").value.trim();
  const comentario = $("#comentario").value.trim();

  // Requeridos: a,b,c,d,e,f
  if(!nombre){ setError("nombre","El nombre es obligatorio."); ok=false; }
  if(!apellido){ setError("apellido","El apellido es obligatorio."); ok=false; }
  if(!fecha){ setError("fecha","La fecha es obligatoria."); ok=false; }
  if(!sexo){ setError("sexo","Seleccioná una opción."); ok=false; }
  if(!valoracion){ setError("valoracion","Seleccioná una valoración."); ok=false; }
  if(!email){ setError("email","El email es obligatorio."); ok=false; }

  // Solo letras
  if(nombre && !letrasRegex.test(nombre)){ setError("nombre","Solo letras y espacios."); ok=false; }
  if(apellido && !letrasRegex.test(apellido)){ setError("apellido","Solo letras y espacios."); ok=false; }

  // Fecha dd-mm-aaaa + válida
  if(fecha && !fechaRegex.test(fecha)){ setError("fecha","Formato inválido (dd-mm-aaaa)."); ok=false; }
  if(fecha && fechaRegex.test(fecha) && !parseFechaDDMMYYYY(fecha)){ setError("fecha","Fecha inexistente."); ok=false; }

  // Email
  if(email && !emailRegex.test(email)){ setError("email","Email inválido."); ok=false; }

  return {
    ok,
    valores: { nombre, apellido, fecha, sexo, valoracion, email, comentario }
  };
}

// === Eventos (Ejercicio 3) ===
$("#btnEnviar")?.addEventListener("click", () => {
  const { ok, valores } = validar();
  if(!ok) return;

  // Mostrar todos los campos en alert
  const msg =
`Nombre: ${valores.nombre}
Apellido: ${valores.apellido}
Fecha de Nacimiento: ${valores.fecha}
Sexo: ${valores.sexo}
Valoración: ${valores.valoracion}
Email: ${valores.email}
Comentario: ${valores.comentario || "(sin comentario)"}`
  alert(msg);
});

$("#btnCancelar")?.addEventListener("click", () => {
  const volver = confirm("¿Sí, deseo volver a la página anterior?");
  if(volver){
    // Volver a la página anterior
    if (history.length > 1) history.back();
    else window.location.href = "index.html";
  }
});

$("#btnReset")?.addEventListener("click", () => {
  $("#frmEncuesta").reset();
  clearErrors();
});

// Limpieza de errores al editar
["#nombre","#apellido","#fecha","#email","#comentario"].forEach(sel => {
  $(sel)?.addEventListener("input", () => clearErrors());
});
$$('input[name="sexo"], input[name="valoracion"]').forEach(r => {
  r.addEventListener("change", () => clearErrors());
});
