# Gestionale SaaS Multi-Tenant - Product Backlog (User Stories)

Questo documento descrive il backlog prodotto in forma di user stories dettagliate per un gestionale SaaS multi-tenant.

## Visione Prodotto

Costruire un gestionale cloud semplice, sicuro e scalabile per PMI, con:
- isolamento dati rigoroso tra tenant;
- sicurezza by default;
- esperienza utente chiara e multilingua;
- base architetturale pulita per evolvere verso moduli amministrativi e operativi.

## Ruoli

- **Guest**: utente non autenticato.
- **Member**: utente autenticato del tenant.
- **Admin**: utente con privilegi amministrativi nel tenant.
- **System**: comportamento applicativo/infrastrutturale.

## Definizioni trasversali (valgono per tutte le storie)

- Ogni entita' applicativa deve includere `tenant_id`.
- Nessuna query puo' ignorare il filtro tenant.
- Ogni endpoint autenticato deve validare identita', ruolo e appartenenza tenant.
- UI senza stringhe hardcoded: tutto passa da layer i18n.
- Errori sensibili non devono esporre dettagli interni.

---

## EPIC 1 - Authentication & Session Management

### US1 - Registrazione con creazione tenant
**Come** nuovo utente  
**voglio** registrarmi inserendo email, password e nome azienda  
**cosi' da** creare il mio spazio gestionale isolato

**Acceptance Criteria**
- Dati minimi richiesti: email valida, password conforme policy, `company_name`.
- Email univoca nel sistema.
- Alla conferma vengono creati:
  - nuovo tenant;
  - utente con ruolo `ADMIN` associato al tenant.
- Login automatico post-registrazione con token valido.
- Redirect su dashboard tenant appena creato.
- Audit log evento `tenant_created` e `user_registered`.

**Edge Cases**
- Email gia' registrata: errore esplicito e non ambiguo.
- Password debole: messaggio con requisiti mancanti.
- Errore transazionale: nessuna creazione parziale (tenant senza admin o viceversa).

---

### US2 - Login utente registrato
**Come** utente registrato  
**voglio** effettuare login con credenziali  
**cosi' da** accedere al mio gestionale

**Acceptance Criteria**
- Login con email/password validi.
- Emissione JWT (o session token) con `user_id`, `tenant_id`, `role`, `exp`.
- Persistenza sessione lato client in modo sicuro.
- Redirect verso dashboard.
- Tentativi falliti tracciati in audit log.

**Edge Cases**
- Credenziali errate: risposta uniforme, senza leak su utente esistente.
- Account disabilitato: login negato con messaggio dedicato.
- Token malformato: sessione rigettata e reset stato client.

---

### US3 - Accesso guest e protezione route private
**Come** guest  
**voglio** vedere uno stato pubblico chiaro  
**cosi' da** capire che devo autenticarmi

**Acceptance Criteria**
- Route private non accessibili ai guest.
- UI guest con call-to-action: "Accedi" / "Registrati".
- Nessun dato tenant visibile in stato guest.
- Redirect automatico a login se si prova ad aprire route protette.

---

### US4 - Gestione sessione invalida
**Come** sistema  
**voglio** invalidare sessioni incoerenti/scadute  
**cosi' da** evitare accessi non autorizzati

**Acceptance Criteria**
- Token scaduti o invalidi causano logout immediato.
- Rimozione credenziali lato client.
- Redirect a login con notifica sessione scaduta.
- Endpoint sensibili rispondono `401/403` coerentemente.

---

## EPIC 2 - Multi-Tenant Isolation

### US5 - Isolamento dati per tenant
**Come** utente autenticato  
**voglio** vedere solo dati del mio tenant  
**cosi' da** proteggere informazioni aziendali

**Acceptance Criteria**
- Ogni query lettura/scrittura filtra per `tenant_id`.
- Impossibile ottenere risorse di tenant diverso.
- Test automatici su accessi cross-tenant bloccati.

---

### US6 - Enforcement middleware tenant-aware
**Come** backend  
**voglio** applicare tenant scoping centralizzato  
**cosi' da** ridurre bug di sicurezza applicativa

**Acceptance Criteria**
- Middleware obbligatorio risolve `tenant_id` da token/sessione.
- Repository/service layer non espongono metodi "globali" non scoped.
- Endpoint senza contesto tenant falliscono in modo sicuro.

---

### US7 - Prevenzione IDOR
**Come** sistema  
**voglio** bloccare accesso diretto a record per ID non autorizzati  
**cosi' da** prevenire data leak

**Acceptance Criteria**
- Ogni fetch by ID valida ownership tenant.
- In caso di mismatch tenant: `404` o `403` coerente con policy.
- Copertura test per tentativi manuali su ID di altri tenant.

---

## EPIC 3 - Core Domain CRUD (Items)

### US8 - Creazione item
**Come** admin  
**voglio** creare un item  
**cosi' da** registrare dati aziendali

**Acceptance Criteria**
- Campi obbligatori validati server-side.
- Item creato con `tenant_id` del chiamante.
- Audit log evento `item_created`.
- Risposta API con payload coerente e localizzabile lato UI.

---

### US9 - Lista item tenant-scoped
**Come** member  
**voglio** vedere la lista dei miei item  
**cosi' da** consultare rapidamente i dati

**Acceptance Criteria**
- Lista filtrata per tenant.
- Ordinamento base (es. data creazione desc).
- Paginazione supportata.
- Empty state guidato se non ci sono elementi.

---

### US10 - Modifica item
**Come** admin  
**voglio** aggiornare un item esistente  
**cosi' da** mantenere i dati aggiornati

**Acceptance Criteria**
- Aggiornamento consentito solo su item del tenant corrente.
- Validazioni coerenti come in creazione.
- Tracciamento `updated_at` e audit evento `item_updated`.
- Conflitti di update gestiti (se policy optimistic locking attiva).

---

### US11 - Eliminazione item
**Come** admin  
**voglio** eliminare un item  
**cosi' da** mantenere pulizia e qualita' dati

**Acceptance Criteria**
- Delete solo su risorse del tenant.
- Conferma utente prima dell'azione distruttiva.
- Soft delete consigliata per recupero operativo.
- Audit evento `item_deleted`.

---

## EPIC 4 - User & Access Management

### US12 - Cambio lingua utente
**Come** utente  
**voglio** cambiare lingua dell'interfaccia  
**cosi' da** usare il sistema nella mia lingua

**Acceptance Criteria**
- Selettore lingua visibile in area utente.
- Preferenza salvata e persistente tra sessioni.
- Aggiornamento UI immediato senza refresh completo (se possibile).

---

### US13 - Invito utenti nel tenant
**Come** admin  
**voglio** invitare nuovi utenti via email  
**cosi' da** collaborare nel mio tenant

**Acceptance Criteria**
- Invito con email e ruolo iniziale.
- Token invito con scadenza.
- Accettazione invito crea/associa utente al tenant corretto.
- Inviti duplicati o scaduti gestiti con feedback chiaro.

---

### US14 - Gestione ruoli e permessi
**Come** admin  
**voglio** assegnare ruoli agli utenti  
**cosi' da** controllare gli accessi

**Acceptance Criteria**
- Ruoli minimi: `ADMIN`, `MEMBER` (estensibile).
- Enforcement permessi lato API, non solo UI.
- Admin non puo' auto-rimuovere ultimo privilegio amministrativo se unico admin.
- Audit evento `role_changed`.

---

## EPIC 5 - Internationalization (i18n)

### US15 - UI multilingua completa
**Come** utente  
**voglio** trovare l'interfaccia tradotta  
**cosi' da** usare il gestionale in modo naturale

**Acceptance Criteria**
- Tutte le stringhe UI passano da dizionari i18n.
- Supporto iniziale minimo: `it` e `en`.
- Messaggi di errore e validazione localizzati.

---

### US16 - Fallback lingua robusto
**Come** sistema  
**voglio** usare fallback automatico su chiavi mancanti  
**cosi' da** evitare UI rotta o testi vuoti

**Acceptance Criteria**
- Se chiave mancante nella lingua attiva, fallback su lingua di default.
- Logging tecnico per chiavi mancanti.
- Nessuna chiave i18n mostrata grezza in UI (es. `dashboard.title`).

---

## EPIC 6 - UX Empty States & Onboarding

### US17 - Empty state guest
**Come** guest  
**voglio** una schermata vuota ma guidata  
**cosi' da** capire il primo passo da fare

**Acceptance Criteria**
- Messaggio sintetico sul valore del prodotto.
- CTA primaria `Accedi` e secondaria `Registrati`.
- Nessun elemento interno del tenant mostrato.

---

### US18 - Empty state tenant nuovo
**Come** utente di tenant appena creato  
**voglio** una guida iniziale con azioni consigliate  
**cosi' da** completare rapidamente onboarding

**Acceptance Criteria**
- Checklist iniziale (es. crea primo item, invita collega, imposta lingua).
- Stato checklist persistente.
- Link rapidi alle azioni principali.

---

## Requisiti Non Funzionali

- **Sicurezza**: OWASP baseline, protezione da IDOR, gestione sicura token/sessioni.
- **Performance**: tempi risposta API CRUD entro SLO definito.
- **Osservabilita'**: log strutturati, audit trail su azioni critiche.
- **Qualita' codice**: TypeScript strict, layering pulito, test su casi critici.
- **Scalabilita'**: schema dati e servizi pronti a crescita tenant/utenti.

## Definition of Done (DoD) per ogni User Story

- Acceptance criteria coperti da test.
- Nessuna regressione su isolamento tenant.
- Messaggi utente localizzati.
- Audit/log aggiunti per eventi sensibili.
- Documentazione API/UI aggiornata.

## Regole operative per sviluppo con AI (Cursor)

### DEVE
- Comportarsi come Senior SaaS Engineer.
- Rispettare sempre l'architettura multi-tenant.
- Usare TypeScript in strict mode.
- Mantenere separazione chiara tra UI, dominio e infrastruttura.

### VIETATO
- Bypassare autenticazione/autorizzazione.
- Eseguire query senza `tenant_id` (salvo flussi di bootstrap espliciti e controllati).
- Inserire stringhe UI hardcoded.
- Spostare logica di business critica nel frontend.

## Principi finali

- **MULTI-TENANT FIRST**
- **SECURITY BY DEFAULT**
- **I18N ALWAYS**
- **SIMPLE MVP, SOLID FOUNDATION**