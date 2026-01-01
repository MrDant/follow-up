const config = {
    // Limites de sécurité
    MAX_FOLLOWS_PER_HOUR: 10,
    MAX_UNFOLLOWS_PER_HOUR: 10,
    UNFOLLOW_AFTER_DAYS: 10, // Attendre 10 jours avant d'unfollow
    
    // Délais (en millisecondes)
    DELAY_BETWEEN_ACTIONS: 2000, // 5 secondes entre chaque action
    DELAY_RANDOM_MAX: 5000, // +/- 5 secondes aléatoires
    PAGE_LOAD_TIMEOUT: 30000,
    
  };
  
  module.exports = config;