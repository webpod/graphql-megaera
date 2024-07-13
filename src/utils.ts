export function firstLetterUpper(string: string) {
  return string.charAt(0).toUpperCase() + string.slice(1)
}

export function plural(count: number, singular: string, plural: string) {
  return (count === 1 ? singular : plural).replace('%d', count.toString())
}
