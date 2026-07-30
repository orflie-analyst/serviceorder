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
import { clear, el } from "./dom.js";

requireAuth(async (user, perfil) => {
  renderTopbar("painel.html", perfil);

  const deptIds = perfil.departamentosPrestador || [];
  const lista = document.getElementById("lista-os");
  const tabAtivas = document.getElementById("tab-ativas");
  const tabConcluidas = document.getElementById("tab-concluidas");

  if (deptIds.length === 0) {
    clear(lista);
    lista.appendChild(el("li", { class: "aviso-vazio" }, "Você não é prestador de nenhum departamento ainda."));
    tabAtivas.disabled = true;
    tabConcluidas.disabled = true;
    return;
  }

  let docs = [];
  try {
    // Firestore limita "in" a 10 valores — suficiente pro número de departamentos previsto.
    const q = query(
      collection(db, "ordens"),
      where("departamentoId", "in", deptIds.slice(0, 10)),
      orderBy("criadoEm", "desc")
    );
    const snap = await getDocs(q);
    docs = snap.docs;
  } catch (err) {
    renderListaOS(lista, [], { vazio: "Não foi possível carregar a fila agora." });
    return;
  }

  function mostrar(aba) {
    tabAtivas.classList.toggle("active", aba === "ativas");
    tabConcluidas.classList.toggle("active", aba === "concluidas");
    const filtrados = docs.filter((d) =>
      aba === "ativas" ? d.data().status !== "concluida" : d.data().status === "concluida"
    );
    renderListaOS(lista, filtrados, {
      vazio: aba === "ativas" ? "Nenhuma OS ativa no momento." : "Nenhuma OS concluída ainda.",
      subtitulo: (d) => d.solicitanteNome,
    });
  }

  tabAtivas.addEventListener("click", () => mostrar("ativas"));
  tabConcluidas.addEventListener("click", () => mostrar("concluidas"));
  mostrar("ativas");
});
