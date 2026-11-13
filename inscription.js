// ========================================
// SNAPE AQUA AFRICA
// INSCRIPTION DES ENQUÊTEURS
// SUPABASE AUTHENTICATION
// ========================================

import { createClient } from
"https://esm.sh/@supabase/supabase-js@2";

// 1. CONFIGURATION SUPABASE

const SUPABASE_URL =
"https://zgeyubvutkcwcskoshcd.supabase.co";

const SUPABASE_KEY =
"sb_publishable_wyRn7S0kg6xC1mNSToYfmA_YRos-9bS";

// 2. INITIALISATION

const supabase = createClient(
    SUPABASE_URL,
    SUPABASE_KEY
);

// 3. RÉCUPÉRATION DU FORMULAIRE

const formulaire = document.getElementById("inscriptionForm");

const bouton = document.getElementById("btnInscription");

const message = document.getElementById("message");

// 4. AFFICHER LES MESSAGES

function afficherMessage(texte, type) {
    message.textContent = texte;
    message.className = type;
}

// 5. INSCRIPTION

formulaire.addEventListener("submit", async function(e) {

    e.preventDefault();

    const nomComplet =
        document.getElementById("nom_complet").value.trim();

    const telephone =
        document.getElementById("telephone").value.trim();

    const email =
        document.getElementById("email").value.trim();

    const password =
        document.getElementById("password").value;

    const confirmPassword =
        document.getElementById("confirmPassword").value;

    // Vérification des champs

    if (!nomComplet || !telephone || !email ||
        !password || !confirmPassword) {

        afficherMessage(
            "Veuillez remplir tous les champs.",
            "error"
        );

        return;
    }

    // Vérification du mot de passe

    if (password.length < 8) {

        afficherMessage(
            "Le mot de passe doit contenir au moins 8 caractères.",
            "error"
        );

        return;
    }

    if (password !== confirmPassword) {

        afficherMessage(
            "Les mots de passe ne correspondent pas.",
            "error"
        );

        return;
    }

    // Désactivation du bouton

    bouton.disabled = true;
    bouton.textContent = "Création du compte...";

    afficherMessage("", "");

    try {

        // Création du compte dans Supabase Auth

        const { data, error } = await supabase.auth.signUp({

            email: email,

            password: password,

            options: {

                data: {
                    nom_complet: nomComplet,
                    telephone: telephone
                }

            }

        });

        if (error) {
            throw error;
        }

        // Vérification du résultat

        if (data.user) {

            formulaire.reset();

            if (data.session) {

                afficherMessage(
                    "Inscription réussie ! Votre compte est en attente de validation par l'administrateur.",
                    "success"
                );

            } else {

                afficherMessage(
                    "Compte créé ! Consultez votre boîte e-mail pour confirmer votre adresse. Votre compte sera accessible après validation par l'administrateur.",
                    "success"
                );

            }

        }

    } catch (error) {

        console.error("Erreur inscription :", error);

        afficherMessage(
            "Erreur lors de l'inscription : " + error.message,
            "error"
        );

    } finally {

        bouton.disabled = false;
        bouton.textContent = "Créer mon compte";

    }

});
