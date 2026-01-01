# 🤖 Instagram Bot - Multi-comptes

Bot Instagram automatisé pour gérer plusieurs comptes, suivre des utilisateurs et nettoyer automatiquement ceux qui ne suivent pas en retour.

## ✨ Fonctionnalités

- ✅ **Multi-comptes** : Gérez plusieurs comptes Instagram
- 🔍 **Scan automatique** : Détecte qui vous suit en retour
- 🧹 **Nettoyage intelligent** : Unfollow automatique des non-followers
- 📊 **Statistiques** : Suivi détaillé de vos actions
- 🍪 **Gestion des cookies** : Connexion persistante
- 🎭 **Anti-détection** : Délais aléatoires et comportement humain

## 📦 Installation

```bash
# Cloner le projet
git clone [votre-repo]
cd insta-bot

# Installer les dépendances
npm install

# Installer dotenv pour la sécurité (recommandé)
npm install dotenv
```

## ⚙️ Configuration

### 1. Créer un fichier `.env`

```bash
cp .env.example .env
```

Puis éditer le fichier `.env` :

```
INSTAGRAM_USERNAME=votre_email@gmail.com
INSTAGRAM_PASSWORD=votre_mot_de_passe
```

### 2. Ajuster les paramètres dans `config.js`

```javascript
UNFOLLOW_AFTER_DAYS: 3  // Nombre de jours avant d'unfollow
DELAY_BETWEEN_ACTIONS: 5000  // Délai entre actions (ms)
```

## 🚀 Utilisation

### Mode simple (1 compte)

```bash
npm start
```

### Modes disponibles

#### 1. Suivre des personnes depuis la page explore

```javascript
await bot.addExploreFollowers(20);
```

#### 2. Scanner qui suit en retour

```javascript
await bot.scanAndUpdateFollowing(100);
```

#### 3. Nettoyer (unfollow non-followers)

```javascript
// autoScan=true va scanner automatiquement si besoin
await bot.cleanupNonFollowers(10, true);
```

#### 4. Workflow complet (recommandé)

```javascript
// Suivre des personnes
await bot.addExploreFollowers(20);

// Scanner qui suit en retour
await bot.scanAndUpdateFollowing(100);

// Nettoyer après X jours
await bot.cleanupNonFollowers(10);
```

## 🗂️ Structure de la base de données

La base de données JSON stocke les données par compte :

```json
{
  "accounts": {
    "compte1@gmail.com": {
      "followedUsers": {
        "username1": {
          "followedAt": 1234567890,
          "followsBack": true,
          "lastChecked": 1234567890
        }
      },
      "unfollowedUsers": {
        "username2": 1234567890
      }
    }
  }
}
```

## 📊 Statistiques

Le bot affiche automatiquement :
- ✅ Total de personnes suivies
- 💚 Nombre de followers en retour
- ❌ Nombre de non-followers
- 👋 Total d'unfollows effectués

## ⚠️ Sécurité et limites Instagram

### Limites recommandées

- **Follows** : Max 10-20 par heure
- **Unfollows** : Max 10-20 par heure
- **Délai entre actions** : 5-10 secondes minimum

### Protection

- ✅ Délais aléatoires entre actions
- ✅ User-agent réaliste
- ✅ Anti-détection webdriver
- ✅ Cookies persistants

⚠️ **Attention** : Un usage excessif peut entraîner un bannissement temporaire ou permanent de votre compte Instagram.

## 🔧 Dépannage

### Erreur "waitForTimeout is not a function"
✅ **Corrigé** : Le bot utilise maintenant une méthode `wait()` personnalisée

### Cookies expirés
```javascript
await bot.clearCookies();
```

### Le bot ne trouve pas les boutons
- Instagram change régulièrement son interface
- Vérifier que les sélecteurs sont à jour
- Le bot est en mode `headless: false` pour le débogage

## 📁 Structure des fichiers

```
insta-bot/
├── bot.js           # Logique principale du bot
├── config.js        # Configuration
├── database.js      # Gestion de la BDD
├── main.js          # Point d'entrée
├── .env             # Identifiants (à créer)
├── .env.example     # Exemple de .env
├── data/
│   ├── bot_data.json       # Base de données
│   └── cookies_*.json      # Cookies par compte
└── package.json
```

## 🤝 Multi-comptes

Pour gérer plusieurs comptes, décommenter la fonction dans `main.js` :

```javascript
async function multiAccountMode() {
  const accounts = [
    { username: 'compte1@gmail.com', password: 'password1' },
    { username: 'compte2@gmail.com', password: 'password2' }
  ];
  
  for (const account of accounts) {
    const bot = new InstagramBot(account.username, account.password);
    // ... traitement
  }
}
```

## 📝 TODO

- [ ] Support des proxy
- [ ] Interface graphique
- [ ] Planification automatique (cron)
- [ ] Statistiques avancées
- [ ] Export des données

## ⚖️ Disclaimer

Ce bot est fourni à des fins éducatives uniquement. L'utilisation de bots pour automatiser des actions sur Instagram peut violer les conditions d'utilisation de la plateforme. Utilisez-le à vos propres risques.

## 📄 Licence

ISC