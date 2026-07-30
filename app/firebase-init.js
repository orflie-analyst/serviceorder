import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyDXZqH1cKOSCC-C-3NPVxo1AZDe5ZydzlU",
  authDomain: "orflie-serviceorder.firebaseapp.com",
  projectId: "orflie-serviceorder",
  storageBucket: "orflie-serviceorder.firebasestorage.app",
  messagingSenderId: "1076051406207",
  appId: "1:1076051406207:web:0fd22e7e7f58129313be4a",
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// Instância nomeada separada, usada só por admin.html para criar novos usuários
// (accounts:signUp) sem substituir a sessão do admin logado no app principal.
export function getAdminCreationApp() {
  const existing = getApps().find((a) => a.name === "admin-creation");
  if (existing) return existing;
  return initializeApp(firebaseConfig, "admin-creation");
}
