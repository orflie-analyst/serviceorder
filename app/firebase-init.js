import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

// Preenchido após `firebase projects:create` + registro do app web (Firebase Console > Configurações do projeto).
const firebaseConfig = {
  apiKey: "",
  authDomain: "",
  projectId: "",
  storageBucket: "",
  messagingSenderId: "",
  appId: "",
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

export const FIREBASE_API_KEY_PLACEHOLDER = firebaseConfig.apiKey;
