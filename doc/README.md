# Test d'autoescola

Aplicació SPA per practicar preguntes del test de conducció. El frontend es comunica amb una API Node.js/Express; les preguntes es guarden a MySQL.

## Disseny i prototip

Els enllaços següents s'han d'actualitzar quan els dissenys estiguin publicats a Penpot:

- **Wireframe mobile i flux de pantalles (Iteració 1):** [Penpot](https://design.penpot.app/#/workspace?team-id=87795101-e4ce-8012-8007-46169f427efb&file-id=19c47d73-0a5d-8067-8008-bd70f0c4bd88&page-id=19c47d73-0a5d-8067-8008-bd70f0c4bd89)

### Flux previst de pantalles mobile

1. **Accés:** introducció del nom i el correu, o accés al panell d'administració.
2. **Partida:** una pregunta cada vegada, imatge opcional, respostes seleccionables i marcador per navegar entre les preguntes.
3. **Resultat:** puntuació i revisió de les preguntes fallades amb la resposta correcta.
4. **Administració:** llistat de preguntes i formulari per crear, editar o eliminar preguntes, inclosa la pujada d'imatges.

El flux anterior descriu la navegació actual de l'aplicació; encara no substitueix l'enllaç al wireframe de Penpot.

### Mockup: principis CRAP

La interfície actual segueix una proposta visual minimalista amb targetes arrodonides, espaiat consistent i jerarquia tipogràfica:

- **Contrast:** colors indigo per a elements principals, verd per a confirmacions/respostes correctes i rosa per a errors/respostes incorrectes.
- **Repetició:** camps, botons i targetes comparteixen cantonades arrodonides, vores suaus i patrons d'espaiat.
- **Alineació:** formularis i llistes s'alineen dins del contenidor principal; les preguntes del CRUD es mostren en una llista vertical.
- **Proximitat:** les respostes queden agrupades amb la pregunta; els botons de gestió, amb la pregunta corresponent.
- **Tipografia:** jerarquia basada en mida, pes i color; la tipografia base de Tailwind és sans-serif.
- **Ombres i vores:** ombres discretes i vores clares per separar targetes sense carregar la pantalla.

La proposta visual de codi no implica que el mockup de Penpot estigui creat o validat.

### Paleta de tres colors

La interfície utilitza aquests tres colors d'accent, a més de blanc i gris pissarra per als fons i el text:

| Ús | Color | Codi |
|---|---|---|
| Principal / pregunta | Indigo Tailwind 700 | `#4338ca` |
| Confirmació / resposta correcta | Emerald Tailwind 700 | `#047857` |
| Error / resposta incorrecta | Rose Tailwind 700 | `#be123c` |

- [Paletes populars de 3 colors a Coolors](https://coolors.co/palettes/popular/3%20colors)
- [Obrir aquests tres colors a Coolors](https://coolors.co/4338ca-047857-be123c)

**Nota:** la paleta enllaçada és la proposta derivada dels colors que ja utilitza la interfície. Cal validar-la amb la paleta popular escollida per al mockup de Penpot.

## Estat dels requisits visuals

| Iteració | Requisit | Estat actual |
|---|---|---|
| 1 | Wireframe mobile i flux de pantalles a Penpot | Flux descrit en aquest document; enllaç al wireframe pendent. |
| 2 | Mockup elaborat amb principis CRAP | La interfície implementada segueix aquests principis; enllaç i validació del mockup de Penpot pendents. |
| 2 | Paleta de tres colors de Coolors | Hi ha una proposta i enllaços de Coolors; pendent de validar la selecció final. |
| 3 | Variables CSS `pregunta`, `divisor` i `fons` | No implementades. L'estil actual s'escriu amb classes utilitàries de Tailwind. |
| 4 | Prototip de Penpot | Pendent de crear/publicar i enllaçar. |
| 4 | CSS Grid per als elements principals | El frontend utilitza CSS Grid mitjançant classes Tailwind responsives. |
| 4 | CSS Grid per als botons de resposta | Les respostes es mostren en una columna vertical; no estan distribuïdes amb Grid. |
| 4 | `grid-template-areas` i `grid-template-columns` | Tailwind genera distribució amb grid i columnes, però no s'han definit `grid-template-areas` ni les àrees amb nom requerides. |

## Tecnologies

- Frontend SPA: HTML, JavaScript i Tailwind CSS.
- Backend: Node.js i Express.
- Persistència: MySQL amb `mysql2`.
- Pujada d'imatges: Multer. Els fitxers acceptats es guarden a `frontend/uploads/`; a MySQL només se'n desa la ruta.

## Posada en marxa

1. Configura les variables d'entorn del backend:
   - `DB_HOST`
   - `DB_USER`
   - `DB_PASSWORD`
   - `DB_NAME`
   - Opcionalment, `PORT` (per defecte `40550`).
2. Instal·la dependències i genera el CSS de Tailwind:

   ```bash
   cd backend
   npm ci
   npm run build
   ```

3. Inicialitza la taula MySQL i les dades inicials:

   ```bash
   node migrate.js
   ```

4. Arrenca l'aplicació:

   ```bash
   npm start
   ```

5. Obre l'adreça del servidor al navegador.

Per executar les proves del backend:

```bash
cd backend
npm test
```

5. Obre l'adreça del servidor al navegador.

Per executar amb docker

```bash
docker compose up --build
docker compose down -v
```

## API principal

| Mètode | Ruta | Funció |
|---|---|---|
| `GET` | `/api/preguntes` | Crea una partida amb preguntes barrejades i una sessió de servidor; no envia les respostes correctes al client. |
| `POST` | `/api/finalitza` | Rep `sessionId` i els índexs de les respostes. Retorna puntuació i preguntes fallades amb les respostes correctes. |
| `GET` | `/api/crud/preguntes` | Llista totes les preguntes per al panell d'administració. |
| `POST` | `/api/crud/preguntes` | Crea una pregunta; opcionalment rep una imatge com a `multipart/form-data`. |
| `PUT` | `/api/crud/preguntes/:id` | Modifica una pregunta i, opcionalment, la seva imatge. |
| `DELETE` | `/api/crud/preguntes/:id` | Elimina una pregunta. |

Les imatges pujades es poden servir des de `/uploads/<nom-del-fitxer>`.
