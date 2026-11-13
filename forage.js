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

const formulaire = document.getElementById("formulaireForage");
const etapes = document.querySelectorAll(".form-step");

const precedent = document.getElementById("precedent");
const suivant = document.getElementById("suivant");
const soumettre = document.getElementById("soumettre");

const numeroEtape = document.getElementById("numeroEtape");
const progression = document.getElementById("progression");

const message = document.getElementById("message");

let etapeActuelle = 0;
let utilisateurConnecte = null;
let profilActif = null;


// =====================================
// MODE MODIFICATION
// =====================================

const parametresURL = new URLSearchParams(window.location.search);

const idFicheAModifier = parametresURL.get("modifier");

let modeModification = Boolean(idFicheAModifier);
let ficheEnCours = null;


// =====================================
// AFFICHAGE DES MESSAGES
// =====================================

function afficherMessage(texte, couleur = "#087E78") {

    if (!message) return;

    message.textContent = texte;
    message.style.color = couleur;

}


// =====================================
// BASE LOCALE DES FICHES
// =====================================

const NOM_BASE = "SNAPE_FORAGES_OFFLINE";

function ouvrirBaseFiches() {

    return new Promise((resolve, reject) => {

        const demande = indexedDB.open(NOM_BASE, 1);

        demande.onupgradeneeded = function(event) {

            const db = event.target.result;

            if (!db.objectStoreNames.contains("fiches")) {

                db.createObjectStore("fiches", {
                    keyPath: "id"
                });

            }

        };

        demande.onsuccess = () => resolve(demande.result);

        demande.onerror = () => reject(demande.error);

    });

}


// =====================================
// ENREGISTRER UNE FICHE LOCALEMENT
// =====================================

async function enregistrerFicheLocale(fiche) {

    const db = await ouvrirBaseFiches();

    return new Promise((resolve, reject) => {

        const transaction = db.transaction(
            "fiches",
            "readwrite"
        );

        transaction.objectStore("fiches").put(fiche);

        transaction.oncomplete = () => resolve(true);

        transaction.onerror = () => reject(transaction.error);

    });

}


// =====================================
// RECUPERER LES FICHES EN ATTENTE
// =====================================

async function obtenirFichesLocales() {

    const db = await ouvrirBaseFiches();

    return new Promise((resolve, reject) => {

        const transaction = db.transaction(
            "fiches",
            "readonly"
        );

        const demande = transaction
            .objectStore("fiches")
            .getAll();

        demande.onsuccess = () => resolve(demande.result || []);

        demande.onerror = () => reject(demande.error);

    });

}


// =====================================
// SUPPRIMER UNE FICHE LOCALE
// =====================================

async function supprimerFicheLocale(id) {

    const db = await ouvrirBaseFiches();

    return new Promise((resolve, reject) => {

        const transaction = db.transaction(
            "fiches",
            "readwrite"
        );

        transaction.objectStore("fiches").delete(id);

        transaction.oncomplete = () => resolve(true);

        transaction.onerror = () => reject(transaction.error);

    });

}


// =====================================
// IDENTIFICATION DE L'ENQUETEUR
// =====================================

async function verifierEnqueteur() {

    const profilSession = sessionStorage.getItem(
        "snape_profil_actif"
    );

    let profilLocal = null;

    if (profilSession) {

        try {

            profilLocal = JSON.parse(profilSession);

        } catch (error) {

            console.error("Profil de session invalide :", error);

        }

    }


    // MODE HORS CONNEXION

    if (!navigator.onLine) {

        if (!profilLocal) {

            window.location.href = "connexion.html";

            return false;

        }

        if (
            profilLocal.role !== "enqueteur" ||
            profilLocal.statut !== "actif"
        ) {

            afficherMessage(
                "Ce compte n'est pas autorisé à remplir les fiches.",
                "#DC3545"
            );

            return false;

        }

        profilActif = profilLocal;

        utilisateurConnecte = {
            id: profilLocal.id
        };

        afficherInformationsEnqueteur(profilLocal);

        afficherMessage(
            "Mode hors connexion : vos fiches seront enregistrées sur ce téléphone."
        );

        return true;

    }


    // MODE CONNECTE

    const { data: sessionData, error: sessionError } =
        await supabase.auth.getSession();

    if (sessionError || !sessionData.session) {

        window.location.href = "connexion.html";

        return false;

    }

    utilisateurConnecte = sessionData.session.user;


    const { data: profil, error } = await supabase
        .from("profiles")
        .select("nom_complet, role, statut")
        .eq("id", utilisateurConnecte.id)
        .single();


    if (error || !profil) {

        afficherMessage(
            "Impossible de récupérer votre profil.",
            "#DC3545"
        );

        return false;

    }


    if (
        profil.role !== "enqueteur" ||
        profil.statut !== "actif"
    ) {

        afficherMessage(
            "Votre compte n'est pas autorisé à remplir cette fiche.",
            "#DC3545"
        );

        return false;

    }


    profilActif = {

        id: utilisateurConnecte.id,

        email: sessionData.session.user.email,

        nom_complet: profil.nom_complet,

        role: profil.role,

        statut: profil.statut

    };


    sessionStorage.setItem(
        "snape_profil_actif",
        JSON.stringify(profilActif)
    );


    afficherInformationsEnqueteur(profilActif);

    return true;

}


// =====================================
// INFORMATIONS DE L'ENQUETEUR
// =====================================

function afficherInformationsEnqueteur(profil) {

    const champNom = document.getElementById("nomEnqueteur");

    const champDate = document.getElementById("dateCollecte");

    if (champNom) {

        champNom.value = profil.nom_complet || "";

    }

    if (champDate && !champDate.value) {

        const aujourdHui = new Date();

        champDate.value =
            aujourdHui.getFullYear() + "-" +
            String(aujourdHui.getMonth() + 1).padStart(2, "0") + "-" +
            String(aujourdHui.getDate()).padStart(2, "0");

    }

}


// =====================================
// CHARGER UNE FICHE POUR MODIFICATION
// =====================================

async function chargerFicheAModifier() {

    if (!modeModification) return true;

    if (!navigator.onLine) {

        afficherMessage(
            "La modification des anciennes fiches nécessite une connexion Internet.",
            "#DC3545"
        );

        return false;

    }


    afficherMessage("Chargement de la fiche...");


    const { data: fiche, error } = await supabase
        .from("recensements_forages")
        .select("*")
        .eq("id", idFicheAModifier)
        .eq("user_id", utilisateurConnecte.id)
        .single();


    if (error || !fiche) {

        console.error("Erreur de chargement :", error);

        afficherMessage(
            "Impossible de charger cette fiche.",
            "#DC3545"
        );

        return false;

    }


    if (fiche.statut_fiche === "valide") {

        afficherMessage(
            "Cette fiche est déjà validée et ne peut plus être modifiée.",
            "#DC3545"
        );

        return false;

    }


    ficheEnCours = fiche;


    const correspondance = {

        nom_programme: "nomProgramme",
        date_collecte: "dateCollecte",
        village_quartier: "villageQuartier",

        programme_realisation: "programmeRealisation",
        annee_realisation: "anneeRealisation",

        programme_rehabilitation: "programmeRehabilitation",
        annee_rehabilitation: "anneeRehabilitation",

        etat_ouvrage: "etatOuvrage",
        utilise: "utilise",

        raison_non_utilisation: "raisonNonUtilisation",

        nombre_menages: "nombreMenages",
        autres_villages: "autresVillages",

        marque_pompe: "marquePompe",
        modele_pompe: "modelePompe",
        annee_pompe: "anneePompe",
        probleme_pompe: "problemePompe",

        existence_deferriseur: "existenceDeferriseur",
        etat_deferriseur: "etatDeferriseur",

        etat_superstructure: "etatSuperstructure",
        etat_margelle: "etatMargelle",

        presence_cloture: "presenceCloture",
        etat_evacuation: "etatEvacuation",
        etat_cloture: "etatCloture",

        couleur_eau: "couleurEau",
        gout_eau: "goutEau",
        odeur_eau: "odeurEau",

        source_pollution: "sourcePollution",
        type_pollution: "typePollution",
        distance_pollution: "distancePollution",

        type_gestionnaire: "typeGestionnaire",
        gestion_fonctionnelle: "gestionFonctionnelle",

        paiement: "paiement",
        nom_gestionnaire: "nomGestionnaire",

        cotisations_regulieres: "cotisationsRegulieres",
        periode_cotisation: "periodeCotisation",

        nombre_personnes_gestion: "nombrePersonnesGestion",
        base_gestion: "baseGestion",

        reparateur: "reparateur",
        montant_reparation: "montantReparation",
        montant_caisse: "montantCaisse",

        vente_volume: "venteVolume",
        base_vente: "baseVente",
        volume_litres: "volumeLitres",

        appui_exterieur_panne: "appuiExterieurPanne",
        prix_appui: "prixAppui",

        satisfait: "satisfait",
        cause_insatisfaction: "causeInsatisfaction",

        observations: "observations",
        signature: "signature"

    };


    Object.entries(fiche).forEach(([colonne, valeur]) => {

        const idChamp = correspondance[colonne] || colonne;

        const champ = document.getElementById(idChamp);

        if (champ && valeur !== null && valeur !== undefined) {

            champ.value = String(valeur);

        }

    });


    afficherMessage("Fiche chargée. Vous pouvez la modifier.");

    return true;

}


// =====================================
// NAVIGATION ENTRE LES ETAPES
// =====================================

function afficherEtape(index) {

    etapes.forEach((etape, i) => {

        etape.classList.toggle("active", i === index);

    });


    etapeActuelle = index;

    numeroEtape.textContent = index + 1;

    progression.style.width =
        ((index + 1) / etapes.length * 100) + "%";


    precedent.hidden = index === 0;

    suivant.hidden = index === etapes.length - 1;

    soumettre.hidden = index !== etapes.length - 1;


    afficherMessage("");

    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });

}


// =====================================
// VERIFICATION DES CHAMPS OBLIGATOIRES
// =====================================

function verifierEtape() {

    const champs = etapes[etapeActuelle].querySelectorAll("[required]");

    for (const champ of champs) {

        if (!champ.checkValidity()) {

            champ.reportValidity();

            return false;

        }

    }

    return true;

}


suivant.addEventListener("click", () => {

    if (!verifierEtape()) return;

    if (etapeActuelle < etapes.length - 1) {

        afficherEtape(etapeActuelle + 1);

    }

});


precedent.addEventListener("click", () => {

    if (etapeActuelle > 0) {

        afficherEtape(etapeActuelle - 1);

    }

});


// =====================================
// CONVERSION DES VALEURS
// =====================================

function texte(id) {

    const champ = document.getElementById(id);

    if (!champ) return null;

    return champ.value.trim() || null;

}


function nombre(id) {

    const champ = document.getElementById(id);

    if (!champ || champ.value === "") return null;

    return Number(champ.value);

}


function booleen(id) {

    const champ = document.getElementById(id);

    if (!champ || champ.value === "") return null;

    return champ.value === "true";

}


// =====================================
// RECUPERATION DES DONNEES
// =====================================

function recupererDonnees() {

    return {

        nom_programme: texte("nomProgramme"),

        nom_enqueteur: profilActif.nom_complet || null,

        date_collecte: texte("dateCollecte"),

        prefecture: texte("prefecture"),

        commune: texte("commune"),

        district: texte("district"),

        village_quartier: texte("villageQuartier"),

        latitude: nombre("latitude"),

        longitude: nombre("longitude"),

        programme_realisation: texte("programmeRealisation"),

        annee_realisation: nombre("anneeRealisation"),

        programme_rehabilitation: texte("programmeRehabilitation"),

        annee_rehabilitation: nombre("anneeRehabilitation"),

        etat_ouvrage: texte("etatOuvrage"),

        utilise: booleen("utilise"),

        raison_non_utilisation: texte("raisonNonUtilisation"),

        profondeur: nombre("profondeur"),

        debit: nombre("debit"),

        nombre_menages: nombre("nombreMenages"),

        autres_villages: texte("autresVillages"),

        marque_pompe: texte("marquePompe"),

        modele_pompe: texte("modelePompe"),

        annee_pompe: nombre("anneePompe"),

        probleme_pompe: texte("problemePompe"),

        existence_deferriseur: booleen("existenceDeferriseur"),

        etat_deferriseur: texte("etatDeferriseur"),

        etat_superstructure: texte("etatSuperstructure"),

        etat_margelle: texte("etatMargelle"),

        presence_cloture: booleen("presenceCloture"),

        etat_evacuation: texte("etatEvacuation"),

        etat_cloture: texte("etatCloture"),

        couleur_eau: texte("couleurEau"),

        gout_eau: booleen("goutEau"),

        odeur_eau: booleen("odeurEau"),

        source_pollution: booleen("sourcePollution"),

        type_pollution: texte("typePollution"),

        distance_pollution: nombre("distancePollution"),

        type_gestionnaire: texte("typeGestionnaire"),

        gestion_fonctionnelle: booleen("gestionFonctionnelle"),

        paiement: booleen("paiement"),

        nom_gestionnaire: texte("nomGestionnaire"),

        cotisations_regulieres: booleen("cotisationsRegulieres"),

        periode_cotisation: texte("periodeCotisation"),

        nombre_personnes_gestion: nombre("nombrePersonnesGestion"),

        base_gestion: texte("baseGestion"),

        reparateur: texte("reparateur"),

        montant_reparation: nombre("montantReparation"),

        montant_caisse: nombre("montantCaisse"),

        vente_volume: booleen("venteVolume"),

        base_vente: texte("baseVente"),

        volume_litres: nombre("volumeLitres"),

        appui_exterieur_panne: texte("appuiExterieurPanne"),

        prix_appui: nombre("prixAppui"),

        satisfait: booleen("satisfait"),

        cause_insatisfaction: texte("causeInsatisfaction"),

        observations: texte("observations"),

        signature: texte("signature"),

        statut_fiche: "soumis"

    };

}


// =====================================
// CAPTURE GPS
// =====================================

document.getElementById("btnGPS").addEventListener("click", () => {

    if (!navigator.geolocation) {

        afficherMessage(
            "GPS non disponible sur ce téléphone.",
            "#DC3545"
        );

        return;

    }


    afficherMessage("Recherche de votre position GPS...");


    navigator.geolocation.getCurrentPosition(

        (position) => {

            document.getElementById("latitude").value =
                position.coords.latitude;

            document.getElementById("longitude").value =
                position.coords.longitude;

            afficherMessage("Position GPS récupérée avec succès.");

        },

        () => {

            afficherMessage(
                "Impossible de récupérer le GPS. Vérifiez les autorisations.",
                "#DC3545"
            );

        },

        {

            enableHighAccuracy: true,

            timeout: 20000,

            maximumAge: 0

        }

    );

});


// =====================================
// ENREGISTREMENT LOCAL D'UNE NOUVELLE FICHE
// =====================================

async function enregistrerNouvelleFicheLocale(donnees) {

    const identifiant = crypto.randomUUID();

    const ficheLocale = {

        id: identifiant,

        user_id: utilisateurConnecte.id,

        ...donnees,

        synchronisation: "en_attente",

        date_enregistrement_local: new Date().toISOString()

    };


    await enregistrerFicheLocale(ficheLocale);

    return ficheLocale;

}


// =====================================
// ENVOI D'UNE FICHE VERS SUPABASE
// =====================================

async function envoyerFicheSupabase(fiche) {

    const donnees = { ...fiche };

    delete donnees.synchronisation;

    delete donnees.date_enregistrement_local;


    const { error } = await supabase
        .from("recensements_forages")
        .insert(donnees);


    if (!error) {

        return true;

    }


    // Une réponse peut avoir été perdue alors que
    // Supabase a déjà enregistré la fiche.
    // On vérifie alors si cet identifiant existe déjà.

    if (error.code === "23505") {

        const { data, error: erreurVerification } = await supabase
            .from("recensements_forages")
            .select("id, user_id")
            .eq("id", fiche.id)
            .maybeSingle();


        if (
            !erreurVerification &&
            data &&
            data.user_id === fiche.user_id
        ) {

            return true;

        }

    }


    throw error;

}


// =====================================
// SYNCHRONISATION DES FICHES
// =====================================

let synchronisationEnCours = false;


async function synchroniserFiches() {

    if (!navigator.onLine) return;

    if (synchronisationEnCours) return;

    if (!utilisateurConnecte) return;


    synchronisationEnCours = true;


    try {

        const { data: sessionData } = await supabase.auth.getSession();

        if (!sessionData.session) return;


        const fiches = await obtenirFichesLocales();

        const fichesUtilisateur = fiches.filter(fiche =>
            fiche.user_id === utilisateurConnecte.id
        );


        if (fichesUtilisateur.length === 0) return;


        afficherMessage(
            "Synchronisation de " + fichesUtilisateur.length + " fiche(s)..."
        );


        let nombreSynchronise = 0;


        for (const fiche of fichesUtilisateur) {

            try {

                await envoyerFicheSupabase(fiche);

                await supprimerFicheLocale(fiche.id);

                nombreSynchronise++;

            } catch (error) {

                console.error(
                    "Synchronisation impossible pour la fiche " + fiche.id,
                    error
                );

            }

        }


        if (nombreSynchronise > 0) {

            afficherMessage(
                nombreSynchronise + " fiche(s) synchronisée(s) avec succès."
            );

        }

    } catch (error) {

        console.error("Erreur de synchronisation :", error);

    } finally {

        synchronisationEnCours = false;

    }

}


// =====================================
// ENREGISTREMENT ET MODIFICATION
// =====================================

formulaire.addEventListener("submit", async (event) => {

    event.preventDefault();


    if (!verifierEtape()) return;


    soumettre.disabled = true;

    soumettre.textContent = "Enregistrement...";


    try {

        const donnees = recupererDonnees();


        // MODIFICATION D'UNE FICHE EXISTANTE

        if (modeModification) {

            if (!navigator.onLine) {

                throw new Error(
                    "La modification des anciennes fiches nécessite Internet."
                );

            }


            const { data, error } = await supabase
                .from("recensements_forages")
                .update(donnees)
                .eq("id", idFicheAModifier)
                .eq("user_id", utilisateurConnecte.id)
                .neq("statut_fiche", "valide")
                .select("id")
                .maybeSingle();


            if (error) throw error;


            if (!data) {

                throw new Error(
                    "Modification impossible. Vérifiez que cette fiche vous appartient et qu'elle n'est pas validée."
                );

            }


            afficherMessage(
                "Modifications enregistrées avec succès !"
            );


            setTimeout(() => {

                window.location.href = "fiches.html";

            }, 1500);


            return;

        }


        // CREATION D'UNE NOUVELLE FICHE

        const ficheLocale = await enregistrerNouvelleFicheLocale(
            donnees
        );


        afficherMessage(
            "Fiche enregistrée sur le téléphone."
        );


        formulaire.reset();

        await verifierEnqueteur();

        afficherEtape(0);


        // ESSAYER DE SYNCHRONISER SI INTERNET EST DISPONIBLE

        if (navigator.onLine) {

            await synchroniserFiches();

        } else {

            afficherMessage(
                "Fiche enregistrée hors connexion. Elle sera synchronisée au retour d'Internet."
            );

        }

    } catch (error) {

        console.error("Erreur d'enregistrement :", error);


        afficherMessage(
            "Erreur : " + error.message,
            "#DC3545"
        );

    } finally {

        soumettre.disabled = false;

        soumettre.textContent = modeModification
            ? "Enregistrer les modifications"
            : "Soumettre la fiche";

    }

});


// =====================================
// RETOUR D'INTERNET
// =====================================

window.addEventListener("online", async () => {

    afficherMessage("Internet disponible. Vérification de la synchronisation...");

    await synchroniserFiches();

});


window.addEventListener("offline", () => {

    afficherMessage(
        "Mode hors connexion. Les nouvelles fiches seront conservées sur ce téléphone."
    );

});


// =====================================
// DEMARRAGE
// =====================================

async function demarrer() {

    try {

        const autorise = await verifierEnqueteur();

        if (!autorise) return;


        if (modeModification) {

            const ficheChargee = await chargerFicheAModifier();

            if (!ficheChargee) return;

            soumettre.textContent = "Enregistrer les modifications";

        }


        afficherEtape(0);


        // Synchronisation des anciennes fiches en attente

        if (navigator.onLine) {

            await synchroniserFiches();

        }

    } catch (error) {

        console.error("Erreur au démarrage :", error);

        afficherMessage(
            "Impossible de démarrer le formulaire : " + error.message,
            "#DC3545"
        );

    }

}


demarrer();