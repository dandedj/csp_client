import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";

const firebaseConfig = {
    apiKey: "AIzaSyAzK_Eqk61KAus0wIQewTDElo5zoWVW7mI",
    authDomain: "csp-plaques.firebaseapp.com",
    projectId: "csp-plaques",
    storageBucket: "csp-plaques.appspot.com",
    messagingSenderId: "316954750234",
    appId: "1:316954750234:web:a0bfb2e600f597a6bc90a3",
    measurementId: "G-NZY0R89RSS"
};

const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);