import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { resetPasswordRequest } from '@/controllers/authApi';
import { getApiErrorMessage } from '@/controllers/apiErrors';
import { evaluatePasswordStrength, PasswordField } from '@/components/PasswordField';
import { brandWordmark } from '@/assets/brandAssets';

const ResetPassword = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') ?? '';
  const navigate = useNavigate();

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  if (!token) {
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
            <div className="glass-panel ds-animate-in rounded-2xl p-8 shadow-elevated space-y-4 text-center">
              <p className="text-sm text-muted-foreground">Link inválido ou expirado.</p>
              <Link to="/esqueci-senha" className="block text-sm font-medium text-primary hover:underline">
                Solicitar novo link
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 8) {
      setError('A senha deve ter pelo menos 8 caracteres.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('As senhas não coincidem.');
      return;
    }
    const strength = evaluatePasswordStrength(newPassword);
    if (strength.score < 2) {
      setError('Use uma senha mais forte (pelo menos média).');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await resetPasswordRequest(token, newPassword);
      setSuccess(true);
      setTimeout(() => navigate('/login'), 3000);
    } catch (err) {
      setError(getApiErrorMessage(err, 'Não foi possível redefinir a senha.'));
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
            <h2 className="font-display mb-2 text-xl font-semibold text-foreground">Redefinir senha</h2>

            {success ? (
              <div className="space-y-4 text-center">
                <p className="text-sm text-muted-foreground">
                  Senha redefinida com sucesso! Você já pode entrar com sua nova senha.
                </p>
                <Link to="/login" className="block text-sm font-medium text-primary hover:underline">
                  Ir para o login
                </Link>
              </div>
            ) : (
              <>
                <p className="mb-6 text-sm text-muted-foreground">
                  Crie uma senha forte para proteger sua conta.
                </p>

                {error && (
                  <div className="mb-4 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
                    {error}
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                  <PasswordField
                    id="new-password"
                    label="Nova senha"
                    value={newPassword}
                    onChange={setNewPassword}
                    placeholder="••••••••"
                    showStrength
                    autoComplete="new-password"
                    disabled={loading}
                  />

                  <PasswordField
                    id="confirm-password"
                    label="Confirmar nova senha"
                    value={confirmPassword}
                    onChange={setConfirmPassword}
                    placeholder="••••••••"
                    autoComplete="new-password"
                    disabled={loading}
                  />

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full rounded-lg bg-primary py-2.5 text-sm font-medium text-primary-foreground shadow-primary transition-all hover:opacity-95 disabled:opacity-60"
                  >
                    {loading ? 'Salvando…' : 'Redefinir senha'}
                  </button>
                </form>

                <p className="mt-6 text-center text-sm text-muted-foreground">
                  <Link to="/login" className="font-medium text-primary hover:underline">
                    Voltar ao login
                  </Link>
                </p>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
