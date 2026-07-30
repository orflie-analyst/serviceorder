import {
  createUserWithEmailAndPassword,
  getAuth,
  signOut,
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import {
  collection,
  doc,
  setDoc,
  updateDoc,
  addDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
import { db, getAdminCreationApp } from "./firebase-init.js";
import { requireAuth, renderTopbar } from "./auth.js";
import { clear, el } from "./dom.js";

requireAuth(async (user, perfil) => {
  renderTopbar("admin.html", perfil);

  if (!perfil.isAdmin) {
    const conteudo = document.getElementById("conteudo");
    clear(conteudo);
    conteudo.appendChild(
      el("div", { class: "card" }, el("p", { class: "aviso-vazio" }, "Você não tem permissão para acessar esta página."))
    );
    return;
  }

  await carregarDepartamentos();
  await carregarUsuarios();
  configurarFormDepartamento();
  configurarFormUsuario();
  configurarFormEditarUsuario();
});

async function carregarDepartamentos() {
  const tbody = document.querySelector("#tabela-departamentos tbody");
  clear(tbody);
  const snap = await getDocs(query(collection(db, "departamentos"), orderBy("nome")));
  snap.forEach((d) => {
    const dados = d.data();
    const btnToggle = el(
      "button",
      {
        class: "btn secondary",
        type: "button",
        onclick: async () => {
          await updateDoc(doc(db, "departamentos", d.id), { ativo: !dados.ativo });
          await carregarDepartamentos();
        },
      },
      dados.ativo ? "Desativar" : "Ativar"
    );
    tbody.appendChild(
      el("tr", {}, [
        el("td", {}, dados.nome),
        el("td", {}, dados.ativo ? "Ativo" : "Inativo"),
        el("td", {}, btnToggle),
      ])
    );
  });
}

function configurarFormDepartamento() {
  const form = document.getElementById("form-departamento");
  const erro = document.getElementById("erro-departamento");
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    erro.classList.add("hidden");
    const input = document.getElementById("novo-departamento");
    const nome = input.value.trim();
    if (!nome) return;
    try {
      await addDoc(collection(db, "departamentos"), { nome, ativo: true, criadoEm: serverTimestamp() });
      input.value = "";
      await carregarDepartamentos();
      await carregarUsuarios();
    } catch (err) {
      erro.textContent = "Não foi possível criar o departamento.";
      erro.classList.remove("hidden");
    }
  });
}

let departamentosCache = [];

async function carregarUsuarios() {
  const snapDept = await getDocs(query(collection(db, "departamentos"), orderBy("nome")));
  departamentosCache = snapDept.docs.map((d) => ({ id: d.id, nome: d.data().nome }));

  const tbody = document.querySelector("#tabela-usuarios tbody");
  clear(tbody);
  const snap = await getDocs(query(collection(db, "usuarios"), orderBy("nome")));
  snap.forEach((u) => {
    const dados = u.data();
    const nomesDept = (dados.departamentosPrestador || [])
      .map((id) => departamentosCache.find((dep) => dep.id === id)?.nome)
      .filter(Boolean)
      .join(", ");
    tbody.appendChild(
      el("tr", {}, [
        el("td", {}, dados.nome),
        el("td", {}, dados.email),
        el("td", {}, dados.isAdmin ? "Sim" : "Não"),
        el("td", {}, nomesDept || "—"),
        el("td", {}, dados.ativo === false ? "Inativo" : "Ativo"),
        el(
          "td",
          {},
          el(
            "button",
            { class: "btn secondary", type: "button", onclick: () => abrirEdicaoUsuario(u.id, dados) },
            "Editar"
          )
        ),
      ])
    );
  });

  const wrap = document.getElementById("u-departamentos");
  clear(wrap);
  if (departamentosCache.length === 0) {
    wrap.appendChild(el("p", { class: "aviso-vazio" }, "Crie um departamento primeiro."));
  }
  for (const dep of departamentosCache) {
    const checkboxId = `dep-${dep.id}`;
    wrap.appendChild(
      el("div", { class: "checkbox-row" }, [
        el("input", { type: "checkbox", id: checkboxId, value: dep.id }),
        el("label", { for: checkboxId, style: "margin:0;" }, dep.nome),
      ])
    );
  }
}

function configurarFormUsuario() {
  const form = document.getElementById("form-usuario");
  const erro = document.getElementById("erro-usuario");
  const sucesso = document.getElementById("sucesso-usuario");
  const btn = document.getElementById("btn-criar-usuario");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    erro.classList.add("hidden");
    sucesso.classList.add("hidden");

    const nome = document.getElementById("u-nome").value.trim();
    const email = document.getElementById("u-email").value.trim();
    const senha = document.getElementById("u-senha").value;
    const isAdmin = document.getElementById("u-admin").checked;
    const departamentosPrestador = departamentosCache
      .map((dep) => dep.id)
      .filter((id) => document.getElementById(`dep-${id}`)?.checked);

    if (!nome || !email || senha.length < 6) return;

    btn.disabled = true;
    btn.textContent = "Criando...";

    // Instância separada do Firebase App só pra não substituir a sessão do admin logado.
    const secondaryApp = getAdminCreationApp();
    const secondaryAuth = getAuth(secondaryApp);

    try {
      const cred = await createUserWithEmailAndPassword(secondaryAuth, email, senha);
      await setDoc(doc(db, "usuarios", cred.user.uid), {
        nome,
        email,
        isAdmin,
        departamentosPrestador,
        ativo: true,
        criadoEm: serverTimestamp(),
      });
      await signOut(secondaryAuth);

      form.reset();
      sucesso.textContent = `Usuário "${nome}" criado. Repasse o email e a senha inicial a ele.`;
      sucesso.classList.remove("hidden");
      await carregarUsuarios();
    } catch (err) {
      erro.textContent =
        err.code === "auth/email-already-in-use"
          ? "Já existe uma conta com esse email."
          : "Não foi possível criar o usuário.";
      erro.classList.remove("hidden");
    } finally {
      btn.disabled = false;
      btn.textContent = "Criar usuário";
    }
  });
}

let uidEmEdicao = null;

function abrirEdicaoUsuario(uid, dados) {
  uidEmEdicao = uid;

  document.getElementById("editar-usuario-email").textContent = dados.email;
  document.getElementById("e-nome").value = dados.nome || "";
  document.getElementById("e-admin").checked = !!dados.isAdmin;
  document.getElementById("e-ativo").checked = dados.ativo !== false;

  const wrap = document.getElementById("e-departamentos");
  clear(wrap);
  if (departamentosCache.length === 0) {
    wrap.appendChild(el("p", { class: "aviso-vazio" }, "Nenhum departamento cadastrado."));
  }
  const atuais = dados.departamentosPrestador || [];
  for (const dep of departamentosCache) {
    const checkboxId = `e-dep-${dep.id}`;
    wrap.appendChild(
      el("div", { class: "checkbox-row" }, [
        el("input", { type: "checkbox", id: checkboxId, value: dep.id, checked: atuais.includes(dep.id) }),
        el("label", { for: checkboxId, style: "margin:0;" }, dep.nome),
      ])
    );
  }

  document.getElementById("erro-editar-usuario").classList.add("hidden");
  const card = document.getElementById("card-editar-usuario");
  card.classList.remove("hidden");
  card.scrollIntoView({ behavior: "smooth", block: "center" });
}

function fecharEdicaoUsuario() {
  uidEmEdicao = null;
  document.getElementById("card-editar-usuario").classList.add("hidden");
}

function configurarFormEditarUsuario() {
  const form = document.getElementById("form-editar-usuario");
  const erro = document.getElementById("erro-editar-usuario");
  const btn = document.getElementById("btn-salvar-usuario");

  document.getElementById("btn-cancelar-edicao").addEventListener("click", fecharEdicaoUsuario);

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!uidEmEdicao) return;
    erro.classList.add("hidden");

    const nome = document.getElementById("e-nome").value.trim();
    if (!nome) return;
    const isAdmin = document.getElementById("e-admin").checked;
    const ativo = document.getElementById("e-ativo").checked;
    const departamentosPrestador = departamentosCache
      .map((dep) => dep.id)
      .filter((id) => document.getElementById(`e-dep-${id}`)?.checked);

    btn.disabled = true;
    btn.textContent = "Salvando...";
    try {
      await updateDoc(doc(db, "usuarios", uidEmEdicao), { nome, isAdmin, ativo, departamentosPrestador });
      fecharEdicaoUsuario();
      await carregarUsuarios();
    } catch (err) {
      erro.textContent = "Não foi possível salvar as alterações.";
      erro.classList.remove("hidden");
    } finally {
      btn.disabled = false;
      btn.textContent = "Salvar";
    }
  });
}
