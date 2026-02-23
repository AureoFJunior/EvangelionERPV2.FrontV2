import { useCallback, useMemo, useReducer } from 'react';
import { Customer as CustomerModel } from '../../services/erpService';
import {
  CustomerFormValues,
  emptyCustomerFormValues,
  getCustomerFormErrors,
  hasCustomerFormErrors,
} from '../../utils/customers/validation';
import { toCustomerFormValues } from '../../utils/customers/presentation';
import { CustomerFormAction, CustomerFormState } from '../../components/customers/types';
import { CepLookupResult } from './useCepLookup';

const toInitialFormState = (): CustomerFormState => ({
  visible: false,
  mode: 'create',
  values: emptyCustomerFormValues(),
  customer: null,
  attempted: false,
  submitting: false,
});

const customerFormReducer = (state: CustomerFormState, action: CustomerFormAction): CustomerFormState => {
  switch (action.type) {
    case 'OPEN_CREATE':
      return {
        visible: true,
        mode: 'create',
        values: action.payload,
        customer: null,
        attempted: false,
        submitting: false,
      };
    case 'OPEN_EDIT':
      return {
        visible: true,
        mode: 'edit',
        values: action.payload.values,
        customer: action.payload.customer,
        attempted: false,
        submitting: false,
      };
    case 'CLOSE':
      return toInitialFormState();
    case 'SET_FIELD': {
      const values = {
        ...state.values,
        [action.payload.field]: action.payload.value,
      } as CustomerFormValues;
      return {
        ...state,
        values,
      };
    }
    case 'SET_ATTEMPTED':
      return {
        ...state,
        attempted: action.payload,
      };
    case 'SET_SUBMITTING':
      return {
        ...state,
        submitting: action.payload,
      };
    case 'PATCH_FIELDS':
      return {
        ...state,
        values: {
          ...state.values,
          ...action.payload,
        },
      };
    default:
      return state;
  }
};

export function useCustomerForm() {
  const [formState, dispatchForm] = useReducer(customerFormReducer, undefined, toInitialFormState);

  const formErrors = useMemo(() => getCustomerFormErrors(formState.values), [formState.values]);
  const formSubmitDisabled = useMemo(
    () => formState.submitting || hasCustomerFormErrors(formErrors),
    [formErrors, formState.submitting],
  );

  const openCreate = useCallback(() => {
    dispatchForm({ type: 'OPEN_CREATE', payload: emptyCustomerFormValues() });
  }, []);

  const openEdit = useCallback((customer: CustomerModel) => {
    dispatchForm({
      type: 'OPEN_EDIT',
      payload: {
        customer,
        values: toCustomerFormValues(customer),
      },
    });
  }, []);

  const closeForm = useCallback(() => {
    dispatchForm({ type: 'CLOSE' });
  }, []);

  const setField = useCallback(
    (field: keyof CustomerFormValues, value: string | CustomerFormValues['status']) => {
      dispatchForm({
        type: 'SET_FIELD',
        payload: {
          field,
          value,
        },
      });
    },
    [],
  );

  const patchFields = useCallback((values: Partial<CustomerFormValues>) => {
    dispatchForm({ type: 'PATCH_FIELDS', payload: values });
  }, []);

  const setAttempted = useCallback((attempted: boolean) => {
    dispatchForm({ type: 'SET_ATTEMPTED', payload: attempted });
  }, []);

  const setSubmitting = useCallback((submitting: boolean) => {
    dispatchForm({ type: 'SET_SUBMITTING', payload: submitting });
  }, []);

  const applyCepResult = useCallback((data: CepLookupResult) => {
    const patch: Partial<CustomerFormValues> = {};
    if (data.street) {
      patch.street = data.street;
    }
    if (data.neighborhood) {
      patch.neighborhood = data.neighborhood;
    }
    if (data.city) {
      patch.city = data.city;
    }
    if (data.state) {
      patch.state = data.state;
    }
    if (Object.keys(patch).length > 0) {
      patchFields(patch);
    }
  }, [patchFields]);

  return {
    formState,
    formErrors,
    formSubmitDisabled,
    openCreate,
    openEdit,
    closeForm,
    setField,
    patchFields,
    setAttempted,
    setSubmitting,
    applyCepResult,
  };
}
