export const formatPrice = (value: string | number): string => `$${Number(value).toLocaleString('es-AR')}`;

export const formatCurrency = (value: number): string =>
  new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value);
