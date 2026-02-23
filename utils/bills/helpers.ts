import { Order as OrderModel } from '../../services/erpService';

export const filterOrdersBySearch = (orders: OrderModel[], searchTerm: string) => {
  const normalizedSearch = searchTerm.trim().toLowerCase();
  return orders.filter((order) => {
    if (!normalizedSearch) {
      return true;
    }
    const orderId = order.id ? String(order.id).toLowerCase() : '';
    const customer = (order.customer ?? '').toLowerCase();
    return orderId.includes(normalizedSearch) || customer.includes(normalizedSearch);
  });
};

export const getOrderStatusColor = (
  status: string,
  colors: { accentOrange: string; primaryPurple: string; neonGreen: string; textMuted: string },
) => {
  switch (status.trim().toLowerCase()) {
    case 'pending':
      return colors.accentOrange;
    case 'processing':
      return colors.primaryPurple;
    case 'delivered':
      return colors.neonGreen;
    default:
      return colors.textMuted;
  }
};

export const openPdfInBrowser = (base64: string) => {
  try {
    const atobFn = (globalThis as any).atob as ((input: string) => string) | undefined;
    const blobCtor = (globalThis as any).Blob as typeof Blob | undefined;
    const urlCtor = (globalThis as any).URL as typeof URL | undefined;
    const windowRef = (globalThis as any).window as Window | undefined;

    if (!atobFn || !blobCtor || !urlCtor || !windowRef) {
      return;
    }

    const binary = atobFn(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) {
      bytes[i] = binary.charCodeAt(i);
    }

    const blob = new blobCtor([bytes], { type: 'application/pdf' });
    const url = urlCtor.createObjectURL(blob);
    windowRef.open(url, '_blank', 'noopener,noreferrer');
    setTimeout(() => urlCtor.revokeObjectURL(url), 60000);
  } catch {
    // Ignore browser open failures.
  }
};
