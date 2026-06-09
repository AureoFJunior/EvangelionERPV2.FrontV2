import { useMemo, useState } from 'react';
import { ApiClient } from '../../services/apiClient';
import { API_CONFIG } from '../../constants/api';
import { ErpService } from '../../services/erpService';

type RecoveryStep = 'idle' | 'email' | 'code' | 'success';

const PASSWORD_MIN_LENGTH = 8;

const isValidEmail = (value: string) => {
  const trimmed = value.trim();
  return trimmed.length > 0 && trimmed.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed);
};

const isValidResetCode = (value: string) => {
  const trimmed = value.trim();
  return trimmed.length === 8 && /^\d{8}$/.test(trimmed);
};

const isValidPassword = (value: string) => {
  if (value.length < PASSWORD_MIN_LENGTH) return false;
  const hasDigit = /\d/.test(value);
  const hasUpperOrSpecial = /[A-Z]/.test(value) || /[^a-zA-Z0-9]/.test(value);
  return hasDigit && hasUpperOrSpecial;
};

export function usePasswordRecoveryController() {
  const [step, setStep] = useState<RecoveryStep>('idle');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const anonClient = useMemo(() => new ApiClient(API_CONFIG), []);
  const service = useMemo(() => new ErpService(anonClient), [anonClient]);

  const canSubmitEmail = !submitting && isValidEmail(email);
  const canSubmitCode =
    !submitting &&
    isValidResetCode(code) &&
    isValidPassword(newPassword) &&
    newPassword === confirmPassword;

  const passwordError = newPassword.length > 0 && !isValidPassword(newPassword);
  const confirmError = confirmPassword.length > 0 && newPassword !== confirmPassword;

  const openRecovery = () => {
    setStep('email');
    setEmail('');
    setCode('');
    setNewPassword('');
    setConfirmPassword('');
    setShowNewPassword(false);
    setError(null);
  };

  const closeRecovery = () => {
    setStep('idle');
    setError(null);
  };

  const submitEmail = async () => {
    if (!canSubmitEmail) return;
    setSubmitting(true);
    setError(null);
    try {
      const response = await service.requestPasswordReset(email.trim());
      if (response.ok) {
        setStep('code');
      } else {
        setError(response.error ?? 'Unable to request password reset.');
      }
    } catch {
      setError('Unable to request password reset.');
    } finally {
      setSubmitting(false);
    }
  };

  const submitReset = async () => {
    if (!canSubmitCode) return;
    setSubmitting(true);
    setError(null);
    try {
      const response = await service.resetPassword(email.trim(), code.trim(), newPassword);
      if (response.ok) {
        setStep('success');
      } else if (response.status === 429) {
        setError('Too many attempts. Please try again later.');
      } else {
        setError(response.error ?? 'Invalid code or password.');
      }
    } catch {
      setError('Unable to reset password.');
    } finally {
      setSubmitting(false);
    }
  };

  const backToEmail = () => {
    setStep('email');
    setCode('');
    setNewPassword('');
    setConfirmPassword('');
    setShowNewPassword(false);
    setError(null);
  };

  return {
    step,
    email,
    setEmail,
    code,
    setCode,
    newPassword,
    setNewPassword,
    confirmPassword,
    setConfirmPassword,
    showNewPassword,
    setShowNewPassword,
    submitting,
    error,
    canSubmitEmail,
    canSubmitCode,
    passwordError,
    confirmError,
    openRecovery,
    closeRecovery,
    submitEmail,
    submitReset,
    backToEmail,
  };
}
