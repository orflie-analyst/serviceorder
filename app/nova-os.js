import {
  collection,
  getDocs,
  addDoc,
  query,
  where,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
import { db } from "./firebase-init.js";
import { requireAuth, renderTopbar } from "./auth.js";
import { clear, el } from "./dom.js";

requireAuth(async (user, perfil) => {
  renderTopbar("nova-os.html", perfil);
  await carregarDepartamentos();

  const form = document.getElementById("form-os");
  const erro = document.getElementById("erro");
  const btn = document.getElementById("btn-criar");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    erro.classList.add("hidden");
    const select = document.getElementById("departamento");
    const departamentoId = select.value;
    const departamentoNome = select.options[select.selectedIndex]?.text || "";
    const titulo = document.getElementById("titulo").value.trim();
    const descricao = document.getElementById("descricao").value.trim();

    if (!departamentoId || !titulo || !descricao) return;

    btn.disabled = true;
    btn.textContent = "Enviando...";
    try {
      const ref = await addDoc(collection(db, "ordens"), {
        titulo,
        descricao,
        departamentoId,
        departamentoNome,
        solicitanteId: user.uid,
        solicitanteNome: perfil.nome || user.email,
        status: "aberta",
        prestadorId: null,
        prestadorNome: null,
        criadoEm: serverTimestamp(),
        atualizadoEm: serverTimestamp(),
        concluidoEm: null,
      });
      window.location.href = `os.html?id=${ref.id}`;
    } catch (err) {
      erro.textContent = "Não foi possível abrir a OS. Tente novamente.";
      erro.classList.remove("hidden");
      btn.disabled = false;
      btn.textContent = "Abrir OS";
    }
  });
});

async function carregarDepartamentos() {
  const select = document.getElementById("departamento");
  const q = query(collection(db, "departamentos"), where("ativo", "==", true));
  const snap = await getDocs(q);
  clear(select);
  if (snap.empty) {
    select.appendChild(el("option", { value: "", disabled: true, selected: true }, "Nenhum departamento cadastrado ainda"));
    return;
  }
  select.appendChild(el("option", { value: "", disabled: true, selected: true }, "Selecione..."));
  snap.forEach((docSnap) => {
    select.appendChild(el("option", { value: docSnap.id }, docSnap.data().nome));
  });
}
