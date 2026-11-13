import { isCivilDate, type CreateChildInput } from './children-api.ts'
export function childInputError(
  input: CreateChildInput,
  today = new Date().toISOString().slice(0, 10)
): string | null {
  for (const [label, raw] of [
    ['nome', input.name],
    ['usuário', input.username.toLowerCase()],
    ['nome do responsável', input.guardianName]
  ]) {
    const text = raw.trim()
    if (
      !text ||
      raw.length > 510 ||
      Array.from(text).length > 255 ||
      /[\p{Cc}\p{Cs}]/u.test(text)
    )
      return `Confira o ${label}: use até 255 caracteres válidos.`
  }
  if (!isCivilDate(input.dateOfBirth) || input.dateOfBirth > today)
    return 'Informe uma data de nascimento válida, que não esteja no futuro.'
  if (
    input.reportedLevel !== null &&
    (input.reportedLevel.length > 510 ||
      Array.from(input.reportedLevel.trim()).length > 255 ||
      /[\p{Cc}\p{Cs}]/u.test(input.reportedLevel))
  )
    return 'O nível informado deve ter até 255 caracteres válidos.'
  if (
    input.notes !== null &&
    (input.notes.length > 4000 ||
      Array.from(input.notes).length > 2000 ||
      Array.from(input.notes).some(
        (character) =>
          !['\n', '\r', '\t'].includes(character) &&
          /[\p{Cc}\p{Cs}]/u.test(character)
      ))
  )
    return 'Use até 2.000 caracteres válidos nas observações.'
  return null
}
