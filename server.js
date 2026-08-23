import express from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { nanoid } from "nanoid";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, "db.json");

function readDB() {
  return JSON.parse(fs.readFileSync(DB_PATH, "utf-8"));
}
function writeDB(data) {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
}

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// ---------- Public settings (numéro WhatsApp, email) ----------
app.get("/api/settings", (req, res) => {
  const db = readDB();
  res.json({
    whatsappNumber: db.settings.whatsappNumber,
    orgEmail: db.settings.orgEmail,
  });
});

// ---------- Soumission formulaire Partenaire ----------
app.post("/api/partners", (req, res) => {
  const { nom, prenom, email, type } = req.body;
  if (!nom || !prenom || !email || !type) {
    return res.status(400).json({ error: "Champs manquants" });
  }
  const db = readDB();
  const entry = {
    id: nanoid(8),
    nom, prenom, email, type,
    status: "En attente",
    adminNote: "",
    createdAt: new Date().toISOString(),
  };
  db.partners.unshift(entry);
  writeDB(db);
  res.json({ ok: true, entry, whatsappNumber: db.settings.whatsappNumber });
});

// ---------- Soumission formulaire Soutenir ----------
app.post("/api/supports", (req, res) => {
  const { nom, prenom, numero, type } = req.body;
  if (!nom || !prenom || !numero || !type) {
    return res.status(400).json({ error: "Champs manquants" });
  }
  const db = readDB();
  const entry = {
    id: nanoid(8),
    nom, prenom, numero, type,
    status: "En attente",
    adminNote: "",
    createdAt: new Date().toISOString(),
  };
  db.supports.unshift(entry);
  writeDB(db);
  res.json({ ok: true, entry, whatsappNumber: db.settings.whatsappNumber });
});

// ---------- Suivi de demande (public) ----------
app.get("/api/partners/track", (req, res) => {
  const email = (req.query.email || "").trim().toLowerCase();
  if (!email) return res.status(400).json({ error: "Email manquant" });
  const db = readDB();
  const found = db.partners.filter(p => p.email.trim().toLowerCase() === email);
  if (found.length === 0) return res.status(404).json({ error: "Aucune demande trouvée pour cet email" });
  res.json(found);
});

app.get("/api/supports/track", (req, res) => {
  const numero = (req.query.numero || "").trim();
  if (!numero) return res.status(400).json({ error: "Numéro manquant" });
  const db = readDB();
  const found = db.supports.filter(s => s.numero.trim() === numero);
  if (found.length === 0) return res.status(404).json({ error: "Aucune demande trouvée pour ce numéro" });
  res.json(found);
});

// ---------- Auth admin (simple) ----------
const adminTokens = new Set();

app.post("/api/admin/login", (req, res) => {
  const db = readDB();
  const { password } = req.body;
  if (password !== db.settings.adminPassword) {
    return res.status(401).json({ error: "Mot de passe incorrect" });
  }
  const token = nanoid(24);
  adminTokens.add(token);
  res.json({ token });
});

function requireAdmin(req, res, next) {
  const token = req.headers["x-admin-token"];
  if (!token || !adminTokens.has(token)) {
    return res.status(401).json({ error: "Non autorisé" });
  }
  next();
}

// ---------- Admin : lister toutes les demandes ----------
app.get("/api/admin/partners", requireAdmin, (req, res) => {
  res.json(readDB().partners);
});
app.get("/api/admin/supports", requireAdmin, (req, res) => {
  res.json(readDB().supports);
});

// ---------- Admin : mettre à jour statut / note d'une demande partenaire ----------
app.post("/api/admin/partners/:id", requireAdmin, (req, res) => {
  const db = readDB();
  const p = db.partners.find(p => p.id === req.params.id);
  if (!p) return res.status(404).json({ error: "Introuvable" });
  if (req.body.status) p.status = req.body.status;
  if (req.body.adminNote !== undefined) p.adminNote = req.body.adminNote;
  writeDB(db);
  res.json(p);
});

// ---------- Admin : mettre à jour statut / note d'une demande soutien ----------
app.post("/api/admin/supports/:id", requireAdmin, (req, res) => {
  const db = readDB();
  const s = db.supports.find(s => s.id === req.params.id);
  if (!s) return res.status(404).json({ error: "Introuvable" });
  if (req.body.status) s.status = req.body.status;
  if (req.body.adminNote !== undefined) s.adminNote = req.body.adminNote;
  writeDB(db);
  res.json(s);
});

// ---------- Admin : modifier les réglages (numéro WhatsApp, email, mot de passe) ----------
app.post("/api/admin/settings", requireAdmin, (req, res) => {
  const db = readDB();
  const { whatsappNumber, orgEmail, adminPassword } = req.body;
  if (whatsappNumber) db.settings.whatsappNumber = whatsappNumber;
  if (orgEmail) db.settings.orgEmail = orgEmail;
  if (adminPassword) db.settings.adminPassword = adminPassword;
  writeDB(db);
  res.json({ ok: true, settings: db.settings });
});

const PORT = 4100;
app.listen(PORT, () => {
  console.log(`AGAPE FOR NATIONS — serveur en écoute sur http://localhost:${PORT}`);
  console.log(`Mot de passe admin par défaut : ${readDB().settings.adminPassword}`);
});
