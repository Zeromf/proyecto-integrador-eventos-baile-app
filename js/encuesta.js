// === Datos del evento pasados por query string ===
const params = new URLSearchParams(window.location.search);
const evento = params.get("evento");
const fecha  = params.get("fecha");
const lugar  = params.get("lugar");

// Si existen, los mostramos en el formulario
if (evento) {
  document.getElementById("eventoTitulo").textContent = evento;
  document.getElementById("eventoInput").value = evento;
}
if (fecha) {
  document.getElementById("eventoFecha").textContent = fecha;
  document.getElementById("fechaInput").value = fecha;
}
if (lugar) {
  document.getElementById("eventoLugar").textContent = lugar;
  document.getElementById("lugarInput").value = lugar;
}

const $  = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

const letrasRegex = /^[A-Za-zÁÉÍÓÚÜáéíóúüÑñ\s]+$/;
const fechaRegex  = /^(0[1-9]|[12][0-9]|3[01])-(0[1-9]|1[0-2])-\d{4}$/;
const emailRegex  = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function setError(id, msg){ const el = $(`#err-${id}`); if(el) el.textContent = msg || ""; }
function clearErrors(){ ["nombre","apellido","fecha","sexo","valoracion","email"].forEach(id => setError(id,"")); }

function parseFechaDDMMYYYY(s){
  const [dd,mm,yyyy] = s.split("-").map(Number);
  const d = new Date(yyyy, mm-1, dd);
  return (d.getFullYear()===yyyy && (d.getMonth()+1)===mm && d.getDate()===dd) ? d : null;
}

function getRadioValue(name){
  const r = document.querySelector(`input[name="${name}"]:checked`);
  return r ? r.value : "";
}

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

  if(!nombre){ setError("nombre","El nombre es obligatorio."); ok=false; }
  if(!apellido){ setError("apellido","El apellido es obligatorio."); ok=false; }
  if(!fecha){ setError("fecha","La fecha es obligatoria."); ok=false; }
  if(!sexo){ setError("sexo","Seleccioná una opción."); ok=false; }
  if(!valoracion){ setError("valoracion","Seleccioná una valoración."); ok=false; }
  if(!email){ setError("email","El email es obligatorio."); ok=false; }

  if(nombre && !letrasRegex.test(nombre)){ setError("nombre","Solo letras y espacios."); ok=false; }
  if(apellido && !letrasRegex.test(apellido)){ setError("apellido","Solo letras y espacios."); ok=false; }

  if(fecha && !fechaRegex.test(fecha)){ setError("fecha","Formato inválido (dd-mm-aaaa)."); ok=false; }
  if(fecha && fechaRegex.test(fecha) && !parseFechaDDMMYYYY(fecha)){ setError("fecha","Fecha inexistente."); ok=false; }

  if(email && !emailRegex.test(email)){ setError("email","Email inválido."); ok=false; }

  return { ok, valores: { nombre, apellido, fecha, sexo, valoracion, email, comentario } };
}

/* === MODALES === */
const backdrop = document.getElementById('backdrop');

function openModal(id){
  const m = document.getElementById(id);
  if(!m) return;
  m.hidden = false; m.classList.add('is-open');
  if(backdrop){ backdrop.hidden = false; backdrop.classList.add('is-open'); }
}
function closeModal(id){
  const m = document.getElementById(id);
  if(!m) return;
  m.classList.remove('is-open'); m.hidden = true;
  if(document.querySelectorAll('.modal.is-open').length === 0 && backdrop){
    backdrop.classList.remove('is-open'); backdrop.hidden = true;
  }
}

document.addEventListener('click', (e)=>{
  const btn = e.target.closest('[data-close]');
  if(btn){ closeModal(btn.getAttribute('data-close')); }
  if(e.target === backdrop){
    document.querySelectorAll('.modal.is-open').forEach(m => closeModal(m.id));
  }
});

/* === Eventos === */
$("#btnEnviar")?.addEventListener("click", () => {
  const { ok, valores } = validar();
  if(!ok) return;
  $("#resumenContenido").textContent =
`Nombre: ${valores.nombre}
Apellido: ${valores.apellido}
Fecha de Nacimiento: ${valores.fecha}
Sexo: ${valores.sexo}
Valoración: ${valores.valoracion}
Email: ${valores.email}
Comentario: ${valores.comentario || "(sin comentario)"}`;
  openModal("modalResumen");
});

$("#btnConfirmarEnvio")?.addEventListener("click", () => {
  $("#frmEncuesta").reset();
  clearErrors();
  closeModal("modalResumen");

  // Mostrar modal de éxito
  openModal("modalExito");

  // Redirigir al inicio después de 2 segundos
  setTimeout(() => {
    closeModal("modalExito");
    window.location.href = "index.html";
  }, 2000);
});



$("#btnCancelar")?.addEventListener("click", () => openModal("modalCancelar"));
$("#btnSiCancelar")?.addEventListener("click", () => {
  closeModal("modalCancelar");
  if (history.length > 1) history.back();
  else window.location.href = "index.html";
});
$("#btnReset")?.addEventListener("click", () => { $("#frmEncuesta").reset(); clearErrors(); });

["#nombre","#apellido","#fecha","#email","#comentario"].forEach(sel => {
  $(sel)?.addEventListener("input", () => clearErrors());
});
$$('input[name="sexo"], input[name="valoracion"]').forEach(r => {
  r.addEventListener("change", () => clearErrors());
});
