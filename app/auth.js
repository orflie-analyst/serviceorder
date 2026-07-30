import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
import { auth, db } from "./firebase-init.js";
import { el } from "./dom.js";

// Auto-cadastro fica restrito a este domínio (reforçado também nas Firestore rules).
export const DOMINIO_PERMITIDO = "orflie.com";

export function login(email, senha) {
  return signInWithEmailAndPassword(auth, email, senha);
}

export function logout() {
  return signOut(auth);
}

// Auto-cadastro: qualquer colaborador com email @orflie.com pode criar a própria conta,
// sempre como solicitante comum (isAdmin false, sem departamentos de prestador) — só um
// admin pode promover depois, via admin.html.
export async function signup(nome, email, senha) {
  if (!email.toLowerCase().endsWith(`@${DOMINIO_PERMITIDO}`)) {
    throw new Error(`Use um email @${DOMINIO_PERMITIDO}.`);
  }
  const cred = await createUserWithEmailAndPassword(auth, email, senha);
  await setDoc(doc(db, "usuarios", cred.user.uid), {
    nome,
    email,
    isAdmin: false,
    departamentosPrestador: [],
    ativo: true,
    criadoEm: serverTimestamp(),
  });
  return cred.user;
}

// Chama callback(user, perfil) quando autenticado; redireciona pra index.html se não estiver.
// perfil é o doc de usuarios/{uid} (nome, isAdmin, departamentosPrestador, ativo).
export function requireAuth(callback) {
  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      window.location.href = "index.html";
      return;
    }
    const snap = await getDoc(doc(db, "usuarios", user.uid));
    if (!snap.exists() || snap.data().ativo === false) {
      await signOut(auth);
      window.location.href = "index.html";
      return;
    }
    callback(user, snap.data());
  });
}

// Redireciona pra painel.html/minhas-os.html se já estiver logado (usado em index.html).
export function redirectIfLoggedIn() {
  onAuthStateChanged(auth, async (user) => {
    if (!user) return;
    const snap = await getDoc(doc(db, "usuarios", user.uid));
    if (snap.exists() && snap.data().ativo !== false) {
      window.location.href = "minhas-os.html";
    }
  });
}

export function renderTopbar(activePage, perfil) {
  const isPrestador = (perfil.departamentosPrestador || []).length > 0;
  const links = [
    { href: "nova-os.html", label: "Nova OS" },
    { href: "minhas-os.html", label: "Minhas OS" },
  ];
  if (isPrestador) links.push({ href: "painel.html", label: "Painel do prestador" });
  if (perfil.isAdmin) links.push({ href: "admin.html", label: "Administração" });

  const nav = el(
    "nav",
    {},
    links.map((l) =>
      el("a", { href: l.href, class: l.href === activePage ? "active" : "" }, l.label)
    )
  );
  nav.appendChild(el("span", { id: "usuario-nome" }, perfil.nome || ""));
  nav.appendChild(
    el("button", { class: "link-btn", type: "button", onclick: () => logout().then(() => (window.location.href = "index.html")) }, "Sair")
  );

  const brand = el("a", { href: "minhas-os.html", class: "brand" }, [
    el("img", { src: "assets/orflie-logo.png", alt: "Orflie" }),
    el("span", {}, "Sistema de Ordem de Serviço"),
  ]);

  const header = el("header", { class: "topbar" }, [brand, nav]);
  document.body.insertBefore(header, document.body.firstChild);
}
