import { ModulePlaceholder } from "@/components/dashboard/module-placeholder";

export default function FinanceiroPage() {
  return (
    <ModulePlaceholder
      phase="Financeiro"
      title="Receitas, despesas e MRR"
      description="Lançamentos manuais no MVP. Integra com Stripe/AbacatePay na Fase 4."
    />
  );
}
