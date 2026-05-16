let interventi = [];
let ordini = [];
let crediti = [];

let interventoInModifica = null;
let ordineInModifica = null;
let creditoInModifica = null;

async function caricaDati() {
    try {
        const risposta = await fetch("/api/dati");
        const dati = await risposta.json();

        interventi = dati.interventi || [];
        ordini = dati.ordini || [];
        crediti = dati.crediti || [];

        mostraInterventi();
        mostraOrdini();
        mostraCrediti();
        aggiornaHome();

    } catch (errore) {
        console.error("Errore caricamento dati:", errore);
    }
}

async function salvaDati() {
    try {
        await fetch("/api/dati", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                interventi,
                ordini,
                crediti
            })
        });
    } catch (errore) {
        console.error("Errore salvataggio dati:", errore);
    }
}

function apriPagina(idPagina) {
    document.querySelectorAll(".pagina").forEach(pagina => {
        pagina.classList.remove("attiva");
    });

    document.getElementById(idPagina).classList.add("attiva");
    aggiornaHome();
}

/* =========================
   ASSISTENZA
========================= */

async function salvaIntervento() {
    const nome = document.getElementById("nome").value.trim();
    const telefono = document.getElementById("telefono").value.trim();
    const dispositivo = document.getElementById("dispositivo").value.trim();
    const codiceSblocco = document.getElementById("codiceSblocco").value.trim();
    const data = document.getElementById("data").value;
    const prezzo = document.getElementById("prezzo").value;
    const stato = document.getElementById("statoIntervento").value;
    const note = document.getElementById("note").value.trim();

    let foto = "";

    const inputFoto = document.getElementById("fotoIntervento");

    if (inputFoto && inputFoto.files.length > 0) {
        const formData = new FormData();
        formData.append("foto", inputFoto.files[0]);

        const rispostaUpload = await fetch("/api/upload", {
            method: "POST",
            body: formData
        });

        const risultatoUpload = await rispostaUpload.json();

        if (risultatoUpload.success) {
            foto = risultatoUpload.file;
        } else {
            alert("Errore durante il caricamento della foto.");
            return;
        }
    }

    if (nome === "" || telefono === "" || dispositivo === "") {
        alert("Compila almeno nome, telefono e dispositivo.");
        return;
    }

    if (interventoInModifica) {
        interventi = interventi.map(intervento => {
            if (intervento.id === interventoInModifica) {
                return {
                    id: intervento.id,
                    nome,
                    telefono,
                    dispositivo,
                    codiceSblocco,
                    data,
                    prezzo,
                    stato,
                    note,
                    foto: foto || intervento.foto || ""
                };
            }

            return intervento;
        });

        interventoInModifica = null;

    } else {
        interventi.push({
            id: Date.now(),
            nome,
            telefono,
            dispositivo,
            codiceSblocco,
            data,
            prezzo,
            stato,
            note,
            foto
        });
    }

    await salvaDati();
    pulisciCampiIntervento();
    mostraInterventi();
    aggiornaHome();

    alert("Intervento salvato correttamente.");
}

function mostraInterventi() {
    const lista = document.getElementById("listaInterventi");

    if (!lista) return;

    const ricercaInput = document.getElementById("ricerca");
    const ricerca = ricercaInput ? ricercaInput.value.toLowerCase() : "";

    lista.innerHTML = "";

    const risultati = interventi.filter(intervento =>
        (intervento.nome || "").toLowerCase().includes(ricerca) ||
        (intervento.telefono || "").toLowerCase().includes(ricerca) ||
        (intervento.dispositivo || "").toLowerCase().includes(ricerca)
    );

    if (risultati.length === 0) {
        lista.innerHTML = "<p>Nessun intervento trovato.</p>";
        return;
    }

    risultati.slice().reverse().forEach(intervento => {
        const card = document.createElement("div");
        card.className = "card";

        const fotoHtml = intervento.foto
            ? `<img src="${intervento.foto}" class="foto-card" alt="Foto intervento">`
            : "";

        card.innerHTML = `
            <p><strong>Cliente:</strong> ${intervento.nome || "-"}</p>
            <p><strong>Telefono:</strong> ${intervento.telefono || "-"}</p>
            <p><strong>Dispositivo:</strong> ${intervento.dispositivo || "-"}</p>
            <p><strong>Codice Sblocco:</strong> ${intervento.codiceSblocco || "-"}</p>
            <p><strong>Data:</strong> ${intervento.data || "-"}</p>
            <p><strong>Prezzo:</strong> ${intervento.prezzo ? "€ " + intervento.prezzo : "-"}</p>
            <p><strong>Stato:</strong> <span class="badge">${intervento.stato || "-"}</span></p>
            <p><strong>Note:</strong> ${intervento.note || "-"}</p>

            ${fotoHtml}

            <div class="azioni">
                <button onclick="modificaIntervento(${intervento.id})">Modifica</button>
                <button onclick="stampaIntervento(${intervento.id})">Stampa</button>
                <button onclick="apriStoricoCliente('${intervento.nome}')">Storico</button>
                <button class="completa-btn" onclick="completaIntervento(${intervento.id})">Consegna</button>
                <button class="elimina-btn" onclick="eliminaIntervento(${intervento.id})">Elimina</button>
            </div>
        `;

        lista.appendChild(card);
    });
}

function modificaIntervento(id) {
    const intervento = interventi.find(item => item.id === id);

    if (!intervento) return;

    document.getElementById("nome").value = intervento.nome || "";
    document.getElementById("telefono").value = intervento.telefono || "";
    document.getElementById("dispositivo").value = intervento.dispositivo || "";
    document.getElementById("codiceSblocco").value = intervento.codiceSblocco || "";
    document.getElementById("data").value = intervento.data || "";
    document.getElementById("prezzo").value = intervento.prezzo || "";
    document.getElementById("statoIntervento").value = intervento.stato || "In attesa";
    document.getElementById("note").value = intervento.note || "";

    interventoInModifica = id;

    apriPagina("assistenza");
    window.scrollTo(0, 0);
}

async function completaIntervento(id) {
    interventi = interventi.map(intervento => {
        if (intervento.id === id) {
            intervento.stato = "Consegnato";
        }

        return intervento;
    });

    await salvaDati();
    mostraInterventi();
    aggiornaHome();
}

async function eliminaIntervento(id) {
    if (!confirm("Vuoi eliminare questo intervento?")) return;

    interventi = interventi.filter(intervento => intervento.id !== id);

    await salvaDati();
    mostraInterventi();
    aggiornaHome();
}

function pulisciCampiIntervento() {
    document.getElementById("nome").value = "";
    document.getElementById("telefono").value = "";
    document.getElementById("dispositivo").value = "";
    document.getElementById("codiceSblocco").value = "";
    document.getElementById("data").value = "";
    document.getElementById("prezzo").value = "";
    document.getElementById("statoIntervento").value = "In attesa";
    document.getElementById("note").value = "";

    const fotoInput = document.getElementById("fotoIntervento");
    if (fotoInput) fotoInput.value = "";

    interventoInModifica = null;
}

/* =========================
   ORDINI
========================= */

async function salvaOrdine() {
    const nome = document.getElementById("ordineNome").value.trim();
    const telefono = document.getElementById("ordineTelefono").value.trim();
    const prodotto = document.getElementById("prodottoRichiesto").value.trim();
    const modello = document.getElementById("modelloRichiesto").value.trim();
    const data = document.getElementById("ordineData").value;
    const prezzo = document.getElementById("ordinePrezzo").value;
    const acconto = document.getElementById("ordineAcconto").value;
    const stato = document.getElementById("statoOrdine").value;
    const note = document.getElementById("ordineNote").value.trim();

    if (nome === "" || prodotto === "") {
        alert("Compila almeno nome cliente e prodotto.");
        return;
    }

    if (ordineInModifica) {
        ordini = ordini.map(ordine => {
            if (ordine.id === ordineInModifica) {
                return {
                    id: ordine.id,
                    nome,
                    telefono,
                    prodotto,
                    modello,
                    data,
                    prezzo,
                    acconto,
                    stato,
                    note
                };
            }

            return ordine;
        });

        ordineInModifica = null;

    } else {
        ordini.push({
            id: Date.now(),
            nome,
            telefono,
            prodotto,
            modello,
            data,
            prezzo,
            acconto,
            stato,
            note
        });
    }

    await salvaDati();
    pulisciCampiOrdine();
    mostraOrdini();
    aggiornaHome();

    alert("Richiesta salvata correttamente.");
}

function mostraOrdini() {
    const lista = document.getElementById("listaOrdini");

    if (!lista) return;

    const ricercaInput = document.getElementById("ricercaOrdini");
    const ricerca = ricercaInput ? ricercaInput.value.toLowerCase() : "";

    lista.innerHTML = "";

    const risultati = ordini.filter(ordine =>
        (ordine.nome || "").toLowerCase().includes(ricerca) ||
        (ordine.telefono || "").toLowerCase().includes(ricerca) ||
        (ordine.prodotto || "").toLowerCase().includes(ricerca) ||
        (ordine.modello || "").toLowerCase().includes(ricerca)
    );

    if (risultati.length === 0) {
        lista.innerHTML = "<p>Nessun ordine trovato.</p>";
        return;
    }

    risultati.slice().reverse().forEach(ordine => {
        const card = document.createElement("div");
        card.className = "card";

        card.innerHTML = `
            <p><strong>Cliente:</strong> ${ordine.nome || "-"}</p>
            <p><strong>Telefono:</strong> ${ordine.telefono || "-"}</p>
            <p><strong>Prodotto:</strong> ${ordine.prodotto || "-"}</p>
            <p><strong>Modello:</strong> ${ordine.modello || "-"}</p>
            <p><strong>Data:</strong> ${ordine.data || "-"}</p>
            <p><strong>Prezzo:</strong> ${ordine.prezzo ? "€ " + ordine.prezzo : "-"}</p>
            <p><strong>Acconto:</strong> ${ordine.acconto ? "€ " + ordine.acconto : "-"}</p>
            <p><strong>Stato:</strong> <span class="badge">${ordine.stato || "-"}</span></p>
            <p><strong>Note:</strong> ${ordine.note || "-"}</p>

            <div class="azioni">
                <button onclick="modificaOrdine(${ordine.id})">Modifica</button>
                <button onclick="apriStoricoCliente('${ordine.nome}')">Storico</button>
                <button class="completa-btn" onclick="consegnaOrdine(${ordine.id})">Consegnato</button>
                <button class="elimina-btn" onclick="eliminaOrdine(${ordine.id})">Elimina</button>
            </div>
        `;

        lista.appendChild(card);
    });
}

function modificaOrdine(id) {
    const ordine = ordini.find(item => item.id === id);

    if (!ordine) return;

    document.getElementById("ordineNome").value = ordine.nome || "";
    document.getElementById("ordineTelefono").value = ordine.telefono || "";
    document.getElementById("prodottoRichiesto").value = ordine.prodotto || "";
    document.getElementById("modelloRichiesto").value = ordine.modello || "";
    document.getElementById("ordineData").value = ordine.data || "";
    document.getElementById("ordinePrezzo").value = ordine.prezzo || "";
    document.getElementById("ordineAcconto").value = ordine.acconto || "";
    document.getElementById("statoOrdine").value = ordine.stato || "Da ordinare";
    document.getElementById("ordineNote").value = ordine.note || "";

    ordineInModifica = id;

    apriPagina("ordini");
    window.scrollTo(0, 0);
}

async function consegnaOrdine(id) {
    ordini = ordini.map(ordine => {
        if (ordine.id === id) {
            ordine.stato = "Consegnato";
        }

        return ordine;
    });

    await salvaDati();
    mostraOrdini();
    aggiornaHome();
}

async function eliminaOrdine(id) {
    if (!confirm("Vuoi eliminare questo ordine?")) return;

    ordini = ordini.filter(ordine => ordine.id !== id);

    await salvaDati();
    mostraOrdini();
    aggiornaHome();
}

function pulisciCampiOrdine() {
    document.getElementById("ordineNome").value = "";
    document.getElementById("ordineTelefono").value = "";
    document.getElementById("prodottoRichiesto").value = "";
    document.getElementById("modelloRichiesto").value = "";
    document.getElementById("ordineData").value = "";
    document.getElementById("ordinePrezzo").value = "";
    document.getElementById("ordineAcconto").value = "";
    document.getElementById("statoOrdine").value = "Da ordinare";
    document.getElementById("ordineNote").value = "";

    ordineInModifica = null;
}

/* =========================
   CREDITI CLIENTI
========================= */

async function salvaCredito() {
    const nome = document.getElementById("creditoNome").value.trim();
    const telefono = document.getElementById("creditoTelefono").value.trim();
    const motivo = document.getElementById("creditoMotivo").value.trim();
    const importo = document.getElementById("creditoImporto").value;
    const acconto = document.getElementById("creditoAcconto").value;
    const data = document.getElementById("creditoData").value;
    const scadenza = document.getElementById("creditoScadenza").value;
    const stato = document.getElementById("creditoStato").value;
    const note = document.getElementById("creditoNote").value.trim();

    if (nome === "" || motivo === "" || importo === "") {
        alert("Compila almeno nome cliente, motivo e importo dovuto.");
        return;
    }

    const nuovoCredito = {
        id: creditoInModifica || Date.now(),
        nome,
        telefono,
        motivo,
        importo,
        acconto,
        data,
        scadenza,
        stato,
        note
    };

    if (creditoInModifica) {
        crediti = crediti.map(credito =>
            credito.id === creditoInModifica ? nuovoCredito : credito
        );

        creditoInModifica = null;
    } else {
        crediti.push(nuovoCredito);
    }

    await salvaDati();

    pulisciCampiCredito();
    mostraCrediti();
    aggiornaHome();

    alert("Credito salvato correttamente.");
}

function mostraCrediti() {
    const lista = document.getElementById("listaCrediti");

    if (!lista) return;

    const ricercaInput = document.getElementById("ricercaCrediti");
    const ricerca = ricercaInput ? ricercaInput.value.toLowerCase() : "";

    lista.innerHTML = "";

    const risultati = crediti.filter(credito =>
        (credito.nome || "").toLowerCase().includes(ricerca) ||
        (credito.telefono || "").toLowerCase().includes(ricerca) ||
        (credito.motivo || "").toLowerCase().includes(ricerca)
    );

    if (risultati.length === 0) {
        lista.innerHTML = "<p>Nessun credito trovato.</p>";
        return;
    }

    risultati.slice().reverse().forEach(credito => {
        const importo = parseFloat(credito.importo) || 0;
        const acconto = parseFloat(credito.acconto) || 0;
        const residuo = importo - acconto;

        const card = document.createElement("div");
        card.className = "card";

        card.innerHTML = `
            <p><strong>Cliente:</strong> ${credito.nome || "-"}</p>
            <p><strong>Telefono:</strong> ${credito.telefono || "-"}</p>
            <p><strong>Motivo:</strong> ${credito.motivo || "-"}</p>
            <p><strong>Importo dovuto:</strong> € ${importo.toFixed(2)}</p>
            <p><strong>Acconto ricevuto:</strong> € ${acconto.toFixed(2)}</p>
            <p><strong>Residuo:</strong> € ${residuo.toFixed(2)}</p>
            <p><strong>Data:</strong> ${credito.data || "-"}</p>
            <p><strong>Scadenza:</strong> ${credito.scadenza || "-"}</p>
            <p><strong>Stato:</strong> <span class="badge">${credito.stato || "-"}</span></p>
            <p><strong>Note:</strong> ${credito.note || "-"}</p>

            <div class="azioni">
                <button onclick="modificaCredito(${credito.id})">Modifica</button>
                <button onclick="apriStoricoCliente('${credito.nome}')">Storico</button>
                <button class="completa-btn" onclick="pagaCredito(${credito.id})">Segna Pagato</button>
                <button class="elimina-btn" onclick="eliminaCredito(${credito.id})">Elimina</button>
            </div>
        `;

        lista.appendChild(card);
    });
}

function modificaCredito(id) {
    const credito = crediti.find(item => item.id === id);

    if (!credito) return;

    document.getElementById("creditoNome").value = credito.nome || "";
    document.getElementById("creditoTelefono").value = credito.telefono || "";
    document.getElementById("creditoMotivo").value = credito.motivo || "";
    document.getElementById("creditoImporto").value = credito.importo || "";
    document.getElementById("creditoAcconto").value = credito.acconto || "";
    document.getElementById("creditoData").value = credito.data || "";
    document.getElementById("creditoScadenza").value = credito.scadenza || "";
    document.getElementById("creditoStato").value = credito.stato || "Da incassare";
    document.getElementById("creditoNote").value = credito.note || "";

    creditoInModifica = id;

    apriPagina("crediti");
    window.scrollTo(0, 0);
}

async function pagaCredito(id) {
    crediti = crediti.map(credito => {
        if (credito.id === id) {
            credito.stato = "Pagato";
            credito.acconto = credito.importo;
        }

        return credito;
    });

    await salvaDati();
    mostraCrediti();
    aggiornaHome();
}

async function eliminaCredito(id) {
    if (!confirm("Vuoi eliminare questo credito?")) return;

    crediti = crediti.filter(credito => credito.id !== id);

    await salvaDati();
    mostraCrediti();
    aggiornaHome();
}

function pulisciCampiCredito() {
    document.getElementById("creditoNome").value = "";
    document.getElementById("creditoTelefono").value = "";
    document.getElementById("creditoMotivo").value = "";
    document.getElementById("creditoImporto").value = "";
    document.getElementById("creditoAcconto").value = "";
    document.getElementById("creditoData").value = "";
    document.getElementById("creditoScadenza").value = "";
    document.getElementById("creditoStato").value = "Da incassare";
    document.getElementById("creditoNote").value = "";

    creditoInModifica = null;
}

/* =========================
   HOME
========================= */

function aggiornaHome() {
    const riepilogoInterventi = document.getElementById("riepilogoInterventi");
    const riepilogoOrdini = document.getElementById("riepilogoOrdini");
    const riepilogoCrediti = document.getElementById("riepilogoCrediti");

    if (riepilogoInterventi) {
        const attiviInterventi = interventi.filter(intervento =>
            intervento.stato !== "Consegnato" &&
            intervento.stato !== "Annullato"
        );

        riepilogoInterventi.innerHTML = "";

        if (attiviInterventi.length === 0) {
            riepilogoInterventi.innerHTML = "<p>Nessuna assistenza attiva.</p>";
        } else {
            attiviInterventi.slice().reverse().forEach(intervento => {
                riepilogoInterventi.innerHTML += `
                    <div class="card">
                        <p><strong>${intervento.nome}</strong> - ${intervento.dispositivo}</p>
                        <p>Stato: <span class="badge">${intervento.stato}</span></p>
                    </div>
                `;
            });
        }
    }

    if (riepilogoOrdini) {
        const attiviOrdini = ordini.filter(ordine =>
            ordine.stato !== "Consegnato" &&
            ordine.stato !== "Annullato"
        );

        riepilogoOrdini.innerHTML = "";

        if (attiviOrdini.length === 0) {
            riepilogoOrdini.innerHTML = "<p>Nessun ordine attivo.</p>";
        } else {
            attiviOrdini.slice().reverse().forEach(ordine => {
                riepilogoOrdini.innerHTML += `
                    <div class="card">
                        <p><strong>${ordine.nome}</strong> - ${ordine.prodotto}</p>
                        <p>Stato: <span class="badge">${ordine.stato}</span></p>
                    </div>
                `;
            });
        }
    }

    if (riepilogoCrediti) {
        const attiviCrediti = crediti.filter(credito =>
            credito.stato !== "Pagato" &&
            credito.stato !== "Annullato"
        );

        let totaleCrediti = 0;

        riepilogoCrediti.innerHTML = "";

        if (attiviCrediti.length === 0) {
            riepilogoCrediti.innerHTML = "<p>Nessun credito attivo.</p>";
        } else {
            attiviCrediti.slice().reverse().forEach(credito => {
                const importo = parseFloat(credito.importo) || 0;
                const acconto = parseFloat(credito.acconto) || 0;
                const residuo = importo - acconto;

                totaleCrediti += residuo;

                riepilogoCrediti.innerHTML += `
                    <div class="card">
                        <p><strong>${credito.nome}</strong> - ${credito.motivo}</p>
                        <p>Residuo: <strong>€ ${residuo.toFixed(2)}</strong></p>
                        <p>Stato: <span class="badge">${credito.stato}</span></p>
                    </div>
                `;
            });

            riepilogoCrediti.innerHTML += `
                <div class="card">
                    <h3>Totale da incassare: € ${totaleCrediti.toFixed(2)}</h3>
                </div>
            `;
        }
    }
}

/* =========================
   STAMPA E STORICO
========================= */

function stampaIntervento(id) {
    const intervento = interventi.find(item => item.id === id);

    if (!intervento) return;

    const contenuto = `
        <html>
        <head>
            <title>Scheda Assistenza</title>
            <style>
                body {
                    font-family: Arial, sans-serif;
                    padding: 30px;
                    line-height: 1.6;
                }

                h1 {
                    text-align: center;
                    margin-bottom: 30px;
                }

                p {
                    margin: 8px 0;
                }

                .firma {
                    margin-top: 80px;
                }

                .firma div {
                    margin-top: 50px;
                    border-top: 1px solid #000;
                    width: 300px;
                    padding-top: 5px;
                }
            </style>
        </head>
        <body>

            <h1>Area41 - Scheda Assistenza</h1>

            <p><strong>Cliente:</strong> ${intervento.nome}</p>
            <p><strong>Telefono:</strong> ${intervento.telefono}</p>
            <p><strong>Dispositivo:</strong> ${intervento.dispositivo}</p>
            <p><strong>Codice Sblocco:</strong> ${intervento.codiceSblocco || "-"}</p>
            <p><strong>Data:</strong> ${intervento.data || "-"}</p>
            <p><strong>Prezzo:</strong> ${intervento.prezzo ? "€ " + intervento.prezzo : "-"}</p>
            <p><strong>Stato:</strong> ${intervento.stato || "-"}</p>
            <p><strong>Note:</strong> ${intervento.note || "-"}</p>

            <div class="firma">
                <p>Firma Cliente</p>
                <div></div>
            </div>

            <script>
                window.onload = function() {
                    window.print();
                };
            </script>

        </body>
        </html>
    `;

    const finestra = window.open("", "_blank");
    finestra.document.write(contenuto);
    finestra.document.close();
}

function apriStoricoCliente(nomeCliente) {
    const titolo = document.getElementById("titoloStoricoCliente");
    const contenuto = document.getElementById("contenutoStoricoCliente");

    titolo.textContent = `Storico Cliente - ${nomeCliente}`;

    const interventiCliente = interventi.filter(intervento => intervento.nome === nomeCliente);
    const ordiniCliente = ordini.filter(ordine => ordine.nome === nomeCliente);
    const creditiCliente = crediti.filter(credito => credito.nome === nomeCliente);

    let html = "";
    let totale = 0;

    html += "<h3>Assistenze</h3>";

    if (interventiCliente.length === 0) {
        html += "<p>Nessuna assistenza trovata.</p>";
    } else {
        interventiCliente.forEach(intervento => {
            const prezzo = parseFloat(intervento.prezzo) || 0;
            totale += prezzo;

            html += `
                <div class="card">
                    <p><strong>Data:</strong> ${intervento.data || "-"}</p>
                    <p><strong>Dispositivo:</strong> ${intervento.dispositivo}</p>
                    <p><strong>Prezzo:</strong> € ${prezzo.toFixed(2)}</p>
                    <p><strong>Stato:</strong> ${intervento.stato}</p>
                </div>
            `;
        });
    }

    html += "<h3>Ordini</h3>";

    if (ordiniCliente.length === 0) {
        html += "<p>Nessun ordine trovato.</p>";
    } else {
        ordiniCliente.forEach(ordine => {
            const prezzo = parseFloat(ordine.prezzo) || 0;
            totale += prezzo;

            html += `
                <div class="card">
                    <p><strong>Data:</strong> ${ordine.data || "-"}</p>
                    <p><strong>Prodotto:</strong> ${ordine.prodotto}</p>
                    <p><strong>Prezzo:</strong> € ${prezzo.toFixed(2)}</p>
                    <p><strong>Stato:</strong> ${ordine.stato}</p>
                </div>
            `;
        });
    }

    html += "<h3>Crediti</h3>";

    if (creditiCliente.length === 0) {
        html += "<p>Nessun credito trovato.</p>";
    } else {
        creditiCliente.forEach(credito => {
            const importo = parseFloat(credito.importo) || 0;
            const acconto = parseFloat(credito.acconto) || 0;
            const residuo = importo - acconto;

            html += `
                <div class="card">
                    <p><strong>Data:</strong> ${credito.data || "-"}</p>
                    <p><strong>Motivo:</strong> ${credito.motivo}</p>
                    <p><strong>Importo:</strong> € ${importo.toFixed(2)}</p>
                    <p><strong>Acconto:</strong> € ${acconto.toFixed(2)}</p>
                    <p><strong>Residuo:</strong> € ${residuo.toFixed(2)}</p>
                    <p><strong>Stato:</strong> ${credito.stato}</p>
                </div>
            `;
        });
    }

    html += `
        <div class="card">
            <h3>Totale storico pagato/registrato: € ${totale.toFixed(2)}</h3>
        </div>
    `;

    contenuto.innerHTML = html;

    apriPagina("storicoCliente");
}

/* =========================
   BACKUP
========================= */

async function creaBackup() {
    try {
        const risposta = await fetch("/api/backup", {
            method: "POST"
        });

        const risultato = await risposta.json();

        if (risultato.success) {
            alert("Backup creato correttamente: " + risultato.file);
        } else {
            alert("Errore durante il backup.");
        }

    } catch (errore) {
        alert("Errore durante il backup.");
        console.error(errore);
    }
}

async function caricaListaBackup() {
    const lista = document.getElementById("listaBackup");

    lista.innerHTML = "<p>Caricamento backup...</p>";

    try {
        const risposta = await fetch("/api/backup");
        const dati = await risposta.json();

        if (!dati.success || dati.backups.length === 0) {
            lista.innerHTML = "<p>Nessun backup trovato.</p>";
            return;
        }

        lista.innerHTML = "";

        dati.backups.forEach(file => {
            const div = document.createElement("div");
            div.className = "card";

            div.innerHTML = `
                <p><strong>Backup:</strong> ${file}</p>

                <button class="completa-btn" onclick="ripristinaBackup('${file}')">
                    Ripristina questo backup
                </button>

                <button class="elimina-btn" onclick="eliminaBackup('${file}')">
                    Elimina backup
                </button>
            `;

            lista.appendChild(div);
        });

    } catch (errore) {
        lista.innerHTML = "<p>Errore durante il caricamento dei backup.</p>";
        console.error(errore);
    }
}

async function ripristinaBackup(file) {
    const conferma = confirm(
        "ATTENZIONE: ripristinando questo backup, i dati attuali verranno sostituiti. Vuoi continuare?"
    );

    if (!conferma) return;

    const risposta = await fetch("/api/ripristina-backup", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ file })
    });

    const risultato = await risposta.json();

    if (risultato.success) {
        alert("Backup ripristinato correttamente.");
        await caricaDati();
        apriPagina("home");
    } else {
        alert(risultato.message || "Errore durante il ripristino.");
    }
}

async function eliminaBackup(file) {
    const conferma = confirm(
        "Vuoi eliminare definitivamente questo backup? Questa operazione non può essere annullata."
    );

    if (!conferma) return;

    const risposta = await fetch("/api/elimina-backup", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ file })
    });

    const risultato = await risposta.json();

    if (risultato.success) {
        alert("Backup eliminato correttamente.");
        caricaListaBackup();
    } else {
        alert(risultato.message || "Errore durante l'eliminazione del backup.");
    }
}

/* =========================
   LOGIN / PASSWORD
========================= */

async function cambiaPassword() {
    const vecchiaPassword = document.getElementById("vecchiaPassword").value;
    const nuovaPassword = document.getElementById("nuovaPassword").value;
    const confermaNuovaPassword = document.getElementById("confermaNuovaPassword").value;

    if (nuovaPassword !== confermaNuovaPassword) {
        alert("Le nuove password non coincidono.");
        return;
    }

    const risposta = await fetch("/api/cambia-password", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            vecchiaPassword,
            nuovaPassword
        })
    });

    const risultato = await risposta.json();

    if (risultato.success) {
        alert("Password modificata correttamente.");

        document.getElementById("vecchiaPassword").value = "";
        document.getElementById("nuovaPassword").value = "";
        document.getElementById("confermaNuovaPassword").value = "";
    } else {
        alert(risultato.message || "Errore durante il cambio password.");
    }
}

async function controllaSessione() {
    const risposta = await fetch("/api/sessione");
    const dati = await risposta.json();

    if (dati.autenticato) {
        document.getElementById("loginBox").style.display = "none";
        document.getElementById("appContent").style.display = "block";
        caricaDati();
    } else {
        document.getElementById("loginBox").style.display = "block";
        document.getElementById("appContent").style.display = "none";
    }
}

async function login() {
    const username = document.getElementById("loginUsername").value.trim();
    const password = document.getElementById("loginPassword").value.trim();

    const risposta = await fetch("/api/login", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            username,
            password
        })
    });

    const risultato = await risposta.json();

    if (risultato.success) {
        document.getElementById("loginBox").style.display = "none";
        document.getElementById("appContent").style.display = "block";
        caricaDati();
    } else {
        alert("Username o password errati.");
    }
}

async function logout() {
    await fetch("/api/logout", {
        method: "POST"
    });

    location.reload();
}

controllaSessione();