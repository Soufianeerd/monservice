export function formatInvoiceNumber(type: 'invoice' | 'quote', year: number, sequence: number): string {
  const prefix = type === 'invoice' ? 'F' : 'D';
  return `${prefix}-${year}-${sequence.toString().padStart(4, '0')}`;
}

export function parseInvoiceNumber(numberString: string): { type: 'invoice' | 'quote'; year: number; sequence: number } | null {
  const match = numberString.match(/^(F|D)-(\d{4})-(\d{4})$/);
  if (!match) return null;
  
  return {
    type: match[1] === 'F' ? 'invoice' : 'quote',
    year: parseInt(match[2], 10),
    sequence: parseInt(match[3], 10),
  };
}
