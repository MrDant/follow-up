const config = require("../config");
const MainBot = require("./main");
const console = require("../utils/logs");

class InstagramBot extends MainBot {
  // Vérifier si on est connecté
  async isLoggedIn() {
    try {
      await this.wait(3000);

      const currentUrl = this.page.url();
      if (currentUrl.includes("/accounts/login")) {
        console.log("🔍 Sur la page de login -> Non connecté");
        return false;
      }

      const isConnected = await this.page.evaluate(() => {
        const indicators = [
          document
            .querySelector('a[href*="/"][href$="/"]')
            ?.href?.includes("/"),
          document.querySelector('svg[aria-label="New post"]') !== null ||
            document.querySelector('svg[aria-label="Nouvelle publication"]') !==
              null,
          document.querySelector("nav") !== null,
          document.querySelector('a[href="/"]') !== null,
        ];

        const validIndicators = indicators.filter(Boolean).length;
        return validIndicators >= 2;
      });

      console.log(
        isConnected
          ? "✅ Détecté comme connecté"
          : "❌ Détecté comme non connecté"
      );
      return isConnected;
    } catch (error) {
      console.error("⚠️ Erreur vérification connexion:", error.message);
      return false;
    }
  }

  // Connexion à Instagram
  async login() {
    console.log("\n🔐 Démarrage du processus de connexion...");

    try {
      await this.page.goto("https://www.instagram.com/", {
        waitUntil: "networkidle2",
      });

      const isConnected = await this.isLoggedIn();
      if (isConnected) {
        console.log("✅ Connecté via cookies sauvegardés");
        await this.handlePopups();
        return true;
      } else {
        console.log(
          "⚠️ Cookies expirés ou invalides, nouvelle connexion nécessaire"
        );
        await this.clearCookies();
      }

      console.log("🔑 redirection sur la page de connexion");
      await this.page.goto("https://www.instagram.com/accounts/login/", {
        waitUntil: "networkidle2",
      });

      await this.handlePopups();
      await this.randomDelay();
      const usernameSelector = 'input[name="username"], input[name="email"]';
      const usernameInput = await this.page.waitForSelector(usernameSelector);

      console.log("📝 Saisie des identifiants...");
      await usernameInput.focus();
      await usernameInput.type(this.username, {
        delay: 100,
      });
      await this.page.focus('input[type="password"]');
      await this.page.type('input[type="password"]', this.password, {
        delay: 100,
      });

      console.log("🔘 Clic sur le bouton de connexion...");

      await this.page.click(
        'button[type="submit"], div[role="button"]:not([aria-label="Show password"])'
      );

      try {
        await this.page.waitForNavigation();
        console.log(this.page.url());
      } catch (e) {
        console.log("⏳ pas de redirection donc retour à l'accueil");
        await this.page.goto("https://www.instagram.com/", {
          waitUntil: "networkidle2",
        });
      }

      const loginSuccess = await this.isLoggedIn();

      if (!loginSuccess) {
        const errorMessage = await this.page.evaluate(() => {
          const errorDiv = document.querySelector("#slfErrorAlert");
          return errorDiv ? errorDiv.textContent : null;
        });

        if (errorMessage) {
          throw new Error(`Échec de connexion: ${errorMessage}`);
        } else {
          throw new Error("Échec de connexion: raison inconnue");
        }
      }

      console.log("✅ Connexion réussie!");

      await this.saveCookies();
      await this.handlePopups();
      return true;
    } catch (error) {
      console.error("❌ Erreur de connexion:", error.message);
      await console.snapshot("error-login", this.page);
      throw error;
    }
  }

  // Gérer les pop-ups
  async handlePopups() {
    try {
      console.log("🔍 Gestion des popups...");
      await this.randomDelay(2000);

      const dismissTexts = [
        "Not Now",
        "Pas maintenant",
        "Later",
        "Plus tard",
        "Ok",
        "Decline",
        "Refuser",
        "Essential",
      ];

      const buttons = await this.page.$$("button");

      for (const button of buttons) {
        try {
          const text = await this.page.evaluate((el) => el.textContent, button);
          if (dismissTexts.some((dismissText) => text.includes(dismissText))) {
            await button.click();
            console.log(`✅ Popup fermée: "${text}"`);
            await this.randomDelay(2000);
          }
        } catch (e) {}
      }

      console.log("✅ Popups gérées");
    } catch (error) {
      console.log("ℹ️ Aucune popup à gérer ou erreur:", error.message);
    }
  }

  async openFollowing() {
    const followingLink = await this.page.waitForSelector(
      'a[href*="/following/"]'
    );
    if (!followingLink) {
      throw new Error('Impossible de trouver le lien "following"');
    }

    await followingLink.click();

    await this.page.waitForSelector('div[role="dialog"]', { timeout: 10000 });
  }

  // Récupérer la liste des personnes suivies par le compte
  async getMyFollowing() {
    console.log(`📋 Récupération de la liste des personnes suivies...`);

    try {
      // Aller sur son propre profil
      await this.page.goto(`https://www.instagram.com/${this.username}/`, {
        waitUntil: "networkidle2",
      });

      // Cliquer sur "following" / "abonnements"
      await this.openFollowing();
      console.log("📜 Scroll pour charger tous les utilisateurs...");

      let scrollableDiv = null;
      do {
        try {
          scrollableDiv = await this.page.waitForSelector(
            'div[role="dialog"] div[style*="overflow"] + div',
            { timeout: 10000 }
          );
        } catch (e) {
          scrollableDiv = null;
        }
        if (scrollableDiv) {
          await scrollableDiv.scrollIntoView();
        }
        await this.wait(3000);
      } while (scrollableDiv);

      const profils = await this.page.$$eval(
        'div[role="dialog"] div[style*="overflow"] a[role="link"]',
        (links) => {
          const profils = links.map((e) => e.getAttribute("href"));
          return [
            ...new Set([...profils].map((item) => item.replaceAll(/\//g, ""))),
          ];
        }
      );

      // Fermer la modal
      const closeButton = await this.page.$(
        'svg[aria-label="Close"], svg[aria-label="Fermer"]'
      );
      if (closeButton) {
        await closeButton.click();
        await this.randomDelay(1000);
      }

      console.log(`✅ ${profils.length} utilisateurs récupérés`);
      return profils;
    } catch (error) {
      console.error("❌ Erreur récupération following:", error.message);
      return [];
    }
  }

  // Vérifier si un utilisateur suit en retour
  async checkIfFollowsBack(username) {
    try {
      await this.page.goto(`https://www.instagram.com/${username}/`, {
        waitUntil: "networkidle2",
      });

      let followBack = false;
      await this.openFollowing();
      try {
        await this.page.waitForSelector(
          'div[role="dialog"] a[href*="' + this.db.currentAccount + '"]'
        );
        followBack = true;
      } catch (e) {
        console.log("🙈 tu n'es pas dans ses followers");
      }
      return followBack;
    } catch (error) {
      await console.snapshot("checkIfFollowsBack", this.page);
      console.error(`❌ Erreur vérification @${username}:`, error.message);
      return false;
    }
  }

  // Scanner et mettre à jour la BDD avec les followers actuels
  async scanAndUpdateFollowing() {
    console.log(
      "\n🔍 Scan des personnes suivies et vérification du follow back..."
    );

    // Récupérer la liste des personnes qu'on suit
    const followingUsers = await this.getMyFollowing();

    if (followingUsers.length === 0) {
      console.log("⚠️ Aucun utilisateur trouvé");
      return;
    }

    console.log(
      `\n🔄 Vérification de ${followingUsers.length} utilisateurs...`
    );

    let checked = 0;
    const data = this.db.getCurrentAccountData().followedUsers;
    for (const username of followingUsers) {
      checked++;
      if (
        data[username] &&
        new Date(data[username].lastChecked) > Date.now() - 24 * 60 * 60 * 1000
      ) {
        console.log(
          `\n[${checked}/${followingUsers.length}] @${username} déjà vérifié...`
        );
        continue;
      }
      console.log(
        `\n[${checked}/${followingUsers.length}] Vérification de @${username}...`
      );

      const followsBack = await this.checkIfFollowsBack(username);

      // Ajouter ou mettre à jour dans la BDD
      await this.db.updateFollowBack(username, followsBack);
      await this.randomDelay();
    }

    // Afficher les statistiques
    const stats = this.db.getStats();
    console.log("\n📊 Statistiques:");
    console.log(`   Total suivis: ${stats.total}`);
    console.log(`   Suivent en retour: ${stats.followingBack}`);
    console.log(`   Ne suivent PAS en retour: ${stats.notFollowingBack}`);
    console.log(`   Total unfollowed: ${stats.unfollowed}`);

    return stats;
  }

  // Suivre des utilisateurs depuis la page explore
  async addExploreFollowers(limit = 50) {
    console.log(`📋 Récupération de ${limit} suggestions...`);

    try {
      console.log("==> https://www.instagram.com/explore/people/");
      await this.page.goto(`https://www.instagram.com/explore/people/`, {
        waitUntil: "networkidle2",
      });

      await this.randomDelay(3000);

      await this.page.waitForSelector(
        "button::-p-text(Follow), button::-p-text(Suivre)"
      );

      const followButtons = await this.page.$$("button");
      let followCount = 0;

      for (const button of followButtons) {
        if (followCount >= limit) break;

        try {
          const text = await this.page.evaluate((el) => el.textContent, button);
          if (text.includes("Follow") || text.includes("Suivre")) {
            await button.click();
            followCount++;
            console.log(`✅ Follow ${followCount}/${limit}`);
            await this.randomDelay();
          }
        } catch (e) {
          console.log("⚠️ Erreur sur un bouton, passage au suivant");
        }
      }

      console.log(`✅ ${followCount} personnes suivies`);
    } catch (error) {
      await console.snapshot("error-follow-people", this.page);
      console.error("❌ Erreur récupération followers:", error.message);
    }
  }

  // Ne plus suivre un utilisateur
  async unfollowUser(username) {
    try {
      if (await this.checkIfFollowsBack(username)) {
        return;
      }
      console.log(`👋 Tentative d'unfollow: @${username}`);

      await this.page.goto(`https://www.instagram.com/${username}/`, {
        waitUntil: "networkidle2",
      });

      try {
        const following = await this.page.waitForSelector(
          "button ::-p-text(Following)"
        );
        following.click();

        await this.page.waitForSelector(
          'div[role="dialog"] div[role="button"] + div:last-child'
        );
        await this.page.evaluate(() => {
          document
            .querySelector(
              'div[role="dialog"] div[role="button"] + div:last-child'
            )
            .click();
        });
      } catch (e) {
        await this.page.waitForSelector("button ::-p-text(Follow)");
      }
      await this.db.removeFollowedUser(username);
      await this.randomDelay();

      console.log(`✅ @${username} unfollow avec succès`);
      return true;
    } catch (error) {
      console.error(`❌ Erreur unfollow @${username}:`, error.message);
      return false;
    }
  }

  // Fonction principale: Unfollow des comptes qui ne suivent pas (VERSION AMÉLIORÉE)
  async cleanupNonFollowers(count = 10, autoScan = true) {
    console.log(`\n🧹 Démarrage du nettoyage`);

    let candidates = await this.db.getUnfollowCandidates();
    console.log(`📊 ${candidates.length} candidats pour unfollow`);

    // Si aucun candidat et autoScan activé, scanner d'abord
    if (candidates.length === 0 && autoScan) {
      console.log("\n⚠️ Aucun candidat trouvé, scan automatique...");
      await this.scanAndUpdateFollowing(); // Scanner jusqu'à 200 personnes

      // Récupérer à nouveau les candidats
      candidates = await this.db.getUnfollowCandidates();
      console.log(candidates);
      console.log(`📊 ${candidates.length} nouveaux candidats trouvés`);

      if (candidates.length === 0) {
        console.log("✅ Personne à unfollow !");
        return 0;
      }
    }

    // Unfollow
    for (const username of candidates.slice(0, count)) {
      console.log("👤 Suppression de @" + username);
      await this.unfollowUser(username);
    }

    console.log(`✅ Nettoyage terminé`);

    // Afficher les stats finales
    const stats = this.db.getStats();
    console.log("\n📊 Statistiques finales:");
    console.log(`   Suivis restants: ${stats.total}`);
    console.log(`   Suivent en retour: ${stats.followingBack}`);
    console.log(`   Ne suivent PAS en retour: ${stats.notFollowingBack}`);
  }
}

module.exports = InstagramBot;
