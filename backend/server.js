const express = require('express');
const path = require('path');
const uuid = require('uuid');
const app = express();
const port = 3000;
const cors = require('cors');

const dades = require('./data.json');

let NumPreguntes = 10


app.use(cors());
app.use(express.static('frontend'));
app.use(express.static(path.join(__dirname, '../frontend')));
app.use(express.json());

app.get('/api/preguntes', (req, res) => {
  const seleccionades = [...dades.preguntes]
    .sort(() => Math.random() - 0.5)
    .slice(0, NumPreguntes)
    .map(p => ({ ...p }));

  for (let i = 0; i < seleccionades.length; i++) {
    delete seleccionades[i].resposta_correcta;
  }

  res.json(seleccionades);
});

/*app.post('/api/comprovar', (req, res) => {  
});*/

app.listen(port, () => {
  console.log(`Servidor actiu a http://localhost:${port}`);
});