import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Menu } from 'lucide-react';
import { brandMark } from '@/assets/brandAssets';
import AppSidebar, { AppSidebarContent } from './AppSidebar';
import { PartnerTestBanner } from '@/components/PartnerTestBanner';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { billingLockState, isTrialingOfficial } from '@/lib/billingLock';
import { cn } from '@/lib/utils';

const AppLayout = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user } = useAuth();
  const adminBanner = user?.subscriptionBillingBypass === true;
  const partnerBanner = user?.accountType === 'partner_test';
  const trialingBanner = isTrialingOfficial(user);
  const infoBanner = adminBanner || partnerBanner || trialingBanner;
  const billingLocked = user ? billingLockState(user).locked : false;
  /** Offset para header mobile fixo ficar abaixo da barra de aviso. */
  const mobileTopClass = billingLocked ? 'top-14' : infoBanner ? 'top-11' : 'top-0';

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-background">
      <div className="ds-shell-bg pointer-events-none fixed inset-0 z-0" aria-hidden>
        <div className="ds-blob ds-blob-1" />
        <div className="ds-blob ds-blob-2" />
        <div className="ds-blob ds-blob-3" />
        <div className="ds-noise" />
        <div className="ds-grid-overlay" />
      </div>

      <div className="fixed left-0 right-0 top-0 z-[45] xl:left-64">
        <PartnerTestBanner />
      </div>

      <header
        className={cn(
          'ds-sidebar-surface fixed left-0 right-0 z-40 flex h-14 items-center gap-3 border-b border-border/60 px-4 xl:left-64 xl:hidden',
          mobileTopClass,
        )}
      >
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="shrink-0 rounded-xl"
          aria-label="Abrir menu"
          onClick={() => setMobileMenuOpen(true)}
        >
          <Menu className="h-5 w-5" />
        </Button>
        <div className="flex min-w-0 items-center gap-2">
          <img src={brandMark} alt="" className="h-8 max-h-9 w-auto max-w-[140px] shrink-0 object-contain object-left" />
          <span className="truncate font-display text-base font-bold tracking-tight text-foreground">
            luni
          </span>
        </div>
      </header>

      <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
        <SheetContent
          side="left"
          className="ds-sidebar-surface flex h-full min-h-0 flex-col [&>button]:hidden"
        >
          <SheetTitle className="sr-only">Menu de navegação</SheetTitle>
          <AppSidebarContent onNavigate={() => setMobileMenuOpen(false)} />
        </SheetContent>
      </Sheet>

      <div className="relative z-10 flex min-h-screen">
        <AppSidebar />
        <main
          className={cn(
            'ml-0 min-h-screen flex-1 xl:ml-64',
            billingLocked
              ? 'pt-[7.5rem] xl:pt-14'
              : infoBanner
                ? 'pt-[6.25rem] xl:pt-10'
                : 'pt-14 xl:pt-0',
          )}
        >
          <div className="mx-auto h-full w-full max-w-[1700px] p-6 md:p-8 lg:p-10">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default AppLayout;
