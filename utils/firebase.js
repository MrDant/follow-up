// Import the functions you need from the SDKs you need
const { initializeApp } = require("firebase/app");
const {
  getFirestore,
  collection,
  doc,
  setDoc,
  getDoc,
} = require("firebase/firestore/lite");
const firestore = require("firebase/firestore");
const console = require("./logs");
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional

class Firebase {
  constructor() {
    const firebaseConfig = {
      apiKey: process.env.FIREBASE_PRIVATE_KEY,
      authDomain: "jobup-a2e67.firebaseapp.com",
      projectId: process.env.FIREBASE_PROJECT_ID,
      storageBucket: "jobup-a2e67.firebasestorage.app",
      messagingSenderId: "652621519140",
      appId: "1:652621519140:web:5e5d4ca2b298006f5e7bb1",
      measurementId: "G-CVB6HRJ9N7",
    };

    // Initialize Firebase
    this.app = initializeApp(firebaseConfig);
    this.db = getFirestore(this.app);
  }

  async addJob(job) {
    const docRef = doc(this.db, "job", job.id);
    await setDoc(docRef, job, { merge: true });
  }
  async getJob(id) {
    const docRef = doc(this.db, "job", id);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return docSnap.data();
    } else {
      return null;
    }
  }

  async save() {
    await batch.commit();
  }

  // Obtenir des statistiques
  getStats() {
    return getAnalytics(this.app);
  }
}

module.exports = Firebase;
