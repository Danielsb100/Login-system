# Blueprint de Implementação da Plataforma

## 1. Objetivo

Transformar o documento original de features em um plano técnico executável para os dois repositórios atuais:

- `Login-system`: backend principal, autenticação, dashboard/backoffice, gestão acadêmica e fonte de verdade dos dados.
- `Multiplayer-project`: runtime imersivo/realtime, mundo 3D, presença social, consumo dos módulos e experiências colaborativas.

Este blueprint parte do código que já existe hoje, consolida itens repetidos do documento original, marca o que já está implementado e define como expandir a plataforma sem quebrar a base atual.

## 2. Premissas usadas neste blueprint

- A plataforma continuará com dois repositórios separados no curto e médio prazo.
- `Login-system` deve continuar como sistema de registro principal; o `Multiplayer-project` não deve virar fonte de verdade para dados acadêmicos.
- O MVP segue browser-first. VR/XR com headset nativo entra apenas depois da consolidação do core acadêmico, colaboração e IA.
- O modelo atual `TrainingModule` deve ser preservado e evoluído; não vale a pena renomeá-lo agora e quebrar a integração com o mundo 3D.
- Um usuário poderá ter múltiplos papéis no futuro; o enum simples atual não escala para o escopo pedido.
- Arquivos binários não devem permanecer no banco como estratégia de longo prazo; isso hoje funciona como MVP, mas precisa migrar para storage externo.

## 3. Foto atual do projeto

### 3.1 Repositórios e responsabilidades atuais

#### `Login-system`

- Node.js + Express + Prisma + PostgreSQL.
- Autenticação com JWT.
- Cadastro com verificação por e-mail.
- Dashboard web em HTML/CSS/JS estático.
- Gestão de módulos com vídeos, documentos e quizzes.
- Fórum por módulo.
- Relatórios básicos por módulo.
- Upload de documentos pessoais e foto de perfil.
- Persistência dos placements de módulos no mundo 3D.

Arquivos estruturais relevantes hoje:

- `index.js`
- `prisma/schema.prisma`
- `controllers/authController.js`
- `controllers/moduleController.js`
- `controllers/contentController.js`
- `controllers/forumController.js`
- `controllers/analyticsController.js`
- `controllers/placementController.js`
- `controllers/reportController.js`
- `public/dashboard.html`
- `public/js/app.js`

#### `Multiplayer-project`

- Node.js + Express + Socket.IO + PeerJS.
- Cliente Three.js com mundo 3D.
- Login no mundo usando o token emitido pelo `Login-system`.
- Avatares, catálogo de objetos, chat global, chamadas P2P de áudio/vídeo.
- Hotspots/placements de módulo consumindo a API do `Login-system`.
- Sidebar de módulo dentro do mundo para vídeos, documentos, quiz e acesso ao fórum.

Arquivos estruturais relevantes hoje:

- `server.js`
- `public/index.html`
- `public/main.js`
- `public/styles.css`

### 3.2 O que já está implementado

Legenda:

- `[x]` Implementado
- `[~]` Parcial / MVP / precisa evoluir
- `[ ]` Não iniciado

### A. Acesso e identidade digital

- `[x]` Cadastro por e-mail.
- `[x]` Login com JWT.
- `[x]` Verificação de conta por código enviado por e-mail.
- `[ ]` Recuperação de senha.
- `[ ]` Gestão de consentimento e privacidade em nível RGPD.
- `[~]` Papéis de usuário: existem apenas `USER`, `ADMIN` e `MASTER`.
- `[~]` Perfil do usuário: hoje cobre `username`, `email`, foto de perfil e documentos pessoais.
- `[ ]` Biografia, interesses, cursos frequentados, habilidades, badges, calendário pessoal e portfólio estruturado.

### B. Estrutura do campus digital

- `[~]` Painel inicial: existe dashboard com áreas gerais, documentos e módulos.
- `[ ]` Próximas aulas, prazos, notificações, sugestões de IA e progresso de trilha no painel.
- `[~]` Navegação por áreas: hoje existe separação parcial entre dashboard web e mundo 3D.
- `[ ]` Biblioteca, ágora/comunidade, área de eventos e suporte de IA como áreas de navegação coesas.

### C. Gestão de cursos, turmas e grupos

- `[~]` Gestão de conteúdo didático: existe CRUD de `TrainingModule` com vídeos, documentos e quizzes.
- `[ ]` Estrutura formal de curso, turma/coorte, matrícula e pré-requisitos.
- `[ ]` Rotas obrigatórias vs personalizadas.
- `[ ]` Avaliações intermediárias e finais além do quiz atual.
- `[ ]` Criação de turmas, mural de avisos da turma, lista de participantes e materiais específicos por turma.
- `[ ]` Subgrupos de projeto, áreas reservadas, tarefas compartilhadas e quadros brancos.

### D. Espaços participativos e aprendizagem social

- `[~]` Fórum por módulo com threads e replies.
- `[ ]` Fóruns temáticos globais por curso/comunidade.
- `[ ]` Moderação, tags, votos, menções e notificações ligadas ao fórum.
- `[ ]` Quadros abertos, brainstorm coletivo, enquetes, desafios, propostas e revisão por pares.
- `[~]` Interação social em tempo real no mundo 3D: chat global e presença multiplayer já existem.
- `[ ]` Networking estruturado entre alunos, tutores, mentores e empresas.

### E. Calendário e planejamento de atividades

- `[ ]` Calendário pessoal e acadêmico.
- `[ ]` Agenda operacional do dia/semana.
- `[ ]` Agendamento de tutoria, entrevistas e eventos.
- `[ ]` Integração com Google Calendar / Outlook.

### F. Tutores digitais e IA conversacional

- `[ ]` Chatbot tutor.
- `[ ]` Tutor técnico.
- `[ ]` Facilitador de grupo.
- `[ ]` Recomendações personalizadas, análise de lacunas, trilhas dinâmicas e risco de evasão.
- `[ ]` Concierge de IA do campus.
- `[ ]` Gêmeo digital do aluno.

### G. VR, AR, XR e ambientes imersivos

- `[~]` Mundo 3D imersivo em navegador com avatares.
- `[~]` Hotspots de módulo dentro do ambiente 3D.
- `[~]` Interação com objetos 3D, catálogo de modelos e estruturas.
- `[~]` Chamadas de áudio/vídeo entre participantes no runtime.
- `[ ]` Salas de aula VR com suporte real a headset/WebXR.
- `[ ]` Laboratórios XR estruturados por cenário.
- `[ ]` Experiências de AR/MR em mobile/tablet.
- `[ ]` Gamificação imersiva completa com missões, níveis e recompensas persistidas.

### H. Conteúdo e ferramentas de ensino

- `[~]` Repositório de documentos pessoais.
- `[~]` Conteúdo por módulo com vídeo, PDF, Word e imagem.
- `[~]` Editor educacional básico para montar módulo, anexar vídeos/docs e criar quiz.
- `[ ]` Biblioteca digital pesquisável com filtros, favoritos e histórico.
- `[ ]` Conteúdo gerado por IA, podcasts, ebooks, modelos 3D e objetos interativos tratados como catálogo unificado.

### I. Avaliação, monitoramento e certificação

- `[~]` Quizzes automáticos com submissão e pontuação.
- `[ ]` Testes adaptativos.
- `[ ]` Tarefas abertas, rubricas, projeto, avaliação oral e peer review estruturados.
- `[~]` Analytics básico: acesso a módulo, progresso de vídeo, download de documento e relatórios simples.
- `[ ]` Painéis completos de progresso, habilidades, risco de evasão e eficácia de conteúdo.
- `[ ]` Distintivos, certificados, microcredenciais e portfólio verificável.

### L. Comunicação e notificações

- `[~]` Chat global no mundo 3D.
- `[~]` Compartilhamento de arquivos pessoais entre usuários.
- `[~]` Chamada de áudio/vídeo P2P.
- `[ ]` Mensageria persistente 1:1, turma e grupo.
- `[ ]` Notificações in-app.
- `[ ]` Notificações por e-mail, push e regras inteligentes por evento.

### M. Inclusão, acessibilidade e personalização

- `[~]` Personalização mínima de cor/avatar/foto.
- `[ ]` Preferência de idioma, tema, modo de estudo, ritmo e acessibilidade.
- `[ ]` Legendas automáticas, TTS, STT, alto contraste, fontes legíveis e suporte completo a leitor de tela.

### N. Back office e administração

- `[~]` Painel administrativo básico de usuários.
- `[~]` Permissões básicas via middleware.
- `[~]` Relatórios de módulo para `MASTER` / `ADMIN`.
- `[~]` `AuditLog` existe no schema, mas ainda não sustenta um backoffice real.
- `[ ]` Catálogo global de cursos, matrículas, moderação da comunidade, gestão institucional e configurações do sistema.
- `[ ]` Gestão de parceiros, departamentos, professores, tutores e acordos corporativos.

### O. Integrações externas

- `[~]` E-mail via SMTP.
- `[~]` Integração entre os dois repositórios via API REST + JWT.
- `[~]` PeerJS externo para áudio/vídeo.
- `[ ]` Zoom / Teams / Meet.
- `[ ]` Google Workspace / Microsoft 365.
- `[ ]` Motores de IA formalizados.
- `[ ]` Ambientes externos de VR/XR.
- `[ ]` API móvel.

## 4. Consolidação do escopo funcional

O documento original mistura features repetidas ou muito próximas. Para implementação, vamos consolidar assim:

- `Chatbot de tutoria`, `Tutor de ensino`, `Tutor técnico`, `Facilitador de grupo`, `Concierge de IA` e `IA adaptativa` passam a ser um único domínio: `AI Platform`, com agentes diferentes sobre a mesma infraestrutura.
- `Central de conteúdo`, `Editor educacional` e `Biblioteca digital` passam a ser um único domínio: `Content Platform`.
- `Comunidade`, `fóruns`, `espaços participativos`, `grupos de trabalho` e parte de `mensagens internas` passam a ser um único domínio: `Collaboration`.
- `Salas VR`, `XR`, `AR/MR`, `gamificação imersiva` e `workshops imersivos com cenários` passam a ser um único domínio: `Immersive Platform`, entregue em níveis de maturidade.
- `Perfil avançado`, `habilidades`, `badges`, `certificados`, `portfólio` e `gêmeo digital do aluno` compartilham o mesmo núcleo de `Identity + Learning Profile`.

## 5. Dívida técnica que deve ser tratada antes da expansão

Antes de começar a adicionar módulos grandes, alguns ajustes são obrigatórios porque hoje já limitam evolução:

1. URLs de integração estão hardcoded no `Multiplayer-project`; isso precisa virar configuração de ambiente.
2. `public/js/app.js` e `public/main.js` já estão grandes demais para evoluir sem modularização.
3. O enum de papéis não cobre o domínio real do produto.
4. Documentos e GLBs em `Bytes` no banco não escalam para biblioteca, XR e mídias maiores.
5. Há inconsistências de contrato entre os repositórios:
   - fluxo de registro no mundo 3D usa rota diferente da exposta no backend;
   - nomenclatura de `source` em analytics não está alinhada ao enum do schema;
   - o runtime do fórum no mundo ainda abre link externo em vez de consumir o fórum real.
6. O multiplayer persiste vários estados apenas em memória:
   - chat global;
   - cubos/modelos livres;
   - presença completa de sessão.
7. `QuizSubmission` hoje está muito centrado no módulo; para analytics e certificação o submission precisa ser claramente ligado a quiz, avaliação e tentativa.

## 6. Arquitetura-alvo recomendada

### 6.1 Decisão arquitetural principal

Não recomendo quebrar isso em microserviços agora.

O caminho correto para este projeto é:

- manter `Login-system` como monólito modular, dono do domínio acadêmico, identidade, colaboração persistente, relatórios, notificações, agenda, integrações e IA;
- manter `Multiplayer-project` como runtime especializado em presença, cena 3D, interação imersiva e colaboração em tempo real;
- formalizar um contrato de integração estável entre os dois.

Isso reduz risco, evita duplicação de regra de negócio e respeita o que já está pronto.

### 6.2 Responsabilidade por repositório

| Repositório | Responsabilidade permanente |
| --- | --- |
| `Login-system` | Auth, perfis, RBAC, cursos, módulos, turmas, comunidade persistente, biblioteca, agenda, notificações, analytics, certificações, integrações, IA |
| `Multiplayer-project` | Cena 3D, avatares, voz/vídeo, presença, hotspots, catálogo 3D, experiências imersivas, sessões colaborativas e consumo de conteúdo no ambiente |

### 6.3 Contrato entre repositórios

O contrato entre os dois repositórios deve seguir estas regras:

1. O token nasce e é validado pelo `Login-system`.
2. O `Multiplayer-project` consome APIs do `Login-system` apenas via cliente autenticado centralizado.
3. Nenhuma regra acadêmica crítica deve existir só no frontend do mundo 3D.
4. O `Multiplayer-project` pode manter estado efêmero de sessão, mas o estado durável deve ser salvo no `Login-system` ou em storage compartilhado.
5. Todo recurso aberto no mundo 3D deve ter um correspondente persistente no backend:
   - `module placements`;
   - cenas/experiências;
   - chat persistente quando for chat oficial;
   - grupos/salas;
   - eventos/sessões.

### 6.4 Organização recomendada do `Login-system`

Migrar de estrutura flat para domínios, sem big bang:

```text
src/
  app/
  config/
  domains/
    auth/
    users/
    roles/
    courses/
    modules/
    content/
    community/
    messaging/
    scheduling/
    notifications/
    analytics/
    certificates/
    ai/
    immersive/
    admin/
  shared/
    middleware/
    storage/
    email/
    validation/
    contracts/
```

Estratégia de migração:

- manter `index.js` como entrypoint inicial;
- mover uma área por vez para `src/domains/*`;
- preservar endpoints atuais como aliases temporários;
- criar novos endpoints já no formato novo;
- retirar aliases só depois de migrar dashboard e multiplayer.

### 6.5 Organização recomendada do `Multiplayer-project`

Separar o `public/main.js` por responsabilidade:

```text
public/
  js/
    boot.js
    auth/
    network/
    world/
    ui/
    module-runtime/
    media/
    player/
    immersive/
```

Regras:

- cliente de autenticação único;
- cliente de API único;
- cliente de socket único;
- módulo próprio para sidebar de módulo;
- módulo próprio para catálogo/placements/cenas;
- módulo próprio para voz e vídeo.

### 6.6 Modelo de dados-alvo

#### Núcleo de identidade

- `User` mantém o registro base.
- `UserProfile` adiciona bio, interesses, avatar, idioma, timezone, headline.
- `UserPreference` guarda tema, idioma, preferências de estudo e acessibilidade.
- `UserRoleAssignment` substitui gradualmente o enum único de `role`.
- `ConsentRecord` guarda consentimentos e versões de termos.
- `PasswordResetToken` suporta recuperação de senha.
- `PortfolioItem` e `UserSkill` estruturam o perfil acadêmico/profissional.

#### Núcleo acadêmico

- `Course`
- `CourseModule`
- `Classroom` / `Cohort`
- `Enrollment`
- `LearningPath`
- `ModulePrerequisite`
- `Assignment`
- `Submission`
- `Rubric`

Observação importante:

- `TrainingModule` permanece como unidade reusável de conteúdo.
- `Course` passa a ser agregador.
- `CourseModule` liga `Course` a `TrainingModule`.

#### Núcleo de colaboração

- `CommunitySpace`
- `DiscussionThread`
- `DiscussionReply`
- `Tag`
- `Mention`
- `Vote`
- `Poll`
- `ProjectGroup`
- `GroupMember`
- `Conversation`
- `Message`
- `Attachment`

#### Núcleo de agenda/notificação

- `CalendarEvent`
- `Reminder`
- `Notification`
- `TaskQueueItem`
- `AvailabilitySlot`
- `ExternalCalendarConnection`

#### Núcleo de analytics e certificação

- `LearningEvent`
- `ProgressSnapshot`
- `RiskAlert`
- `Skill`
- `Badge`
- `Certificate`
- `CredentialShare`

#### Núcleo imersivo

- `ImmersiveScene`
- `ImmersivePlacement`
- `ImmersiveAsset`
- `ExperienceScenario`
- `Mission`
- `Reward`
- `AvatarProfile`

Observação importante:

- `WorldModulePlacement` deve ser encapsulado por serviço e evoluir para `ImmersivePlacement`.
- Não recomendo renomear o model agora. Recomendo criar um service layer e migrar o nome apenas quando o domínio estiver estabilizado.

### 6.7 Storage e mídia

Migrar a estratégia de storage para:

- banco relacional: apenas metadados;
- object storage: documentos, imagens, vídeos, GLBs, thumbnails, exports e certificados;
- service layer: `StorageService` para abstrair provider.

Isso destrava:

- biblioteca de conteúdo;
- upload maior;
- assets 3D;
- certificados;
- conteúdo gerado por IA.

## 7. Plano de implementação ordenado por complexidade

### 7.1 Complexidade 1/5: Fundação, contratos e saneamento técnico

**Cobre**

- base para todas as features seguintes;
- alinhamento entre os dois repositórios;
- correções de design que hoje travam evolução.

**Estado atual**

- integração existe, mas está frágil;
- contratos não estão formalizados;
- frontend dos dois repositórios está concentrado em arquivos únicos grandes;
- storage binário está acoplado ao banco.

**Implementação no `Login-system`**

- criar camada única de configuração (`env`, URLs, flags, secrets);
- padronizar resposta de erro e shape de payload;
- introduzir `StorageService`;
- começar extração de domínios a partir dos controllers atuais;
- criar aliases planejados para rotas legadas;
- alinhar enums e naming conventions (`source`, `role`, `status`).

**Implementação no `Multiplayer-project`**

- remover URLs hardcoded;
- criar `authClient`, `apiClient`, `socketClient`;
- modularizar `main.js`;
- criar camada de integração explícita com o `Login-system`.

**Ajustes obrigatórios já nesta etapa**

- corrigir inconsistência do fluxo de registro;
- corrigir inconsistência de analytics/source;
- definir como o runtime do fórum será embutido;
- preparar migração de storage.

**Resultado esperado**

- base técnica estável para crescer sem reescrever tudo depois.

### 7.2 Complexidade 1.5/5: Identidade, papéis, consentimento e perfil avançado

**Features cobertas**

- login/cadastro;
- recuperação de senha;
- papéis reais de usuário;
- perfil avançado;
- consentimento e preferências.

**Estado atual**

- auth básica já existe e deve ser preservada;
- há apenas `USER`, `ADMIN`, `MASTER`;
- perfil é mínimo.

**Decisão arquitetural**

Trocar a lógica de papel único por atribuições de papel.

Papéis alvo:

- `STUDENT`
- `TEACHER`
- `TUTOR`
- `BUSINESS_MENTOR`
- `COORDINATOR`
- `ADMIN`
- `GUEST`
- opcionalmente `SUPER_ADMIN`

**Implementação no banco**

- adicionar `UserProfile`, `UserPreference`, `UserRoleAssignment`, `ConsentRecord`, `PasswordResetToken`, `PortfolioItem`;
- manter `User.role` temporariamente como compatibilidade;
- fazer backfill:
  - `USER -> STUDENT`
  - `MASTER -> TEACHER` ou `CONTENT_OWNER` durante a migração
  - `ADMIN -> ADMIN`

**Implementação no backend**

- endpoints de recuperação de senha;
- endpoints de perfil completo;
- middleware de autorização baseado em múltiplos papéis;
- endpoints de consentimento e preferências.

**Implementação no frontend**

- expandir perfil no dashboard;
- exibir papel real do usuário;
- permitir gestão básica de bio, interesses, idioma, preferências e portfólio;
- mostrar cartão de perfil enriquecido no mundo 3D.

**Resultado esperado**

- identidade pronta para escalar para universidade/ecossistema, sem ficar presa no conceito atual de `MASTER`.

### 7.3 Complexidade 2/5: Notificações e agenda operacional

**Features cobertas**

- notificações inteligentes;
- "fazer hoje";
- urgências;
- metas da semana;
- lembretes automáticos.

**Estado atual**

- inexistente.

**Implementação**

- criar `Notification`, `Reminder` e `TaskQueueItem`;
- disparar notificações a partir de eventos reais:
  - módulo publicado;
  - reply no fórum;
  - quiz submetido;
  - convite para evento;
  - matrícula em turma;
  - novo feedback;
- dashboard com inbox de notificações e agenda operacional;
- badge/resumo no mundo 3D quando existir ação pendente.

**Observação**

- esta etapa pode ser entregue sem Google/Outlook;
- primeiro vem agenda interna, depois sincronização externa.

### 7.4 Complexidade 2.5/5: Cursos, turmas, matrículas e progressão

**Features cobertas**

- gestão de cursos;
- turmas;
- trilhas obrigatórias/personalizadas;
- pré-requisitos;
- progresso por rota;
- materiais e participantes por turma.

**Estado atual**

- existe apenas `TrainingModule`;
- não há curso, turma nem matrícula.

**Decisão arquitetural**

Não substituir `TrainingModule`.

Evolução correta:

- `Course` agrega vários `TrainingModule`;
- `CourseModule` define ordem, obrigatoriedade e pré-requisitos;
- `Classroom` / `Cohort` define instância viva da oferta;
- `Enrollment` controla acesso do aluno.

**Implementação no backend**

- CRUD de curso;
- CRUD de turma;
- matrícula manual e automática;
- acesso a módulo condicionado por matrícula e pré-requisito;
- mural e lista de participantes por turma.

**Implementação no dashboard**

- catálogo de cursos;
- "minhas turmas";
- visão de progresso;
- participantes e materiais por turma.

**Implementação no mundo 3D**

- os placements passam a abrir módulos no contexto do curso/turma;
- acesso e analytics passam a considerar matrícula real.

**Resultado esperado**

- o produto deixa de ser apenas "módulos soltos" e passa a ter estrutura acadêmica.

### 7.5 Complexidade 3/5: Comunidade, fóruns e espaços participativos

**Features cobertas**

- fóruns temáticos;
- discussões por curso/módulo;
- Q&A;
- moderação;
- tags;
- votos;
- menções;
- enquetes;
- desafios;
- ideias/propostas;
- revisão por pares.

**Estado atual**

- fórum básico por módulo já existe;
- mundo 3D ainda não consome esse fórum de verdade.

**Decisão arquitetural**

Generalizar o fórum atual em vez de criar um segundo sistema.

**Implementação**

- transformar `ForumThread` / `ForumReply` em domínio genérico de discussão com `scopeType` e `scopeId`;
- adicionar `Tag`, `Mention`, `Vote`, `Poll`, `Proposal`, `ModerationFlag`;
- permitir escopos:
  - plataforma;
  - comunidade;
  - curso;
  - turma;
  - módulo;
  - grupo de projeto;
- embutir o fórum real no dashboard e no mundo 3D.

**Resultado esperado**

- comunidade deixa de ser lateral e passa a ser parte do campus.

### 7.6 Complexidade 3/5: Plataforma de conteúdo, biblioteca e editor educacional v2

**Features cobertas**

- central de conteúdo;
- biblioteca digital;
- editor educacional;
- favoritos;
- histórico;
- busca por formato/tema/nível;
- conteúdo multimídia unificado.

**Estado atual**

- vídeos, documentos e quiz já existem;
- biblioteca e busca avançada não existem;
- upload ainda está acoplado ao banco.

**Decisão arquitetural**

Transformar conteúdo em catálogo versionado, e não em anexos dispersos.

**Implementação**

- criar `ContentAsset`, `ContentCollection`, `ContentBlock`, `AssetVersion`, `Favorite`;
- migrar `Document` para metadado + storage externo;
- suportar tipos:
  - vídeo;
  - PDF;
  - Word;
  - imagem;
  - áudio;
  - ebook;
  - GLB/3D;
  - link externo;
- criar busca por texto, tipo, tags e autor;
- permitir editor de aula baseado em blocos.

**Implementação no `Multiplayer-project`**

- consumir manifesto de conteúdo em vez de heurísticas espalhadas;
- preparar runtime para assets 3D didáticos e cenários.

### 7.7 Complexidade 3.5/5: Mensageria, grupos de trabalho e sessões ao vivo

**Features cobertas**

- chat individual;
- chat de turma;
- chat de grupo;
- grupos de projeto;
- compartilhamento de arquivos;
- reuniões rápidas;
- webinars/oficinas.

**Estado atual**

- existe chat global efêmero no mundo 3D;
- existem chamadas P2P;
- não existe mensageria persistente.

**Decisão arquitetural**

- chat oficial e persistente deve viver no `Login-system`;
- presença, proximidade e mídia em tempo real continuam no `Multiplayer-project`.

**Implementação**

- criar `Conversation`, `Message`, `MessageAttachment`, `ProjectGroup`, `GroupMember`, `GroupTask`, `LiveSession`;
- permitir escopos:
  - 1:1
  - turma
  - grupo
  - módulo
  - evento
- integrar uploads/arquivos já existentes via `StorageService`;
- manter voz/vídeo P2P como camada de sessão, não como sistema de registro.

**Resultado esperado**

- colaboração deixa de depender só do chat efêmero do mundo.

### 7.8 Complexidade 3.5/5: Backoffice, organizações e governança

**Features cobertas**

- painel do administrador;
- funções e permissões;
- catálogo de cursos;
- moderação;
- auditoria;
- instituições parceiras;
- departamentos;
- acordos corporativos.

**Estado atual**

- há apenas gestão básica de usuários e relatórios simples.

**Implementação**

- criar `Organization`, `Department`, `PartnerCompany`, `InstitutionAgreement`, `SystemSetting`;
- montar backoffice para:
  - usuários;
  - cursos;
  - turmas;
  - comunidade;
  - relatórios;
  - configurações;
- dar uso real ao `AuditLog` com filtros e visualização;
- separar permissões administrativas por domínio.

**Resultado esperado**

- plataforma passa a suportar operação institucional real.

### 7.9 Complexidade 4/5: Avaliação, analytics, skills, badges e certificações

**Features cobertas**

- avaliações ricas;
- peer review;
- habilidades;
- progresso;
- badges;
- certificados;
- microcredenciais;
- risco de evasão básico.

**Estado atual**

- quizzes e relatórios básicos já existem;
- faltam tarefas, rubricas, skills e certificação.

**Decisão arquitetural**

Unificar rastreamento em um domínio de eventos de aprendizagem.

**Implementação**

- criar `LearningEvent` como trilha unificada de eventos;
- manter logs atuais por compatibilidade e alimentar `LearningEvent`;
- criar `Assignment`, `Submission`, `Rubric`, `AssessmentResult`, `Skill`, `UserSkill`, `Badge`, `Certificate`;
- ligar submissão a quiz, assignment e tentativa de forma explícita;
- gerar snapshots de progresso por usuário/turma/curso;
- mostrar painéis diferentes para:
  - aluno;
  - professor/tutor;
  - coordenador/admin.

**Resultado esperado**

- analytics deixa de ser só contagem de acesso e vira inteligência educacional utilizável.

### 7.10 Complexidade 4/5: Calendário, eventos, networking e matching

**Features cobertas**

- calendário inteligente;
- agenda de aulas ao vivo;
- prazos;
- tutoria;
- entrevistas;
- webinars/eventos;
- matching aluno-tutor, aluno-grupo, aluno-empresa.

**Estado atual**

- inexistente.

**Implementação**

- criar `CalendarEvent`, `Reminder`, `AvailabilitySlot`, `Event`, `EventRegistration`, `MatchProfile`, `RecommendationMatch`;
- integrar eventos com notificações e tarefas;
- construir agenda interna primeiro;
- depois conectar Google Calendar / Outlook;
- criar motor de matching inicial baseado em:
  - papel;
  - interesses;
  - skills;
  - disponibilidade;
  - curso/turma;
  - objetivo.

**Resultado esperado**

- campus passa a ter coordenação operacional real e networking orientado.

### 7.11 Complexidade 5/5: Plataforma de IA

**Features cobertas**

- tutor chatbot;
- tutor técnico;
- facilitador de grupo;
- concierge de IA;
- IA adaptativa;
- criação rápida de conteúdo;
- gêmeo digital do aluno;
- recomendações e recuperação direcionada.

**Estado atual**

- inexistente.

**Decisão arquitetural**

Criar uma plataforma de IA única com múltiplos agentes especializados.

**Implementação**

- criar `AiAgent`, `AiConversation`, `AiMessage`, `KnowledgeChunk`, `Embedding`, `Recommendation`, `RiskAlert`, `StudentTwinSnapshot`;
- RAG sobre módulos, documentos, quizzes, fóruns e eventos;
- agentes iniciais:
  - `Campus Concierge`
  - `Teaching Tutor`
  - `Technical Tutor`
  - `Teacher Copilot`
  - `Group Facilitator`
- painel de custo, observabilidade e aprovação humana para ações sensíveis;
- trilha de recomendações acionando notificações e agenda.

**Implementação por superfície**

- dashboard:
  - chat tutor;
  - sugestões do dia;
  - alertas de risco;
  - geração assistida de conteúdo;
- mundo 3D:
  - tutor contextual por hotspot/cena;
  - ajuda contextual em experiências imersivas.

### 7.12 Complexidade 5/5+: Plataforma imersiva XR/VR/AR e gamificação

**Features cobertas**

- salas imersivas;
- workshops com cenários;
- laboratórios simulados;
- dramatizações;
- visitas virtuais;
- AR/MR;
- missões;
- níveis;
- desafios em grupo;
- recompensas.

**Estado atual**

- existe mundo 3D browser-based com bom esqueleto para virar esse domínio;
- ainda não existe engine de cenários nem suporte XR real.

**Decisão arquitetural**

Evoluir o runtime existente em camadas:

1. Browser 3D colaborativo com hotspots e experiências.
2. Cenários roteirizados.
3. WebXR/VR.
4. AR/MR e integrações externas.

**Implementação**

- criar `ImmersiveScene`, `ExperienceScenario`, `Mission`, `Reward`, `AvatarProfile`, `ImmersiveAsset`;
- persistir cenário, estado relevante e checkpoints;
- separar objetos livres do mundo de objetos acadêmicos persistentes;
- adicionar engine de roteiro:
  - objetivo;
  - passos;
  - ações esperadas;
  - feedback;
  - reward;
- preparar suporte a WebXR no cliente;
- integrar analytics da experiência ao domínio educacional.

**Resultado esperado**

- a plataforma passa a ter diferenciação real em relação a um LMS tradicional.

## 8. Ordem prática recomendada de execução

Mesmo ordenando por complexidade, a melhor sequência de entrega é:

1. Fundação e contratos.
2. Identidade, papéis e perfil.
3. Cursos, turmas e matrículas.
4. Notificações e agenda operacional.
5. Comunidade e colaboração persistente.
6. Plataforma de conteúdo e biblioteca.
7. Backoffice institucional.
8. Avaliação, analytics e certificações.
9. Calendário, eventos e matching.
10. IA.
11. XR/VR/AR/gamificação.

Motivo:

- os itens 1 a 4 desbloqueiam tudo;
- os itens 5 a 8 transformam a base atual em campus digital real;
- os itens 9 a 11 entregam diferenciação e valor premium.

## 9. Distribuição sugerida entre devs

### Trilha A: Core Platform (`Login-system`)

- Fundação/contratos
- Identidade/roles/perfil
- Cursos/turmas/matrículas
- Notificações/agenda

### Trilha B: Academic + Collaboration (`Login-system`)

- Comunidade e fóruns
- Mensageria persistente
- Biblioteca/editor
- Backoffice

### Trilha C: Immersive Runtime (`Multiplayer-project`)

- Modularização do cliente
- Hotspots e runtime de módulo
- Experiências roteirizadas
- WebXR/avatares/gamificação

### Trilha D: Data + Intelligence (cross-repo)

- Analytics unificado
- Certificações/skills
- Matching
- IA

### Dependências mínimas para paralelizar

- ninguém deveria iniciar IA antes de 1, 2 e 4;
- ninguém deveria iniciar XR avançado antes de 1 e da modularização do `Multiplayer-project`;
- analytics/certificação dependem da modelagem acadêmica;
- mensageria persistente depende da fundação de storage e contratos.

## 10. Primeiros entregáveis recomendados

Se eu fosse abrir a implementação agora, começaria exatamente por estes entregáveis:

1. Documento de contrato entre repositórios e variáveis de ambiente compartilhadas.
2. Refactor inicial:
   - `Login-system/public/js/app.js`
   - `Multiplayer-project/public/main.js`
3. Migração de papéis:
   - modelo de múltiplos papéis
   - compatibilidade com o enum atual
4. Recuperação de senha + consentimento.
5. Estrutura de `Course`, `Classroom` e `Enrollment` usando `TrainingModule` como unidade reaproveitável.
6. Agenda/notifications inbox.
7. Storage externo para documentos, imagens, vídeos e GLBs.

## 11. Conclusão

O projeto já tem uma base melhor do que parece à primeira vista:

- auth funcional;
- dashboard funcional;
- módulos com conteúdo e quizzes;
- relatórios básicos;
- mundo 3D multiplayer com integração real ao backend.

O que falta não é "refazer tudo", e sim consolidar a arquitetura para sair de um MVP técnico promissor e virar uma plataforma universitária completa.

A decisão mais importante deste blueprint é esta:

- `Login-system` vira o cérebro da plataforma;
- `Multiplayer-project` vira a camada imersiva e realtime;
- ambos evoluem sob um contrato claro, com storage externo, múltiplos papéis, domínio acadêmico formal e analytics unificado.
