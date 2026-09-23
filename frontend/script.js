let preguntes;

let estatDeLaPartida = {
  sessionId: null,
  contadorPreguntes: 0,
  respostesUsuari: Array.from({ length: 10 }, () => ({
    id_pregunta: null,
    resposta: null,
  }))
};

const botoEsborrar = document.getElementById("boto-esborrar");
const userForm = document.getElementById('user-form');
const sessioPartida = document.getElementById("quiz-container");
const userNameText = document.getElementById("userNameText");
const partidaDiv = document.getElementById("partida");

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
    const textResposta = event.target.textContent.trim();
    clickBoto(textResposta);
  }
});

fetch('./api/preguntes')
  .then(res => res.json())
  .then(data => {
    estatDeLaPartida.sessionId = data.sessionId; 
    preguntes = data.questions; 
    
    renderitzarPregunta(0);
    renderitzarMarcador();
  })
  .catch(err => console.error("Error carregant les dades:", err));

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
      botonsHTML += `<button class="boto-resposta" data-index="${i}">${p.respostes[i]}</button>`;
    }
  }

  const numPregunta = index < 9 ? `0${index + 1}` : index + 1;
  const contingut = `
    <h2><span style="color: #1e3a8a; font-weight: bold; font-size: 1.4rem; margin-right: 8px;">${numPregunta}.</span> ${p.pregunta}</h2>
    <div class="opcions-container">${botonsHTML}</div>
  `;

  partidaDiv.innerHTML = contingut;
}

function clickBoto(textResposta) { 
  const currentIdx = estatDeLaPartida.contadorPreguntes;
  estatDeLaPartida.respostesUsuari[currentIdx] = {
    id_pregunta: preguntes[currentIdx].id,
    resposta: textResposta
  };
  estatDeLaPartida.contadorPreguntes++;
  console.log(estatDeLaPartida);
  
  renderitzarMarcador();

  if (estatDeLaPartida.contadorPreguntes < preguntes.length) {
    renderitzarPregunta(estatDeLaPartida.contadorPreguntes);
  } else {
    partidaDiv.innerHTML = "<h3>Has completat totes les preguntes!</h3>";
    
    const imatgeContainer = document.getElementById("imatge-container");
    if (imatgeContainer) imatgeContainer.style.display = "none";
  }
}

function renderitzarMarcador() {
  const totalPreguntes = preguntes ? preguntes.length : 10;
  const respostesFetes = estatDeLaPartida.contadorPreguntes;

  const marcadorDiv = document.getElementById("marcador");
  if (marcadorDiv) {
    let gridHTML = "";
    for (let i = 1; i <= totalPreguntes; i++) {
      const classe = i <= respostesFetes ? "responduda" : "";
      const numeroFormatat = i < 10 ? `0${i}` : i;
      gridHTML += `<span class="${classe}">${numeroFormatat}</span>`;
    }
    marcadorDiv.innerHTML = gridHTML;
  }

  if (respostesFetes === totalPreguntes && totalPreguntes > 0) {
    const botoEnviar = document.getElementById("boto-enviar");
    if (botoEnviar) {
      botoEnviar.classList.remove("hidden");
    }
  }
}