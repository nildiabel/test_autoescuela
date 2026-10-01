let preguntes;

let estatDeLaPartida = {
  sessionId: null,
  preguntaActual: 0,
  finalitzada: false,
  respostesUsuari: Array.from({ length: 10 }, () => ({
    id_pregunta: null,
    resposta: null,
  }))
};

let intervalTemporitzador = null;
let segonsTranscorreguts = 0;

const botoEsborrar = document.getElementById("boto-esborrar");
const userForm = document.getElementById('user-form');
const sessioPartida = document.getElementById("quiz-container");
const userNameText = document.getElementById("userNameText");
const partidaDiv = document.getElementById("partida");
const botoEnviar = document.getElementById("boto-enviar");
const adminContainer = document.getElementById("admin-container");
const adminForm = document.getElementById("admin-question-form");
const adminAnswers = document.getElementById("admin-answers");
const adminCorrectAnswer = document.getElementById("admin-correct-answer");
const adminQuestionsList = document.getElementById("admin-questions-list");
const adminMessage = document.getElementById("admin-message");

botoEnviar.addEventListener("click", finalitzarPartida);
document.getElementById("boto-obrir-admin").addEventListener("click", obrirPanellAdmin);
document.getElementById("boto-tornar-inici").addEventListener("click", tancarPanellAdmin);
document.getElementById("admin-cancel-edit").addEventListener("click", reiniciarFormulariAdmin);
adminForm.addEventListener("submit", desarPreguntaAdmin);
adminAnswers.addEventListener("input", () => actualitzarOpcionsCorrectes());
adminQuestionsList.addEventListener("click", gestionarAccioPreguntaAdmin);

botoEsborrar.addEventListener('click', function () {
  localStorage.removeItem('user');
  displayUserName();
});          

userForm.addEventListener('submit', function (event) {
  event.preventDefault();

  const nameValue = document.getElementById('name').value.trim();
  const emailValue = document.getElementById('email').value.trim();

  const userObj = {
    username: nameValue,
    email: emailValue
  };

  localStorage.setItem('user', JSON.stringify(userObj));
  
  displayUserName();
  iniciarTemporitzador();
});

function displayUserName() {
  const dataFromLocalStorage = localStorage.getItem("user");

  if (dataFromLocalStorage) {
    const userObj = JSON.parse(dataFromLocalStorage);
    
    userNameText.textContent = `Aspirant: ${userObj.username}`;

    userForm.classList.add("hidden");
    sessioPartida.classList.remove("hidden");
  } else {
    userForm.classList.remove("hidden");
    sessioPartida.classList.add("hidden");
  }
}

displayUserName();

function obrirPanellAdmin() {
  userForm.classList.add("hidden");
  sessioPartida.classList.add("hidden");
  adminContainer.classList.remove("hidden");
  carregarPreguntesAdmin();
}

function tancarPanellAdmin() {
  adminContainer.classList.add("hidden");
  displayUserName();
}

async function carregarPreguntesAdmin() {
  adminMessage.textContent = "Carregant preguntes...";
  adminMessage.classList.remove("error");

  try {
    const resposta = await fetch("./api/crud/preguntes");
    const preguntesAdmin = await resposta.json();
    if (!resposta.ok) {
      throw new Error(preguntesAdmin.error || "No s'han pogut carregar les preguntes.");
    }

    mostrarPreguntesAdmin(preguntesAdmin);
    adminMessage.textContent = `${preguntesAdmin.length} preguntes carregades.`;
  } catch (error) {
    adminQuestionsList.replaceChildren();
    mostrarErrorAdmin(error);
  }
}

function mostrarPreguntesAdmin(preguntesAdmin) {
  adminQuestionsList.replaceChildren();

  if (preguntesAdmin.length === 0) {
    const buit = document.createElement("p");
    buit.textContent = "Encara no hi ha preguntes a la base de dades.";
    adminQuestionsList.append(buit);
    return;
  }

  preguntesAdmin.forEach(pregunta => {
    const targeta = document.createElement("article");
    targeta.className = "admin-question-card";

    const titol = document.createElement("h3");
    titol.textContent = pregunta.pregunta;
    targeta.append(titol);

    const llistaRespostes = document.createElement("ol");
    pregunta.respostes.forEach((resposta, index) => {
      const opcio = document.createElement("li");
      opcio.textContent = resposta;
      if (index === pregunta.resposta_correcta) {
        opcio.classList.add("admin-correct-answer");
        opcio.append(document.createTextNode(" (correcta)"));
      }
      llistaRespostes.append(opcio);
    });
    targeta.append(llistaRespostes);

    if (pregunta.imatge) {
      const rutaImatge = document.createElement("p");
      rutaImatge.className = "admin-image-path";
      rutaImatge.textContent = `Imatge: ${pregunta.imatge}`;
      targeta.append(rutaImatge);
    }

    const accions = document.createElement("div");
    accions.className = "admin-card-actions";
    const botoEditar = document.createElement("button");
    botoEditar.type = "button";
    botoEditar.className = "btn-secondary";
    botoEditar.dataset.action = "edit";
    botoEditar.dataset.id = pregunta.id;
    botoEditar.textContent = "Editar";

    const botoEliminar = document.createElement("button");
    botoEliminar.type = "button";
    botoEliminar.className = "btn-danger";
    botoEliminar.dataset.action = "delete";
    botoEliminar.dataset.id = pregunta.id;
    botoEliminar.textContent = "Esborrar";

    accions.append(botoEditar, botoEliminar);
    targeta.append(accions);
    adminQuestionsList.append(targeta);
  });
}

function actualitzarOpcionsCorrectes(indexPreferit = Number(adminCorrectAnswer.value)) {
  const respostes = adminAnswers.value
    .split("\n")
    .map(resposta => resposta.trim())
    .filter(Boolean);

  adminCorrectAnswer.replaceChildren();
  if (respostes.length === 0) {
    const opcio = document.createElement("option");
    opcio.value = "";
    opcio.textContent = "Afegeix primer les respostes";
    adminCorrectAnswer.append(opcio);
    adminCorrectAnswer.disabled = true;
    return;
  }

  respostes.forEach((resposta, index) => {
    const opcio = document.createElement("option");
    opcio.value = String(index);
    opcio.textContent = `Resposta ${index + 1}: ${resposta}`;
    adminCorrectAnswer.append(opcio);
  });
  adminCorrectAnswer.disabled = false;
  adminCorrectAnswer.value = String(
    Number.isInteger(indexPreferit) && indexPreferit >= 0 && indexPreferit < respostes.length
      ? indexPreferit
      : 0
  );
}

function iniciarEdicioPregunta(pregunta) {
  document.getElementById("admin-question-id").value = pregunta.id;
  document.getElementById("admin-question-text").value = pregunta.pregunta;
  adminAnswers.value = pregunta.respostes.join("\n");
  actualitzarOpcionsCorrectes(pregunta.resposta_correcta);
  document.getElementById("admin-image-path").value = pregunta.imatge || "";
  document.getElementById("admin-current-image").textContent = pregunta.imatge
    ? `Imatge actual: ${pregunta.imatge}. Tria un fitxer nou per substituir-la.`
    : "Aquesta pregunta no té cap imatge.";
  document.getElementById("admin-current-image").classList.remove("hidden");
  document.getElementById("admin-form-title").textContent = "Editar pregunta";
  document.getElementById("admin-save-button").textContent = "Desar canvis";
  document.getElementById("admin-cancel-edit").classList.remove("hidden");
  adminForm.scrollIntoView({ behavior: "smooth", block: "start" });
}

function reiniciarFormulariAdmin() {
  adminForm.reset();
  document.getElementById("admin-question-id").value = "";
  document.getElementById("admin-form-title").textContent = "Crear pregunta";
  document.getElementById("admin-save-button").textContent = "Crear pregunta";
  document.getElementById("admin-cancel-edit").classList.add("hidden");
  document.getElementById("admin-image-path").value = "";
  document.getElementById("admin-current-image").textContent = "";
  document.getElementById("admin-current-image").classList.add("hidden");
  actualitzarOpcionsCorrectes();
}

async function gestionarAccioPreguntaAdmin(event) {
  const boto = event.target.closest("button[data-action]");
  if (!boto) return;

  const preguntaId = boto.dataset.id;
  if (boto.dataset.action === "edit") {
    try {
      const resposta = await fetch("./api/crud/preguntes");
      const preguntesAdmin = await resposta.json();
      if (!resposta.ok) {
        throw new Error(preguntesAdmin.error || "No s'han pogut carregar les preguntes.");
      }
      const pregunta = preguntesAdmin.find(item => String(item.id) === preguntaId);
      if (!pregunta) throw new Error("No s'ha trobat la pregunta seleccionada.");
      iniciarEdicioPregunta(pregunta);
    } catch (error) {
      mostrarErrorAdmin(error);
    }
    return;
  }

  const targeta = boto.closest(".admin-question-card");
  const titolPregunta = targeta.querySelector("h3").textContent;
  if (!window.confirm(`Vols esborrar la pregunta "${titolPregunta}"?`)) return;

  try {
    const resposta = await fetch(`./api/crud/preguntes/${encodeURIComponent(preguntaId)}`, {
      method: "DELETE"
    });
    const resultat = await resposta.json();
    if (!resposta.ok) {
      throw new Error(resultat.error || "No s'ha pogut esborrar la pregunta.");
    }
    reiniciarFormulariAdmin();
    adminMessage.textContent = "Pregunta esborrada correctament.";
    await carregarPreguntesAdmin();
  } catch (error) {
    mostrarErrorAdmin(error);
  }
}

async function desarPreguntaAdmin(event) {
  event.preventDefault();

  const respostes = adminAnswers.value
    .split("\n")
    .map(resposta => resposta.trim())
    .filter(Boolean);
  const pregunta = document.getElementById("admin-question-text").value.trim();
  const respostaCorrecta = Number(adminCorrectAnswer.value);

  if (!pregunta || respostes.length < 2 || !Number.isInteger(respostaCorrecta)) {
    adminMessage.textContent = "Escriu una pregunta i com a mínim dues respostes, i marca'n la correcta.";
    adminMessage.classList.add("error");
    return;
  }

  const questionId = document.getElementById("admin-question-id").value;
  const dades = new FormData();
  dades.append("pregunta", pregunta);
  dades.append("respostes", JSON.stringify(respostes));
  dades.append("resposta_correcta", String(respostaCorrecta));
  const rutaActual = document.getElementById("admin-image-path").value;
  dades.append("imatge", rutaActual || "");

  const fitxerImatge = document.getElementById("admin-image").files[0];
  if (fitxerImatge) {
    dades.append("imatgeFile", fitxerImatge);
  }

  try {
    const resposta = await fetch(
      questionId
        ? `./api/crud/preguntes/${encodeURIComponent(questionId)}`
        : "./api/crud/preguntes",
      {
        method: questionId ? "PUT" : "POST",
        body: dades
      }
    );
    const resultat = await resposta.json();
    if (!resposta.ok) {
      throw new Error(resultat.error || "No s'ha pogut desar la pregunta.");
    }

    reiniciarFormulariAdmin();
    adminMessage.textContent = questionId
      ? "Pregunta modificada correctament."
      : "Pregunta creada correctament.";
    adminMessage.classList.remove("error");
    await carregarPreguntesAdmin();
  } catch (error) {
    mostrarErrorAdmin(error);
  }
}

function mostrarErrorAdmin(error) {
  console.error("Error al gestionar les preguntes:", error);
  adminMessage.textContent = error.message;
  adminMessage.classList.add("error");
}

partidaDiv.addEventListener("click", (event) => {
  if (event.target.classList.contains("boto-resposta")) {
    const indexResposta = Number(event.target.dataset.index);
    clickBoto(indexResposta);
  }
});

document.getElementById("marcador").addEventListener("click", (event) => {
  if (!event.target.classList.contains("boto-pregunta")) return;

  estatDeLaPartida.preguntaActual = Number(event.target.dataset.pregunta);
  renderitzarPregunta(estatDeLaPartida.preguntaActual);
  renderitzarMarcador();
});

fetch('./api/preguntes')
  .then(res => res.json())
  .then(data => {
    estatDeLaPartida.sessionId = data.sessionId; 
    preguntes = data.questions; 
    
    renderitzarPregunta(0);
    renderitzarMarcador();
    iniciarTemporitzador();
  })
  .catch(err => console.error("Error carregant les dades:", err));

function iniciarTemporitzador() {
  if (sessioPartida.classList.contains("hidden") || !preguntes?.length || intervalTemporitzador !== null) return;

  actualitzarTemporitzador();
  intervalTemporitzador = setInterval(() => {
    segonsTranscorreguts++;
    actualitzarTemporitzador();
  }, 1000);
}

function aturarTemporitzador() {
  if (intervalTemporitzador === null) return;

  clearInterval(intervalTemporitzador);
  intervalTemporitzador = null;
}

function actualitzarTemporitzador() {
  const minuts = Math.floor(segonsTranscorreguts / 60);
  const segons = segonsTranscorreguts % 60;
  const temporitzador = document.getElementById("temporitzador");

  if (temporitzador) {
    temporitzador.textContent = `Temps: ${String(minuts).padStart(2, "0")}:${String(segons).padStart(2, "0")}`;
  }
}

function renderitzarPregunta(index) {
  const p = preguntes[index];
  if (!p) return;

  const imatgeContainer = document.getElementById("imatge-container");
  if (imatgeContainer) {
    if (p.imatge) {
      imatgeContainer.innerHTML = `<img src="${p.imatge}" alt="Imatge pregunta">`;
      imatgeContainer.style.display = "flex";
    } else {
      imatgeContainer.innerHTML = "";
      imatgeContainer.style.display = "none";
    }
  }

  let botonsHTML = "";
  for (let i = 0; i < p.respostes.length; i++) {
    if (p.respostes[i]) {
      const respostaSeleccionada = estatDeLaPartida.respostesUsuari[index].resposta === i;
      botonsHTML += `<button class="boto-resposta${respostaSeleccionada ? " seleccionada" : ""}" data-index="${i}" aria-pressed="${respostaSeleccionada}">${p.respostes[i]}</button>`;
    }
  }

  const numPregunta = index < 9 ? `0${index + 1}` : index + 1;
  const contingut = `
    <h2><span style="color: #1e3a8a; font-weight: bold; font-size: 1.4rem; margin-right: 8px;">${numPregunta}.</span> ${p.pregunta}</h2>
    <div class="opcions-container">${botonsHTML}</div>
  `;

  partidaDiv.innerHTML = contingut;
}

function clickBoto(indexResposta) {
  const currentIdx = estatDeLaPartida.preguntaActual;
  if (estatDeLaPartida.finalitzada || currentIdx >= preguntes.length) return;

  estatDeLaPartida.respostesUsuari[currentIdx] = {
    id_pregunta: preguntes[currentIdx].id,
    resposta: indexResposta
  };

  const preguntesPendents = estatDeLaPartida.respostesUsuari
    .map((resposta, index) => resposta.resposta === null ? index : -1)
    .filter(index => index !== -1);

  if (preguntesPendents.length === 0) {
    aturarTemporitzador();
  } else {
    estatDeLaPartida.preguntaActual =
      preguntesPendents.find(index => index > currentIdx) ?? preguntesPendents[0];
  }

  renderitzarPregunta(estatDeLaPartida.preguntaActual);
  renderitzarMarcador();
}

async function finalitzarPartida() {
  const totesRespondudes = estatDeLaPartida.respostesUsuari
    .every(resposta => resposta.resposta !== null);
  if (!totesRespondudes || botoEnviar.disabled || estatDeLaPartida.finalitzada) return;

  botoEnviar.disabled = true;

  try {
    const resposta = await fetch('./api/finalitza', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: estatDeLaPartida.sessionId,
        respostes: estatDeLaPartida.respostesUsuari.map(resposta => resposta.resposta)
      })
    });
    const resultat = await resposta.json();

    if (!resposta.ok) {
      throw new Error(resultat.error || 'No s’ha pogut finalitzar la partida');
    }

    estatDeLaPartida.finalitzada = true;
    partidaDiv.innerHTML = `<h3>Resultat: ${resultat.respostesCorrectes}/${resultat.totalRespostes}</h3>`;
    botoEnviar.classList.add("hidden");
    renderitzarMarcador();
  } catch (error) {
    console.error('Error finalitzant la partida:', error);
    botoEnviar.disabled = false;
    partidaDiv.insertAdjacentHTML('beforeend', `<p role="alert">${error.message}</p>`);
  }
}

function renderitzarMarcador() {
  const totalPreguntes = preguntes ? preguntes.length : 10;
  const respostesFetes = estatDeLaPartida.respostesUsuari
    .filter(resposta => resposta.resposta !== null).length;

  const marcadorDiv = document.getElementById("marcador");
  if (marcadorDiv) {
    let gridHTML = "";
    for (let i = 1; i <= totalPreguntes; i++) {
      const index = i - 1;
      const respostaDesada = estatDeLaPartida.respostesUsuari[index].resposta !== null;
      const preguntaActual = index === estatDeLaPartida.preguntaActual;
      const classes = [
        "boto-pregunta",
        respostaDesada ? "responduda" : "",
        preguntaActual ? "actual" : ""
      ].filter(Boolean).join(" ");
      const numeroFormatat = i < 10 ? `0${i}` : i;
      const estat = respostaDesada ? "resposta desada" : "sense respondre";
      gridHTML += `<button type="button" class="${classes}" data-pregunta="${index}" aria-label="Pregunta ${i}, ${estat}" aria-current="${preguntaActual ? "step" : "false"}"${estatDeLaPartida.finalitzada ? " disabled" : ""}>${numeroFormatat}</button>`;
    }
    marcadorDiv.innerHTML = gridHTML;
  }

  if (respostesFetes === totalPreguntes && totalPreguntes > 0) {
    botoEnviar.classList.remove("hidden");
  } else {
    botoEnviar.classList.add("hidden");
  }
}