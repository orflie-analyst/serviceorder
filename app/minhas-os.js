import {
  collection,
  getDocs,
  query,
  where,
  orderBy,
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
import { db } from "./firebase-init.js";
import { requireAuth, renderTopbar } from "./auth.js";
import { renderListaOS } from "./lista-os.js";

requireAuth(async (user, perfil) => {
  renderTopbar("minhas-os.html", perfil);

  const lista = document.getElementById("lista-os");
  try {
    const q = query(
      collection(db, "ordens"),
      where("solicitanteId", "==", user.uid),
      orderBy("criadoEm", "desc")
    );
    const snap = await getDocs(q);
    renderListaOS(lista, snap.docs, { vazio: "Você ainda não abriu nenhuma OS." });
  } catch (err) {
    renderListaOS(lista, [], { vazio: "Não foi possível carregar suas OS agora." });
  }
});
