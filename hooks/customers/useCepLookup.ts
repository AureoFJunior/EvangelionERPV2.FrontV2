import { useEffect, useRef } from 'react';
import { normalizeStateCode } from '../../utils/customers/validation';

export type CepLookupResult = {
  street: string;
  neighborhood: string;
  city: string;
  state: string;
};

const normalizeDigits = (value: string) => value.replace(/\D/g, '');

interface UseCepLookupParams {
  postalCode: string;
  enabled: boolean;
  onResolved: (data: CepLookupResult) => void;
}

export function useCepLookup({ postalCode, enabled, onResolved }: UseCepLookupParams) {
  const lastLookupRef = useRef('');

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const cep = normalizeDigits(postalCode);
    if (cep.length !== 8) {
      lastLookupRef.current = '';
      return;
    }

    if (lastLookupRef.current === cep) {
      return;
    }

    let active = true;
    const timer = setTimeout(async () => {
      try {
        const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
        if (!response.ok || !active) {
          return;
        }

        const data = (await response.json()) as Record<string, unknown>;
        if (!data || data.erro) {
          return;
        }

        const street = typeof data.logradouro === 'string' ? data.logradouro.trim() : '';
        const neighborhood = typeof data.bairro === 'string' ? data.bairro.trim() : '';
        const city = typeof data.localidade === 'string' ? data.localidade.trim() : '';
        const state = typeof data.uf === 'string' ? normalizeStateCode(data.uf) : '';

        lastLookupRef.current = cep;
        onResolved({ street, neighborhood, city, state });
      } catch {
        // Ignore lookup errors and keep manual input flow.
      }
    }, 350);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [postalCode, enabled, onResolved]);
}
