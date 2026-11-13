import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = "https://zgeyubvutkcwcskoshcd.supabase.co";
const SUPABASE_KEY = "sb_publishable_wyRn7S0kg6xC1mNSToYfmA_YRos-9bS";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ELEMENTS HTML

const liste = document.getElementById("listeEnqueteurs");
const message = document.getElementById("message");
const recherche = document.getElementById("rechercheEnqueteur");

const sidebar = document.getElementById("sidebar");
const sidebarOverlay = document.getElementById("sidebarOverlay");
const btnMenu = document.getElementById("btnMenu");
const btnDeconnexion = document.getElementById("btnDeconnexion");

let enqueteurs = [];

// =========================================
// MESSAGES
// =========================================

function afficherMessage(texte, type = "") {
    message.textContent = texte;
    message.className = "message " + type;
}

// =========================================
// SECURISER LES TEXTES
// =========================================

function echapper(texte) {
    return String(texte ?? "").replace(/[&<>"']/g, caractere => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
    })[caractere]);
}

// =========================================
// MENU LATERAL
// =========================================

function ouvrirMenu() {

    sidebar.classList.add("open");
    sidebarOverlay.classList.add("active");
    document.body.classList.add("menu-open");

    btnMenu.setAttribute("aria-expanded", "true");
}

function fermerMenu() {

    sidebar.classList.remove("open");
    sidebarOverlay.classList.remove("active");
    document.body.classList.remove("menu-open");

    btnMenu.setAttribute("aria-expanded", "false");
}

btnMenu.addEventListener("click", function() {

    if (sidebar.classList.contains("open")) {
        fermerMenu();
    } else {
        ouvrirMenu();
    }

});

sidebarOverlay.addEventListener("click", fermerMenu);

document.addEventListener("keydown", function(e) {

    if (e.key === "Escape") {
        fermerMenu();
    }

});

document.querySelectorAll(".sidebar-nav .nav-link").forEach(lien => {

    lien.addEventListener("click", fermerMenu);

});

// =========================================
// VERIFIER L'ADMINISTRATEUR
// =========================================

async function verifierAdministrateur() {

    const { data: sessionData, error: sessionError } =
        await supabase.auth.getSession();

    if (sessionError || !sessionData.session) {

        window.location.href = "connexion.html";
        return false;

    }

    const utilisateur = sessionData.session.user;

    const { data: profil, error } = await supabase
        .from("profiles")
        .select("nom_complet, role, statut")
        .eq("id", utilisateur.id)
        .single();

    if (
        error ||
        !profil ||
        profil.role !== "admin" ||
        profil.statut !== "actif"
    ) {

        await supabase.auth.signOut();

        window.location.href = "connexion.html";

        return false;

    }

    // AFFICHER LE NOM DE L'ADMINISTRATEUR

    const nom = profil.nom_complet || "Administrateur";

    document.getElementById("profilNom").textContent = nom;

    document.getElementById("profilAvatar").textContent =
        nom.trim().charAt(0).toUpperCase();

    return true;
}

// =========================================
// ACTUALISER LES STATISTIQUES
// =========================================

function actualiserStatistiques() {

    document.getElementById("totalEnqueteurs").textContent =
        enqueteurs.length;

    document.getElementById("totalAttente").textContent =
        enqueteurs.filter(p => p.statut === "en_attente").length;

    document.getElementById("totalActifs").textContent =
        enqueteurs.filter(p => p.statut === "actif").length;

}

// =========================================
// AFFICHER LES ENQUETEURS
// =========================================

function afficherEnqueteurs(listeFiltree = enqueteurs) {

    if (listeFiltree.length === 0) {

        liste.innerHTML = `
            <tr>
                <td colspan="4">Aucun enquêteur trouvé.</td>
            </tr>
        `;

        return;
    }

    liste.innerHTML = listeFiltree.map(p => {

        let statutTexte = p.statut;

        if (p.statut === "en_attente") {
            statutTexte = "En attente";
        }

        if (p.statut === "actif") {
            statutTexte = "Actif";
        }

        if (p.statut === "suspendu") {
            statutTexte = "Suspendu";
        }

        if (p.statut === "refuse") {
            statutTexte = "Refusé";
        }

        return `
            <tr>

                <td>${echapper(p.nom_complet)}</td>

                <td>${echapper(p.telephone || "Non renseigné")}</td>

                <td>
                    <span class="statut-badge statut-${echapper(p.statut)}">
                        ${echapper(statutTexte)}
                    </span>
                </td>

                <td>

                    ${p.statut !== "actif" ? `
                        <button
                            class="action-btn valider"
                            data-id="${echapper(p.id)}"
                            data-statut="actif">

                            ${p.statut === "suspendu" ? "Réactiver" : "Activer"}

                        </button>
                    ` : ""}

                    ${p.statut === "en_attente" ? `
                        <button
                            class="action-btn refuser"
                            data-id="${echapper(p.id)}"
                            data-statut="refuse">

                            Refuser

                        </button>
                    ` : ""}

                    ${p.statut === "actif" ? `
                        <button
                            class="action-btn suspendre"
                            data-id="${echapper(p.id)}"
                            data-statut="suspendu">

                            Suspendre

                        </button>
                    ` : ""}

                </td>

            </tr>
        `;

    }).join("");

}

// =========================================
// CHARGER LES ENQUETEURS
// =========================================

async function chargerEnqueteurs() {

    liste.innerHTML = `
        <tr>
            <td colspan="4">Chargement...</td>
        </tr>
    `;

    const { data, error } = await supabase
        .from("profiles")
        .select("id, nom_complet, telephone, role, statut, created_at")
        .eq("role", "enqueteur")
        .order("created_at", { ascending: false });

    if (error) {

        afficherMessage("Erreur : " + error.message, "error");

        liste.innerHTML = `
            <tr>
                <td colspan="4">
                    Impossible de charger les enquêteurs.
                </td>
            </tr>
        `;

        return;
    }

    enqueteurs = data || [];

    actualiserStatistiques();

    afficherEnqueteurs();

}

// =========================================
// RECHERCHER UN ENQUETEUR
// =========================================

recherche.addEventListener("input", function() {

    const terme = recherche.value.toLowerCase().trim();

    const resultats = enqueteurs.filter(p =>

        (p.nom_complet || "").toLowerCase().includes(terme) ||

        (p.telephone || "").toLowerCase().includes(terme) ||

        (p.statut || "").toLowerCase().includes(terme)

    );

    afficherEnqueteurs(resultats);

});

// =========================================
// MODIFIER LE STATUT D'UN ENQUETEUR
// =========================================

liste.addEventListener("click", async function(e) {

    const bouton = e.target.closest("button[data-id]");

    if (!bouton) return;

    const id = bouton.dataset.id;

    const nouveauStatut = bouton.dataset.statut;

    const confirmation = confirm(
        "Voulez-vous vraiment modifier le statut de cet enquêteur ?"
    );

    if (!confirmation) return;

    bouton.disabled = true;

    afficherMessage("Modification en cours...");

    const { error } = await supabase.rpc(
        "admin_changer_statut_utilisateur",
        {
            p_user_id: id,
            p_nouveau_statut: nouveauStatut
        }
    );

    if (error) {

        afficherMessage("Erreur : " + error.message, "error");

        bouton.disabled = false;

        return;
    }

    afficherMessage(
        "Statut modifié avec succès.",
        "success"
    );

    await chargerEnqueteurs();

});

// =========================================
// DECONNEXION
// =========================================

async function deconnecter() {

    const confirmation = confirm(
        "Voulez-vous vraiment vous déconnecter ?"
    );

    if (!confirmation) return;

    const { error } = await supabase.auth.signOut();

    if (error) {

        afficherMessage(
            "Erreur de déconnexion : " + error.message,
            "error"
        );

        return;
    }

    window.location.href = "connexion.html";

}

btnDeconnexion.addEventListener("click", deconnecter);

// =========================================
// DEMARRAGE
// =========================================

async function demarrer() {

    const autorise = await verifierAdministrateur();

    if (!autorise) return;

    await chargerEnqueteurs();

}

demarrer();