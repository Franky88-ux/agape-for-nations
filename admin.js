const API = "";
let TOKEN = sessionStorage.getItem("agape_admin_token") || "";
let currentTab = "partners";

const loginView = document.getElementById("login-view");
const dashView = document.getElementById("dash-view");

function showDash() {
  loginView.style.display = "none";
  dashView.style.display = "block";
  loadTab("partners");
}

if (TOKEN) showDash();

document.getElementById("login-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const password = document.getElementById("password").value;
  const errBox = document.getElementById("login-error");
  errBox.textContent = "";
  try {
    const res = await fetch(API + "/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || "Erreur");
    TOKEN = json.token;
    sessionStorage.setItem("agape_admin_token", TOKEN);
    showDash();
  } catch (err) {
    errBox.textContent = err.message === "Failed to fetch"
      ? "Serveur injoignable — vérifie que le backend tourne (npm start)."
      : "Mot de passe incorrect.";
  }
});

document.querySelectorAll(".admin-tab").forEach(tab => {
  tab.addEventListener("click", () => loadTab(tab.dataset.tab));
});

async function loadTab(tab) {
  currentTab = tab;
  document.querySelectorAll(".admin-tab").forEach(t => t.classList.toggle("active", t.dataset.tab === tab));
  const container = document.getElementById("table-container");
  container.innerHTML = "Chargement...";

  const res = await fetch(API + `/api/admin/${tab}`, {
    headers: { "x-admin-token": TOKEN },
  });
  if (!res.ok) {
    container.innerHTML = "<p>Session expirée, reconnecte-toi.</p>";
    sessionStorage.removeItem("agape_admin_token");
    return;
  }
  const rows = await res.json();

  if (rows.length === 0) {
    container.innerHTML = "<p style='color:var(--gray);'>Aucune demande pour le moment.</p>";
    return;
  }

  const isPartner = tab === "partners";
  let html = `<table class="admin-table"><thead><tr>
    <th>Nom</th><th>${isPartner ? "Email" : "Numéro"}</th><th>Type</th><th>Statut</th><th>Note admin</th><th>Actions</th>
  </tr></thead><tbody>`;

  rows.forEach(r => {
    const contact = isPartner ? r.email : r.numero;
    const pillClass = r.status === "Traité" ? "traite" : "attente";
    html += `<tr data-id="${r.id}">
      <td>${r.nom} ${r.prenom}</td>
      <td>${contact}</td>
      <td>${r.type}</td>
      <td><span class="status-pill ${pillClass}">${r.status}</span></td>
      <td><textarea class="admin-note" data-id="${r.id}">${r.adminNote || ""}</textarea></td>
      <td>
        <button class="small-btn toggle-status" data-id="${r.id}" data-current="${r.status}">
          ${r.status === "Traité" ? "Marquer en attente" : "Marquer traité"}
        </button><br><br>
        <button class="small-btn save-note" data-id="${r.id}">Enregistrer note</button>
      </td>
    </tr>`;
  });
  html += "</tbody></table>";
  container.innerHTML = html;

  container.querySelectorAll(".toggle-status").forEach(btn => {
    btn.addEventListener("click", async () => {
      const newStatus = btn.dataset.current === "Traité" ? "En attente" : "Traité";
      await updateEntry(btn.dataset.id, { status: newStatus });
      loadTab(currentTab);
    });
  });
  container.querySelectorAll(".save-note").forEach(btn => {
    btn.addEventListener("click", async () => {
      const textarea = container.querySelector(`.admin-note[data-id="${btn.dataset.id}"]`);
      await updateEntry(btn.dataset.id, { adminNote: textarea.value });
      btn.textContent = "Enregistré !";
      setTimeout(() => (btn.textContent = "Enregistrer note"), 1500);
    });
  });
}

async function updateEntry(id, payload) {
  await fetch(API + `/api/admin/${currentTab}/${id}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-admin-token": TOKEN },
    body: JSON.stringify(payload),
  }).catch(() => {
    alert("Erreur : impossible de sauvegarder. Vérifie que le serveur tourne toujours.");
  });
}

document.getElementById("logout-btn")?.addEventListener("click", () => {
  sessionStorage.removeItem("agape_admin_token");
  TOKEN = "";
  dashView.style.display = "none";
  loginView.style.display = "block";
});

// ---------- Réglages (numéro WhatsApp / email) ----------
document.getElementById("settings-form")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const whatsappNumber = document.getElementById("set-whatsapp").value.trim();
  const orgEmail = document.getElementById("set-email").value.trim();
  const btn = e.target.querySelector("button");
  btn.textContent = "Enregistrement...";
  try {
    const res = await fetch(API + "/api/admin/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-admin-token": TOKEN },
      body: JSON.stringify({ whatsappNumber, orgEmail }),
    });
    if (!res.ok) throw new Error();
    btn.textContent = "Enregistré !";
  } catch {
    btn.textContent = "Échec — réessaie";
  }
  setTimeout(() => (btn.textContent = "Enregistrer les réglages"), 1800);
});
