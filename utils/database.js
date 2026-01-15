const fs = require("fs").promises;
const path = require("path");
const config = require("../config");
const console = require("./logs");

class Database {
  constructor(dbPath = "./data/bot_data.json") {
    this.dbPath = dbPath;
    this.data = {
      accounts: {}, // Structure: { username: { followedUsers: {}, unfollowedUsers: {} } }
    };
    this.currentAccount = null;
  }

  async init(accountUsername) {
    console.log("Initialisation de la base : " + accountUsername);
    this.currentAccount = accountUsername;

    try {
      const dir = path.dirname(this.dbPath);
      await fs.mkdir(dir, { recursive: true });

      try {
        const content = await fs.readFile(this.dbPath, "utf8");
        this.data = JSON.parse(content);
      } catch (err) {
        await this.save();
      }

      // Initialiser le compte s'il n'existe pas
      if (!this.data.accounts[accountUsername]) {
        this.data.accounts[accountUsername] = {
          followedUsers: {},
          unfollowedUsers: {},
        };
        await this.save();
      }

      console.log(`📂 Base de données initialisée`);
    } catch (error) {
      console.error("Erreur initialisation DB:", error);
    }
  }

  async save() {
    console.log("Enregistrement de la db");
    await fs.writeFile(this.dbPath, JSON.stringify(this.data, null, 2));
  }

  // Obtenir les données du compte actuel
  getCurrentAccountData() {
    if (!this.currentAccount || !this.data.accounts[this.currentAccount]) {
      throw new Error("Aucun compte actif");
    }
    return this.data.accounts[this.currentAccount];
  }

  // Mettre à jour si un utilisateur suit en retour
  async updateFollowBack(username, followsBack) {
    const accountData = this.getCurrentAccountData();

    accountData.followedUsers[username] = {
      createdAt: (
        accountData.followedUsers[username] || { followsBack: Date.now() }
      ).followsBack,
      followsBack: followsBack,
      lastChecked: Date.now(),
    };

    await this.save();
    console.log(`🔄 @${username} - suit en retour: ${followsBack}`);
  }

  // Obtenir les candidats pour l'unfollow (ne suivent pas en retour + délai passé)
  async getUnfollowCandidates() {
    const accountData = this.getCurrentAccountData();
    const now = Date.now();
    const threshold = config.UNFOLLOW_AFTER_DAYS * 24 * 60 * 60 * 1000;

    return Object.entries(accountData.followedUsers)
      .filter(([_, data]) => {
        return !data.followsBack && now - data.lastChecked > threshold;
      })
      .map(([username]) => username);
  }

  // Retirer un utilisateur de la liste des suivis
  async removeFollowedUser(username) {
    const accountData = this.getCurrentAccountData();
    if (accountData.followedUsers[username]) {
      delete accountData.followedUsers[username];
    }
    accountData.unfollowedUsers[username] = Date.now();
    await this.save();
    console.log(`🗑️ @${username} retiré de la liste des suivis`);
  }

  // Obtenir des statistiques
  getStats() {
    const accountData = this.getCurrentAccountData();
    const total = Object.keys(accountData.followedUsers).length;
    const followingBack = Object.values(accountData.followedUsers).filter(
      (data) => data.followsBack
    ).length;
    const notFollowingBack = total - followingBack;

    return {
      total,
      followingBack,
      notFollowingBack,
      unfollowed: Object.keys(accountData.unfollowedUsers).length,
    };
  }
}

module.exports = Database;
