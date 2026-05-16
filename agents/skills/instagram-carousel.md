# Skill: Instagram Carousel

Template estrutural para o Content Agent gerar `type: "carousel"`.

## Estrutura (7–10 slides)
- **Slide 1 — Hook:** título de no máximo 8 palavras + número/dado de impacto.
- **Slides 2 a N-1 — Conceito por slide:** título curto + 2–4 bullets densos.
  Um conceito por slide, sem mistura.
- **Slide N — Síntese:** 1 parágrafo de fechamento + assinatura
  "Fly.AI — Intelligence as Infrastructure".

## Limites por slide
- Título: até 60 caracteres.
- Corpo: até 280 caracteres.
- Zero emoji decorativo.

## Output esperado
`content` é um array de strings, uma por slide, no formato:
```
TÍTULO

• bullet 1
• bullet 2
• bullet 3
```
