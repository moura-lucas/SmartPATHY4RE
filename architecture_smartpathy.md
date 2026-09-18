# Arquitetura Técnica Proposta — Plataforma SmartPATHY (TCC)

**Base:** Capítulo 6 da dissertação de Ganiyat Saleeman ("Proposed SmartPATHY Platform"), adaptado para implementação real usando o stack de tecnologias já dominado por Lucas Eduardo Souza de Moura.

---

## 1. Por que esse stack encaixa bem

| Necessidade da plataforma | Tecnologia do seu currículo |
|---|---|
| Interface web (Dashboard, formulários, telas de persona/requisitos) | **Next.js + React** |
| API/backend que orquestra os prompts do SmartPATHY e PATHY4RE | **Express.js (Node/TypeScript)** |
| Persistência de projetos, personas e requisitos gerados | **MySQL + Prisma ORM** |
| Ambiente reprodutível para desenvolvimento e entrega do TCC | **Docker** |
| Testes automatizados do backend/frontend | **Jest** |
| Integração e entrega contínua | **Git/GitHub + GitHub Actions** |
| Organização do trabalho ao longo do semestre | **Scrum/Kanban** |

Você não precisa aprender uma stack nova: dá para construir a plataforma inteira com o que já está no seu currículo. O único componente novo é a integração com a API de um LLM (documentada abaixo), que é simples — basta uma chamada HTTP.

---

## 2. Visão geral da arquitetura

```
┌─────────────────────────────────────────────────────────────────┐
│                        FRONTEND (Next.js)                        │
│  Dashboard │ Criação de Projeto │ Persona PATHY │ Requisitos      │
│                         │ Exportação                              │
└───────────────────────────────┬───────────────────────────────────┘
                                 │ REST API (JSON, HTTPS)
┌───────────────────────────────▼───────────────────────────────────┐
│                    BACKEND (Express.js + TypeScript)              │
│  ┌───────────────┐  ┌──────────────────┐  ┌────────────────────┐ │
│  │ Auth/Projetos │  │ Módulo SmartPATHY │  │ Módulo PATHY4RE    │ │
│  │  (CRUD)       │  │ (multi-prompt)    │  │ (geração de reqs)  │ │
│  └───────┬───────┘  └─────────┬─────────┘  └──────────┬─────────┘ │
│          │                    │                        │           │
└──────────┼────────────────────┼────────────────────────┼───────────┘
           │                    │                        │
           ▼                    ▼                        ▼
   ┌───────────────┐   ┌──────────────────┐   ┌──────────────────┐
   │ MySQL (Prisma)│   │  LLM API          │   │  LLM API          │
   │ Projetos,     │   │ (Claude/OpenAI)   │   │ (mesma integração)│
   │ Personas,     │   └──────────────────┘   └──────────────────┘
   │ Requisitos    │
   └───────────────┘

   Tudo containerizado com Docker (frontend, backend, banco em serviços separados via docker-compose)
```

---

## 3. Módulos do backend

### 3.1 Módulo de Projetos (CRUD básico)
- Endpoints REST: `POST /projects`, `GET /projects`, `GET /projects/:id`
- Armazena: nome do projeto, descrição da aplicação, perfil-alvo, nível de experiência tecnológica, notas adicionais (campos do formulário "Project Creation" descrito no Capítulo 6).

### 3.2 Módulo SmartPATHY (geração de persona)
- Endpoint: `POST /projects/:id/generate-persona`
- Recebe os dados do projeto e monta a sequência de prompts estruturados (multi-prompt strategy) descrita na dissertação, um prompt por dimensão PATHY (Do, Feel/Think/Believe, Experience with Technology, Problems, Needs, Existing Solutions).
- Chama a API do LLM sequencialmente ou em uma única chamada estruturada (você pode simplificar para 1 chamada com saída em JSON, o que facilita a persistência).
- Salva o resultado estruturado no banco.

### 3.3 Módulo PATHY4RE (geração de requisitos)
- Endpoint: `POST /projects/:id/generate-requirements`
- Usa a persona PATHY validada como contexto de entrada.
- Chama o LLM pedindo requisitos funcionais e não-funcionais em formato estruturado (ex: JSON com `type`, `description`, `priority`).
- Salva os requisitos vinculados ao projeto.

### 3.4 Módulo de Exportação
- Endpoint: `GET /projects/:id/export?format=pdf|json|docx`
- Gera um documento consolidado (persona + requisitos) para uso em outras ferramentas de engenharia de software.

---

## 4. Modelagem de dados (Prisma schema — rascunho)

```prisma
model Project {
  id                  String   @id @default(uuid())
  name                String
  description         String
  targetProfile       String
  techExperienceLevel String
  notes               String?
  createdAt           DateTime @default(now())
  persona             Persona?
  requirements        Requirement[]
}

model Persona {
  id                String   @id @default(uuid())
  projectId         String   @unique
  project           Project  @relation(fields: [projectId], references: [id])
  doDimension       String   @db.Text
  feelThinkBelieve  String   @db.Text
  techExperience    String   @db.Text
  problems          String   @db.Text
  needs             String   @db.Text
  existingSolutions String   @db.Text
  createdAt         DateTime @default(now())
}

model Requirement {
  id          String   @id @default(uuid())
  projectId   String
  project     Project  @relation(fields: [projectId], references: [id])
  type        String   // "functional" | "non-functional"
  description String   @db.Text
  priority    String?
  createdAt   DateTime @default(now())
}
```

---

## 5. Integração com o LLM

- Use a API do Anthropic (Claude) ou OpenAI via chamada HTTP simples a partir do backend Node/Express — não precisa de SDK complexo, um `fetch`/`axios` resolve.
- Estratégia recomendada: peça ao LLM que **responda apenas em JSON** (schema fixo por dimensão PATHY), isso evita parsing manual de texto livre e facilita salvar direto no Prisma.
- Trate timeouts e falhas de geração com retry simples (2-3 tentativas) — é comum em chamadas de LLM.

---

## 6. Fluxo de telas (mapeado 1:1 com o Capítulo 6 da dissertação)

1. **Dashboard** → lista de projetos, botão "Novo Projeto"
2. **Criação de Projeto** → formulário (nome, descrição, perfil, nível técnico, notas) → botão "Gerar Persona"
3. **Persona PATHY gerada** → exibida nas 6 dimensões, editável → botão "Gerar Requisitos"
4. **Requisitos gerados** → lista de requisitos funcionais/não-funcionais
5. **Exportação** → download em PDF/JSON

---

## 7. Organização sugerida com Docker

```yaml
# docker-compose.yml (esboço)
services:
  frontend:
    build: ./frontend      # Next.js
    ports: ["3000:3000"]
  backend:
    build: ./backend       # Express + TS + Prisma
    ports: ["4000:4000"]
    environment:
      - DATABASE_URL=mysql://user:pass@db:3306/smartpathy
      - LLM_API_KEY=${LLM_API_KEY}
    depends_on: [db]
  db:
    image: mysql:8
    environment:
      - MYSQL_DATABASE=smartpathy
    volumes: ["db_data:/var/lib/mysql"]
volumes:
  db_data:
```

CI/CD com **GitHub Actions**: pipeline simples rodando `npm test` (Jest) no push/PR, e opcionalmente build da imagem Docker.

---

## 8. Escopo sugerido para o TCC (MVP realista)

Dado o prazo de um TCC, recomendo priorizar:

1. **Fase 1 (essencial):** CRUD de projetos + módulo SmartPATHY funcionando ponta a ponta (formulário → LLM → persona salva e exibida).
2. **Fase 2:** módulo PATHY4RE (persona → requisitos).
3. **Fase 3 (se sobrar tempo):** exportação e refinamentos de UI.
4. **Avaliação:** repita a lógica do "Proposed Evaluation Plan" da dissertação — aplique um questionário simples de usabilidade/utilidade com colegas ou usuários-teste, para dar rigor acadêmico ao seu TCC (comparável ao que a autora propõe fazer).

---

Quer que eu já monte o schema completo do Prisma com migrations, ou comece a estruturar os prompts do SmartPATHY (as 6 dimensões) em formato pronto para enviar à API do LLM?
