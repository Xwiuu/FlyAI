import { format, formatDistanceToNow } from "date-fns"
import { ptBR } from "date-fns/locale"

export function formatBRL(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(value)
}

export function formatBRLCompact(value: number): string {
  if (value >= 1_000_000) return `R$ ${(value / 1_000_000).toFixed(1)}M`
  if (value >= 1_000) return `R$ ${(value / 1_000).toFixed(0)}K`
  return formatBRL(value)
}

export function formatDate(date: string | Date): string {
  return format(new Date(date), "d 'de' MMMM 'de' yyyy", { locale: ptBR })
}

export function formatDateShort(date: string | Date): string {
  return format(new Date(date), "dd/MM/yyyy", { locale: ptBR })
}

export function formatRelative(date: string | Date): string {
  return formatDistanceToNow(new Date(date), { locale: ptBR, addSuffix: true })
}

export function formatGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return "Bom dia"
  if (hour < 18) return "Boa tarde"
  return "Boa noite"
}

export function formatTodayLong(): string {
  return format(new Date(), "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR })
}
