import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import type { LucideIcon } from 'lucide-react';
import { PlusCircle, Users, Activity, Calendar, TrendingUp, Sparkles, ShoppingBag, XCircle } from 'lucide-react';
import { fetchDashboardSummary } from '@/controllers/dashboardApi';
import { brandMark } from '@/assets/brandAssets';

const Dashboard = () => {
  const { user } = useAuth();
  const { data, isLoading, isError } = useQuery({
    queryKey: ['dashboard', 'summary'],
    queryFn: fetchDashboardSummary,
  });

  const stats = [
    {
      label: 'Simulações Criadas',
      value: data?.totalSimulations ?? '—',
      icon: Sparkles,
      color: 'text-primary',
    },
    {
      label: 'Pacientes',
      value: data?.totalPatients ?? '—',
      icon: Users,
      color: 'text-info',
    },
    {
      label: 'Vendas realizadas',
      value: data?.totalSales ?? '—',
      icon: ShoppingBag,
      color: 'text-success',
    },
    {
      label: 'Sem venda',
      value: data?.totalNoSales ?? '—',
      icon: XCircle,
      color: 'text-muted-foreground',
    },
    {
      label: 'Taxa de Conversão',
      value: data != null ? `${data.conversionRate}%` : '—',
      icon: TrendingUp,
      color: 'text-warning',
    },
    {
      label: 'Procedimentos este mês',
      value: data?.proceduresThisMonth ?? '—',
      icon: Activity,
      color: 'text-primary',
    },
  ];

  const recentSimulations = data?.recentSimulations ?? [];

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="ds-label-mono mb-1">Painel</p>
          <h1 className="font-display text-3xl font-bold tracking-tight text-foreground">
            Olá, {user?.name?.split(' ')[0] || 'Doutor'} 👋
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">{user?.clinic}</p>
        </div>
        <Link
          to="/nova-simulacao"
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground shadow-primary transition-all hover:opacity-95"
        >
          <PlusCircle className="h-4 w-4" />
          Nova Simulação
        </Link>
      </div>

      {isError && (
        <p className="text-sm text-destructive">Não foi possível carregar o painel. Verifique se a API está no ar.</p>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="ds-feature-card group relative p-5 shadow-card ds-transition-surface hover:shadow-elevated"
          >
            <div className="ds-feature-card-glow -right-4 -top-4 bg-primary/15 group-hover:bg-primary/20" />
            <div className="relative z-10">
              <div className="mb-3 flex items-center justify-between">
                <stat.icon className={`h-5 w-5 ${stat.color}`} />
              </div>
              <p className="font-display text-2xl font-bold tracking-tight text-foreground">
                {isLoading ? '…' : stat.value}
              </p>
              <p className="ds-label-mono mt-2 text-[10px] normal-case tracking-wide text-muted-foreground">
                {stat.label}
              </p>
            </div>
          </div>
        ))}
      </div>

      <div className="ds-feature-card overflow-hidden shadow-card ds-transition-surface">
        <div className="flex items-center justify-between border-b border-border/80 p-5">
          <div>
            <p className="ds-label-mono mb-1">Lista</p>
            <h2 className="font-display font-semibold text-foreground">Simulações recentes</h2>
          </div>
          <Link to="/pacientes" className="text-xs font-medium text-primary hover:underline">
            Ver todas
          </Link>
        </div>
        <div className="divide-y divide-border">
          {recentSimulations.length === 0 && !isLoading && (
            <div className="px-5 py-8 text-center text-sm text-muted-foreground">Nenhuma simulação ainda.</div>
          )}
          {recentSimulations.map((sim) => (
            <div key={sim.id} className="flex items-center justify-between px-5 py-4">
              <div className="flex items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-border/60 bg-secondary/80">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">{sim.patientName}</p>
                  <p className="text-xs text-muted-foreground">{sim.procedure}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">
                  {new Date(sim.date).toLocaleDateString('pt-BR')}
                </p>
                {/* {sim.points != null && sim.points > 0 && (
                  <p className="text-xs font-medium text-primary">{sim.points} pontos</p>
                )} */}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
