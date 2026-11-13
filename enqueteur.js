import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// =====================================
// CONFIGURATION SUPABASE
// =====================================

const SUPABASE_URL = "https://zgeyubvutkcwcskoshcd.supabase.co";
const SUPABASE_KEY = "sb_publishable_wyRn7S0kg6xC1mNSToYfmA_YRos-9bS";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// =====================================
// ELEMENTS HTML
// =====================================

const message = document.getElementById("message");

const sidebar = document.getElementById("sidebar");
const sidebarOverlay = document.getElementById("sidebarOverlay");
const btnMenu = document.getElementById("btnMenu");
const btnDeconnexion = document.getElementById("btnDeconnexion");

const nomEnqueteur = document.getElementById("nomEnqueteur");
const profilAvatar = document.getElementById("profilAvatar");

const totalForages = document.getElementById("totalForages");
const foragesAttente = document.getElementById("foragesAttente");
const foragesValides = document.getElementById("foragesValides");

// =====================================
// VARIABLES
// =====================================

let profilActif = null;

// =====================================
// MESSAGES
// =====================================

function afficherMessage(texte, erreur = false) {

    if (!message) return;

    message.textContent = texte;
    message.style.color = erreur ? "#D64545" : "#087E78";

}

// =====================================
// MENU LATERAL
// =====================================

function ouvrirMenu() {

    if (!sidebar || !sidebarOverlay || !btnMenu) return;

    sidebar.classList.add("open");
    sidebarOverlay.classList.add("active");

    document.body.classList.add("menu-open");

    btnMenu.textContent = "✕";
    btnMenu.setAttribute("aria-expanded", "true");

}

function fermerMenu() {

    if (!sidebar || !sidebarOverlay || !btnMenu) return;

    sidebar.classList.remove("open");
    sidebarOverlay.classList.remove("active");

    document.body.classList.remove("menu-open");

    btnMenu.textContent = "☰";
    btnMenu.setAttribute("aria-expanded", "false");

}

if (btnMenu) {

    btnMenu.addEventListener("click", () => {

        if (sidebar.classList.contains("open")) {
            fermerMenu();
        } else {
            ouvrirMenu();
        }

    });

}

if (sidebarOverlay) {
    sidebarOverlay.addEventListener("click", fermerMenu);
}

document.querySelectorAll(".sidebar-nav .nav-link").forEach(lien => {
    lien.addEventListener("click", fermerMenu);
});

document.addEventListener("keydown", evenement => {

    if (evenement.key === "Escape") {
        fermerMenu();
    }

});

window.addEventListener("resize", () => {

    if (window.innerWidth > 700) {
        fermerMenu();
    }

});

// =====================================
// AFFICHER LE PROFIL
// =====================================

function afficherProfil(profil) {

    const nom = profil.nom_complet || "Enquêteur";

    if (nomEnqueteur) {
        nomEnqueteur.textContent = nom;
    }

    if (profilAvatar) {
        profilAvatar.textContent = nom.trim().charAt(0).toUpperCase();
    }

}

// =====================================
// RECUPERER LE PROFIL LOCAL
// =====================================

function recupererProfilLocal() {

    try {

        const donnees = sessionStorage.getItem("snape_profil_actif");

        if (!donnees) return null;

        return JSON.parse(donnees);

    } catch (erreur) {

        console.error("Erreur profil local :", erreur);

        return null;

    }

}

// =====================================
// VERIFICATION DU PROFIL
// =====================================

function verifierProfil(profil) {

    if (!profil) {
        throw new Error("Profil introuvable.");
    }

    if (profil.role !== "enqueteur") {
        throw new Error("Cet espace est réservé aux enquêteurs.");
    }

    if (profil.statut !== "actif") {
        throw new Error("Votre compte n'est pas actif.");
    }

}

// =====================================
// CHARGEMENT DES STATISTIQUES
// =====================================

function afficherStatistiques(stats) {

    if (totalForages) {
        totalForages.textContent = stats.total;
    }

    if (foragesAttente) {
        foragesAttente.textContent = stats.attente;
    }

    if (foragesValides) {
        foragesValides.textContent = stats.valides;
    }

}

function sauvegarderStatistiquesLocal(userId, stats) {

    try {

        localStorage.setItem(
            "snape_stats_" + userId,
            JSON.stringify(stats)
        );

    } catch (erreur) {

        console.error("Erreur sauvegarde statistiques :", erreur);

    }

}

function recupererStatistiquesLocales(userId) {

    try {

        const donnees = localStorage.getItem("snape_stats_" + userId);

        return donnees ? JSON.parse(donnees) : null;

    } catch (erreur) {

        console.error("Erreur lecture statistiques locales :", erreur);

        return null;

    }

}

// =====================================
// CHARGEMENT DEPUIS SUPABASE
// =====================================

async function chargerStatistiques(userId) {

    afficherMessage("Actualisation des statistiques...");

    const { data, error } = await supabase
        .from("recensements_forages")
        .select("statut_fiche")
        .eq("user_id", userId);

    if (error) {
        throw error;
    }

    const fiches = data || [];

    const stats = {
        total: fiches.length,

        attente: fiches.filter(
            fiche => fiche.statut_fiche === "Soumis"
        ).length,

        valides: fiches.filter(
            fiche => fiche.statut_fiche === "Valide"
        ).length
    };

    afficherStatistiques(stats);

    sauvegarderStatistiquesLocal(userId, stats);

    afficherMessage("Statistiques actualisées.");

}

// =====================================
// CHARGEMENT DU TABLEAU DE BORD
// =====================================

async function demarrer() {

    afficherMessage("Chargement de votre espace...");

    try {

        let profil = recupererProfilLocal();

        if (navigator.onLine) {

            const { data, error } = await supabase.auth.getSession();

            if (error) throw error;

            if (!data.session) {

                window.location.href = "connexion.html";
                return;

            }

            const { data: profilServeur, error: erreurProfil } =
                await supabase
                    .from("profiles")
                    .select("nom_complet, role, statut")
                    .eq("id", data.session.user.id)
                    .single();

            if (erreurProfil || !profilServeur) {
                throw new Error("Impossible de récupérer votre profil.");
            }

            profil = {
                id: data.session.user.id,
                email: data.session.user.email,
                nom_complet: profilServeur.nom_complet,
                role: profilServeur.role,
                statut: profilServeur.statut
            };

            sessionStorage.setItem(
                "snape_profil_actif",
                JSON.stringify(profil)
            );

        } else {

            if (!profil) {
                window.location.href = "connexion.html";
                return;
            }

            afficherMessage(
                "Mode hors connexion : profil enregistré sur cet appareil."
            );

        }

        verifierProfil(profil);

        profilActif = profil;

        afficherProfil(profil);

        if (navigator.onLine) {

            try {

                await chargerStatistiques(profil.id);

            } catch (erreur) {

                console.error("Erreur statistiques :", erreur);

                const statsLocales = recupererStatistiquesLocales(profil.id);

                if (statsLocales) {

                    afficherStatistiques(statsLocales);

                    afficherMessage(
                        "Statistiques locales affichées. Actualisation Supabase impossible."
                    );

                } else {

                    afficherStatistiques({
                        total: "—",
                        attente: "—",
                        valides: "—"
                    });

                    afficherMessage(
                        "Impossible de récupérer les statistiques.",
                        true
                    );

                }

            }

        } else {

            const statsLocales = recupererStatistiquesLocales(profil.id);

            if (statsLocales) {

                afficherStatistiques(statsLocales);

                afficherMessage(
                    "Mode hors connexion : dernières statistiques enregistrées."
                );

            } else {

                afficherStatistiques({
                    total: "—",
                    attente: "—",
                    valides: "—"
                });

                afficherMessage(
                    "Aucune statistique enregistrée sur cet appareil."
                );

            }

        }

    } catch (erreur) {

        console.error("Erreur tableau de bord :", erreur);

        afficherMessage(erreur.message, true);

    }

}

// =====================================
// RETOUR D'INTERNET
// =====================================

window.addEventListener("online", async () => {

    if (!profilActif) return;

    afficherMessage("Internet rétabli. Vérification du compte...");

    try {

        const { data, error } = await supabase.auth.getSession();

        if (error) throw error;

        if (!data.session || data.session.user.id !== profilActif.id) {

            afficherMessage(
                "Reconnectez-vous pour vérifier votre compte.",
                true
            );

            return;

        }

        const { data: profil, error: erreurProfil } = await supabase
            .from("profiles")
            .select("nom_complet, role, statut")
            .eq("id", profilActif.id)
            .single();

        if (erreurProfil || !profil) throw erreurProfil;

        verifierProfil(profil);

        await chargerStatistiques(profilActif.id);

    } catch (erreur) {

        console.error("Erreur retour Internet :", erreur);

        afficherMessage(
            "Vérification impossible. Reconnectez-vous ou contactez l'administrateur.",
            true
        );

    }

});

// =====================================
// DECONNEXION
// =====================================

if (btnDeconnexion) {

    btnDeconnexion.addEventListener("click", async () => {

        btnDeconnexion.disabled = true;

        try {

            if (navigator.onLine) {
                await supabase.auth.signOut();
            }

            sessionStorage.removeItem("snape_profil_actif");

            window.location.href = "connexion.html";

        } catch (erreur) {

            console.error("Erreur déconnexion :", erreur);

            afficherMessage("Erreur pendant la déconnexion.", true);

            btnDeconnexion.disabled = false;

        }

    });

}

// =====================================
// LANCEMENT
// =====================================

demarrer();