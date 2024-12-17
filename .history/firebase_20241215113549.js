import { initializeApp } from "firebase/app";
// import { getAnalytics } from "firebase/analytics";
import { initializeFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyD-HTOSoqHQMIk9P09HXHJcLpV_g2OnWQ0",
  authDomain: "vidcall-e32e6.firebaseapp.com",  // Firebase Auth Domain
  projectId: "vidcall-e32e6",  // Firebase Project ID
  storageBucket: "vidcall-e32e6.appspot.com",  // Firebase Storage Bucket
  messagingSenderId: "564182913475",  // Messaging Sender ID
  appId: "1:564182913475:android:8253788def80879fb36d76",  // Mobile App ID (use app ID for Android app here)
  measurementId: "",  // Leave empty or remove if you are not using Analytics
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
// const analytics = getAnalytics(app);

export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
});
