import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = "https://zgeyubvutkcwcskoshcd.supabase.co";
const SUPABASE_KEY = "sb_publishable_wyRn7S0kg6xC1mNSToYfmA_YRos-9bS";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);


// ======================================
// ELEMENTS HTML
// ======================================

const btnMenu = document.getElementById("btnMenu");
const sidebar = document.getElementById("sidebar");
const sidebarOverlay = document.getElementById("sidebarOverlay");

const btnDeconnexion = document.getElementById("btnDeconnexion");

const profilNom = document.getElementById("profilNom");
const profilAvatar = document.getElementById("profilAvatar");

const totalForages = document.getElementById("totalForages");
const totalSoumis = document.getElementById("totalSoumis");
const totalValides = document.getElementById("totalValides");
const totalActifs = document.getElementById("totalActifs");

const activiteRecente = document.getElementById("activiteRecente");

const graphique = document.getElementById("graphiqueRecensements");


// ======================================
// OUTILS
// ======================================

function echapper(texte) {
    return String(texte ?? "").replace(/[&<>"']/g, caractere => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
    })[caractere]);
}

function afficherNombre(element, nombre) {
    if (element) {
        element.textContent = nombre ?? 0;
    }
}

function afficherDate(date) {
    if (!date) return "Non renseignée";

    return new Date(date).toLocaleDateString("fr-FR");
}


// ======================================
// MENU LATERAL MOBILE
// ======================================

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

        if (sidebar.classList.contains("open")) {
            fermerMenu();
        } else {
            ouvrirMenu();
        }

    });

    sidebarOverlay.addEventListener("click", fermerMenu);

    document.querySelectorAll(".sidebar-nav .nav-link").forEach(lien => {

        lien.addEventListener("click", fermerMenu);

    });

    document.addEventListener("keydown", function(e) {

        if (e.key === "Escape") {
            fermerMenu();
        }

    });

}


// ======================================
// VERIFICATION ADMINISTRATEUR
// ======================================

async function verifierAdministrateur() {

    const { data, error } = await supabase.auth.getSession();

    if (error || !data.session) {

        window.location.href = "connexion.html";

        return null;
    }

    const utilisateur = data.session.user;

    const { data: profil, error: erreurProfil } = await supabase
        .from("profiles")
        .select("nom_complet, role, statut")
        .eq("id", utilisateur.id)
        .single();

    if (
        erreurProfil ||
        !profil ||
        profil.role !== "admin" ||
        profil.statut !== "actif"
    ) {

        await supabase.auth.signOut();

        window.location.href = "connexion.html";

        return null;
    }

    return profil;
}


// ======================================
// AFFICHER LE PROFIL ADMINISTRATEUR
// ======================================

function afficherProfil(profil) {

    const nom = profil.nom_complet || "Administrateur";

    if (profilNom) {
        profilNom.textContent = nom;
    }

    if (profilAvatar) {
        profilAvatar.textContent = nom.charAt(0).toUpperCase();
    }

}


// ======================================
// CHARGER LES STATISTIQUES
// ======================================

async function chargerStatistiques() {

    // Nombre total de forages

    const { count: nombreForages, error: erreurForages } =
        await supabase
            .from("recensements_forages")
            .select("id", { count: "exact", head: true });

    if (erreurForages) {
        console.error("Erreur forages :", erreurForages.message);
    } else {
        afficherNombre(totalForages, nombreForages);
    }


    // Nombre de fiches soumises

    const { count: nombreSoumis, error: erreurSoumis } =
        await supabase
            .from("recensements_forages")
            .select("id", { count: "exact", head: true })
            .eq("statut_fiche", "soumis");

    if (erreurSoumis) {
        console.error("Erreur fiches soumises :", erreurSoumis.message);
    } else {
        afficherNombre(totalSoumis, nombreSoumis);
    }


    // Nombre de fiches validées

    const { count: nombreValides, error: erreurValides } =
        await supabase
            .from("recensements_forages")
            .select("id", { count: "exact", head: true })
            .eq("statut_fiche", "valide");

    if (erreurValides) {
        console.error("Erreur fiches validées :", erreurValides.message);
    } else {
        afficherNombre(totalValides, nombreValides);
    }


    // Nombre d'enquêteurs actifs

    const { count: nombreActifs, error: erreurActifs } =
        await supabase
            .from("profiles")
            .select("id", { count: "exact", head: true })
            .eq("role", "enqueteur")
            .eq("statut", "actif");

    if (erreurActifs) {
        console.error("Erreur enquêteurs :", erreurActifs.message);
    } else {
        afficherNombre(totalActifs, nombreActifs);
    }

}


// ======================================
// CHARGER LES DERNIERES FICHES
// ======================================

async function chargerActiviteRecente() {

    if (!activiteRecente) return;

    activiteRecente.innerHTML = `
        <tr>
            <td colspan="5">Chargement des données...</td>
        </tr>
    `;

    const { data, error } = await supabase
        .from("recensements_forages")
        .select(`
            nom_enqueteur,
            prefecture,
            commune,
            date_collecte,
            statut_fiche,
            created_at
        `)
        .order("created_at", { ascending: false })
        .limit(5);

    if (error) {

        console.error("Erreur activité récente :", error.message);

        activiteRecente.innerHTML = `
            <tr>
                <td colspan="5">Impossible de charger les dernières fiches.</td>
            </tr>
        `;

        return;
    }

    if (!data || data.length === 0) {

        activiteRecente.innerHTML = `
            <tr>
                <td colspan="5">Aucun recensement enregistré.</td>
            </tr>
        `;

        return;
    }

    activiteRecente.innerHTML = data.map(fiche => {

        const statut = fiche.statut_fiche || "Inconnu";

        return `
            <tr>
                <td>${echapper(fiche.nom_enqueteur)}</td>

                <td>${echapper(fiche.prefecture)}</td>

                <td>${echapper(fiche.commune)}</td>

                <td>${echapper(afficherDate(fiche.date_collecte))}</td>

                <td>
                    <span class="status-badge">
                        ${echapper(statut)}
                    </span>
                </td>
            </tr>
        `;

    }).join("");

}


// ======================================
// GRAPHIQUE DES RECENSEMENTS
// ======================================

async function chargerGraphique() {

    if (!graphique) return;

    if (typeof Chart === "undefined") {
        console.error("Chart.js n'est pas chargé.");
        return;
    }

    const maintenant = new Date();

    const debut = new Date(
        maintenant.getFullYear(),
        maintenant.getMonth() - 5,
        1
    );

    const { data, error } = await supabase
        .from("recensements_forages")
        .select("created_at")
        .gte("created_at", debut.toISOString());

    if (error) {

        console.error("Erreur graphique :", error.message);

        return;
    }

    const mois = [];

    const valeurs = [];

    for (let i = 5; i >= 0; i--) {

        const date = new Date(
            maintenant.getFullYear(),
            maintenant.getMonth() - i,
            1
        );

        const nomMois = date.toLocaleDateString("fr-FR", {
            month: "short",
            year: "numeric"
        });

        mois.push(nomMois);

        valeurs.push(0);
    }

    (data || []).forEach(fiche => {

        const date = new Date(fiche.created_at);

        const difference =
            (maintenant.getFullYear() - date.getFullYear()) * 12 +
            maintenant.getMonth() - date.getMonth();

        if (difference >= 0 && difference < 6) {

            valeurs[5 - difference]++;

        }

    });

    new Chart(graphique, {

        type: "line",

        data: {

            labels: mois,

            datasets: [{

                label: "Recensements",

                data: valeurs,

                borderColor: "#087E78",

                backgroundColor: "rgba(8, 126, 120, 0.12)",

                borderWidth: 3,

                fill: true,

                tension: 0.4,

                pointRadius: 4,

                pointBackgroundColor: "#087E78"

            }]

        },

        options: {

            responsive: true,

            maintainAspectRatio: false,

            plugins: {

                legend: {
                    display: false
                }

            },

            scales: {

                y: {
                    beginAtZero: true,
                    ticks: {
                        precision: 0
                    }
                }

            }

        }

    });

}


// ======================================
// DECONNEXION
// ======================================

if (btnDeconnexion) {

    btnDeconnexion.addEventListener("click", async function() {

        const confirmation = confirm(
            "Voulez-vous vraiment vous déconnecter ?"
        );

        if (!confirmation) return;

        const { error } = await supabase.auth.signOut();

        if (error) {

            alert("Erreur de déconnexion : " + error.message);

            return;
        }

        window.location.href = "connexion.html";

    });

}


// ======================================
// DEMARRAGE DU TABLEAU DE BORD
// ======================================

async function demarrer() {

    const profil = await verifierAdministrateur();

    if (!profil) return;

    afficherProfil(profil);

    await Promise.all([

        chargerStatistiques(),

        chargerActiviteRecente(),

        chargerGraphique()

    ]);

}

demarrer();
