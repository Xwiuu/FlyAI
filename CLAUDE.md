# CLAUDE.md — Fly.AI Project Bible

## Visão geral
Fly.AI é uma empresa de inteligência operacional que projeta e constrói sistemas inteligentes para empresas modernas. Este repositório contém dois produtos internos:
1. **Time de agentes de marketing** — agentes de IA que gerenciam o marketing da Fly.AI
2. **Dashboard interno** — coração da empresa, centraliza todas as métricas e operações

---

## Stack técnica

### Frontend / Dashboard
- Next.js 14+ (App Router)
- Tailwind CSS
- TypeScript (strict mode obrigatório)
- Shadcn/ui para componentes base

### Backend / Banco de dados
- Supabase (PostgreSQL + Auth + Storage)
- Autenticação com 2FA obrigatório
- 2 usuários apenas: founder CTO + founder Comercial
- **Row Level Security (RLS) ativo em todas as tabelas** — nenhuma tabela com acesso público. Policies permitem operações apenas se `auth.uid()` bater com IDs autorizados (diretoria técnica e comercial)

### LLMs (zero-cost MVP)
- Gemini 2.5 Flash — research, analytics, daily brief (1.500 req/dia grátis)
- Groq Llama 3.3 70B — tasks rápidas, fallback (30 RPM grátis)
- NVIDIA NIM Qwen 3-235B — copy PT-BR premium (5.000 credits grátis)
- Fallback chain: Gemini → Groq → NIM → OpenRouter free

### Integrações futuras
- Stripe ou AbacatePay (financeiro)
- Instagram Graph API (postagem automática — fase 4)
- LinkedIn API (métricas — fase 4)

---

## Estrutura de pastas

```
flyai/
├── CLAUDE.md                    ← este arquivo
├── FLY.md                       ← brand bible (leia antes de qualquer output)
├── README.md
├── .env.local                   ← nunca committar
├── .env.example
│
├── dashboard/                   ← Next.js app
│   ├── app/
│   │   ├── (auth)/
│   │   │   ├── login/
│   │   │   └── 2fa/
│   │   ├── (protected)/
│   │   │   ├── overview/
│   │   │   ├── financeiro/
│   │   │   ├── comercial/
│   │   │   ├── clientes/
│   │   │   ├── marketing/
│   │   │   ├── okrs/
│   │   │   └── agentes/
│   │   └── layout.tsx
│   ├── components/
│   │   ├── ui/                  ← shadcn components
│   │   ├── dashboard/           ← componentes específicos do dash
│   │   └── agents/              ← componentes do time de agentes
│   └── lib/
│       ├── supabase.ts
│       ├── llm-router.ts        ← roteador multi-provider
│       └── utils.ts
│
├── agents/                      ← time de agentes de marketing
│   ├── system-prompts/
│   │   ├── ceo-agent.md
│   │   ├── research-agent.md
│   │   ├── content-agent.md
│   │   └── analytics-agent.md
│   ├── skills/
│   │   ├── linkedin-post.md
│   │   ├── instagram-carousel.md
│   │   └── research-trends.md
│   ├── workflows/
│   │   ├── daily-brief.ts
│   │   ├── weekly-planning.ts
│   │   └── content-production.ts
│   └── scheduler/
│       └── cron.ts              ← crons dos rituais
│
└── supabase/
    ├── migrations/
    │   └── 001_initial_schema.sql
    └── seed.sql
```

---

## Schema do banco de dados

```sql
-- =============================================
-- Fly.AI — Initial Schema
-- Migration: 001_initial_schema.sql
-- RLS ativado em todas as tabelas
-- =============================================

-- Posts gerados pelos agentes
CREATE TABLE posts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  agent VARCHAR(50) NOT NULL,        -- 'content' | 'ceo' | 'research'
  type VARCHAR(50) NOT NULL,         -- 'linkedin' | 'instagram' | 'carousel'
  content TEXT NOT NULL,
  status VARCHAR(20) DEFAULT 'draft', -- 'draft' | 'pending' | 'approved' | 'rejected' | 'published'
  scheduled_for TIMESTAMPTZ,         -- agendamento para publicação (fase 4)
  created_at TIMESTAMPTZ DEFAULT NOW(),
  approved_at TIMESTAMPTZ,
  approved_by UUID REFERENCES auth.users(id),
  published_at TIMESTAMPTZ
);
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "posts_auth_only" ON posts
  USING (auth.uid() IS NOT NULL);

-- Briefs diários do CEO Agent
CREATE TABLE briefs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  date DATE NOT NULL UNIQUE,
  content TEXT NOT NULL,             -- markdown do brief completo
  status VARCHAR(20) DEFAULT 'pending',
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE briefs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "briefs_auth_only" ON briefs
  USING (auth.uid() IS NOT NULL);

-- Métricas de marketing (input manual no MVP)
CREATE TABLE metrics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  platform VARCHAR(50) NOT NULL,     -- 'instagram' | 'linkedin'
  metric_name VARCHAR(100) NOT NULL, -- 'followers' | 'engagement' | 'reach'
  value NUMERIC NOT NULL,
  post_id UUID REFERENCES posts(id), -- permite cruzar qual post gerou qual engajamento
  collected_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE metrics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "metrics_auth_only" ON metrics
  USING (auth.uid() IS NOT NULL);

-- Clientes ativos
CREATE TABLE clients (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  ticket NUMERIC NOT NULL,           -- valor mensal em BRL
  status VARCHAR(20) DEFAULT 'active', -- 'active' | 'paused' | 'churned'
  started_at DATE NOT NULL,
  next_delivery DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "clients_auth_only" ON clients
  USING (auth.uid() IS NOT NULL);

-- Pipeline comercial
CREATE TABLE pipeline (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  company VARCHAR(255),
  email VARCHAR(255),
  stage VARCHAR(50) NOT NULL,        -- 'lead' | 'call_scheduled' | 'proposal' | 'closed_won' | 'closed_lost'
  estimated_ticket NUMERIC,
  win_probability INTEGER,           -- 0-100, para projeção de MRR ponderado no overview
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE pipeline ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pipeline_auth_only" ON pipeline
  USING (auth.uid() IS NOT NULL);

-- Financeiro (input manual no MVP)
CREATE TABLE transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  type VARCHAR(10) NOT NULL,         -- 'income' | 'expense'
  description VARCHAR(255) NOT NULL,
  amount NUMERIC NOT NULL,           -- em BRL
  category VARCHAR(100),             -- 'mrr' | 'tools' | 'tax' | 'other'
  date DATE NOT NULL,
  client_id UUID REFERENCES clients(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "transactions_auth_only" ON transactions
  USING (auth.uid() IS NOT NULL);

-- OKRs e metas
CREATE TABLE okrs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  quarter VARCHAR(10) NOT NULL,      -- '2026-Q2'
  objective TEXT NOT NULL,
  key_results JSONB NOT NULL,        -- [{title, target, current, unit}]
  status VARCHAR(20) DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE okrs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "okrs_auth_only" ON okrs
  USING (auth.uid() IS NOT NULL);

-- Log de execução dos agentes
CREATE TABLE agent_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  agent VARCHAR(50) NOT NULL,
  action VARCHAR(100) NOT NULL,
  status VARCHAR(20) NOT NULL,       -- 'success' | 'error' | 'pending'
  output TEXT,
  error TEXT,
  tokens_used INTEGER,
  duration_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE agent_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "agent_logs_auth_only" ON agent_logs
  USING (auth.uid() IS NOT NULL);
```

---

## Módulos do dashboard

| Módulo | Rota | Descrição |
|--------|------|-----------|
| Overview | /overview | MRR, clientes ativos, pipeline ponderado, OKRs resumidos, saúde geral |
| Financeiro | /financeiro | Receitas, despesas, MRR, projeção. Input manual no MVP |
| Comercial | /comercial | Pipeline Giovanni. Leads → calls → propostas → fechamentos + win_probability |
| Clientes | /clientes | Lista de clientes ativos, ticket, status, próxima entrega |
| Marketing | /marketing | Métricas IG/LinkedIn. Input manual. Posts pendentes de aprovação |
| Metas / OKRs | /okrs | Objetivos trimestrais com progresso visual |
| Time de agentes | /agentes | Status de cada agente, último output, fila de aprovações |

---

## Time de agentes — funcionamento

### Os 4 agentes
- **CEO Agent** — orquestra todos, gera daily brief às 07h55
- **Research Agent** — trends diários às 07h00 (Gemini + web search)
- **Content Agent** — posts LinkedIn e Instagram (Qwen 3 via NIM)
- **Analytics Agent** — métricas semanais toda sexta às 18h

### Rituais automáticos
- **Daily 07h55** — CEO Agent consolida brief do dia → salva em `briefs` → notifica via Discord webhook
- **Weekly domingo 22h** — plano semanal completo → fila de aprovação no módulo /agentes
- **Monthly última sexta 18h** — relatório mensal consolidado

### Fluxo de aprovação
1. Agente gera output → salva em `posts` com status `pending`
2. Dashboard mostra na fila de aprovações em /agentes
3. CTO aprova/rejeita → status atualiza para `approved` ou `rejected`
4. Aprovado → publicação manual ou automática via `scheduled_for` (fase 4)

---

## LLM Router — lógica de roteamento

```typescript
type TaskType = 'research' | 'copy_ptbr' | 'analytics' | 'fast' | 'long_context'

function route(task: TaskType): Provider {
  switch(task) {
    case 'long_context': return 'gemini'      // 1M ctx grátis
    case 'research':     return 'gemini'      // web search nativo
    case 'copy_ptbr':    return 'nim_qwen3'   // melhor PT-BR
    case 'analytics':    return 'gemini'      // reasoning
    case 'fast':         return 'groq'        // 300 tok/s
    default:             return 'gemini'
  }
}

// Fallback chain quando hit rate limit
const fallbackChain = ['gemini', 'groq', 'nim', 'openrouter_free']
```

### Timeout obrigatório
Implementar **hard-timeout de 15 segundos** em todas as chamadas de LLM. Se o provider não responder em 15s, aborta e passa automaticamente para o próximo no `fallbackChain`. Evita que a fila de aprovação do dashboard trave por timeout silencioso.

```typescript
const LLM_TIMEOUT_MS = 15_000

async function callWithTimeout(provider: Provider, payload: any) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), LLM_TIMEOUT_MS)
  try {
    return await callProvider(provider, payload, { signal: controller.signal })
  } catch (err) {
    if (err.name === 'AbortError') {
      // passa pro próximo da chain
      return fallbackToNext(provider, payload)
    }
    throw err
  } finally {
    clearTimeout(timeout)
  }
}
```

---

## Regras de desenvolvimento

### Obrigatórias
- Nunca committar `.env.local` ou qualquer chave de API
- Todo output de agente passa por aprovação humana antes de publicar
- Toda rota do dashboard é protegida por autenticação
- TypeScript strict mode em tudo
- RLS ativo em todas as tabelas do Supabase desde a migration 001
- Commits em inglês, convenção: `feat:` `fix:` `chore:` `docs:`

### Padrões de código
- Componentes React: functional components + hooks
- Server components onde possível (Next.js App Router)
- Client components apenas quando necessário (interatividade)
- Variáveis de ambiente: sempre via `process.env` com validação no startup
- LLM Router: sempre usar `callWithTimeout` — nunca chamada direta sem timeout

### Sobre a marca
- Sempre ler `FLY.md` antes de gerar qualquer copy ou conteúdo
- Tom: técnico, preciso, premium. Nunca genérico ou com hype
- Vocabulário proibido: revolucionário, incrível, game-changer, chatbot

---

## Variáveis de ambiente necessárias

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# LLMs
GEMINI_API_KEY=
GROQ_API_KEY=
NVIDIA_NIM_API_KEY=
OPENROUTER_API_KEY=

# Notificações
DISCORD_WEBHOOK_URL=

# Financeiro (fase 4)
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
```

---

## Fases do projeto

### Fase 1 — Fundação (semana 1–2)
- [ ] Setup repo GitHub
- [ ] Supabase: projeto + schema + Auth + 2FA
- [ ] RLS ativo em todas as tabelas desde o início
- [ ] Next.js: estrutura de pastas + layout base
- [ ] Autenticação funcionando para 2 usuários

### Fase 2 — Time de agentes (semana 3–5)
- [ ] LLM Router implementado com hard-timeout de 15s
- [ ] Research Agent (Gemini + web search)
- [ ] Content Agent (Qwen 3 via NIM)
- [ ] CEO Agent (orquestra + daily brief)
- [ ] Analytics Agent (relatório semanal)
- [ ] Crons dos rituais configurados
- [ ] Discord webhook para notificações

### Fase 3 — Dashboard (semana 6–9)
- [ ] Overview com KPIs + pipeline ponderado (win_probability)
- [ ] Módulo Financeiro (input manual)
- [ ] Módulo Comercial (pipeline)
- [ ] Módulo Clientes
- [ ] Módulo Marketing + fila de aprovações
- [ ] Módulo OKRs
- [ ] Módulo Time de agentes (fleet status)

### Fase 4 — Escala (mês 3+)
- [ ] Instagram Graph API (postagem automática via scheduled_for)
- [ ] LinkedIn API (métricas automáticas)
- [ ] Cruzamento metrics ↔ posts via post_id (Analytics Agent)
- [ ] Stripe / AbacatePay integrado
- [ ] Agente de prospecção (após autoridade de marca)

---

## Contexto de negócio

- **Empresa:** Fly.AI — Operational Intelligence for Modern Companies
- **Founders:** 2 pessoas (CTO + Comercial)
- **Meta ano 1:** R$1MM receita bruta
- **Nicho:** SaaS B2B brasileiro (50–200 funcionários)
- **Ticket médio:** R$6K–R$15K/mês por cliente
- **Este repositório:** uso interno apenas, não é produto para clientes
