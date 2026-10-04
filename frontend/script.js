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
const resultActions = document.getElementById("result-actions");
const resultActionMessage = document.getElementById("result-action-message");
const botoRecomencar = document.getElementById("boto-recomencar");
const examControls = document.getElementById("exam-controls");
const questionMarker = document.getElementById("question-marker");

botoEnviar.addEventListener("click", finalitzarPartida);
document.getElementById("boto-recomencar").addEventListener("click", recomencarPartida);
document.getElementById("boto-esborrar-resultat").addEventListener("click", esborrarNom);
document.getElementById("boto-obrir-admin").addEventListener("click", obrirPanellAdmin);
document.getElementById("boto-tornar-inici").addEventListener("click", tancarPanellAdmin);
document.getElementById("admin-cancel-edit").addEventListener("click", reiniciarFormulariAdmin);
adminForm.addEventListener("submit", desarPreguntaAdmin);
adminAnswers.addEventListener("input", () => actualitzarOpcionsCorrectes());
adminQuestionsList.addEventListener("click", gestionarAccioPreguntaAdmin);

botoEsborrar.addEventListener('click', function () {
  esborrarNom();
});          

userForm.addEventListener('submit', async function (event) {
  event.preventDefault();

  const nameValue = document.getElementById('name').value.trim();
  const emailValue = document.getElementById('email').value.trim();

  try {
    await carregarPartida();
  } catch (error) {
    console.error("Error carregant les dades:", error);
    return;
  }

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
    userNameText.textContent = "Aspirant:";
    userForm.classList.remove("hidden");
    sessioPartida.classList.add("hidden");
  }
}

displayUserName();

function esborrarNom() {
  aturarTemporitzador();
  localStorage.removeItem('user');
  userForm.reset();
  resultActions.classList.add("hidden");
  examControls.classList.remove("hidden");
  questionMarker.classList.remove("hidden");
  displayUserName();
}

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
  adminMessage.classList.remove("text-rose-700");
  adminMessage.classList.add("text-emerald-700");

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
    targeta.className = "rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-slate-300 sm:p-6";

    const titol = document.createElement("h3");
    titol.className = "mb-3 text-lg font-semibold tracking-tight text-slate-900";
    titol.textContent = pregunta.pregunta;
    targeta.append(titol);

    const llistaRespostes = document.createElement("ol");
    llistaRespostes.className = "list-decimal space-y-1 pl-5 text-sm text-slate-600";
    pregunta.respostes.forEach((resposta, index) => {
      const opcio = document.createElement("li");
      opcio.textContent = resposta;
      if (index === pregunta.resposta_correcta) {
        opcio.className = "font-semibold text-emerald-700";
        opcio.append(document.createTextNode(" (correcta)"));
      }
      llistaRespostes.append(opcio);
    });
    targeta.append(llistaRespostes);

    if (pregunta.imatge) {
      const rutaImatge = document.createElement("p");
      rutaImatge.className = "mt-3 break-all text-sm text-slate-500";
      rutaImatge.textContent = `Imatge: ${pregunta.imatge}`;
      targeta.append(rutaImatge);
    }

    const accions = document.createElement("div");
    accions.className = "mt-4 flex flex-wrap items-center gap-2";
    const botoEditar = document.createElement("button");
    botoEditar.type = "button";
    botoEditar.className = "rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 focus:outline-none focus:ring-4 focus:ring-slate-100";
    botoEditar.dataset.action = "edit";
    botoEditar.dataset.id = pregunta.id;
    botoEditar.textContent = "Editar";

    const botoEliminar = document.createElement("button");
    botoEliminar.type = "button";
    botoEliminar.className = "rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-700 focus:outline-none focus:ring-4 focus:ring-rose-100";
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

  const targeta = boto.closest("article");
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
    adminMessage.classList.remove("text-emerald-700");
    adminMessage.classList.add("text-rose-700");
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
    adminMessage.classList.remove("text-rose-700");
    adminMessage.classList.add("text-emerald-700");
    await carregarPreguntesAdmin();
  } catch (error) {
    mostrarErrorAdmin(error);
  }
}

function mostrarErrorAdmin(error) {
  console.error("Error al gestionar les preguntes:", error);
  adminMessage.textContent = error.message;
  adminMessage.classList.remove("text-emerald-700");
  adminMessage.classList.add("text-rose-700");
}

partidaDiv.addEventListener("click", (event) => {
  const botoResposta = event.target.closest("button[data-index]");
  if (botoResposta) {
    const indexResposta = Number(botoResposta.dataset.index);
    clickBoto(indexResposta);
  }
});

document.getElementById("marcador").addEventListener("click", (event) => {
  const botoPregunta = event.target.closest("button[data-pregunta]");
  if (!botoPregunta) return;

  estatDeLaPartida.preguntaActual = Number(botoPregunta.dataset.pregunta);
  renderitzarPregunta(estatDeLaPartida.preguntaActual);
  renderitzarMarcador();
});

async function carregarPartida() {
  const resposta = await fetch('./api/preguntes');
  const data = await resposta.json();
  if (!resposta.ok) {
    throw new Error(data.error || "No s'han pogut carregar les preguntes.");
  }

  preguntes = data.questions;
  estatDeLaPartida = {
    sessionId: data.sessionId,
    preguntaActual: 0,
    finalitzada: false,
    respostesUsuari: preguntes.map(pregunta => ({
      id_pregunta: pregunta.id,
      resposta: null
    }))
  };
  segonsTranscorreguts = 0;
  partidaDiv.replaceChildren();
  resultActions.classList.add("hidden");
  resultActionMessage.textContent = "";
  examControls.classList.remove("hidden");
  questionMarker.classList.remove("hidden");
  botoEnviar.disabled = false;
  botoEnviar.classList.add("hidden");

  const imatgeContainer = document.getElementById("imatge-container");
  imatgeContainer.classList.remove("hidden");
  imatgeContainer.classList.add("flex");
  const contingutPartida = partidaDiv.parentElement;
  contingutPartida.classList.remove("grid-cols-1");
  contingutPartida.classList.add("lg:grid-cols-[minmax(0,420px)_1fr]");
  renderitzarPregunta(0);
  renderitzarMarcador();
}

async function recomencarPartida() {
  botoRecomencar.disabled = true;
  resultActionMessage.textContent = "Carregant una partida nova...";

  try {
    await carregarPartida();
    iniciarTemporitzador();
  } catch (error) {
    console.error("Error carregant una partida nova:", error);
    resultActionMessage.textContent = error.message;
  } finally {
    botoRecomencar.disabled = false;
  }
}

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
      imatgeContainer.classList.remove("hidden");
      imatgeContainer.classList.add("flex");
    } else {
      imatgeContainer.innerHTML = "";
      imatgeContainer.classList.add("hidden");
      imatgeContainer.classList.remove("flex");
    }
  }

  let botonsHTML = "";
  for (let i = 0; i < p.respostes.length; i++) {
    if (p.respostes[i]) {
      const respostaSeleccionada = estatDeLaPartida.respostesUsuari[index].resposta === i;
      const classesResposta = respostaSeleccionada
        ? "mb-3 block w-full rounded-2xl border border-indigo-600 bg-indigo-50 px-5 py-4 text-left font-medium text-indigo-900 shadow-sm ring-2 ring-indigo-100 transition"
        : "mb-3 block w-full rounded-2xl border border-slate-200 bg-white px-5 py-4 text-left font-medium text-slate-700 shadow-sm transition hover:border-indigo-300 hover:bg-indigo-50 hover:shadow";
      botonsHTML += `<button class="${classesResposta}" data-index="${i}" aria-pressed="${respostaSeleccionada}">${p.respostes[i]}</button>`;
    }
  }

  const numPregunta = index < 9 ? `0${index + 1}` : index + 1;
  const contingut = `
    <h2 class="mb-6 text-xl font-semibold leading-relaxed tracking-tight text-slate-900 sm:text-2xl"><span class="mr-2 text-indigo-700">${numPregunta}.</span> ${p.pregunta}</h2>
    <div>${botonsHTML}</div>
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
    const imatgePregunta = document.getElementById("imatge-container");
    imatgePregunta.replaceChildren();
    imatgePregunta.classList.add("hidden");
    imatgePregunta.classList.remove("flex");
    const contingutPartida = partidaDiv.parentElement;
    contingutPartida.classList.remove("lg:grid-cols-[minmax(0,420px)_1fr]");
    contingutPartida.classList.add("grid-cols-1");
    renderitzarResultat(resultat);
    botoEnviar.classList.add("hidden");
    examControls.classList.add("hidden");
    questionMarker.classList.add("hidden");
    resultActions.classList.remove("hidden");
  } catch (error) {
    console.error('Error finalitzant la partida:', error);
    botoEnviar.disabled = false;
    partidaDiv.insertAdjacentHTML('beforeend', `<p role="alert">${error.message}</p>`);
  }
}

function renderitzarResultat(resultat) {
  partidaDiv.replaceChildren();

  const resum = document.createElement("section");
  resum.className = "mb-8 rounded-3xl bg-indigo-950 p-6 text-white shadow-sm sm:p-8";

  const etiqueta = document.createElement("p");
  etiqueta.className = "text-sm font-semibold uppercase tracking-widest text-indigo-200";
  etiqueta.textContent = "Partida finalitzada";

  const titol = document.createElement("h2");
  titol.className = "mt-2 text-2xl font-semibold tracking-tight sm:text-3xl";
  titol.textContent = "La teva puntuació";

  const puntuacio = document.createElement("p");
  puntuacio.className = "mt-5 flex items-baseline gap-2";
  const encerts = document.createElement("span");
  encerts.className = "text-6xl font-bold tracking-tight tabular-nums";
  encerts.textContent = String(resultat.respostesCorrectes);
  const separador = document.createElement("span");
  separador.className = "text-2xl font-medium text-indigo-200";
  separador.textContent = `/ ${resultat.totalRespostes}`;
  puntuacio.append(encerts, separador);

  const percentatge = document.createElement("p");
  percentatge.className = "mt-1 text-sm text-indigo-200";
  percentatge.textContent = `${Math.round(resultat.respostesCorrectes / resultat.totalRespostes * 100)}% d'encerts`;

  const resumDetall = document.createElement("div");
  resumDetall.className = "mt-6 flex flex-wrap gap-2";
  const encertsBadge = document.createElement("span");
  encertsBadge.className = "rounded-full bg-emerald-400/15 px-3 py-1.5 text-sm font-medium text-emerald-200";
  encertsBadge.textContent = `${resultat.respostesCorrectes} correctes`;
  const falladesBadge = document.createElement("span");
  falladesBadge.className = "rounded-full bg-rose-400/15 px-3 py-1.5 text-sm font-medium text-rose-200";
  falladesBadge.textContent = `${resultat.preguntesFallades.length} per revisar`;
  resumDetall.append(encertsBadge, falladesBadge);
  resum.append(etiqueta, titol, puntuacio, percentatge, resumDetall, resultActions);
  partidaDiv.append(resum);

  const revisio = document.createElement("section");
  const titolRevisio = document.createElement("h2");
  titolRevisio.className = "mb-4 text-xl font-semibold tracking-tight text-slate-900";
  titolRevisio.textContent = resultat.preguntesFallades.length
    ? "Preguntes fallades"
    : "Perfecte! No has fallat cap pregunta.";
  revisio.append(titolRevisio);

  if (resultat.preguntesFallades.length) {
    const llista = document.createElement("div");
    llista.className = "flex flex-col gap-3";

    resultat.preguntesFallades.forEach((pregunta, index) => {
      const targeta = document.createElement("article");
      targeta.className = "rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6";

      const titolPregunta = document.createElement("h3");
      titolPregunta.className = "mb-3 text-lg font-semibold tracking-tight text-slate-900";
      titolPregunta.textContent = `${index + 1}. ${pregunta.pregunta}`;
      targeta.append(titolPregunta);

      if (pregunta.imatge) {
        const imatge = document.createElement("img");
        imatge.src = pregunta.imatge;
        imatge.alt = "Imatge de la pregunta";
        imatge.className = "mb-4 h-64 w-full rounded-xl border border-slate-200 object-contain sm:h-80";
        targeta.append(imatge);
      }

      const opcions = document.createElement("ol");
      opcions.className = "list-decimal space-y-2 pl-5 text-sm text-slate-600";
      pregunta.respostes.forEach((resposta, respostaIndex) => {
        const opcio = document.createElement("li");
        opcio.textContent = resposta;
        if (respostaIndex === pregunta.respostaCorrecta) {
          opcio.className = "font-semibold text-emerald-700";
          opcio.append(document.createTextNode(" (correcta)"));
        } else if (respostaIndex === pregunta.respostaUsuari) {
          opcio.className = "font-medium text-rose-700";
          opcio.append(document.createTextNode(" (la teva resposta)"));
        }
        opcions.append(opcio);
      });
      targeta.append(opcions);
      llista.append(targeta);
    });

    revisio.append(llista);
  }

  partidaDiv.append(revisio);
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
          "rounded-xl border px-2 py-2.5 text-sm font-semibold transition focus:outline-none focus:ring-4 focus:ring-indigo-100",
          respostaDesada
            ? "border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
            : "border-slate-200 bg-white text-slate-500 hover:border-indigo-300 hover:bg-indigo-50",
          preguntaActual ? "ring-2 ring-indigo-300" : "",
          estatDeLaPartida.finalitzada ? "cursor-not-allowed opacity-60" : ""
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