import { useState } from 'react';
import { Link } from 'react-router-dom';
import { forgotPasswordRequest } from '@/controllers/authApi';
import { getApiErrorMessage } from '@/controllers/apiErrors';
import { brandWordmark } from '@/assets/brandAssets';

const inputClass =
  'w-full rounded-lg border border-input bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/20';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setError('Preencha o e-mail.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await forgotPasswordRequest(email.trim());
      setSubmitted(true);
    } catch (err) {
      setError(getApiErrorMessage(err, 'Não foi possível enviar o e-mail.'));
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
            <h2 className="font-display mb-2 text-xl font-semibold text-foreground">Esqueceu a senha?</h2>

            {submitted ? (
              <div className="space-y-4 text-center">
                <p className="text-sm text-muted-foreground">
                  Se este e-mail estiver cadastrado, você receberá as instruções em instantes.
                  Verifique também sua caixa de spam.
                </p>
                <Link to="/login" className="block text-sm font-medium text-primary hover:underline">
                  Voltar ao login
                </Link>
              </div>
            ) : (
              <>
                <p className="mb-6 text-sm text-muted-foreground">
                  Digite o e-mail associado à sua conta e enviaremos um link para criar uma nova senha.
                </p>

                {error && (
                  <div className="mb-4 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
                    {error}
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-foreground">E-mail</label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="seu@email.com"
                      autoComplete="email"
                      className={inputClass}
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full rounded-lg bg-primary py-2.5 text-sm font-medium text-primary-foreground shadow-primary transition-all hover:opacity-95 disabled:opacity-60"
                  >
                    {loading ? 'Enviando…' : 'Enviar link de redefinição'}
                  </button>
                </form>

                <p className="mt-6 text-center text-sm text-muted-foreground">
                  Lembrou a senha?{' '}
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

export default ForgotPassword;
