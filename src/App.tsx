import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate, useLocation } from "react-router-dom";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import AppLayout from "@/components/AppLayout";
import { partnerTestLockState } from "@/lib/partnerTest";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Dashboard from "./pages/Dashboard";
import NewSimulation from "./pages/NewSimulation";
import SimulationResult from "./pages/SimulationResult";
import Patients from "./pages/Patients";
import PatientProfile from "./pages/PatientProfile";
import History from "./pages/History";
import SettingsPage from "./pages/Settings";
import SubscriptionSettings from "./pages/SubscriptionSettings";
import PricingSimulator from "./pages/PricingSimulator";
import FirstAccessPassword from "./pages/FirstAccessPassword";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();
const FIRST_ACCESS_ROUTE = "/primeiro-acesso/alterar-senha";

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, authReady, user } = useAuth();
  const location = useLocation();
  if (!authReady) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-sm text-muted-foreground">
        Carregando…
      </div>
    );
  }
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (user?.firstAccess && location.pathname !== FIRST_ACCESS_ROUTE) {
    return <Navigate to={FIRST_ACCESS_ROUTE} replace />;
  }
  if (!user?.firstAccess && location.pathname === FIRST_ACCESS_ROUTE) {
    return <Navigate to="/dashboard" replace />;
  }
  const lock = partnerTestLockState(user ?? null);
  if (
    lock.locked &&
    user &&
    location.pathname !== FIRST_ACCESS_ROUTE &&
    !location.pathname.startsWith("/configuracoes")
  ) {
    return <Navigate to="/configuracoes/assinatura" replace />;
  }
  return <>{children}</>;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/login" element={<Login />} />
              <Route path="/cadastro" element={<Signup />} />
              <Route path="/esqueci-senha" element={<ForgotPassword />} />
              <Route path="/redefinir-senha" element={<ResetPassword />} />
              <Route
                path={FIRST_ACCESS_ROUTE}
                element={
                  <ProtectedRoute>
                    <FirstAccessPassword />
                  </ProtectedRoute>
                }
              />
              <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/nova-simulacao" element={<NewSimulation />} />
                <Route path="/resultado-simulacao" element={<SimulationResult />} />
                <Route path="/pacientes" element={<Patients />} />
                <Route path="/pacientes/:id" element={<PatientProfile />} />
                <Route path="/historico" element={<History />} />
                <Route path="/configuracoes" element={<SettingsPage />} />
                <Route path="/configuracoes/assinatura" element={<SubscriptionSettings />} />
                <Route path="/simulador-precos" element={<PricingSimulator />} />
              </Route>
              <Route path="*" element={<NotFound />} />
            </Routes>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
