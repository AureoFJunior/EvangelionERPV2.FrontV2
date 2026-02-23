import { Customer as CustomerModel } from '../../services/erpService';
import { CustomerFormValues, CustomerStatusOption } from '../../utils/customers/validation';

export type CustomerFormMode = 'create' | 'edit';

export type CustomerFormState = {
  visible: boolean;
  mode: CustomerFormMode;
  values: CustomerFormValues;
  customer: CustomerModel | null;
  attempted: boolean;
  submitting: boolean;
};

export type CustomerFormAction =
  | { type: 'OPEN_CREATE'; payload: CustomerFormValues }
  | { type: 'OPEN_EDIT'; payload: { values: CustomerFormValues; customer: CustomerModel } }
  | { type: 'CLOSE' }
  | { type: 'SET_FIELD'; payload: { field: keyof CustomerFormValues; value: string | CustomerStatusOption } }
  | { type: 'SET_ATTEMPTED'; payload: boolean }
  | { type: 'SET_SUBMITTING'; payload: boolean }
  | { type: 'PATCH_FIELDS'; payload: Partial<CustomerFormValues> };

export type CustomerColors = {
  primaryPurple: string;
  neonGreen: string;
  textMuted: string;
  textSecondary: string;
  textPrimary: string;
  cardBgFrom: string;
  cardBgTo: string;
  cardBorder: string;
  accentOrange: string;
  inputBgFrom: string;
  appBg: string;
};
