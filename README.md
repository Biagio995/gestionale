# Gestionale — CRM e fatturazione per la tua azienda

Gestionale è un software **multi-azienda (SaaS)** pensato per piccole e medie imprese italiane. Ti permette di gestire **contatti, trattative, vendite e fatturazione** in un unico ambiente, con supporto alla **fattura elettronica** (SDI simulato in ambiente demo).

L’interfaccia è disponibile in **italiano**, **inglese** e **greco**.

---

## A chi è rivolto

- Aziende che vogliono un flusso ordinato: **Preventivo → Ordine → DDT → Fattura**
- Team commerciali che usano un **CRM** leggero (contatti, trattative, calendario)
- Amministratori che devono configurare **dati fiscali**, **scadenzario** e **fatture passive**
- Chi cerca una soluzione **self-hosted** o in prova locale prima di adottarla

---

## Prova subito (account demo)

Se l’ambiente è già configurato, puoi accedere con:

| Campo    | Valore              |
|----------|---------------------|
| Email    | `demo@example.com`  |
| Password | `password123`       |

L’account demo include già un **profilo fiscale** precompilato (Demo Srl) e dati di esempio per esplorare vendite e fatturazione.

---

## Primo accesso: registra la tua azienda

1. Apri l’applicazione nel browser (di default: `http://localhost:5173`)
2. Clicca **Registra azienda**
3. Inserisci email, password e **nome azienda**
4. Dopo l’accesso, segui la **guida introduttiva** in dashboard

Ogni azienda registrata ha un **ambiente isolato**: i tuoi dati non sono visibili ad altre aziende sulla piattaforma.

---

## Avvio locale (installazione rapida)

### Requisiti

- [Node.js](https://nodejs.org/) 20 o superiore
- [Docker](https://www.docker.com/) (per PostgreSQL)
- npm

### Passaggi

```bash
# 1. Avvia il database
docker compose up -d

# 2. Backend
cd backend
cp .env.example .env
npm install
npm run migrate
npm run seed:demo    # opzionale: dati demo fiscali
npm run dev

# 3. Frontend (in un altro terminale)
cd frontend
cp .env.example .env
npm install
npm run dev
```

Apri **http://localhost:5173** e accedi o registrati.

> **Nota:** in sviluppo le email (inviti, reset password) vengono scritte in console, non inviate realmente, a meno che non configuri SMTP in `backend/.env`.

---

## Cosa puoi fare

### CRM

| Area | Descrizione |
|------|-------------|
| **Contatti** | Anagrafica clienti con P.IVA, codice fiscale, SDI, PEC e indirizzo |
| **Trattative** | Pipeline commerciale (lead → chiusura) con valore e fasi |
| **Calendario** | Appuntamenti e attività collegati a contatti e trattative |
| **Dashboard** | Panoramica attività commerciale e indicatori vendite |

### Vendite e documenti

Il cuore del gestionale è il **flusso documentale**:

```
Preventivo  →  Ordine  →  DDT  →  Fattura
```

| Documento | A cosa serve |
|-----------|--------------|
| **Preventivo** | Proposta commerciale al cliente |
| **Ordine** | Conferma dell’ordine (da preventivo accettato) |
| **DDT** | Documento di trasporto / consegna merci |
| **Fattura** | Documento fiscale (prima in bozza, poi emessa) |

**Funzionalità utili:**

- **Pipeline vendite** — vista d’insieme di preventivi, ordini, DDT e fatture
- **Catena documenti** — collegamento tra i documenti dello stesso cliente
- **Conversione guidata** — da preventivo puoi andare direttamente a fattura, con opzione **Salta DDT** (ideale per servizi)
- **Evasione parziale** — DDT e fatture su quantità residue (consegne o fatturazioni a rate)
- **PDF ed email** — scarica o invia i documenti al cliente
- **Catalogo articoli** — prodotti con prezzo e, opzionalmente, **gestione magazzino**

### Fatturazione elettronica

| Area | Descrizione |
|------|-------------|
| **Profilo fiscale** | Dati azienda (P.IVA, indirizzo, SDI, PEC, giorni pagamento predefiniti) |
| **Fatture attive** | Emissione, modifica in bozza, emissione definitiva, invio SDI |
| **Fatture passive** | Registrazione e import XML fatture ricevute |
| **Scadenzario** | Scadenze pagamento e stato incassi |
| **Validazione P.IVA** | Controllo formale (e opzionale VIES se abilitato) |

> **Importante:** in ambiente locale l’invio allo **SDI è simulato**. Non sostituisce un gestionale certificato in produzione finché non colleghi i servizi reali dell’Agenzia delle Entrate.

---

## Flusso consigliato (passo per passo)

### 1. Configura il profilo fiscale

**Vendite → Impostazioni fiscali** (solo amministratori)

Compila ragione sociale, P.IVA, indirizzo, codice SDI o PEC e i giorni di pagamento predefiniti. Senza questi dati, PDF e fattura elettronica non sono completi.

### 2. Crea contatti e articoli

- Aggiungi i **clienti** in CRM → Contatti (con dati fiscali se devi fatturare)
- Opzionale: crea **articoli** in Elementi (prezzo, giacenza se gestisci magazzino)

### 3. Crea un preventivo

**Vendite → Preventivi → Nuovo preventivo**

- Seleziona un contatto CRM o inserisci i dati manualmente
- Aggiungi le righe (descrizione, quantità, prezzo, IVA)
- Salva e, se serve, invia PDF/email al cliente

### 4. Converti in ordine

Dal dettaglio preventivo: **Converti in ordine**. Il preventivo passa allo stato *Convertito*.

### 5. Genera il DDT (o salta)

Dal dettaglio ordine:

- **Genera DDT** — per consegna merci (anche parziale, scegliendo le quantità)
- **Fattura (senza DDT)** — per prestazioni di servizio senza documento di trasporto

Se tracci il magazzino, la giacenza degli articoli viene aggiornata alla creazione del DDT.

### 6. Emetti la fattura

La conversione crea una fattura in **bozza (DRAFT)**:

1. Controlla e modifica righe e dati cliente se necessario
2. Clicca **Emetti fattura** per renderla definitiva
3. Scarica PDF/XML o usa **Invia SDI** (simulato in demo)

### 7. Monitora pagamenti

Usa lo **Scadenzario** e, dal dettaglio fattura, registra gli incassi parziali o totali.

---

## Ruoli utente

| Ruolo | Cosa può fare |
|-------|----------------|
| **Utente** | CRM, vendite, consultazione documenti, ticket assistenza |
| **Admin azienda** | Tutto quanto sopra + utenti, profilo fiscale, emissione fatture, SDI |
| **Super Admin** | Pannello piattaforma: gestione aziende clienti, ticket, contratti (non usa il CRM aziendale) |

Gli amministratori possono **invitare colleghi** via email dalla sezione Utenti.

---

## Lingue

Dal menu utente puoi cambiare lingua:

- Italiano
- English
- Ελληνικά

---

## Assistenza

Ogni azienda può aprire **ticket di assistenza** dalla sezione dedicata. I ticket sono gestiti dal team piattaforma (Super Admin) separatamente dal CRM aziendale.

---

## Limitazioni attuali (da conoscere)

- **SDI simulato** — l’invio fiscale non raggiunge l’Agenzia delle Entrate in ambiente demo
- **Nessun OAuth AdE** — integrazione produzione SDI non inclusa in questa versione
- **Email** — in sviluppo le notifiche vanno in log; in produzione serve SMTP configurato
- **Multi-azienda** — ogni registrazione crea un tenant isolato; non è previsto condividere dati tra aziende

---

## Struttura del progetto (per curiosi)

```
Gestionale/
├── backend/     API REST (Node.js, Express, PostgreSQL)
├── frontend/    Interfaccia web (Vue 3, TypeScript)
├── docker-compose.yml
└── README.md    ← questa guida
```

Per sviluppatori: test backend con `npm test` nella cartella `backend`, build frontend con `npm run build` in `frontend`.

---

## Domande frequenti

**Devo creare sempre il DDT?**  
No. Per servizi puoi usare **Fattura (senza DDT)** dall’ordine o spuntare *Salta il DDT* nel wizard da preventivo.

**Posso fatturare solo una parte dell’ordine?**  
Sì. In conversione ordine→DDT o DDT→fattura puoi indicare le **quantità parziali** per riga.

**Perché la fattura è in bozza?**  
Per permetterti di controllare i dati prima dell’emissione definitiva. Solo dopo **Emetti fattura** puoi inviare allo SDI.

**Ho dimenticato la password?**  
Usa **Password dimenticata** dalla schermata di login (richiede SMTP configurato in produzione).

---

## Licenza e supporto

Software in evoluzione. Per segnalazioni o richieste, apri un ticket dall’interno dell’applicazione o contatta chi gestisce l’installazione.
