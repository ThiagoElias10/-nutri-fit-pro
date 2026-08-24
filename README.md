# NutriFit Pro

Sistema inteligente de nutrição para profissionais e entusiastas de saúde e fitness.

## Funcionalidades

- **Autenticação segura** - Login, registro e recuperação de senha com JWT
- **Dashboard** - Visão geral com estatísticas e resumos
- **Avaliações físicas** - Cálculo de IMC, metabólismo basal e histórico
- **Gerenciamento de clientes** - Vinculação e acompanhamento individual
- **Banco de alimentos** - Cadastro e busca por categorias
- **Planos alimentares** - Criação e personalização de dietas
- **Diário alimentar** - Registro de refeições do dia
- **Exercícios e treinos** - Cadastro de atividades físicas e rotinas
- **Acompanhamento de progresso** - Medidas corporais e fotos de evolução
- **Receitas** - Cadastro e organização de receitas saudáveis
- **Notificações** - Alertas e lembretes para o usuário
- **Painel administrativo** - Gestão de usuários e estatísticas

## Pré-requisitos

- [Node.js](https://nodejs.org/) v22.0.0 ou superior
- npm

## Instalação

```bash
# Clone o repositório
git clone https://github.com/SEU-USER/nutrifit-pro.git

# Navegue até o diretório
cd nutrifit-pro

# Instale as dependências
npm install
```

## Configuração

```bash
# Copie o arquivo de exemplo de variáveis de ambiente
cp .env.example .env
```

Edite o arquivo `.env` conforme necessário:

| Variável | Descrição | Padrão |
|----------|-----------|--------|
| `PORT` | Porta do servidor | 3002 |
| `HOST` | Host de escuta | 0.0.0.0 |
| `JWT_SECRET` | Segredo para tokens JWT | Gerado automaticamente |
| `DB_PATH` | Caminho do banco de dados | ./nutrifit.db |
| `CORS_ORIGINS` | Origens permitidas (separadas por vírgula) | http://localhost:5173 |
| `COOKIE_SECURE` | Cookies seguros (HTTPS) | false |
| `LOG_LEVEL` | Nível de log (debug/info/warn/error) | info |

## Executando o projeto

### Backend

```bash
npm start
```

O servidor estará disponível em http://localhost:3002

### Frontend (desenvolvimento)

```bash
cd frontend
npm install
npm run dev
```

O frontend estará disponível em http://localhost:5173

## Deploy no Render

1. Crie uma conta gratuita em [render.com](https://render.com)

2. Suba o código no GitHub:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin https://github.com/SEU-USER/nutrifit-pro.git
   git push -u origin main
   ```

3. No Render, clique em "New +" → "Web Service"

4. Conecte seu repositório GitHub

5. Configure:
   - **Name:** nutrifit-pro
   - **Runtime:** Node
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`

6. Clique em "Create Web Service"

O link público será algo como `https://nutrifit-pro.onrender.com`

## Estrutura do Projeto

```
nutrifit-pro/
├── frontend/          # Frontend React com TypeScript
│   ├── src/
│   ├── dist/          # Build do frontend
│   └── package.json
├── src/
│   ├── routes/        # Rotas da API
│   ├── auth.js        # Autenticação
│   ├── db.js          # Conexão com banco
│   ├── logger.js      # Sistema de logs
│   ├── schemas.js     # Validações com Zod
│   └── validate.js    # Middleware de validação
├── public/            # Arquivos estáticos (legado)
├── server.js          # Servidor Express
├── electron.js        # App Electron
├── package.json
└── .env.example
```

## Tecnologias

### Backend
- [Node.js](https://nodejs.org/) - Runtime JavaScript
- [Express](https://expressjs.com/) - Framework web
- [SQLite](https://www.sqlite.org/) via [sql.js](https://sql.js.org/) - Banco de dados
- [JWT](https://jwt.io/) - Autenticação
- [Zod](https://zod.dev/) - Validação de dados
- [Bcrypt](https://www.npmjs.com/package/bcryptjs) - Hash de senhas

### Frontend
- [React](https://react.dev/) - Biblioteca de UI
- [TypeScript](https://www.typescriptlang.org/) - Tipagem estática
- [Vite](https://vitejs.dev/) - Build tool
- [Tailwind CSS](https://tailwindcss.com/) - Estilização
- [Recharts](https://recharts.org/) - Gráficos

### Desktop
- [Electron](https://www.electronjs.org/) - App desktop

## API

A documentação completa da API está disponível acessando `GET /api` após iniciar o servidor.

Principais endpoints:

- `POST /api/auth/login` - Login
- `POST /api/auth/register` - Registro
- `GET /api/dashboard` - Dados do dashboard
- `GET /api/alimentos` - Lista de alimentos
- `GET /api/planos-alimentares` - Planos alimentares
- `GET /api/treinos` - Treinos

## Licença

MIT
