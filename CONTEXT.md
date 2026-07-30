# Sistema de Ordem de Serviços (OS) — Orflie

Sistema interno para colaboradores da Orflie abrirem Ordens de Serviço (OS) direcionadas a
departamentos prestadores de serviço (ex: TI, Analista Comercial), com timeline de anotações
até a conclusão. OS concluídas ficam disponíveis para um futuro relatório de produtividade.

Leia este arquivo primeiro ao retomar o trabalho.

## Stack

- **Firebase Auth** (email/senha, contas criadas só por admin — sem self-signup) + **Firestore**.
- Site estático (HTML/CSS/JS módulo, sem build step) publicado no **GitHub Pages**.
- Mesmo padrão usado nos projetos DojoPass/AcademiaTeste/AcademiaPlus (ver memória de sessões
  anteriores se precisar comparar), mas este é um projeto separado, sem relação com aquele.

## Contas

- **GitHub**: repo `orflie-analyst/serviceorder`. Push feito com uma conta GitHub nova e
  dedicada (separada de `arnaldohungria`/`tatamepass` usadas nos projetos DojoPass).
- **Firebase**: projeto criado numa conta Google **@orflie.com** (não usar as contas pessoais
  `arnaldo@live.jp` / `tatamepass@gmail.com` usadas nos outros projetos).

## Modelo de dados (Firestore)

- `usuarios/{uid}`: `nome`, `email`, `isAdmin` (bool), `departamentosPrestador` (array de
  deptId — vazio = só solicitante), `ativo` (bool), `criadoEm`.
- `departamentos/{deptId}`: `nome`, `ativo` (bool), `criadoEm`. CRUD só por admin.
- `ordens/{osId}`: `titulo`, `descricao`, `departamentoId`, `departamentoNome` (desnormalizado),
  `solicitanteId`, `solicitanteNome`, `status` (`aberta` | `em_andamento` | `concluida`),
  `prestadorId`/`prestadorNome` (quem assumiu), `criadoEm`, `atualizadoEm`, `concluidoEm`
  (null até concluir — base do futuro relatório de produtividade).
  - Subcoleção `ordens/{osId}/notas/{notaId}`: `autorId`, `autorNome`, `texto`, `statusApos`
    (opcional), `criadoEm`. Forma o histórico/timeline da OS. Imutável (sem update/delete).

Não existe coleção separada de "arquivadas" — uma OS concluída só tem `status: 'concluida'`
e `concluidoEm` preenchido; os painéis e o relatório futuro são queries filtradas.

## Regras de segurança

Ver `firestore.rules`. Resumo: solicitante só lê/comenta as próprias OS; prestador só
atualiza/comenta OS do(s) departamento(s) em que está em `departamentosPrestador`; admin
tem acesso total. Ninguém edita `isAdmin`/`departamentosPrestador` do próprio usuário.

## Páginas

- `index.html` — login.
- `nova-os.html` — abrir OS (qualquer colaborador logado).
- `minhas-os.html` — OS abertas pelo usuário (visão solicitante).
- `painel.html` — fila de OS dos departamentos em que o usuário é prestador + concluídas.
- `os.html?id=...` — detalhe/timeline de uma OS, adicionar nota, mudar status/concluir.
- `admin.html` — CRUD de departamentos + criação de usuários (admin only).

## Gotchas conhecidos (herdados de projetos irmãos, aplicam aqui também)

- **XSS**: nunca concatenar texto de usuário em `innerHTML` (nome, descrição, notas) — sempre
  `createElement`/`textContent`. Isso já mordeu os projetos DojoPass/AcademiaPlus.
- **Criação de usuário sem apagar sessão do admin**: `admin.html` usa uma segunda instância
  nomeada do Firebase App (`getAdminCreationApp()` em `app/firebase-init.js`) para chamar
  `createUserWithEmailAndPassword`, evitando substituir a sessão logada do admin.
- **Regras do Firestore vs. UI**: qualquer permissão nova (quem pode mudar status, criar
  departamento, etc.) tem que ser reforçada em `firestore.rules`, não só escondida na UI —
  senão dá pra burlar via SDK/REST direto, como já aconteceu (e foi corrigido) nos projetos
  irmãos.

## Status

Ver o plano da sessão que criou este projeto para o histórico completo de decisões.
Em construção — primeira versão ainda não publicada no Firebase/GitHub Pages.
