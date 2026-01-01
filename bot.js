const puppeteer = require('puppeteer');
const config = require('./config');
const Database = require('./database');
const fs = require('fs').promises;
const path = require('path');

class InstagramBot {
  constructor(username, password) {
    this.username = username;
    this.password = password;
    this.browser = null;
    this.page = null;
    this.db = new Database();
    this.cookiesPath = path.join(__dirname, 'data', `cookies_${username}.json`);
  }

  // Attendre (remplace waitForTimeout qui est déprécié)
  async wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Sauvegarder les cookies
  async saveCookies() {
    try {
      const cookies = await this.page.cookies();
      await fs.writeFile(this.cookiesPath, JSON.stringify(cookies, null, 2));
      console.log('🍪 Cookies sauvegardés');
    } catch (error) {
      console.error('❌ Erreur sauvegarde cookies:', error.message);
    }
  }

  // Charger les cookies
  async loadCookies() {
    try {
      const cookiesString = await fs.readFile(this.cookiesPath, 'utf8');
      const cookies = JSON.parse(cookiesString);
      await this.page.setCookie(...cookies);
      console.log('🍪 Cookies chargés');
      return true;
    } catch (error) {
      console.log('ℹ️ Aucun cookie trouvé');
      return false;
    }
  }

  // Vérifier si on est connecté
  async isLoggedIn() {
    try {
      await this.wait(3000);
      
      const currentUrl = this.page.url();
      if (currentUrl.includes('/accounts/login')) {
        console.log('🔍 Sur la page de login -> Non connecté');
        return false;
      }
      
      const isConnected = await this.page.evaluate(() => {
        const indicators = [
          document.querySelector('a[href*="/"][href$="/"]')?.href?.includes('/'),
          document.querySelector('svg[aria-label="New post"]') !== null ||
          document.querySelector('svg[aria-label="Nouvelle publication"]') !== null,
          document.querySelector('nav') !== null,
          document.querySelector('a[href="/"]') !== null
        ];
        
        const validIndicators = indicators.filter(Boolean).length;
        return validIndicators >= 2;
      });
      
      console.log(isConnected ? '✅ Détecté comme connecté' : '❌ Détecté comme non connecté');
      return isConnected;
      
    } catch (error) {
      console.error('⚠️ Erreur vérification connexion:', error.message);
      return false;
    }
  }

  // Délai aléatoire
  async randomDelay(baseDelay = config.DELAY_BETWEEN_ACTIONS) {
    const randomExtra = Math.random() * config.DELAY_RANDOM_MAX;
    const totalDelay = baseDelay + randomExtra;
    console.log(`⏳ Attente de ${Math.round(totalDelay / 1000)}s...`);
    await new Promise(resolve => setTimeout(resolve, totalDelay));
  }

  // Initialisation du navigateur
  async init() {
    console.log('🚀 Initialisation du bot...');
    await this.db.init(this.username);
    
    this.browser = await puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox'
      ]
    });
    
    this.page = await this.browser.newPage();
    
    await this.page.setViewport({ width: 1366, height: 768 });
    await this.page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    
    await this.page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, 'webdriver', {
        get: () => false,
      });
    });
    
    console.log('✅ Bot initialisé');
  }

  // Connexion à Instagram
  async login() {
    console.log('\n🔐 Démarrage du processus de connexion...');
    
    try {
      const cookiesLoaded = await this.loadCookies();
      
      if (cookiesLoaded) {
        console.log('🔍 Vérification des cookies existants...');
        
        await this.page.goto('https://www.instagram.com/', {
          waitUntil: 'networkidle2',
          timeout: config.PAGE_LOAD_TIMEOUT
        });
        
        const isConnected = await this.isLoggedIn();
        
        if (isConnected) {
          console.log('✅ Connecté via cookies sauvegardés');
          await this.handlePopups();
          return true;
        } else {
          console.log('⚠️ Cookies expirés ou invalides, nouvelle connexion nécessaire');
          await this.clearCookies();
        }
      }
      
      console.log('🔑 Connexion avec identifiants...');
      
      await this.page.goto('https://www.instagram.com/accounts/login/', {
        waitUntil: 'networkidle2',
        timeout: config.PAGE_LOAD_TIMEOUT
      });
      
      await this.page.waitForSelector('input[name="username"]', { timeout: 10000 });
      await this.randomDelay(2000);
      
      try {
        const cookieButtons = await this.page.$$('button');
        for (const button of cookieButtons) {
          const text = await this.page.evaluate(el => el.textContent, button);
          if (text.includes('Decline') || text.includes('Refuser') || text.includes('Essential')) {
            await button.click();
            await this.randomDelay(1000);
            break;
          }
        }
      } catch (e) {}
      
      console.log('📝 Saisie des identifiants...');
      await this.page.click('input[name="username"]');
      await this.page.type('input[name="username"]', this.username, { delay: 100 });
      await this.randomDelay(1000);
      
      await this.page.click('input[name="password"]');
      await this.page.type('input[name="password"]', this.password, { delay: 100 });
      await this.randomDelay(1500);
      
      console.log('🔘 Clic sur le bouton de connexion...');
      await this.page.click('button[type="submit"]');
      
      try {
        await this.page.waitForNavigation({ 
          waitUntil: 'networkidle2',
          timeout: 15000 
        });
      } catch (e) {
        console.log('⏳ Attente de la redirection...');
        await this.randomDelay(5000);
      }
      
      const loginSuccess = await this.isLoggedIn();
      
      if (!loginSuccess) {
        const errorMessage = await this.page.evaluate(() => {
          const errorDiv = document.querySelector('#slfErrorAlert');
          return errorDiv ? errorDiv.textContent : null;
        });
        
        if (errorMessage) {
          throw new Error(`Échec de connexion: ${errorMessage}`);
        } else {
          throw new Error('Échec de connexion: raison inconnue');
        }
      }
      
      console.log('✅ Connexion réussie!');
      
      await this.saveCookies();
      await this.randomDelay(3000);
      await this.handlePopups();
      
      return true;
      
    } catch (error) {
      console.error('❌ Erreur de connexion:', error.message);
      
      try {
        await this.page.screenshot({ path: 'error-login.png' });
        console.log('📸 Screenshot sauvegardé: error-login.png');
      } catch (e) {}
      
      throw error;
    }
  }

  // Gérer les pop-ups
  async handlePopups() {
    try {
      console.log('🔍 Gestion des popups...');
      await this.randomDelay(2000);
      
      const dismissTexts = [
        'Not Now',
        'Pas maintenant',
        'Later',
        'Plus tard',
        'Ok',
        'OK'
      ];
      
      const buttons = await this.page.$$('button');
      
      for (const button of buttons) {
        try {
          const text = await this.page.evaluate(el => el.textContent, button);
          if (dismissTexts.some(dismissText => text.includes(dismissText))) {
            await button.click();
            console.log(`✅ Popup fermée: "${text}"`);
            await this.randomDelay(2000);
          }
        } catch (e) {}
      }
      
      console.log('✅ Popups gérées');
      
    } catch (error) {
      console.log('ℹ️ Aucune popup à gérer ou erreur:', error.message);
    }
  }

  async openFollowing() {
    const followingLink = await this.page.$('a[href*="/following/"]');
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
        waitUntil: 'networkidle2',
        timeout: config.PAGE_LOAD_TIMEOUT
      });
      
      // Cliquer sur "following" / "abonnements"
      await this.openFollowing()
      console.log('📜 Scroll pour charger tous les utilisateurs...');
      
      let scrollableDiv = null
      do {
        try {
          scrollableDiv = await this.page.waitForSelector('div[role="dialog"] div[style*="overflow"] + div', { timeout: 10000 });
        } catch (e) {
          scrollableDiv = null
        }
        if(scrollableDiv) {
          await scrollableDiv.scrollIntoView()
        }
        await this.wait(3000)
      } while(scrollableDiv)
     
      const profils = await this.page.$$eval('div[role="dialog"] div[style*="overflow"] a[role="link"]', links => { 
        const profils = links.map(e => e.getAttribute('href'))
        return [...new Set([...profils].map(item => item.replaceAll(/\//g, '')))]
      })
      
      // Fermer la modal
      const closeButton = await this.page.$('svg[aria-label="Close"], svg[aria-label="Fermer"]');
      if (closeButton) {
        await closeButton.click();
        await this.randomDelay(1000);
      }
      
      console.log(`✅ ${profils.length} utilisateurs récupérés`);
      return profils;
      
    } catch (error) {
      console.error('❌ Erreur récupération following:', error.message);
      return [];
    }
  }

  // Vérifier si un utilisateur suit en retour
  async checkIfFollowsBack(username) {
    try {
      await this.page.goto(`https://www.instagram.com/${username}/`, {
        waitUntil: 'networkidle2',
        timeout: config.PAGE_LOAD_TIMEOUT
      });
      
      await this.openFollowing()
      let followBack = false
      try {
        await this.page.waitForSelector('div[role="dialog"] a[href*="' + this.db.currentAccount + '"]', {timeout:3000})
        followBack = true
      } catch(e) {}
      return followBack;
      
    } catch (error) {
      console.error(`❌ Erreur vérification @${username}:`, error.message);
      return false;
    }
  }

  // Scanner et mettre à jour la BDD avec les followers actuels
  async scanAndUpdateFollowing() {
    console.log('\n🔍 Scan des personnes suivies et vérification du follow back...');
    
    // Récupérer la liste des personnes qu'on suit
    const followingUsers = await this.getMyFollowing();
    
    if (followingUsers.length === 0) {
      console.log('⚠️ Aucun utilisateur trouvé');
      return;
    }
    
    console.log(`\n🔄 Vérification de ${followingUsers.length} utilisateurs...`);
    
    let checked = 0;
    const data = this.db.getCurrentAccountData().followedUsers;
    for (const username of followingUsers) {
      checked++;
      if(data[username] && new Date(data[username].lastChecked) > Date.now() - 24 * 60 * 60 * 1000) {
        console.log(`\n[${checked}/${followingUsers.length}] @${username} déjà vérifié...`);
        continue
      }
      console.log(`\n[${checked}/${followingUsers.length}] Vérification de @${username}...`);

      
      const followsBack = await this.checkIfFollowsBack(username);
      
      // Ajouter ou mettre à jour dans la BDD
      await this.db.updateFollowBack(username, followsBack);
      await this.randomDelay();
    }
    
    // Afficher les statistiques
    const stats = this.db.getStats();
    console.log('\n📊 Statistiques:');
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
      await this.page.goto(`https://www.instagram.com/explore/people/`, {
        waitUntil: 'networkidle2'
      });
      
      await this.randomDelay(3000);
      
      const followButtons = await this.page.$$('button');
      let followCount = 0;
      
      for (const button of followButtons) {
        if (followCount >= limit) break;
        
        try {
          const text = await this.page.evaluate(el => el.textContent, button);
          if (text.includes('Follow') || text.includes('Suivre')) {
            await button.click();
            followCount++;
            console.log(`✅ Follow ${followCount}/${limit}`);
            await this.randomDelay();
          }
        } catch (e) {
          console.log('⚠️ Erreur sur un bouton, passage au suivant');
        }
      }
      
      console.log(`✅ ${followCount} personnes suivies`);
      
    } catch (error) {
      console.error('❌ Erreur récupération followers:', error.message);
    }
  }

  // Ne plus suivre un utilisateur
  async unfollowUser(username) {
    try {
      console.log(`👋 Tentative d'unfollow: @${username}`);
      
      await this.page.goto(`https://www.instagram.com/${username}/`, {
        waitUntil: 'networkidle2'
      });
      
      const following = await this.page.waitForSelector('button ::-p-text(Following)')
      following.click()

      await this.page.waitForSelector('div[role="dialog"] div[role="button"] + div:last-child')
      await this.page.evaluate(() => {
        document.querySelector('div[role="dialog"] div[role="button"] + div:last-child').click()
      })
      await this.db.removeFollowedUser()
      await this.randomDelay()

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
      console.log('\n⚠️ Aucun candidat trouvé, scan automatique...');
      await this.scanAndUpdateFollowing(); // Scanner jusqu'à 200 personnes
      
      // Récupérer à nouveau les candidats
      candidates = await this.db.getUnfollowCandidates();
      console.log(candidates)
      console.log(`📊 ${candidates.length} nouveaux candidats trouvés`);
      
      if (candidates.length === 0) {
        console.log('✅ Personne à unfollow !');
        return 0;
      }
    }
    
    // Unfollow
    for (const username of candidates.slice(0, count)) {
      await this.unfollowUser(username);
    }
    
    console.log(`✅ Nettoyage terminé`);
    
    // Afficher les stats finales
    const stats = this.db.getStats();
    console.log('\n📊 Statistiques finales:');
    console.log(`   Suivis restants: ${stats.total}`);
    console.log(`   Suivent en retour: ${stats.followingBack}`);
    console.log(`   Ne suivent PAS en retour: ${stats.notFollowingBack}`);
    
  }

  // Fermeture du bot
  async close() {
    if (this.browser) {
      await this.saveCookies();
      await this.browser.close();
      console.log('👋 Bot fermé');
    }
  }
  
  // Supprimer les cookies
  async clearCookies() {
    try {
      await fs.unlink(this.cookiesPath);
      console.log('🗑️ Cookies supprimés');
    } catch (error) {
      console.log('ℹ️ Aucun cookie à supprimer');
    }
  }
}

module.exports = InstagramBot;
