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

const formulaire = document.getElementById("connexionForm");
const bouton = document.getElementById("btnConnexion");
const message = document.getElementById("message");

const etatConnexion = document.getElementById("etatConnexion");

const zoneConnexion = document.getElementById("zoneConnexion");
const zoneCreationPIN = document.getElementById("zoneCreationPIN");
const zonePINHorsLigne = document.getElementById("zonePINHorsLigne");

const formCreationPIN = document.getElementById("formCreationPIN");
const formPINHorsLigne = document.getElementById("formPINHorsLigne");

const messagePIN = document.getElementById("messagePIN");
const messagePINHorsLigne = document.getElementById("messagePINHorsLigne");

// =====================================
// VARIABLES
// =====================================

let profilEnAttente = null;
let emailEnAttente = null;

// =====================================
// AFFICHAGE DES MESSAGES
// =====================================

function afficherMessage(element, texte, erreur = false) {
    if (!element) return;

    element.textContent = texte;
    element.style.color = erreur ? "#D64545" : "#087E78";
}

// =====================================
// AFFICHAGE DES ZONES
// =====================================

function afficherZone(zone) {

    zoneConnexion.hidden = zone !== "connexion";
    zoneCreationPIN.hidden = zone !== "creation";
    zonePINHorsLigne.hidden = zone !== "pin";

}

// =====================================
// BASE DE DONNEES LOCALE
// =====================================

function ouvrirBaseLocale() {

    return new Promise((resolve, reject) => {

        const demande = indexedDB.open("SNAPE_AQUA_OFFLINE", 1);

        demande.onupgradeneeded = function(event) {

            const db = event.target.result;

            if (!db.objectStoreNames.contains("profils")) {
                db.createObjectStore("profils", {
                    keyPath: "email"
                });
            }

        };

        demande.onsuccess = () => resolve(demande.result);
        demande.onerror = () => reject(demande.error);

    });

}

async function obtenirProfilLocal(email) {

    const db = await ouvrirBaseLocale();

    return new Promise((resolve, reject) => {

        const transaction = db.transaction("profils", "readonly");

        const demande = transaction
            .objectStore("profils")
            .get(email.toLowerCase());

        demande.onsuccess = () => resolve(demande.result || null);
        demande.onerror = () => reject(demande.error);

    });

}

async function enregistrerProfilLocal(enregistrement) {

    const db = await ouvrirBaseLocale();

    return new Promise((resolve, reject) => {

        const transaction = db.transaction("profils", "readwrite");

        transaction.objectStore("profils").put(enregistrement);

        transaction.oncomplete = () => resolve(true);
        transaction.onerror = () => reject(transaction.error);

    });

}

// =====================================
// CHIFFREMENT DU PROFIL
// =====================================

async function creerClePIN(pin, sel) {

    const donneesPIN = new TextEncoder().encode(pin);

    const materiau = await crypto.subtle.importKey(
        "raw",
        donneesPIN,
        "PBKDF2",
        false,
        ["deriveKey"]
    );

    return crypto.subtle.deriveKey(
        {
            name: "PBKDF2",
            salt: sel,
            iterations: 310000,
            hash: "SHA-256"
        },
        materiau,
        {
            name: "AES-GCM",
            length: 256
        },
        false,
        ["encrypt", "decrypt"]
    );

}

async function chiffrerProfil(profil, pin, ancienSel = null) {

    const sel = ancienSel || crypto.getRandomValues(new Uint8Array(16));

    const cle = await creerClePIN(pin, sel);

    const iv = crypto.getRandomValues(new Uint8Array(12));

    const donnees = new TextEncoder().encode(
        JSON.stringify(profil)
    );

    const contenuChiffre = await crypto.subtle.encrypt(
        {
            name: "AES-GCM",
            iv: iv
        },
        cle,
        donnees
    );

    return {
        email: profil.email.toLowerCase(),
        sel: Array.from(sel),
        iv: Array.from(iv),
        contenu: Array.from(new Uint8Array(contenuChiffre)),
        dateMiseAJour: new Date().toISOString()
    };

}

async function dechiffrerProfil(enregistrement, pin) {

    const sel = new Uint8Array(enregistrement.sel);
    const iv = new Uint8Array(enregistrement.iv);
    const contenu = new Uint8Array(enregistrement.contenu);

    const cle = await creerClePIN(pin, sel);

    const donnees = await crypto.subtle.decrypt(
        {
            name: "AES-GCM",
            iv: iv
        },
        cle,
        contenu
    );

    return JSON.parse(
        new TextDecoder().decode(donnees)
    );

}

// =====================================
// REDIRECTION SELON LE ROLE
// =====================================

// =====================================
// REDIRECTION ET TRANSMISSION DU PROFIL
// =====================================

function redirigerSelonRole(profil) {

    // Conserver le profil pour le tableau de bord
    sessionStorage.setItem(
        "snape_profil_actif",
        JSON.stringify(profil)
    );

    if (profil.role === "admin") {
        window.location.href = "admin.html";
        return;
    }

    if (profil.role === "enqueteur") {
        window.location.href = "enqueteur.html";
        return;
    }

    throw new Error("Rôle utilisateur non reconnu.");
}

// =====================================
// VERIFICATION DU PROFIL
// =====================================

function verifierProfil(profil) {

    if (profil.statut !== "actif") {
        throw new Error("Votre compte n'est pas autorisé à accéder à la plateforme.");
    }

    if (!["admin", "enqueteur"].includes(profil.role)) {
        throw new Error("Rôle utilisateur non reconnu.");
    }

}

// =====================================
// CONNEXION AVEC INTERNET
// =====================================

formulaire.addEventListener("submit", async function(e) {

    e.preventDefault();

    if (!navigator.onLine) {
        afficherMessage(
            message,
            "Internet est nécessaire pour cette première authentification.",
            true
        );
        return;
    }

    const email = document.getElementById("email").value.trim().toLowerCase();
    const password = document.getElementById("password").value;

    bouton.disabled = true;
    bouton.textContent = "Connexion en cours...";

    afficherMessage(message, "");

    try {

        const { data: connexion, error: erreurConnexion } =
            await supabase.auth.signInWithPassword({
                email,
                password
            });

        if (erreurConnexion) throw erreurConnexion;

        const { data: profil, error: erreurProfil } = await supabase
            .from("profiles")
            .select("nom_complet, role, statut")
            .eq("id", connexion.user.id)
            .single();

        if (erreurProfil || !profil) {
            await supabase.auth.signOut();
            throw new Error("Impossible de récupérer votre profil.");
        }

        verifierProfil(profil);

        profilEnAttente = {
            id: connexion.user.id,
            email: email,
            nom_complet: profil.nom_complet,
            role: profil.role,
            statut: profil.statut
        };

        emailEnAttente = email;

        const profilLocal = await obtenirProfilLocal(email);

        if (profilLocal) {

            afficherZone("pin");

            document.getElementById("emailHorsLigne").value = email;

            afficherMessage(
                messagePINHorsLigne,
                "Saisissez votre PIN pour actualiser votre profil."
            );

        } else {

            afficherZone("creation");

            afficherMessage(
                messagePIN,
                "Choisissez un code PIN pour votre prochain accès hors connexion."
            );

        }

    } catch (error) {

        console.error("Erreur connexion :", error);

        afficherMessage(message, error.message, true);

    } finally {

        bouton.disabled = false;
        bouton.textContent = "Se connecter";

    }

});

// =====================================
// CREATION DU CODE PIN
// =====================================

formCreationPIN.addEventListener("submit", async function(e) {

    e.preventDefault();

    const pin = document.getElementById("nouveauPIN").value;
    const confirmation = document.getElementById("confirmationPIN").value;

    try {

        if (!profilEnAttente) {
            throw new Error("Aucun profil à enregistrer.");
        }

        if (!/^[0-9]{6}$/.test(pin)) {
            throw new Error("Le code PIN doit contenir exactement 6 chiffres.");
        }

        if (pin !== confirmation) {
            throw new Error("Les deux codes PIN ne correspondent pas.");
        }

        const enregistrement = await chiffrerProfil(
            profilEnAttente,
            pin
        );

        await enregistrerProfilLocal(enregistrement);

        redirigerSelonRole(profilEnAttente);

    } catch (error) {

        console.error("Erreur PIN :", error);

        afficherMessage(messagePIN, error.message, true);

    }

});

// =====================================
// IDENTIFICATION HORS CONNEXION
// =====================================

formPINHorsLigne.addEventListener("submit", async function(e) {

    e.preventDefault();

    const email = document
        .getElementById("emailHorsLigne")
        .value.trim()
        .toLowerCase();

    const pin = document.getElementById("pinHorsLigne").value;

    try {

        const profilLocal = await obtenirProfilLocal(email);

        if (!profilLocal) {
            throw new Error("Aucun profil local trouvé pour cette adresse e-mail.");
        }

        const profil = await dechiffrerProfil(profilLocal, pin);

        // Si une connexion Internet vient de réussir,
        // actualiser le profil local avec les données Supabase.

        if (profilEnAttente && profilEnAttente.email === email) {

            const nouveauProfil = await chiffrerProfil(
                profilEnAttente,
                pin,
                new Uint8Array(profilLocal.sel)
            );

            await enregistrerProfilLocal(nouveauProfil);

            redirigerSelonRole(profilEnAttente);

            return;

        }

        // Accès local sans Internet

        if (navigator.onLine) {

            afficherMessage(
                messagePINHorsLigne,
                "Connexion hors ligne autorisée. Une vérification du compte sera nécessaire au retour d'Internet.",
                false
            );

        }

        redirigerSelonRole(profil);

    } catch (error) {

        console.error("Erreur PIN hors ligne :", error);

        afficherMessage(
            messagePINHorsLigne,
            "Code PIN incorrect ou profil local inaccessible.",
            true
        );

    }

});

// =====================================
// ETAT DE LA CONNEXION INTERNET
// =====================================

function actualiserEtatConnexion() {

    if (!etatConnexion) return;

    if (navigator.onLine) {

        etatConnexion.textContent = "● Connexion Internet disponible";
        etatConnexion.style.color = "#087E78";

    } else {

        etatConnexion.textContent = "● Mode hors connexion";
        etatConnexion.style.color = "#D64545";

        afficherZone("pin");

    }

}

window.addEventListener("online", actualiserEtatConnexion);
window.addEventListener("offline", actualiserEtatConnexion);

// =====================================
// DEMARRAGE
// =====================================

async function demarrer() {

    actualiserEtatConnexion();

    if (!navigator.onLine) {

        afficherZone("pin");

        afficherMessage(
            messagePINHorsLigne,
            "Internet indisponible. Identifiez-vous avec votre PIN."
        );

        return;

    }

    afficherZone("connexion");

}

demarrer();