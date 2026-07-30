# Sistema de Ordem de Serviços (OS) — Orflie

Sistema interno para colaboradores da Orflie abrirem Ordens de Serviço (OS) direcionadas a
departamentos prestadores de serviço (ex: TI, Analista Comercial), com timeline de anotações
até a conclusão. OS concluídas ficam disponíveis para um futuro relatório de produtividade.

Leia este arquivo primeiro ao retomar o trabalho.

## Stack

- **Firebase Auth** (email/senha) + **Firestore**. Auto-cadastro habilitado em `index.html`
  para qualquer email `@orflie.com` — sempre criado com privilégios mínimos (solicitante
  comum); só um admin promove depois via `admin.html`. Continua sem cadastro público
  irrestrito (domínio reforçado nas Firestore rules, não só na UI).
- Site estático (HTML/CSS/JS módulo, sem build step) publicado no **GitHub Pages**.
- Mesmo padrão usado nos projetos DojoPass/AcademiaTeste/AcademiaPlus (ver memória de sessões
  anteriores se precisar comparar), mas este é um projeto separado, sem relação com aquele.

## Identidade visual

Paleta preto/laranja (cores da marca Orflie): `--bg`/`--surface` em preto/quase-preto,
`--primary` laranja (`#f5821f`), topbar em preto puro. Logo real em `assets/orflie-logo.png`
(copiado de `Downloads/logo-light.png` — versão clara do logo, feita pra fundo escuro).
Usado na topbar (via `renderTopbar()` em `app/auth.js`) e na tela de login, ao lado do texto
"Sistema de Ordem de Serviço". Se o logo for atualizado, substituir esse arquivo mantendo o
nome — nada mais referencia o caminho original em Downloads.

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
tem acesso total. Ninguém edita `isAdmin`/`departamentosPrestador` do próprio usuário —
nem por auto-cadastro (`autoCadastroValido()` força `isAdmin: false`,
`departamentosPrestador: []`, `ativo: true` e email do doc == email do token, com domínio
`@orflie.com` checado via regex no próprio token, não no campo enviado pelo cliente).

## Páginas

- `index.html` — login **e auto-cadastro** (toggle entre os dois forms; cadastro exige
  email `@orflie.com`).
- `nova-os.html` — abrir OS (qualquer colaborador logado).
- `minhas-os.html` — OS abertas pelo usuário (visão solicitante).
- `painel.html` — fila de OS dos departamentos em que o usuário é prestador + concluídas.
- `os.html?id=...` — detalhe/timeline de uma OS, adicionar nota, mudar status/concluir.
- `admin.html` — CRUD de departamentos, criação de usuários **e edição de usuário
  existente** (nome, isAdmin, departamentosPrestador, ativo — botão "Editar" por linha).

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

## Status (2026-07-30)

**No ar e funcional**, ponta a ponta testado no ambiente de produção:
- GitHub Pages: https://orflie-analyst.github.io/serviceorder/
- Firebase: projeto `orflie-serviceorder` (conta @orflie.com), Firestore em `southamerica-east1`.
- Primeiro admin criado: `arnaldo.hungria@orflie.com` (`isAdmin: true`).
- Departamentos reais já cadastrados: **TI** e **Comercial** (via `admin.html`).
- Fluxo completo validado no navegador: login → criar departamento → abrir OS → assumir
  ("Em andamento") → concluir, com o histórico de anotações e o painel do prestador
  refletindo cada mudança corretamente.

**Índices compostos do Firestore** (`firestore.indexes.json`, deploy via
`firebase deploy --only firestore:indexes`): sem eles, `minhas-os.js` e `painel.js`
falham com `failed-precondition`. Um índice novo leva ~1-2 min pra ficar pronto depois do
deploy — normal, não é bug.

**Bootstrap do primeiro admin**: como a regra `usuarios` exige `souAdmin()` pra criar
qualquer doc (evitando auto-promoção), o primeiro admin não pode se auto-cadastrar pela
UI. Foi criado manualmente: (1) `accounts:signUp` via REST com a apiKey pública pra criar
o Auth user, (2) regra `usuarios` temporariamente relaxada **só pro uid específico**
daquela conta, (3) doc `usuarios/{uid}` criado via Firestore REST com o idToken dessa
conta, (4) regra revertida e redeployada imediatamente. Não precisa repetir esse processo
— só documentado aqui caso um segundo Firebase project precise do mesmo bootstrap no
futuro (ex: se este projeto for clonado para outra empresa/ambiente).

**Atualização 2026-07-30 (rebrand + auto-cadastro + edição de usuário):** identidade visual
preto/laranja com o logo real (ver seção "Identidade visual" acima); `admin.html` ganhou
edição de usuário existente (gap anterior, já resolvido); `index.html` ganhou auto-cadastro
restrito a `@orflie.com` com privilégios mínimos por padrão. Tudo testado no ar: rules
publicadas, auto-cadastro criou um usuário de teste com `isAdmin:false`/
`departamentosPrestador:[]` como esperado (conta de teste apagada depois), edição de
usuário confirmada diretamente contra as regras publicadas. **Gotcha de cache do GitHub
Pages**: assets servidos com `Cache-Control: max-age=600` — depois de um deploy, o
navegador pode continuar servindo a versão antiga de `.js`/`.css` por até 10 min mesmo
com reload forçado (não é um hard-refresh de verdade sem DevTools). Pra verificar uma
mudança recém-publicada sem esperar, buscar o arquivo direto (`curl`) ou importar o módulo
com `?v=` cache-buster confirma o conteúdo já está atualizado na origem.
