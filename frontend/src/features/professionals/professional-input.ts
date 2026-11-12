export function professionalInputError(
  name: string,
  username: string
): string | null {
  for (const [label, value, raw] of [
    ['nome', name.trim(), name],
    ['usuário', username.trim().toLowerCase(), username]
  ]) {
    if (
      raw.length > 510 ||
      !value ||
      Array.from(value).length > 255 ||
      /[\p{Cc}\p{Cs}]/u.test(value)
    )
      return `Informe um ${label} válido, com até 255 caracteres e sem caracteres de controle.`
  }
  return null
}
export const professionalStatusLabels = {
  pending: 'Aguardando ativação',
  active: 'Conta ativa',
  suspended: 'Conta suspensa'
}
