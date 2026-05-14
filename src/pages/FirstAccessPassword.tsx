import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { getApiErrorMessage } from '@/controllers/apiErrors';
import { changePassword } from '@/controllers/userApi';
import { brandWordmark } from '@/assets/brandAssets';
import { PasswordField } from '@/components/PasswordField';

const FirstAccessPassword = () => {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!currentPassword || !newPassword || !confirmPassword) {
      setError('Preencha todos os campos.');
      return;
    }
    if (newPassword.length < 8) {
      setError('A nova senha deve ter pelo menos 8 caracteres.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('A confirmação da senha não confere.');
      return;
    }

    try {
      setLoading(true);
      await changePassword({ currentPassword, newPassword });
      logout();
      navigate('/login', { replace: true });
    } catch (err) {
      setError(getApiErrorMessage(err, 'Não foi possível alterar a senha.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-background">
      <div className="ds-shell-bg pointer-events-none fixed inset-0 z-0" aria-hidden>
        <div className="ds-blob ds-blob-1" />
        <div className="ds-blob ds-blob-2" />
        <div className="ds-blob ds-blob-3" />
        <div className="ds-noise" />
        <div className="ds-grid-overlay" />
      </div>

      <div className="relative z-10 flex min-h-screen items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="ds-animate-in mb-8 text-center">
            <img
              src={brandWordmark}
              alt="luni"
              className="mx-auto h-11 w-auto max-w-[min(100%,240px)] object-contain"
            />
            <p className="ds-label-mono mt-4 normal-case">Simulação estética inteligente</p>
          </div>

          <div className="glass-panel ds-animate-in rounded-2xl p-8 shadow-elevated">
            <h2 className="font-display mb-2 text-xl font-semibold text-foreground">Primeiro acesso</h2>
            <p className="mb-6 text-sm text-muted-foreground">
              Por segurança, troque a senha temporária antes de continuar usando a plataforma.
            </p>

            {error && (
              <div className="mb-4 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}

            <form className="space-y-4" onSubmit={handleSubmit}>
              <PasswordField
                id="current-password"
                label="Senha atual (temporária)"
                value={currentPassword}
                onChange={setCurrentPassword}
                autoComplete="current-password"
                disabled={loading}
              />

              <PasswordField
                id="new-password"
                label="Nova senha"
                value={newPassword}
                onChange={setNewPassword}
                showStrength
                autoComplete="new-password"
                disabled={loading}
              />

              <PasswordField
                id="confirm-password"
                label="Confirmar nova senha"
                value={confirmPassword}
                onChange={setConfirmPassword}
                autoComplete="new-password"
                disabled={loading}
              />

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-lg bg-primary py-2.5 text-sm font-medium text-primary-foreground shadow-primary transition-all hover:opacity-95 disabled:opacity-60"
              >
                {loading ? 'Salvando...' : 'Atualizar senha e continuar'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FirstAccessPassword;
