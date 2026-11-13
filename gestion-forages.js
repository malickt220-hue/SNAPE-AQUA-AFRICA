import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { jsPDF } from "https://esm.sh/jspdf@2.5.2";
import autoTable from "https://esm.sh/jspdf-autotable@3.8.4";

const SUPABASE_URL = "https://zgeyubvutkcwcskoshcd.supabase.co";
const SUPABASE_KEY = "sb_publishable_wyRn7S0kg6xC1mNSToYfmA_YRos-9bS";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const listeForages = document.getElementById("listeForages");
const messageForages = document.getElementById("messageForages");

let toutesLesFiches = [];

// ==========================================
// SÉCURISER L'AFFICHAGE
// ==========================================

function echapper(texte) {
    return String(texte ?? "").replace(/[&<>"']/g, caractere => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
    })[caractere]);
}

// ==========================================
// MENU LATÉRAL
// ==========================================

const btnMenu = document.getElementById("btnMenu");
const sidebar = document.getElementById("sidebar");
const sidebarOverlay = document.getElementById("sidebarOverlay");

function ouvrirMenu() {
    sidebar?.classList.add("open");
    sidebarOverlay?.classList.add("active");
    document.body.classList.add("menu-open");

    btnMenu?.setAttribute("aria-expanded", "true");
}

function fermerMenu() {
    sidebar?.classList.remove("open");
    sidebarOverlay?.classList.remove("active");
    document.body.classList.remove("menu-open");

    btnMenu?.setAttribute("aria-expanded", "false");
}

if (btnMenu && sidebar && sidebarOverlay) {

    btnMenu.addEventListener("click", function() {
        const menuOuvert = sidebar.classList.contains("open");

        if (menuOuvert) {
            fermerMenu();
        } else {
            ouvrirMenu();
        }
    });

    sidebarOverlay.addEventListener("click", fermerMenu);

    sidebar.querySelectorAll(".nav-link").forEach(lien => {
        lien.addEventListener("click", fermerMenu);
    });

    document.addEventListener("keydown", function(e) {
        if (e.key === "Escape") {
            fermerMenu();
        }
    });
}

// ==========================================
// VÉRIFIER L'ADMINISTRATEUR
// ==========================================

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

    // AFFICHER LE PROFIL ADMINISTRATEUR

    const profilNom = document.getElementById("profilNom");
    const profilAvatar = document.getElementById("profilAvatar");

    const nom = profil.nom_complet || "Administrateur";

    if (profilNom) {
        profilNom.textContent = nom;
    }

    if (profilAvatar) {
        profilAvatar.textContent = nom
            .trim()
            .split(/\s+/)
            .slice(0, 2)
            .map(mot => mot.charAt(0).toUpperCase())
            .join("");
    }

    return true;
}

// ==========================================
// DÉCONNEXION
// ==========================================

const btnDeconnexion = document.getElementById("btnDeconnexion");

if (btnDeconnexion) {

    btnDeconnexion.addEventListener("click", async function() {

        const confirmation = confirm(
            "Voulez-vous vraiment vous déconnecter ?"
        );

        if (!confirmation) return;

        btnDeconnexion.disabled = true;

        const { error } = await supabase.auth.signOut();

        if (error) {
            alert("Erreur de déconnexion : " + error.message);
            btnDeconnexion.disabled = false;
            return;
        }

        window.location.href = "connexion.html";
    });
}

// ==========================================
// CHARGER LES FORAGES
// ==========================================

async function chargerForages() {

    messageForages.textContent = "Chargement des recensements...";

    const { data, error } = await supabase
        .from("recensements_forages")
        .select("*")
        .order("created_at", { ascending: false });

    if (error) {
        messageForages.textContent = "Erreur : " + error.message;
        console.error(error);
        return;
    }

    toutesLesFiches = data || [];

    actualiserStatistiques();
    afficherForages(toutesLesFiches);

    messageForages.textContent =
        toutesLesFiches.length + " fiche(s) trouvée(s).";
}

// ==========================================
// STATISTIQUES
// ==========================================

function actualiserStatistiques() {

    document.getElementById("totalForages").textContent =
        toutesLesFiches.length;

    document.getElementById("totalSoumis").textContent =
        toutesLesFiches.filter(f => f.statut_fiche === "soumis").length;

    document.getElementById("totalValides").textContent =
        toutesLesFiches.filter(f => f.statut_fiche === "valide").length;

    document.getElementById("totalRejetes").textContent =
        toutesLesFiches.filter(f => f.statut_fiche === "rejete").length;
}

// ==========================================
// AFFICHER LES FORAGES
// ==========================================

function afficherForages(fiches) {

    if (fiches.length === 0) {

        listeForages.innerHTML = `
            <tr>
                <td colspan="7">Aucun forage trouvé.</td>
            </tr>
        `;

        return;
    }

    listeForages.innerHTML = fiches.map(f => {

        const statut = String(f.statut_fiche || "")
            .toLowerCase();

        const libelleStatut = {
            soumis: "Soumis",
            valide: "Validé",
            rejete: "Rejeté"
        };

        return `
            <tr>

                <td>${echapper(f.date_collecte)}</td>

                <td>${echapper(f.nom_enqueteur)}</td>

                <td>${echapper(f.prefecture)}</td>

                <td>${echapper(f.commune)}</td>

                <td>${echapper(f.village_quartier)}</td>

                <td>
                    <span class="badge-statut statut-${echapper(statut)}">
                        ${echapper(libelleStatut[statut] || statut || "Inconnu")}
                    </span>
                </td>

                <td>

                    <button
                        class="btn-consulter"
                        data-id="${echapper(f.id)}">
                        Consulter
                    </button>

                    ${statut === "soumis" ? `

                        <button
                            class="btn-valider"
                            data-id="${echapper(f.id)}">
                            Valider
                        </button>

                        <button
                            class="btn-rejeter"
                            data-id="${echapper(f.id)}">
                            Rejeter
                        </button>

                    ` : ""}

                </td>

            </tr>
        `;

    }).join("");
}

// ==========================================
// RECHERCHE ET FILTRES
// ==========================================

document.getElementById("rechercheForage")
    .addEventListener("input", appliquerFiltres);

document.getElementById("filtreStatut")
    .addEventListener("change", appliquerFiltres);

function appliquerFiltres() {

    const recherche = document.getElementById("rechercheForage")
        .value.toLowerCase().trim();

    const statut = document.getElementById("filtreStatut").value;

    const resultats = toutesLesFiches.filter(f => {

        const correspondRecherche = [
            f.nom_enqueteur,
            f.prefecture,
            f.commune,
            f.village_quartier
        ].some(valeur =>
            String(valeur ?? "").toLowerCase().includes(recherche)
        );

        const correspondStatut =
            !statut || f.statut_fiche === statut;

        return correspondRecherche && correspondStatut;
    });

    afficherForages(resultats);
}

// ==========================================
// DÉMARRAGE
// ==========================================

async function demarrer() {

    const autorise = await verifierAdministrateur();

    if (!autorise) return;

    await chargerForages();
}

demarrer();

// ==========================================
// CONSULTATION DÉTAILLÉE DES FORAGES
// ==========================================

const fenetreConsultation =
    document.getElementById("fenetreConsultation");

const detailsForage =
    document.getElementById("detailsForage");

const fermerConsultation =
    document.getElementById("fermerConsultation");

// ORGANISATION DES INFORMATIONS

const rubriquesForage = [

    {
        titre: "1. Identification",
        champs: {
            nom_programme: "Nom du programme",
            nom_enqueteur: "Enquêteur",
            date_collecte: "Date de collecte"
        }
    },

    {
        titre: "2. Localisation et GPS",
        champs: {
            prefecture: "Préfecture",
            commune: "Commune",
            district: "District",
            village_quartier: "Village / Quartier",
            latitude: "Latitude",
            longitude: "Longitude"
        }
    },

    {
        titre: "3. Réalisation et réhabilitation",
        champs: {
            programme_realisation: "Programme de réalisation",
            annee_realisation: "Année de réalisation",
            programme_rehabilitation: "Programme de réhabilitation",
            annee_rehabilitation: "Année de réhabilitation",
            etat_ouvrage: "État de l'ouvrage",
            utilise: "Ouvrage utilisé",
            raison_non_utilisation: "Raison de non-utilisation"
        }
    },

    {
        titre: "4. Caractéristiques techniques",
        champs: {
            profondeur: "Profondeur",
            debit: "Débit",
            nombre_menages: "Nombre de ménages",
            autres_villages: "Autres villages desservis",
            marque_pompe: "Marque de la pompe",
            modele_pompe: "Modèle de la pompe",
            annee_pompe: "Année de la pompe",
            probleme_pompe: "Problème de la pompe"
        }
    },

    {
        titre: "5. État des équipements",
        champs: {
            existence_deferriseur: "Existence du déferriseur",
            etat_deferriseur: "État du déferriseur",
            etat_superstructure: "État de la superstructure",
            etat_margelle: "État de la margelle",
            presence_cloture: "Présence d'une clôture",
            etat_evacuation: "État de l'évacuation",
            etat_cloture: "État de la clôture"
        }
    },

    {
        titre: "6. Qualité de l'eau",
        champs: {
            couleur_eau: "Couleur de l'eau",
            gout_eau: "Goût de l'eau",
            odeur_eau: "Odeur de l'eau",
            source_pollution: "Source de pollution",
            type_pollution: "Type de pollution",
            distance_pollution: "Distance de la pollution"
        }
    },

    {
        titre: "7. Gestion et fonctionnement",
        champs: {
            type_gestionnaire: "Type de gestionnaire",
            gestion_fonctionnelle: "Gestion fonctionnelle",
            paiement: "Paiement",
            nom_gestionnaire: "Nom du gestionnaire",
            cotisations_regulieres: "Cotisations régulières",
            periode_cotisation: "Période de cotisation",
            nombre_personnes_gestion: "Personnes chargées de la gestion",
            base_gestion: "Base de gestion",
            reparateur: "Réparateur",
            montant_reparation: "Montant de réparation",
            montant_caisse: "Montant en caisse",
            vente_volume: "Vente au volume",
            base_vente: "Base de vente",
            volume_litres: "Volume en litres",
            appui_exterieur_panne: "Appui extérieur en cas de panne",
            prix_appui: "Prix de l'appui"
        }
    },

    {
        titre: "8. Satisfaction et observations",
        champs: {
            satisfait: "Satisfaction",
            cause_insatisfaction: "Cause d'insatisfaction",
            observations: "Observations",
            signature: "Signature"
        }
    }

];

// ==========================================
// FORMATER LES VALEURS
// ==========================================

function formaterValeur(valeur) {

    if (valeur === null || valeur === undefined || valeur === "") {
        return "Non renseigné";
    }

    if (typeof valeur === "boolean") {
        return valeur ? "Oui" : "Non";
    }

    return String(valeur);
}

// ==========================================
// AFFICHER LES DÉTAILS
// ==========================================

function afficherDetailsForage(fiche) {

    detailsForage.innerHTML = rubriquesForage.map(rubrique => {

        const champsHTML = Object.entries(rubrique.champs)
            .map(([cle, titre]) => {

                return `
                    <div class="detail-item">
                        <strong>${echapper(titre)}</strong>
                        <span>${echapper(formaterValeur(fiche[cle]))}</span>
                    </div>
                `;

            }).join("");

        return `
            <section class="detail-section">

                <h3>${echapper(rubrique.titre)}</h3>

                <div class="detail-grille">
                    ${champsHTML}
                </div>

            </section>
        `;

    }).join("");

    // STATUT ET MOTIF DE REJET

    detailsForage.innerHTML += `
        <section class="detail-section">

            <h3>Statut de la fiche</h3>

            <div class="detail-grille">

                <div class="detail-item">
                    <strong>Statut actuel</strong>
                    <span>
                        ${echapper(formaterValeur(fiche.statut_fiche))}
                    </span>
                </div>

                ${fiche.statut_fiche === "rejete" ? `
                    <div class="detail-item">
                        <strong>Motif du rejet</strong>
                        <span>
                            ${echapper(formaterValeur(fiche.motif_rejet))}
                        </span>
                    </div>
                ` : ""}

            </div>

        </section>
    `;

    fenetreConsultation.hidden = false;
}

// ==========================================
// CLIQUER SUR CONSULTER
// ==========================================

listeForages.addEventListener("click", function(e) {

    const bouton = e.target.closest(".btn-consulter");

    if (!bouton) return;

    const fiche = toutesLesFiches.find(
        f => String(f.id) === bouton.dataset.id
    );

    if (!fiche) {
        alert("Fiche introuvable.");
        return;
    }

    afficherDetailsForage(fiche);
});

// ==========================================
// VALIDATION ET REJET DES FICHES
// ==========================================

listeForages.addEventListener("click", async function(e) {

    // VALIDER UNE FICHE

    const boutonValider = e.target.closest(".btn-valider");

    if (boutonValider) {

        const confirmation = confirm(
            "Voulez-vous vraiment valider cette fiche ?"
        );

        if (!confirmation) return;

        boutonValider.disabled = true;

        const { error } = await supabase
            .from("recensements_forages")
            .update({
                statut_fiche: "valide",
                motif_rejet: null
            })
            .eq("id", boutonValider.dataset.id);

        if (error) {

            alert("Erreur : " + error.message);

            boutonValider.disabled = false;

            return;
        }

        alert("Fiche validée avec succès !");

        await chargerForages();

        return;
    }

    // REJETER UNE FICHE

    const boutonRejeter = e.target.closest(".btn-rejeter");

    if (boutonRejeter) {

        const motif = prompt(
            "Indiquez obligatoirement le motif du rejet :"
        );

        if (motif === null) return;

        if (!motif.trim()) {
            alert("Le motif du rejet est obligatoire.");
            return;
        }

        boutonRejeter.disabled = true;

        const { error } = await supabase
            .from("recensements_forages")
            .update({
                statut_fiche: "rejete",
                motif_rejet: motif.trim()
            })
            .eq("id", boutonRejeter.dataset.id);

        if (error) {

            alert("Erreur : " + error.message);

            boutonRejeter.disabled = false;

            return;
        }

        alert("Fiche rejetée avec succès !");

        await chargerForages();
    }

});

// ==========================================
// FERMER LA FENÊTRE DE CONSULTATION
// ==========================================

fermerConsultation.addEventListener("click", function() {
    fenetreConsultation.hidden = true;
});

fenetreConsultation.addEventListener("click", function(e) {

    if (e.target === fenetreConsultation) {
        fenetreConsultation.hidden = true;
    }

});

// ==========================================
// GÉNÉRATION DU RAPPORT GÉNÉRAL DES FORAGES
// ==========================================

const btnExporterPDF = document.getElementById("btnExporterPDF");
const dateDebut = document.getElementById("dateDebut");
const dateFin = document.getElementById("dateFin");
const messageExport = document.getElementById("messageExport");

// NOMS DES COLONNES DU RAPPORT

const nomsColonnes = {

    id: "ID",
    user_id: "Utilisateur",
    nom_programme: "Programme",
    nom_enqueteur: "Enquêteur",
    date_collecte: "Date collecte",
    latitude: "Latitude",
    longitude: "Longitude",
    prefecture: "Préfecture",
    commune: "Commune",
    district: "District",
    village_quartier: "Village / Quartier",
    programme_realisation: "Programme réalisation",
    annee_realisation: "Année réalisation",
    programme_rehabilitation: "Programme réhabilitation",
    annee_rehabilitation: "Année réhabilitation",
    etat_ouvrage: "État ouvrage",
    utilise: "Utilisé",
    raison_non_utilisation: "Raison non-utilisation",
    profondeur: "Profondeur",
    debit: "Débit",
    nombre_menages: "Nombre ménages",
    autres_villages: "Autres villages",
    marque_pompe: "Marque pompe",
    modele_pompe: "Modèle pompe",
    annee_pompe: "Année pompe",
    probleme_pompe: "Problème pompe",
    existence_deferriseur: "Déferriseur",
    etat_deferriseur: "État déferriseur",
    etat_superstructure: "Superstructure",
    etat_margelle: "Margelle",
    presence_cloture: "Clôture",
    etat_evacuation: "Évacuation",
    etat_cloture: "État clôture",
    couleur_eau: "Couleur eau",
    gout_eau: "Goût eau",
    odeur_eau: "Odeur eau",
    source_pollution: "Source pollution",
    type_pollution: "Type pollution",
    distance_pollution: "Distance pollution",
    type_gestionnaire: "Type gestionnaire",
    gestion_fonctionnelle: "Gestion fonctionnelle",
    paiement: "Paiement",
    nom_gestionnaire: "Gestionnaire",
    cotisations_regulieres: "Cotisations régulières",
    periode_cotisation: "Période cotisation",
    nombre_personnes_gestion: "Personnes gestion",
    base_gestion: "Base gestion",
    reparateur: "Réparateur",
    montant_reparation: "Montant réparation",
    montant_caisse: "Montant caisse",
    vente_volume: "Vente au volume",
    base_vente: "Base vente",
    volume_litres: "Volume litres",
    appui_exterieur_panne: "Appui extérieur",
    prix_appui: "Prix appui",
    satisfait: "Satisfaction",
    cause_insatisfaction: "Cause insatisfaction",
    observations: "Observations",
    signature: "Signature",
    statut_fiche: "Statut",
    motif_rejet: "Motif rejet",
    created_at: "Date création",
    updated_at: "Dernière modification"

};

// ==========================================
// CONVERTIR LES VALEURS POUR LE PDF
// ==========================================

function valeurPDF(valeur) {

    if (valeur === null || valeur === undefined || valeur === "") {
        return "-";
    }

    if (typeof valeur === "boolean") {
        return valeur ? "Oui" : "Non";
    }

    return String(valeur);
}

// ==========================================
// RÉCUPÉRER TOUTES LES FICHES
// ==========================================

async function recupererToutesLesFiches() {

    let resultats = [];
    let debut = 0;

    const limite = 1000;

    while (true) {

        const { data, error } = await supabase
            .from("recensements_forages")
            .select("*")
            .order("date_collecte", { ascending: true })
            .order("id", { ascending: true })
            .range(debut, debut + limite - 1);

        if (error) {
            throw error;
        }

        resultats = resultats.concat(data || []);

        if (!data || data.length < limite) {
            break;
        }

        debut += limite;
    }

    return resultats;
}

// ==========================================
// GÉNÉRER LE RAPPORT PDF
// ==========================================

btnExporterPDF.addEventListener("click", async function() {

    const debut = dateDebut.value;
    const fin = dateFin.value;

    if (!debut || !fin) {
        alert("Veuillez sélectionner les deux dates.");
        return;
    }

    if (debut > fin) {
        alert("La date de début doit précéder la date de fin.");
        return;
    }

    btnExporterPDF.disabled = true;

    messageExport.textContent = "Préparation du rapport PDF...";

    try {

        const toutesLesDonnees = await recupererToutesLesFiches();

        const fiches = toutesLesDonnees.filter(f => {

            const date = String(f.date_collecte || "").slice(0, 10);

            return date >= debut && date <= fin;

        });

        if (fiches.length === 0) {

            messageExport.textContent =
                "Aucun forage trouvé pour cette période.";

            return;
        }

        // CRÉER LE DOCUMENT A4 PAYSAGE

        const doc = new jsPDF({
            orientation: "landscape",
            unit: "mm",
            format: "a4"
        });

        const largeur = doc.internal.pageSize.getWidth();

        // EN-TÊTE OFFICIEL

        doc.setFillColor(8, 126, 120);

        doc.rect(0, 0, largeur, 35, "F");

        doc.setTextColor(255, 255, 255);

        doc.setFont("helvetica", "bold");

        doc.setFontSize(20);

        doc.text("SNAPE AQUA AFRICA", 15, 14);

        doc.setFontSize(12);

        doc.text(
            "RAPPORT GENERAL DE RECENSEMENT DES FORAGES",
            15,
            25
        );

        // INFORMATIONS DU RAPPORT

        doc.setTextColor(30, 41, 59);

        doc.setFontSize(10);

        doc.text("Période du : " + debut + " au " + fin, 15, 45);

        doc.text(
            "Date de génération : " + new Date().toLocaleDateString("fr-FR"),
            15,
            52
        );

        doc.setFont("helvetica", "bold");

        doc.text("TOTAL DES FORAGES : " + fiches.length, 15, 63);

        doc.text(
            "SOUMIS : " + fiches.filter(f => f.statut_fiche === "soumis").length,
            115,
            63
        );

        doc.text(
            "VALIDÉS : " + fiches.filter(f => f.statut_fiche === "valide").length,
            205,
            63
        );

        doc.text(
            "REJETÉS : " + fiches.filter(f => f.statut_fiche === "rejete").length,
            295,
            63
        );

        // CONSTRUIRE LES COLONNES

        const cles = Object.keys(fiches[0]);

        const colonnes = cles.map(cle => ({
            header: nomsColonnes[cle] || cle,
            dataKey: cle
        }));

        // PRÉPARER LES LIGNES

        const lignes = fiches.map(fiche => {

            const ligne = {};

            cles.forEach(cle => {
                ligne[cle] = valeurPDF(fiche[cle]);
            });

            return ligne;
        });

        // GÉNÉRER LE TABLEAU

        autoTable(doc, {

            columns: colonnes,

            body: lignes,

            startY: 70,

            theme: "grid",

            styles: {
                font: "helvetica",
                fontSize: 5,
                cellPadding: 1.5,
                overflow: "linebreak",
                valign: "middle"
            },

            headStyles: {
                fillColor: [8, 126, 120],
                textColor: 255,
                fontStyle: "bold",
                fontSize: 6
            },

            alternateRowStyles: {
                fillColor: [240, 248, 247]
            },

            horizontalPageBreak: true,

            horizontalPageBreakRepeat: [
                "date_collecte",
                "nom_enqueteur",
                "prefecture",
                "commune",
                "village_quartier"
            ],

            margin: {
                top: 12,
                right: 8,
                bottom: 15,
                left: 8
            },

            showHead: "everyPage",

            didDrawPage: function() {

                const hauteur = doc.internal.pageSize.getHeight();

                const largeurPage = doc.internal.pageSize.getWidth();

                doc.setFontSize(8);

                doc.setTextColor(100, 100, 100);

                doc.text(
                    "SNAPE AQUA AFRICA - Rapport général des recensements",
                    8,
                    hauteur - 7
                );

                doc.text(
                    "Page " + doc.internal.getNumberOfPages(),
                    largeurPage - 25,
                    hauteur - 7
                );
            }

        });

        // TÉLÉCHARGER LE PDF

        doc.save(
            "Rapport_general_forages_" + debut + "_" + fin + ".pdf"
        );

        messageExport.textContent =
            "Rapport généré avec succès : " + fiches.length + " forage(s).";

    } catch (error) {

        console.error("Erreur PDF :", error);

        messageExport.textContent =
            "Erreur lors de la génération : " + error.message;

    } finally {

        btnExporterPDF.disabled = false;

    }

});