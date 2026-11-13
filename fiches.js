import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = "https://zgeyubvutkcwcskoshcd.supabase.co";

const SUPABASE_KEY = "sb_publishable_wyRn7S0kg6xC1mNSToYfmA_YRos-9bS";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

let toutesLesFiches = [];
let profilConnecte = null;

// ELEMENTS HTML
const listeForages = document.getElementById("listeForages");
const messageChargement = document.getElementById("messageChargement");
const rechercheFiche = document.getElementById("rechercheFiche");
const filtreStatut = document.getElementById("filtreStatut");

// VERIFICATION DE L'UTILISATEUR
async function verifierUtilisateur() {

    const { data: { session }, error } = await supabase.auth.getSession();

    if (error || !session) {
        window.location.href = "connexion.html";
        return null;
    }

    const { data: profil, error: erreurProfil } = await supabase
        .from("profiles")
        .select("nom_complet, role, statut")
        .eq("id", session.user.id)
        .single();

    if (erreurProfil || !profil || profil.statut !== "actif") {
        alert("Accès refusé. Votre compte n'est pas actif.");
        await supabase.auth.signOut();
        window.location.href = "connexion.html";
        return null;
    }

    if (!["admin", "enqueteur"].includes(profil.role)) {
        window.location.href = "connexion.html";
        return null;
    }

    // RETOUR AU BON TABLEAU DE BORD
    document.getElementById("retourDashboard").href =
        profil.role === "admin" ? "admin.html" : "enqueteur.html";

    return profil;
}

// CHARGEMENT DES FICHES
async function chargerFiches() {

    messageChargement.textContent = "Chargement des fiches...";

    const { data, error } = await supabase
        .from("recensements_forages")
        .select("*")
        .order("created_at", { ascending: false });

    if (error) {
        console.error(error);
        messageChargement.textContent =
            "Erreur lors du chargement : " + error.message;
        return;
    }

    toutesLesFiches = data || [];

    actualiserStatistiques();
    afficherFiches(toutesLesFiches);
}

// STATISTIQUES
function actualiserStatistiques() {

    document.getElementById("totalFiches").textContent =
        toutesLesFiches.length;

    document.getElementById("fichesSoumises").textContent =
        toutesLesFiches.filter(f => f.statut_fiche === "soumis").length;

    document.getElementById("fichesValidees").textContent =
        toutesLesFiches.filter(f => f.statut_fiche === "valide").length;

    document.getElementById("fichesRejetees").textContent =
        toutesLesFiches.filter(f => f.statut_fiche === "rejete").length;
}

// SECURISATION DE L'AFFICHAGE
function securiser(texte) {

    return String(texte ?? "").replace(/[&<>"']/g, caractere => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
    })[caractere]);
}

// AFFICHAGE DES FICHES
function afficherFiches(fiches) {

    listeForages.innerHTML = "";

    messageChargement.textContent =
        fiches.length === 0
        ? "Aucune fiche trouvée."
        : fiches.length + " fiche(s) trouvée(s).";

    fiches.forEach(fiche => {

        const ligne = document.createElement("tr");

        const date = fiche.date_collecte
            ? new Date(fiche.date_collecte + "T00:00:00").toLocaleDateString("fr-FR")
            : "-";

        ligne.innerHTML = `
            <td>${securiser(date)}</td>
            <td>${securiser(fiche.nom_enqueteur)}</td>
            <td>${securiser(fiche.prefecture)}</td>
            <td>${securiser(fiche.commune)}</td>
            <td>${securiser(fiche.village_quartier)}</td>
            <td>${securiser(fiche.statut_fiche)}</td>
            <td>
    <button class="btnVoir" data-id="${securiser(fiche.id)}">
        Consulter
    </button>

    ${
        profilConnecte?.role === "enqueteur" &&
        fiche.statut_fiche !== "valide"
        ? `
            <button class="btnModifier" data-id="${securiser(fiche.id)}">
                Modifier
            </button>
        `
        : ""
    }
            </td>
        `;

        listeForages.appendChild(ligne);
    });
}

// RECHERCHE ET FILTRE
function filtrerFiches() {

    const recherche = rechercheFiche.value.toLowerCase().trim();
    const statut = filtreStatut.value;

    const resultats = toutesLesFiches.filter(fiche => {

        const correspondRecherche = [
            fiche.prefecture,
            fiche.commune,
            fiche.district,
            fiche.village_quartier,
            fiche.nom_enqueteur
        ].some(valeur =>
            String(valeur || "").toLowerCase().includes(recherche)
        );

        const correspondStatut =
            !statut || fiche.statut_fiche === statut;

        return correspondRecherche && correspondStatut;
    });

    afficherFiches(resultats);
}

rechercheFiche.addEventListener("input", filtrerFiches);
filtreStatut.addEventListener("change", filtrerFiches);

// DEMARRAGE
async function demarrer() {

    profilConnecte = await verifierUtilisateur();

    if (!profilConnecte) return;

    await chargerFiches();
}

demarrer();

// =====================================
// CONSULTATION DETAILLEE DES FORAGES
// =====================================

const fenetreFiche = document.getElementById("fenetreFiche");
const detailsFiche = document.getElementById("detailsFiche");
const fermerFiche = document.getElementById("fermerFiche");

// Organisation des informations
const sectionsDetails = {
    "Identification": [
        ["nom_enqueteur", "Enquêteur"],
        ["date_collecte", "Date de collecte"],
        ["nom_programme", "Nom du programme"]
    ],

    "Localisation et GPS": [
        ["prefecture", "Préfecture"],
        ["commune", "Commune"],
        ["district", "District"],
        ["village_quartier", "Village / Quartier"],
        ["latitude", "Latitude"],
        ["longitude", "Longitude"]
    ],

    "Identification des travaux": [
        ["programme_realisation", "Programme de réalisation"],
        ["annee_realisation", "Année de réalisation"],
        ["programme_rehabilitation", "Programme de réhabilitation"],
        ["annee_rehabilitation", "Année de réhabilitation"],
        ["etat_ouvrage", "État de l'ouvrage"],
        ["utilise", "Ouvrage utilisé"],
        ["raison_non_utilisation", "Raison de non-utilisation"]
    ],

    "Caractéristiques techniques": [
        ["profondeur", "Profondeur"],
        ["debit", "Débit"],
        ["nombre_menages", "Nombre de ménages"],
        ["autres_villages", "Autres villages desservis"],
        ["marque_pompe", "Marque de la pompe"],
        ["modele_pompe", "Modèle de la pompe"],
        ["annee_pompe", "Année de la pompe"],
        ["probleme_pompe", "Problème de la pompe"]
    ],

    "État des équipements": [
        ["existence_deferriseur", "Existence du déferriseur"],
        ["etat_deferriseur", "État du déferriseur"],
        ["etat_superstructure", "État de la superstructure"],
        ["etat_margelle", "État de la margelle"],
        ["presence_cloture", "Présence de clôture"],
        ["etat_evacuation", "État de l'évacuation"],
        ["etat_cloture", "État de la clôture"]
    ],

    "Qualité de l'eau": [
        ["couleur_eau", "Couleur de l'eau"],
        ["gout_eau", "Goût de l'eau"],
        ["odeur_eau", "Odeur de l'eau"],
        ["source_pollution", "Source de pollution"],
        ["type_pollution", "Type de pollution"],
        ["distance_pollution", "Distance de la pollution"]
    ],

    "Gestion et maintenance": [
        ["type_gestionnaire", "Type de gestionnaire"],
        ["gestion_fonctionnelle", "Gestion fonctionnelle"],
        ["paiement", "Paiement"],
        ["nom_gestionnaire", "Nom du gestionnaire"],
        ["cotisations_regulieres", "Cotisations régulières"],
        ["periode_cotisation", "Période de cotisation"],
        ["nombre_personnes_gestion", "Personnes chargées de la gestion"],
        ["base_gestion", "Base de gestion"],
        ["reparateur", "Réparateur"],
        ["montant_reparation", "Montant de réparation"],
        ["montant_caisse", "Montant en caisse"],
        ["vente_volume", "Vente au volume"],
        ["base_vente", "Base de vente"],
        ["volume_litres", "Volume en litres"],
        ["appui_exterieur_panne", "Appui extérieur en cas de panne"],
        ["prix_appui", "Prix de l'appui"]
    ],

    "Observations et satisfaction": [
    ["satisfait", "Population satisfaite"],
    ["cause_insatisfaction", "Cause d'insatisfaction"],
    ["observations", "Observations"],
    ["signature", "Signature"],
    ["statut_fiche", "Statut de la fiche"]
]
};
// CONSULTATION ET MODIFICATION DES FICHES
listeForages.addEventListener("click", (event) => {

    // BOUTON MODIFIER
    const boutonModifier = event.target.closest(".btnModifier");

    if (boutonModifier) {

        const id = boutonModifier.dataset.id;

        const fiche = toutesLesFiches.find(f => f.id === id);

        if (!fiche) {
            alert("Fiche introuvable.");
            return;
        }

        if (profilConnecte?.role !== "enqueteur") {
            alert("Vous n'avez pas le droit de modifier cette fiche.");
            return;
        }

        if (fiche.statut_fiche === "valide") {
            alert("Cette fiche est déjà validée et ne peut plus être modifiée.");
            return;
        }

        window.location.href =
            "forage.html?modifier=" + encodeURIComponent(id);

        return;
    }

    // BOUTON CONSULTER
    const bouton = event.target.closest(".btnVoir");

    if (!bouton) return;

    const id = bouton.dataset.id;

    const fiche = toutesLesFiches.find(f => f.id === id);

    if (!fiche) {
        alert("Fiche introuvable.");
        return;
    }

    let contenu = "";

    for (const [titre, champs] of Object.entries(sectionsDetails)) {

        contenu += `
            <div class="detail-section">
                <h3>${securiser(titre)}</h3>
                <div class="detail-grille">
        `;

        champs.forEach(([colonne, libelle]) => {

            const valeur = fiche[colonne];

            contenu += `
                <div class="detail-item">
                    <strong>${securiser(libelle)}</strong>
                    <span>${securiser(
                        valeur === null || valeur === undefined || valeur === ""
                        ? "-"
                        : valeur
                    )}</span>
                </div>
            `;
        });

        contenu += `
                </div>
            </div>
        `;
    }

    // AFFICHER LE MOTIF DU REJET
if (fiche.statut_fiche === "rejete") {

    contenu += `
        <div class="detail-section motif-rejet-section">
            <h3>⚠️ Motif du rejet</h3>

            <div class="detail-item">
                <strong>Explication de l'administrateur</strong>

                <span>
                    ${securiser(
                        fiche.motif_rejet || "Aucun motif renseigné."
                    )}
                </span>
            </div>
        </div>
    `;
}

detailsFiche.innerHTML = contenu;

    fenetreFiche.classList.add("active");
});

// FERMER LA FENÊTRE
fermerFiche.addEventListener("click", () => {
    fenetreFiche.classList.remove("active");
});

// FERMER EN CLIQUANT À L'EXTÉRIEUR
fenetreFiche.addEventListener("click", (event) => {

    if (event.target === fenetreFiche) {
        fenetreFiche.classList.remove("active");
    }

});