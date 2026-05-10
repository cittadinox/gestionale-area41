const express = require("express");
const path = require("path");
const fs = require("fs");
const bcrypt = require("bcrypt");
const session = require("express-session");
const multer = require("multer");
const sharp = require("sharp");
const app = express();
app.use(session({
    secret: "area41-gestionale-super-segreto",
    resave: false,
    saveUninitialized: false
}));
const PORT = 3000;
const DATABASE_FILE = path.join(__dirname, "database.json");
const BACKUP_DIR = path.join(__dirname, "backup");
const UPLOADS_DIR = path.join(__dirname, "uploads");
const USERS_FILE = path.join(__dirname, "users.json");

function leggiUtenti() {
    if (!fs.existsSync(USERS_FILE)) {
        const utentiPredefiniti = [
            {
                username: "admin",
                passwordHash: bcrypt.hashSync("area41", 10)
            }
        ];

        fs.writeFileSync(
            USERS_FILE,
            JSON.stringify(utentiPredefiniti, null, 2)
        );
    }

    return JSON.parse(
        fs.readFileSync(USERS_FILE, "utf8")
    );
}

function salvaUtenti(utenti) {
    fs.writeFileSync(
        USERS_FILE,
        JSON.stringify(utenti, null, 2)
    );
}
app.use(express.json());
app.use(express.static(__dirname));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

app.post("/api/upload", upload.single("foto"), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: "Nessun file caricato"
            });
        }

        if (!fs.existsSync(UPLOADS_DIR)) {
            fs.mkdirSync(UPLOADS_DIR);
        }

        const nomeFile = `foto-${Date.now()}.jpg`;
        const percorsoFile = path.join(UPLOADS_DIR, nomeFile);

        await sharp(req.file.buffer)
            .resize({
                width: 1600,
                withoutEnlargement: true
            })
            .jpeg({
                quality: 80
            })
            .toFile(percorsoFile);

        res.json({
            success: true,
            file: `/uploads/${nomeFile}`
        });

    } catch (errore) {
        res.status(500).json({
            success: false,
            message: errore.message
        });
    }
});

function leggiDatabase() {
    if (!fs.existsSync(DATABASE_FILE)) {
        fs.writeFileSync(DATABASE_FILE, JSON.stringify({
            interventi: [],
            ordini: []
        }, null, 2));
    }

    const dati = fs.readFileSync(DATABASE_FILE, "utf8");
    return JSON.parse(dati);
}

function salvaDatabase(dati) {
    fs.writeFileSync(DATABASE_FILE, JSON.stringify(dati, null, 2));
}

app.post("/api/backup", (req, res) => {
    try {
        if (!fs.existsSync(BACKUP_DIR)) {
            fs.mkdirSync(BACKUP_DIR);
        }

        const data = new Date();

        const nomeFile = `backup-${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, "0")}-${String(data.getDate()).padStart(2, "0")}-${String(data.getHours()).padStart(2, "0")}-${String(data.getMinutes()).padStart(2, "0")}-${String(data.getSeconds()).padStart(2, "0")}.json`;

        const percorsoBackup = path.join(BACKUP_DIR, nomeFile);

        fs.copyFileSync(DATABASE_FILE, percorsoBackup);

        res.json({
            success: true,
            file: nomeFile
        });

    } catch (errore) {
        res.status(500).json({
            success: false,
            errore: errore.message
        });
    }
});

app.get("/api/dati", (req, res) => {
    const dati = leggiDatabase();
    res.json(dati);
});

app.post("/api/dati", (req, res) => {
    salvaDatabase(req.body);
    res.json({ success: true });
});

app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "index.html"));
});

app.post("/api/login", async (req, res) => {

    const { username, password } = req.body;

    const utenti = leggiUtenti();

const utente = utenti.find(
    u => u.username === username
);

    if (!utente) {
        return res.status(401).json({
            success: false,
            message: "Utente non trovato"
        });
    }

    const passwordCorretta = await bcrypt.compare(
        password,
        utente.passwordHash
    );

    if (!passwordCorretta) {
        return res.status(401).json({
            success: false,
            message: "Password errata"
        });
    }

    req.session.utente = {
        username: utente.username
    };

    res.json({
        success: true
    });
});

app.get("/api/sessione", (req, res) => {

    if (req.session.utente) {
        res.json({
            autenticato: true,
            utente: req.session.utente
        });
    } else {
        res.json({
            autenticato: false
        });
    }
});

app.post("/api/logout", (req, res) => {
    req.session.destroy(() => {
        res.json({
            success: true
        });
    });
});

app.post("/api/cambia-password", async (req, res) => {

    if (!req.session.utente) {
        return res.status(401).json({
            success: false,
            message: "Non autorizzato"
        });
    }

    const { vecchiaPassword, nuovaPassword } = req.body;

    const utenti = leggiUtenti();

    const utente = utenti.find(
        u => u.username === req.session.utente.username
    );

    if (!utente) {
        return res.status(404).json({
            success: false,
            message: "Utente non trovato"
        });
    }

    const passwordCorretta = await bcrypt.compare(
        vecchiaPassword,
        utente.passwordHash
    );

    if (!passwordCorretta) {
        return res.status(400).json({
            success: false,
            message: "Vecchia password errata"
        });
    }

    utente.passwordHash = await bcrypt.hash(
        nuovaPassword,
        10
    );

    salvaUtenti(utenti);

    res.json({
        success: true
    });
});

app.get("/api/backup", (req, res) => {
    try {
        if (!fs.existsSync(BACKUP_DIR)) {
            fs.mkdirSync(BACKUP_DIR);
        }

        const files = fs.readdirSync(BACKUP_DIR)
            .filter(file => file.endsWith(".json"))
            .sort()
            .reverse();

        res.json({
            success: true,
            backups: files
        });

    } catch (errore) {
        res.status(500).json({
            success: false,
            message: errore.message
        });
    }
});

app.post("/api/ripristina-backup", (req, res) => {
    try {
        const { file } = req.body;

        if (!file || file.includes("..") || file.includes("/") || file.includes("\\")) {
            return res.status(400).json({
                success: false,
                message: "Nome file non valido"
            });
        }

        const percorsoBackup = path.join(BACKUP_DIR, file);

        if (!fs.existsSync(percorsoBackup)) {
            return res.status(404).json({
                success: false,
                message: "Backup non trovato"
            });
        }

        fs.copyFileSync(percorsoBackup, DATABASE_FILE);

        res.json({
            success: true
        });

    } catch (errore) {
        res.status(500).json({
            success: false,
            message: errore.message
        });
    }
});

app.post("/api/elimina-backup", (req, res) => {
    try {
        const { file } = req.body;

        if (!file || file.includes("..") || file.includes("/") || file.includes("\\")) {
            return res.status(400).json({
                success: false,
                message: "Nome file non valido"
            });
        }

        const percorsoBackup = path.join(BACKUP_DIR, file);

        if (!fs.existsSync(percorsoBackup)) {
            return res.status(404).json({
                success: false,
                message: "Backup non trovato"
            });
        }

        fs.unlinkSync(percorsoBackup);

        res.json({
            success: true
        });

    } catch (errore) {
        res.status(500).json({
            success: false,
            message: errore.message
        });
    }
});

app.listen(PORT, () => {
    console.log(`Server avviato su http://localhost:${PORT}`);
});