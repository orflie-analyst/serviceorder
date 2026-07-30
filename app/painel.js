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
import { clear, el, formatDate, STATUS_LABEL } from "./dom.js";

requireAuth(async (user, perfil) => {
  renderTopbar("painel.html", perfil);

  const deptIds = perfil.departamentosPrestador || [];
  const lista = document.getElementById("lista-os");
  const tabAtivas = document.getElementById("tab-ativas");
  const tabConcluidas = document.getElementById("tab-concluidas");
  const btnRelatorio = document.getElementById("btn-relatorio");

  if (deptIds.length === 0) {
    clear(lista);
    lista.appendChild(el("li", { class: "aviso-vazio" }, "Você não é prestador de nenhum departamento ainda."));
    tabAtivas.disabled = true;
    tabConcluidas.disabled = true;
    btnRelatorio.disabled = true;
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

  btnRelatorio.addEventListener("click", () => gerarRelatorio(docs, perfil));
});

function gerarRelatorio(docs, perfil) {
  const container = document.getElementById("relatorio-print");
  clear(container);

  const departamentos = [...new Set(docs.map((d) => d.data().departamentoNome))].filter(Boolean).join(", ");

  container.appendChild(el("h1", {}, "Relatório de Ordens de Serviço"));
  container.appendChild(
    el("div", { class: "relatorio-meta" }, [
      el("div", {}, `Departamento(s): ${departamentos || "—"}`),
      el("div", {}, `Prestador: ${perfil.nome || ""}`),
      el("div", {}, `Gerado em: ${formatDate(new Date())}`),
      el("div", {}, `Total de OS: ${docs.length}`),
    ])
  );

  const thead = el("thead", {}, el("tr", {}, [
    el("th", {}, "Título"),
    el("th", {}, "Solicitante"),
    el("th", {}, "Status"),
    el("th", {}, "Responsável"),
    el("th", {}, "Aberta em"),
    el("th", {}, "Concluída em"),
  ]));

  const tbody = el("tbody", {});
  for (const docSnap of docs) {
    const d = docSnap.data();
    tbody.appendChild(
      el("tr", {}, [
        el("td", {}, d.titulo),
        el("td", {}, d.solicitanteNome),
        el("td", {}, STATUS_LABEL[d.status] || d.status),
        el("td", {}, d.prestadorNome || "—"),
        el("td", {}, formatDate(d.criadoEm)),
        el("td", {}, d.concluidoEm ? formatDate(d.concluidoEm) : "—"),
      ])
    );
  }

  container.appendChild(el("table", {}, [thead, tbody]));

  window.print();
}
