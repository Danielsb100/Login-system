# Plano de Testes Local - Login-system

Este documento e especifico do repositorio `Login-system`.

Para o plano integrado do projeto com os dois repositorios (`Login-system` + `Multiplayer-project`), use `C:\Code\training-eurobot\docs\testing-plan.md`.

Este plano cobre o jeito pratico de validar o `Login-system` hoje, do nivel mais barato ao fluxo manual completo no navegador.

## 1. Pre-requisitos

- Node.js instalado
- PostgreSQL acessivel pela `DATABASE_URL`
- arquivo `.env` criado a partir de `.env.example`

Variaveis minimas para rodar:

- `DATABASE_URL`
- `JWT_SECRET`

Variaveis opcionais para o fluxo completo:

- `EMAIL_USER`
- `EMAIL_PASS`
- `PUBLIC_MULTIPLAYER_URL`

## 2. Validacao rapida apos alteracoes

Hoje o projeto ainda nao tem uma suite real de unit tests. O check mais barato e seguro e validar sintaxe dos arquivos alterados.

Comandos uteis:

```powershell
node --check index.js
node --check controllers/authController.js
node --check middleware/authMiddleware.js
node --check services/emailService.js
node --check public/js/app.js
```

Se a mudanca tocar Prisma, rode tambem:

```powershell
npx prisma generate
```

## 3. Smoke test de API local

Instalacao e bootstrap:

```powershell
npm install
npx prisma db push
npm start
```

Observacao importante: `npm start` executa `npx prisma db push --accept-data-loss`. Use apenas um banco local e descartavel.

Com o servidor no ar em `http://localhost:3000`, valide o fluxo de autenticacao:

1. `POST /auth/register`
2. `POST /auth/verify-email`
3. `POST /auth/login`
4. `GET /auth/verify` com bearer token

Exemplo de smoke em PowerShell:

```powershell
$register = Invoke-RestMethod -Method Post -Uri "http://localhost:3000/auth/register" -ContentType "application/json" -Body '{"username":"tester01","email":"tester01@example.com","password":"123456"}'
```

```powershell
$login = Invoke-RestMethod -Method Post -Uri "http://localhost:3000/auth/login" -ContentType "application/json" -Body '{"email":"tester01@example.com","password":"123456"}'
```

```powershell
Invoke-RestMethod -Method Get -Uri "http://localhost:3000/auth/verify" -Headers @{ Authorization = "Bearer $($login.token)" }
```

Se o SMTP nao estiver configurado, o registro continua funcionando, mas voce nao recebe o codigo por email. Nessa situacao:

- abra o banco via Prisma Studio para ler `verificationCode`; ou
- atualize o usuario manualmente para `isVerified = true`.

## 4. End-to-end manual no navegador

Com o backend rodando:

1. Abrir `http://localhost:3000/index.html`
2. Registrar uma conta nova
3. Verificar o email com o codigo
4. Fazer login
5. Confirmar redirecionamento para `/dashboard.html`
6. Validar carregamento de perfil (`username`, `email`, `role`)
7. Testar upload de foto de perfil
8. Testar upload de documento
9. Se estiver usando uma conta `MASTER`, validar criacao e edicao de modulo
10. Se `PUBLIC_MULTIPLAYER_URL` estiver configurada, clicar em `Entrar no Mundo 3D` e confirmar abertura correta com o token

## 5. Casos minimos para a etapa 7.1

Para o corte atual da etapa `7.1`, o minimo aceitavel e:

1. servidor sobe com a configuracao centralizada
2. `GET /app-config.js` responde com `window.__APP_CONFIG__`
3. login e verificacao de token continuam funcionando
4. erros de autenticacao retornam `ok: false`, `error` e `code`
5. frontend abre o link do multiplayer a partir da config runtime, sem URL hardcoded

## 6. Limitacoes atuais

- ainda nao existe suite automatizada de unit/integration tests
- `test_db.js` esta quebrado e nao deve ser usado como referencia
- `check-docs.js` esta desatualizado em relacao ao schema atual
- o usuario `MASTER` seedado nao nasce verificado, entao o login local pode exigir ajuste manual no banco

## 7. Proximo passo recomendado

Quando quiser transformar esse plano em automacao de verdade:

1. adicionar `vitest` ou `jest`
2. adicionar `supertest` para os endpoints Express
3. criar banco de teste isolado para Prisma
4. adicionar um smoke E2E com Playwright para `register -> verify -> login -> dashboard`
