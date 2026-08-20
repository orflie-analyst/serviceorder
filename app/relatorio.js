import {
  collection,
  getDocs,
  query,
  orderBy,
  where,
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
import { db } from "./firebase-init.js";
import { requireAuth, renderTopbar } from "./auth.js";
import { clear, el, formatDate } from "./dom.js";

let osConcluidas = [];
let ultimasLinhas = [];
let ultimoTotal = 0;

requireAuth(async (user, perfil) => {
  renderTopbar("relatorio.html", perfil);

  if (!perfil.isAdmin) {
    const conteudo = document.getElementById("conteudo");
    clear(conteudo);
    conteudo.appendChild(
      el("div", { class: "card" }, el("p", { class: "aviso-vazio" }, "Você não tem permissão para acessar esta página."))
    );
    return;
  }

  configurarMesPadrao();
  await carregarDepartamentos();
  await carregarOSConcluidas();
  gerarTabela();

  document.getElementById("btn-gerar").addEventListener("click", gerarTabela);
  document.getElementById("btn-imprimir").addEventListener("click", imprimir);
});

function configurarMesPadrao() {
  const agora = new Date();
  const ym = `${agora.getFullYear()}-${String(agora.getMonth() + 1).padStart(2, "0")}`;
  document.getElementById("filtro-mes").value = ym;
}

async function carregarDepartamentos() {
  const select = document.getElementById("filtro-departamento");
  const snap = await getDocs(query(collection(db, "departamentos"), orderBy("nome")));
  snap.forEach((d) => {
    select.appendChild(el("option", { value: d.id }, d.data().nome));
  });
}

async function carregarOSConcluidas() {
  // Admin lê todas as OS concluídas (qualquer departamento) de uma vez só; o
  // filtro por mês/departamento é feito aqui no cliente pra não depender de
  // índice composto novo no Firestore.
  const snap = await getDocs(query(collection(db, "ordens"), where("status", "==", "concluida")));
  osConcluidas = snap.docs.map((d) => d.data());
}

function paraAnoMes(timestamp) {
  const data = typeof timestamp?.toDate === "function" ? timestamp.toDate() : new Date(timestamp);
  return `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, "0")}`;
}

function formatarDuracao(ms) {
  const horas = ms / (1000 * 60 * 60);
  if (horas < 24) return `${horas.toFixed(1)} h`;
  return `${(horas / 24).toFixed(1)} d`;
}

function gerarTabela() {
  const mes = document.getElementById("filtro-mes").value;
  const deptId = document.getElementById("filtro-departamento").value;

  const filtradas = osConcluidas.filter((d) => {
    if (!d.concluidoEm) return false;
    if (mes && paraAnoMes(d.concluidoEm) !== mes) return false;
    if (deptId && d.departamentoId !== deptId) return false;
    return true;
  });

  const porPrestador = new Map();
  for (const d of filtradas) {
    const chave = d.prestadorId || "sem-responsavel";
    if (!porPrestador.has(chave)) {
      porPrestador.set(chave, { nome: d.prestadorNome || "Sem responsável", count: 0, somaMs: 0, comTempo: 0 });
    }
    const entrada = porPrestador.get(chave);
    entrada.count += 1;
    if (d.criadoEm) {
      const inicio = typeof d.criadoEm.toDate === "function" ? d.criadoEm.toDate() : new Date(d.criadoEm);
      const fim = typeof d.concluidoEm.toDate === "function" ? d.concluidoEm.toDate() : new Date(d.concluidoEm);
      entrada.somaMs += fim - inicio;
      entrada.comTempo += 1;
    }
  }

  ultimasLinhas = [...porPrestador.values()].sort((a, b) => b.count - a.count);
  ultimoTotal = filtradas.length;

  const tbody = document.querySelector("#tabela-produtividade tbody");
  clear(tbody);
  const avisoVazio = document.getElementById("aviso-vazio-relatorio");

  if (ultimasLinhas.length === 0) {
    avisoVazio.classList.remove("hidden");
    return;
  }
  avisoVazio.classList.add("hidden");
  for (const linha of ultimasLinhas) {
    tbody.appendChild(
      el("tr", {}, [
        el("td", {}, linha.nome),
        el("td", {}, String(linha.count)),
        el("td", {}, linha.comTempo > 0 ? formatarDuracao(linha.somaMs / linha.comTempo) : "—"),
      ])
    );
  }
}

function imprimir() {
  const container = document.getElementById("relatorio-print");
  clear(container);

  const mes = document.getElementById("filtro-mes").value;
  const selectDept = document.getElementById("filtro-departamento");
  const deptNome = selectDept.options[selectDept.selectedIndex]?.text || "Todos";

  container.appendChild(el("h1", {}, "Relatório de Produtividade"));
  container.appendChild(
    el("div", { class: "relatorio-meta" }, [
      el("div", {}, `Período: ${mes}`),
      el("div", {}, `Departamento: ${deptNome}`),
      el("div", {}, `Gerado em: ${formatDate(new Date())}`),
      el("div", {}, `Total de OS concluídas: ${ultimoTotal}`),
    ])
  );

  const thead = el(
    "thead",
    {},
    el("tr", {}, [el("th", {}, "Prestador"), el("th", {}, "OS concluídas"), el("th", {}, "Tempo médio de resolução")])
  );
  const tbody = el("tbody", {});
  for (const linha of ultimasLinhas) {
    tbody.appendChild(
      el("tr", {}, [
        el("td", {}, linha.nome),
        el("td", {}, String(linha.count)),
        el("td", {}, linha.comTempo > 0 ? formatarDuracao(linha.somaMs / linha.comTempo) : "—"),
      ])
    );
  }
  container.appendChild(el("table", {}, [thead, tbody]));

  window.print();
}
