import {
  doc,
  getDoc,
  updateDoc,
  deleteDoc,
  collection,
  addDoc,
  getDocs,
  query,
  orderBy,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
import { db } from "./firebase-init.js";
import { requireAuth, renderTopbar } from "./auth.js";
import { clear, el, formatDate, STATUS_LABEL } from "./dom.js";

const params = new URLSearchParams(window.location.search);
const osId = params.get("id");

requireAuth(async (user, perfil) => {
  renderTopbar("", perfil);

  if (!osId) {
    document.getElementById("detalhe-os").textContent = "OS não informada.";
    return;
  }

  await carregar(user, perfil);
});

async function carregar(user, perfil) {
  const ref = doc(db, "ordens", osId);
  const snap = await getDoc(ref);
  const detalheEl = document.getElementById("detalhe-os");

  if (!snap.exists()) {
    clear(detalheEl);
    detalheEl.appendChild(el("p", { class: "aviso-vazio" }, "OS não encontrada ou sem permissão de acesso."));
    return;
  }

  const d = snap.data();
  const souSolicitante = d.solicitanteId === user.uid;
  const souPrestador = perfil.isAdmin || (perfil.departamentosPrestador || []).includes(d.departamentoId);

  if (!souSolicitante && !souPrestador) {
    clear(detalheEl);
    detalheEl.appendChild(el("p", { class: "aviso-vazio" }, "Você não tem acesso a esta OS."));
    return;
  }

  renderDetalhe(detalheEl, d);
  if (perfil.isAdmin) renderExcluir(detalheEl, ref);
  await renderTimeline();

  const podeInteragir = d.status !== "concluida";
  const cardNota = document.getElementById("card-nova-nota");
  const cardConcluida = document.getElementById("card-concluida-aviso");

  if (!podeInteragir) {
    cardNota.classList.add("hidden");
    cardConcluida.classList.remove("hidden");
    return;
  }
  cardConcluida.classList.add("hidden");
  cardNota.classList.remove("hidden");
  configurarFormNota(ref, d, user, perfil, souPrestador);
}

function renderDetalhe(container, d) {
  clear(container);
  container.appendChild(
    el("div", { style: "display:flex; justify-content:space-between; align-items:flex-start; gap:1rem;" }, [
      el("h1", {}, d.titulo),
      el("span", { class: `badge status-${d.status}` }, STATUS_LABEL[d.status] || d.status),
    ])
  );
  container.appendChild(el("p", {}, d.descricao));
  const metaLinhas = [
    `Departamento: ${d.departamentoNome}`,
    `Solicitante: ${d.solicitanteNome}`,
    `Aberta em: ${formatDate(d.criadoEm)}`,
  ];
  if (d.prestadorNome) metaLinhas.push(`Responsável: ${d.prestadorNome}`);
  if (d.concluidoEm) metaLinhas.push(`Concluída em: ${formatDate(d.concluidoEm)}`);
  for (const linha of metaLinhas) {
    container.appendChild(el("div", { class: "meta" }, linha));
  }
}

function renderExcluir(container, ref) {
  const btn = el(
    "button",
    {
      class: "btn danger",
      type: "button",
      style: "margin-top: 0.5rem;",
      onclick: async () => {
        if (!window.confirm("Excluir esta OS definitivamente? Essa ação não pode ser desfeita.")) return;
        btn.disabled = true;
        btn.textContent = "Excluindo...";
        try {
          await deleteDoc(ref);
          window.location.href = "minhas-os.html";
        } catch (err) {
          btn.disabled = false;
          btn.textContent = "Excluir OS";
          window.alert("Não foi possível excluir a OS.");
        }
      },
    },
    "Excluir OS"
  );
  container.appendChild(btn);
}

async function renderTimeline() {
  const timelineEl = document.getElementById("timeline");
  clear(timelineEl);
  const q = query(collection(db, "ordens", osId, "notas"), orderBy("criadoEm", "asc"));
  const snap = await getDocs(q);
  if (snap.empty) {
    timelineEl.appendChild(el("li", { class: "aviso-vazio" }, "Nenhuma anotação ainda."));
    return;
  }
  snap.forEach((notaSnap) => {
    const n = notaSnap.data();
    const linhas = [el("span", { class: "autor" }, n.autorNome), el("span", { class: "quando" }, formatDate(n.criadoEm))];
    const item = el("li", {}, [
      el("div", {}, linhas),
      el("div", { class: "texto" }, n.texto),
    ]);
    if (n.statusApos) {
      item.appendChild(el("div", { class: "meta" }, `Status atualizado para: ${STATUS_LABEL[n.statusApos] || n.statusApos}`));
    }
    timelineEl.appendChild(item);
  });
}

function opcoesStatusDisponiveis(statusAtual) {
  if (statusAtual === "aberta") return ["em_andamento", "concluida"];
  if (statusAtual === "em_andamento") return ["concluida"];
  return [];
}

function configurarFormNota(ref, d, user, perfil, souPrestador) {
  const selectStatus = document.getElementById("nota-status");
  const labelStatus = document.getElementById("label-nota-status");
  clear(selectStatus);

  if (souPrestador) {
    const opcoes = opcoesStatusDisponiveis(d.status);
    selectStatus.appendChild(el("option", { value: "" }, "Manter status atual"));
    for (const op of opcoes) {
      selectStatus.appendChild(el("option", { value: op }, STATUS_LABEL[op]));
    }
    selectStatus.classList.remove("hidden");
    labelStatus.classList.remove("hidden");
  } else {
    selectStatus.classList.add("hidden");
    labelStatus.classList.add("hidden");
  }

  const form = document.getElementById("form-nota");
  const erro = document.getElementById("erro-nota");
  const btn = document.getElementById("btn-nota");

  form.onsubmit = async (e) => {
    e.preventDefault();
    erro.classList.add("hidden");
    const texto = document.getElementById("nota-texto").value.trim();
    if (!texto) return;
    const novoStatus = souPrestador ? selectStatus.value : "";

    btn.disabled = true;
    btn.textContent = "Salvando...";
    try {
      await addDoc(collection(db, "ordens", osId, "notas"), {
        autorId: user.uid,
        autorNome: perfil.nome || user.email,
        texto,
        statusApos: novoStatus || null,
        criadoEm: serverTimestamp(),
      });

      if (novoStatus) {
        const atualizacao = {
          status: novoStatus,
          atualizadoEm: serverTimestamp(),
        };
        if (!d.prestadorId) {
          atualizacao.prestadorId = user.uid;
          atualizacao.prestadorNome = perfil.nome || user.email;
        }
        if (novoStatus === "concluida") {
          atualizacao.concluidoEm = serverTimestamp();
        }
        await updateDoc(ref, atualizacao);
      }

      await carregar(user, perfil);
    } catch (err) {
      erro.textContent = "Não foi possível salvar a anotação.";
      erro.classList.remove("hidden");
      btn.disabled = false;
      btn.textContent = "Salvar";
    }
  };
}
