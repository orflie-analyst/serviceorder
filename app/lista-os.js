import { clear, el, formatDate, STATUS_LABEL } from "./dom.js";

// Renderiza uma lista de docs de `ordens` (QueryDocumentSnapshot[]) dentro de `container` (<ul>).
// `subtitulo(dados)` opcional: string extra pra linha de meta (ex: nome do solicitante no painel do prestador).
export function renderListaOS(container, docs, { vazio = "Nenhuma OS encontrada.", subtitulo } = {}) {
  clear(container);
  if (docs.length === 0) {
    container.appendChild(el("li", { class: "aviso-vazio" }, vazio));
    return;
  }
  for (const docSnap of docs) {
    const d = docSnap.data();
    const metaPartes = [d.departamentoNome, formatDate(d.criadoEm)];
    if (subtitulo) metaPartes.unshift(subtitulo(d));

    const link = el("a", { class: "item-os", href: `os.html?id=${docSnap.id}` }, [
      el("div", { class: "info" }, [
        el("div", { class: "titulo" }, d.titulo),
        el("div", { class: "meta" }, metaPartes.filter(Boolean).join(" · ")),
      ]),
      el("span", { class: `badge status-${d.status}` }, STATUS_LABEL[d.status] || d.status),
    ]);

    container.appendChild(el("li", {}, link));
  }
}

// Controles de "Anterior/Próxima" pra listas de OS longas (ex: fila de concluídas
// de um prestador com muito histórico). Não renderiza nada se couber tudo numa página.
export function renderPaginacao(container, { totalItens, paginaAtual, tamanhoPagina, aoMudarPagina }) {
  clear(container);
  const totalPaginas = Math.max(1, Math.ceil(totalItens / tamanhoPagina));
  if (totalPaginas <= 1) return;

  container.appendChild(
    el("div", { class: "paginacao" }, [
      el(
        "button",
        {
          class: "btn secondary",
          type: "button",
          disabled: paginaAtual <= 1,
          onclick: () => aoMudarPagina(paginaAtual - 1),
        },
        "‹ Anterior"
      ),
      el("span", { class: "paginacao-info" }, `Página ${paginaAtual} de ${totalPaginas}`),
      el(
        "button",
        {
          class: "btn secondary",
          type: "button",
          disabled: paginaAtual >= totalPaginas,
          onclick: () => aoMudarPagina(paginaAtual + 1),
        },
        "Próxima ›"
      ),
    ])
  );
}
