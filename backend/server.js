const express = require('express');
const path = require('path');
const app = express();
const port = 3000;
const cors = require('cors');

const dades = require('./data.json');


app.use(cors());
app.use(express.static('frontend'));
app.use(express.static(path.join(__dirname, '../frontend')));
app.use(express.json());

app.get('/api/preguntes', (req, res) => {
  const seleccionades = [...dades.preguntes]
    .sort(() => Math.random() - 0.5)
    .slice(0, 10)
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