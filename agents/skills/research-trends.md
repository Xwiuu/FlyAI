# Skill: Research Trends

Template estrutural para o Research Agent buscar tópicos do dia.

## Query base (sempre)
- Combine palavras-chave dos 5 eixos do CLAUDE.md com filtros temporais
  ("últimos 7 dias", "this week").
- Idiomas aceitos: PT-BR e EN. Priorize fontes BR quando disponíveis.

## Fontes preferenciais
- The Information, The Pragmatic Engineer, Latent Space, Brazil Journal,
  NeoFeed, Pipeline, blogs de engenharia de empresas (Stripe, Linear,
  Vercel, Resend), arXiv (categoria cs.MA / cs.CL para agentes).

## Fontes a evitar
- Conteúdo gerado por IA sem assinatura humana clara.
- Press releases puros (apenas o anúncio, sem análise).
- LinkedIn opinion pieces sem dado novo.

## Critério de relevância (1–5)
- 5: dado novo, fonte primária, aplicável a SaaS BR esta semana.
- 4: análise de qualidade, fonte respeitada, aplicável em 1 mês.
- 3: contexto útil, mas não acionável.
- 1–2: descartar.
