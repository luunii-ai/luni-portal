import { Eye, EyeOff } from 'lucide-react';
import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

interface PasswordStrengthResult {
  score: number;  // 0-4
  label: string;
  color: string;
}

export function evaluatePasswordStrength(password: string): PasswordStrengthResult {
  const rules = [
    password.length >= 8,
    /[a-z]/.test(password) && /[A-Z]/.test(password),
    /[0-9]/.test(password),
    /[^a-zA-Z0-9]/.test(password),
  ];
  const score = rules.filter(Boolean).length;

  if (score <= 1) return { score, label: 'Fraca', color: 'bg-destructive' };
  if (score <= 3) return { score, label: 'Média', color: 'bg-yellow-500' };
  return { score, label: 'Forte', color: 'bg-green-500' };
}

interface PasswordFieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  showStrength?: boolean;
  className?: string;
  autoComplete?: string;
  disabled?: boolean;
}

export function PasswordField({
  id,
  label,
  value,
  onChange,
  placeholder,
  showStrength = false,
  className,
  autoComplete,
  disabled,
}: PasswordFieldProps) {
  const [visible, setVisible] = useState(false);

  const strength = showStrength && value ? evaluatePasswordStrength(value) : null;

  return (
    <div className={cn('space-y-1', className)}>
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <Input
          id={id}
          type={visible ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          disabled={disabled}
          className="pr-10"
        />
        <button
          type="button"
          aria-label={visible ? 'Ocultar senha' : 'Mostrar senha'}
          onClick={() => setVisible((v) => !v)}
          className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground hover:text-foreground"
          tabIndex={-1}
          disabled={disabled}
        >
          {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
      {showStrength && value && strength && (
        <div className="space-y-1 pt-1">
          <div className="flex gap-1">
            {[1, 2, 3, 4].map((step) => (
              <div
                key={step}
                className={cn(
                  'h-1 flex-1 rounded-full transition-all',
                  step <= strength.score ? strength.color : 'bg-border',
                )}
              />
            ))}
          </div>
          <p
            className={cn('text-xs font-medium', {
              'text-destructive': strength.score <= 1,
              'text-yellow-500': strength.score === 2 || strength.score === 3,
              'text-green-500': strength.score === 4,
            })}
          >
            Senha {strength.label}
          </p>
        </div>
      )}
    </div>
  );
}
