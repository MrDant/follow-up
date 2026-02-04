const InstagramBot = require("./bots/instagram");
const JobUpBot = require("./bots/jobup");
require("dotenv").config();
const cron = require("node-cron");
const console = require("./utils/logs");
const config = require("./config");

async function main() {
  const accounts = process.env.INSTAGRAM_ACCOUNTS.split(",").map((e) => {
    const a = e.split(":");
    return { username: a[0], password: a[1] };
  });

  for (const account of accounts) {
    console.log(`\n${"=".repeat(60)}`);
    console.log(`🔄 Traitement du compte: ${account.username}`);
    console.log("=".repeat(60));

    const bot = new InstagramBot(account.username, account.password);

    try {
      await bot.init();
      await bot.login();

      // ==========================================
      // CHOISIS TON MODE D'UTILISATION
      // ==========================================

      // MODE 1: Suivre des personnes depuis la page explore
      await bot.addExploreFollowers(config.MAX_FOLLOWS_PER_HOUR);

      // MODE 2: Scanner les personnes suivies et mettre à jour la BDD
      // await bot.scanAndUpdateFollowing();

      // MODE 3: Nettoyer (unfollow) ceux qui ne suivent pas en retour
      // Le paramètre autoScan=true va automatiquement scanner si besoin
      await bot.cleanupNonFollowers(config.MAX_UNFOLLOWS_PER_HOUR, true);
    } catch (error) {
      console.error(`❌ Erreur pour ${account.username}:`, error.message);
    } finally {
      await bot.close();
    }
  }
}

async function jobUp() {
  const bot = new JobUpBot();

  await bot.init();
  const jobslink = await bot.getJobs();
  for (const link of jobslink) {
    console.log("save : " + link);
    try {
      await bot.saveJob(link);
    } catch (e) {
      console.log(link + " pas passé");
    }
  }
}

// // S'exécute à 9h et 21h chaque jour
// cron.schedule("0 9,17 * * *", () => {
//   console.log("Exécution à", new Date());
//   main();
// });

// // S'exécute à 6h
// cron.schedule("0 6 * * *", () => {
//   console.log("Exécution de JobUp à", new Date());
//   jobUp().then();
// });

// main();

jobUp().then();
