const InstagramBot = require('./bot');
require('dotenv').config(); // Si tu utilises un .env
const cron = require('node-cron');

async function main() {

  const accounts = process.env.INSTAGRAM_ACCOUNTS.split(',').map(e => {
    const a = e.split(":")
    return {username: a[0], password: a[1]}
  })


  for (const account of accounts) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`🔄 Traitement du compte: ${account.username}`);
    console.log('='.repeat(60));
    
    const bot = new InstagramBot(account.username, account.password);
    
    try {
      await bot.init();
      await bot.login();
      
      // ==========================================
      // CHOISIS TON MODE D'UTILISATION
      // ==========================================
      
      // MODE 1: Suivre des personnes depuis la page explore
      await bot.addExploreFollowers(5);
      
      // MODE 2: Scanner les personnes suivies et mettre à jour la BDD
      // await bot.scanAndUpdateFollowing();
      
      // MODE 3: Nettoyer (unfollow) ceux qui ne suivent pas en retour
      // Le paramètre autoScan=true va automatiquement scanner si besoin
      await bot.cleanupNonFollowers(10, true);
      
    } catch (error) {
      console.error(`❌ Erreur pour ${account.username}:`, error.message);
    } finally {
      await bot.close();
    }
    
    // Pause entre les comptes
    console.log('\n⏳ Pause de 2 minutes avant le prochain compte...');
    await new Promise(resolve => setTimeout(resolve, 120000));
  }
  

}


// S'exécute à 9h et 21h chaque jour
cron.schedule('0 9,17 * * *', () => {
  console.log('Exécution à', new Date());
  main();
});
main();
