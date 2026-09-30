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

botoEnviar.addEventListener("click", finalitzarPartida);

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