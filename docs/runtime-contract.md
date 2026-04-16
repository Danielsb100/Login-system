# Runtime Contract - Etapa 7.1

Este documento fixa o primeiro corte da etapa `7.1` do blueprint no repositório `Login-system`.

## Objetivo deste corte

- centralizar configuração de ambiente em um único módulo;
- expor contrato runtime para o frontend sem URLs hardcoded;
- começar a padronização de respostas HTTP.

## Configuração centralizada

Toda leitura de ambiente deve passar por `config/env.js`.

Variáveis introduzidas neste corte:

- `PORT`
- `NODE_ENV`
- `DATABASE_URL`
- `JWT_SECRET`
- `JWT_EXPIRES_IN`
- `EMAIL_USER`
- `EMAIL_PASS`
- `EMAIL_FROM_NAME`
- `CORS_ORIGIN`
- `PUBLIC_API_BASE_URL`
- `PUBLIC_MULTIPLAYER_URL`
- `UPLOAD_MAX_FILE_SIZE_MB`
- `ENABLE_AUTO_SEED_MASTER`
- `MASTER_USERNAME`
- `MASTER_EMAIL`
- `MASTER_PASSWORD`

## Contrato público para o frontend

O backend publica `GET /app-config.js`, que injeta `window.__APP_CONFIG__` com:

- `apiBaseUrl`
- `multiplayerUrl`
- `upload.maxFileSizeMb`
- `auth.tokenExpiresIn`

Esse contrato substitui URLs hardcoded no cliente do `Login-system`.

## Shape HTTP introduzido

Respostas que já passaram pelo helper novo seguem o padrão:

Sucesso:

```json
{
  "ok": true,
  "message": "Login successful",
  "token": "...",
  "user": {}
}
```

Erro:

```json
{
  "ok": false,
  "error": "Invalid email or password.",
  "code": "AUTH_INVALID_CREDENTIALS"
}
```

Nesta etapa o padrão começou pelo fluxo de autenticação e pelos erros globais. Os outros controllers ainda podem responder no formato legado até a migração completa.
