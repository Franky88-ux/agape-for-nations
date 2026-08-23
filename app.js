const API = "";

// ---------- Choix visuels (radio stylées) ----------
function wireChoiceGroup(groupSelector) {
  document.querySelectorAll(groupSelector + " .choice").forEach(choice => {
    const input = choice.querySelector("input");
    choice.addEventListener("click", () => {
      document.querySelectorAll(groupSelector + " .choice").forEach(c => c.classList.remove("selected"));
      input.checked = true;
      choice.classList.add("selected");
    });
  });
}

// ---------- Formulaire Partenaire ----------
async function initPartnerForm() {
  const form = document.getElementById("partner-form");
  if (!form) return;
  wireChoiceGroup("#partner-form");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const btn = form.querySelector("button[type=submit]");
    btn.disabled = true;
    btn.textContent = "Envoi en cours...";

    const data = {
      nom: form.nom.value.trim(),
      prenom: form.prenom.value.trim(),
      email: form.email.value.trim(),
      type: form.querySelector("input[name=type]:checked")?.value || "",
    };

    if (!data.type) {
      alert("Merci de choisir un type de partenariat.");
      btn.disabled = false;
      btn.textContent = "Envoyer la demande";
      return;
    }

    try {
      const res = await fetch(API + "/api/partners", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Erreur");

      form.style.display = "none";
      const pending = document.getElementById("partner-pending");
      pending.style.display = "flex";

      const waLink = document.getElementById("partner-wa-link");
      const waMsg = encodeURIComponent(
        `Bonjour, je viens de faire une demande de partenariat (${data.type}) sur le site AGAPE FOR NATIONS.\nNom : ${data.nom} ${data.prenom}\nEmail : ${data.email}`
      );
      waLink.href = `https://wa.me/${json.whatsappNumber}?text=${waMsg}`;
    } catch (err) {
      alert("Le serveur n'est pas joignable. Vérifie que le backend est bien démarré (npm start).");
      btn.disabled = false;
      btn.textContent = "Envoyer la demande";
    }
  });
}

// ---------- Formulaire Soutenir ----------
async function initSupportForm() {
  const form = document.getElementById("support-form");
  if (!form) return;
  wireChoiceGroup("#support-form");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const btn = form.querySelector("button[type=submit]");
    btn.disabled = true;
    btn.textContent = "Envoi en cours...";

    const data = {
      nom: form.nom.value.trim(),
      prenom: form.prenom.value.trim(),
      numero: form.numero.value.trim(),
      type: form.querySelector("input[name=type]:checked")?.value || "",
    };

    if (!data.type) {
      alert("Merci de choisir un type de soutien.");
      btn.disabled = false;
      btn.textContent = "Envoyer la demande";
      return;
    }

    try {
      const res = await fetch(API + "/api/supports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Erreur");

      form.style.display = "none";
      const pending = document.getElementById("support-pending");
      pending.style.display = "flex";

      const waLink = document.getElementById("support-wa-link");
      const waMsg = encodeURIComponent(
        `Bonjour, je viens de faire une demande de soutien (${data.type}) sur le site AGAPE FOR NATIONS.\nNom : ${data.nom} ${data.prenom}\nNuméro : ${data.numero}`
      );
      waLink.href = `https://wa.me/${json.whatsappNumber}?text=${waMsg}`;
    } catch (err) {
      alert("Le serveur n'est pas joignable. Vérifie que le backend est bien démarré (npm start).");
      btn.disabled = false;
      btn.textContent = "Envoyer la demande";
    }
  });
}

// ---------- Numéro WhatsApp dynamique (page Contact) ----------
async function initContactWA() {
  const el = document.getElementById("contact-wa-link");
  if (!el) return;
  try {
    const res = await fetch(API + "/api/settings");
    const settings = await res.json();
    el.href = `https://wa.me/${settings.whatsappNumber}`;
  } catch (err) {
    // silencieux si le serveur n'est pas encore démarré
  }
}

// ---------- Suivi de demande : Partenaires ----------
function renderStatusPill(status) {
  const cls = status === "Traité" ? "traite" : "attente";
  return `<span class="status-pill ${cls}">${status}</span>`;
}

async function initTrackPartner() {
  const form = document.getElementById("track-partner-form");
  if (!form) return;
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = document.getElementById("track-email").value.trim();
    const results = document.getElementById("track-partner-results");
    results.innerHTML = "Recherche...";
    try {
      const res = await fetch(API + "/api/partners/track?email=" + encodeURIComponent(email));
      const data = await res.json();
      if (!res.ok) {
        results.innerHTML = `<p style="color:var(--gray);">${data.error}</p>`;
        return;
      }
      results.innerHTML = data.map(d => `
        <div class="pending-box" style="display:flex; flex-direction:column; align-items:flex-start; gap:10px;">
          <div style="display:flex; justify-content:space-between; width:100%;">
            <strong>${d.type}</strong> ${renderStatusPill(d.status)}
          </div>
          ${d.adminNote ? `<p style="font-size:0.9rem;">Réponse de l'équipe : ${d.adminNote}</p>` : `<p style="font-size:0.85rem; color:var(--gray);">Pas encore de réponse pour le moment.</p>`}
        </div>
      `).join("");
    } catch {
      results.innerHTML = "<p style='color:var(--red-bright);'>Serveur injoignable.</p>";
    }
  });
}

async function initTrackSupport() {
  const form = document.getElementById("track-support-form");
  if (!form) return;
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const numero = document.getElementById("track-numero").value.trim();
    const results = document.getElementById("track-support-results");
    results.innerHTML = "Recherche...";
    try {
      const res = await fetch(API + "/api/supports/track?numero=" + encodeURIComponent(numero));
      const data = await res.json();
      if (!res.ok) {
        results.innerHTML = `<p style="color:var(--gray);">${data.error}</p>`;
        return;
      }
      results.innerHTML = data.map(d => `
        <div class="pending-box" style="display:flex; flex-direction:column; align-items:flex-start; gap:10px;">
          <div style="display:flex; justify-content:space-between; width:100%;">
            <strong>${d.type}</strong> ${renderStatusPill(d.status)}
          </div>
          ${d.adminNote ? `<p style="font-size:0.9rem;">Réponse de l'équipe : ${d.adminNote}</p>` : `<p style="font-size:0.85rem; color:var(--gray);">Pas encore de réponse pour le moment.</p>`}
        </div>
      `).join("");
    } catch {
      results.innerHTML = "<p style='color:var(--red-bright);'>Serveur injoignable.</p>";
    }
  });
}

document.addEventListener("DOMContentLoaded", () => {
  initPartnerForm();
  initSupportForm();
  initContactWA();
  initTrackPartner();
  initTrackSupport();
});
