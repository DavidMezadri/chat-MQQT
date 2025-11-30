export const formatDate = (date: Date) => {
  return date.toLocaleTimeString();
};

export function formatPhoneBR(input: string | number): string {
  // força string e remove tudo que não é dígito
  const s = String(input); //.replace(/\D/g, "");

  if (!s) return "";

  // se tiver mais que 11 dígitos, corta os extras (mantém os últimos 11)
  const digits = s.length > 11 ? s.slice(-11) : s;

  // tratar quando tem DDD (2 primeiros dígitos)
  if (digits.length >= 10) {
    const ddd = digits.slice(0, 2);
    const local = digits.slice(2);

    if (local.length === 8) {
      // (AA) 9999-9999
      return `(${ddd}) ${local.slice(0, 4)}-${local.slice(4)}`;
    } else if (local.length === 9) {
      // (AA) 99999-9999
      return `(${ddd}) ${local.slice(0, 5)}-${local.slice(5)}`;
    } else {
      // casos estranhos (ex: 10/11 mas corte diferente) -> tenta maior split possível
      const first = Math.ceil(local.length / 2);
      return `(${ddd}) ${local.slice(0, first)}-${local.slice(first)}`;
    }
  }

  // sem DDD: apenas formata local (8 ou 9 ou outros)
  if (digits.length === 8) {
    return `${digits.slice(0, 4)}-${digits.slice(4)}`;
  }
  if (digits.length === 9) {
    return `${digits.slice(0, 5)}-${digits.slice(5)}`;
  }

  // fallback: retorna os dígitos como estão
  return digits;
}
