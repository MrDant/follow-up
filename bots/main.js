const puppeteer = require("puppeteer");
const config = require("../config");
const Database = require("../utils/database");
const fs = require("fs").promises;
const path = require("path");
const console = require("../utils/logs");

class MainBot {
  constructor(username, password) {
    this.username = username;
    this.password = password;
    this.browser = null;
    this.page = null;
    this.db = new Database();
    this.cookiesPath = path.resolve(
      __dirname,
      "..",
      "data",
      `cookies_${username}.json`
    );
  }

  // Attendre (remplace waitForTimeout qui est déprécié)
  async wait(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // Sauvegarder les cookies
  async saveCookies() {
    try {
      const cookies = await this.page.cookies();
      await fs.writeFile(this.cookiesPath, JSON.stringify(cookies, null, 2));
      console.log("🍪 Cookies sauvegardés");
    } catch (error) {
      console.error("❌ Erreur sauvegarde cookies:", error.message);
    }
  }

  // Charger les cookies
  async loadCookies() {
    try {
      const cookiesString = await fs.readFile(this.cookiesPath, "utf8");
      const cookies = JSON.parse(cookiesString);
      await this.page.setCookie(...cookies);
      console.log("🍪 Cookies chargés");
      return true;
    } catch (error) {
      console.log("ℹ️ Aucun cookie trouvé");
      return false;
    }
  }

  // Délai aléatoire
  async randomDelay(baseDelay = config.DELAY_BETWEEN_ACTIONS) {
    const randomExtra = Math.random() * config.DELAY_RANDOM_MAX;
    const totalDelay = baseDelay + randomExtra;
    console.log(`⏳ Attente de ${Math.round(totalDelay / 1000)}s...`);
    await new Promise((resolve) => setTimeout(resolve, totalDelay));
  }

  async initDB() {
    await this.db.init(this.username);
  }
  // Initialisation du navigateur
  async init() {
    console.log("🚀 Initialisation du bot...");
    await this.initDB();

    console.log("===== Lancement de chrome =====");

    this.browser = await puppeteer.launch({
      headless: true,
      ...(process.env.NODE_ENV === "production" && {
        executablePath: process.env.CHROMIUM_PATH,
      }),
      defaultViewport: {
        width: 1440,
        height: 886,
      },
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    this.page = await this.browser.newPage();
    this.page.setDefaultTimeout(60000);

    await this.page.setUserAgent({
      userAgent:
        "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      platform: "Linux x86_64",
    });

    await this.loadCookies();

    console.log("✅ Bot initialisé");
  }

  // Fermeture du bot
  async close() {
    if (this.browser) {
      await this.saveCookies();
      await this.browser.close();
      console.log("👋 Bot fermé");
    }
  }

  // Supprimer les cookies
  async clearCookies() {
    try {
      await fs.unlink(this.cookiesPath);
      console.log("🗑️ Cookies supprimés");
    } catch (error) {
      console.log("ℹ️ Aucun cookie à supprimer");
    }
  }
}

module.exports = MainBot;
