import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, PlusCircle, Users, Settings, LogOut, Calculator, Zap } from 'lucide-react';
import { brandWordmark } from '@/assets/brandAssets';
import { useAuth } from '@/contexts/AuthContext';
import { partnerTestLockState } from '@/lib/partnerTest';
import { cn } from '@/lib/utils';

const navItems = [
  { path: '/dashboard', label: 'Painel', short: 'PNL', icon: LayoutDashboard },
  { path: '/nova-simulacao', label: 'Nova Simulação', short: 'NOV', icon: PlusCircle },
  { path: '/pacientes', label: 'Pacientes', short: 'PAC', icon: Users },
  { path: '/simulador-precos', label: 'Simulador de Preços', short: 'PREÇ', icon: Calculator },
  { path: '/configuracoes', label: 'Configurações', short: 'CFG', icon: Settings },
];

export interface AppSidebarContentProps {
  /** Fecha o drawer ao navegar (mobile / tablet &lt; xl). */
  onNavigate?: () => void;
}

function simulationCreditsStyle(remaining: number, total: number) {
  if (remaining <= 5) {
    return {
      tone: 'critical' as const,
      iconClass: 'text-red-600',
      valueClass: 'text-red-700',
      barClass: 'bg-red-500',
    };
  }
  const half = Math.floor(total / 2);
  if (remaining <= half) {
    return {
      tone: 'warning' as const,
      iconClass: 'text-amber-500',
      valueClass: 'text-amber-800',
      barClass: 'bg-amber-500',
    };
  }
  return {
    tone: 'ok' as const,
    iconClass: 'text-primary',
    valueClass: 'text-foreground',
    barClass: 'bg-primary',
  };
}

export function AppSidebarContent({ onNavigate }: AppSidebarContentProps) {
  const location = useLocation();
  const { user, logout } = useAuth();
  const partnerLocked = user ? partnerTestLockState(user).locked : false;
  const isPartnerTest = user?.accountType === 'partner_test';
  /** Contas oficiais: cota mensal. Parceiro teste: sem cota mensal — barra/tons com denominador mínimo 10 só para UI. */
  const partnerTestBarDen =
    user && isPartnerTest ? Math.max(user.simulationCreditsRemaining, 10) : 0;
  const cr =
    user && isPartnerTest
      ? simulationCreditsStyle(user.simulationCreditsRemaining, partnerTestBarDen)
      : user && user.simulationMonthlyQuota > 0
        ? simulationCreditsStyle(user.simulationCreditsRemaining, user.simulationMonthlyQuota)
        : null;

  return (
    <>
      <div className="shrink-0 border-b border-border/80 p-6">
        <Link
          to={partnerLocked ? '/configuracoes/assinatura' : '/dashboard'}
          className="group flex flex-col gap-2"
          onClick={() => onNavigate?.()}
        >
          <img
            src={brandWordmark}
            alt="luni"
            className="h-9 w-auto max-w-[11.5rem] object-contain object-left"
          />
        </Link>
      </div>

      <nav className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto p-4">
        <p className="ds-label-mono mb-2 px-3">Menu</p>
        {navItems.map((item) => {
          const isActive =
            location.pathname === item.path || location.pathname.startsWith(item.path + '/');
          const disabled = partnerLocked && item.path !== '/configuracoes';
          const inner = (
            <>
              <span
                className={cn(
                  'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border transition-colors',
                  isActive
                    ? 'border-primary/40 bg-primary/15 text-primary'
                    : 'border-border/60 bg-background/50 text-muted-foreground',
                )}
              >
                <item.icon className="h-5 w-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate leading-snug">{item.label}</span>
                <span className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground opacity-80">
                  {item.short}
                </span>
              </span>
            </>
          );
          return disabled ? (
            <span
              key={item.path}
              className={cn('ds-nav-item pointer-events-none cursor-not-allowed opacity-40')}
              aria-disabled="true"
            >
              {inner}
            </span>
          ) : (
            <Link
              key={item.path}
              to={item.path}
              onClick={() => onNavigate?.()}
              className={cn(
                'ds-nav-item',
                isActive ? 'ds-nav-item-active' : 'ds-nav-item-idle',
              )}
            >
              {inner}
            </Link>
          );
        })}
      </nav>

      <div className="shrink-0 space-y-3 border-t border-border/80 p-4">
        {user && (
          <div
            className={cn(
              'flex items-center gap-2 rounded-xl border bg-muted/20 px-3 py-2',
              cr?.tone === 'critical' && 'border-red-500/40',
              cr?.tone === 'warning' && 'border-amber-500/40',
              (cr?.tone === 'ok' || !cr) && 'border-border/60',
            )}
          >
            <Zap
              className={cn('h-4 w-4 shrink-0', cr ? cr.iconClass : 'text-primary')}
            />
            <div className="min-w-0 flex-1">
              {isPartnerTest && cr ? (
                <>
                  <p className="text-xs font-medium">
                    <span className={cr.valueClass}>{user.simulationCreditsRemaining}</span>
                    <span className="ml-1 font-normal text-muted-foreground">
                      simulação(ões) restante(s)
                    </span>
                  </p>
                  <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-border/60">
                    <div
                      className={cn('h-full rounded-full transition-all', cr.barClass)}
                      style={{
                        width: `${Math.min(
                          100,
                          Math.round((user.simulationCreditsRemaining / partnerTestBarDen) * 100),
                        )}%`,
                      }}
                    />
                  </div>
                </>
              ) : user.simulationMonthlyQuota > 0 && cr ? (
                <>
                  <p className="text-xs font-medium">
                    <span className={cr.valueClass}>
                      {user.simulationCreditsRemaining} / {user.simulationMonthlyQuota}
                    </span>
                    <span className="ml-1 font-normal text-muted-foreground">simulações</span>
                  </p>
                  <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-border/60">
                    <div
                      className={cn('h-full rounded-full transition-all', cr.barClass)}
                      style={{
                        width: `${Math.min(100, Math.round((user.simulationCreditsRemaining / user.simulationMonthlyQuota) * 100))}%`,
                      }}
                    />
                  </div>
                </>
              ) : (
                <p className="text-xs text-muted-foreground">Sem simulações disponíveis</p>
              )}
            </div>
          </div>
        )}
        <div className="flex items-center gap-3 rounded-2xl border border-border/60 bg-muted/30 px-3 py-2">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full gradient-primary text-xs font-bold text-primary-foreground">
            {user?.name?.charAt(0) || 'U'}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-foreground">{user?.name}</p>
            <p className="truncate text-xs text-muted-foreground">{user?.clinic}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            onNavigate?.();
            void logout();
          }}
          className="ds-icon-btn flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium text-muted-foreground hover:text-destructive"
        >
          <LogOut className="h-5 w-5 shrink-0" />
          Sair
        </button>
      </div>
    </>
  );
}

const AppSidebar = () => {
  return (
    <aside className="ds-sidebar-surface fixed left-0 top-0 z-50 hidden h-screen min-h-0 w-64 flex-col xl:flex">
      <AppSidebarContent />
    </aside>
  );
};

export default AppSidebar;
