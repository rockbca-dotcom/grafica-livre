export function onlyDigits(s: string): string {
  return s.replace(/\D/g, '')
}

export function maskCpfCnpj(value: string): string {
  const d = onlyDigits(value).slice(0, 14)
  if (d.length <= 11) {
    return d
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})$/, '$1-$2')
  }
  return d
    .replace(/(\d{2})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1/$2')
    .replace(/(\d{4})(\d{1,2})$/, '$1-$2')
}

// Formata como "+55 21 99999-9999" (celular) ou "+55 21 9999-9999" (fixo).
// O código do país (+55) é fixo; o usuário digita apenas DDD + número.
/** Mantém apenas DDD + número para edição e persistência, aceitando valores legados com 55. */
export function telefoneParaDigitos(value: string): string {
  let d = onlyDigits(value)
  if (d === '55') return ''
  if (d.length > 11 && d.startsWith('55')) d = d.slice(2)
  return d.slice(0, 11)
}

export function maskTelefone(value: string): string {
  const d = telefoneParaDigitos(value)
  if (d.length === 0) return ''
  const ddd = d.slice(0, 2)
  const num = d.slice(2)
  let out = '+55'
  if (ddd) out += ' ' + ddd
  if (num.length === 0) return out
  if (num.length <= 4) {
    out += ' ' + num
  } else if (num.length <= 8) {
    // fixo: 0000-0000
    out += ' ' + num.replace(/(\d{4})(\d{1,4})$/, '$1-$2')
  } else {
    // celular: 00000-0000
    out += ' ' + num.replace(/(\d{5})(\d{1,4})$/, '$1-$2')
  }
  return out
}

export function maskCep(value: string): string {
  return onlyDigits(value)
    .slice(0, 8)
    .replace(/(\d{5})(\d{1,3})$/, '$1-$2')
}

export function validateCpf(cpf: string): boolean {
  const d = onlyDigits(cpf)
  if (d.length !== 11 || /^(\d)\1{10}$/.test(d)) return false
  for (const len of [9, 10]) {
    let sum = 0
    for (let i = 0; i < len; i++) sum += parseInt(d[i]) * (len + 1 - i)
    const check = ((sum * 10) % 11) % 10
    if (check !== parseInt(d[len])) return false
  }
  return true
}

export function validateCnpj(cnpj: string): boolean {
  const d = onlyDigits(cnpj)
  if (d.length !== 14 || /^(\d)\1{13}$/.test(d)) return false
  const calc = (len: number) => {
    const weights =
      len === 12
        ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
        : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
    let sum = 0
    for (let i = 0; i < len; i++) sum += parseInt(d[i]) * weights[i]
    const rest = sum % 11
    return rest < 2 ? 0 : 11 - rest
  }
  return calc(12) === parseInt(d[12]) && calc(13) === parseInt(d[13])
}

/** Valida CPF ou CNPJ conforme o tamanho. Vazio é considerado válido (campo opcional). */
export function validateDocumento(doc: string): boolean {
  const d = onlyDigits(doc)
  if (!d) return true
  if (d.length === 11) return validateCpf(d)
  if (d.length === 14) return validateCnpj(d)
  return false
}
