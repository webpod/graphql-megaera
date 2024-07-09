import {
  GraphQLType,
  isEnumType,
  isListType,
  isNonNullType,
  isNullableType,
  isScalarType,
} from 'graphql/type/definition.js'
import { Operation, Selector } from './visitor.js'

export function generate(ops: Operation[]) {
  const code: string[] = []
  for (const q of ops) {
    code.push(`export type ${q.name} = (${generateVariables(q.variables)}) => ${generateSelector(q.select)}

export const ${q.name} = \`#graphql
${q.query}\` as string & ${q.name}
`)
  }

  return code.join('\n\n')
}

function generateVariables(variables: Record<string, GraphQLType | undefined>) {
  return (
    'params: {' +
    Object.entries(variables)
      .map(([name, type]) => {
        if (type === undefined) {
          return `${name}: unknown`
        }
        return `${name}: ${generateType(type)}`
      })
      .join(', ') +
    '}'
  )
}

function generateSelector(s: Selector, depth = 0) {
  const code: string[] = []
  if (s.fields.length > 0) {
    let open = '{'
    let close = '}'
    if (isListType(s.type)) {
      open = 'Array<{'
      close = '}>'
    }
    code.push(open)
    for (const field of s.fields) {
      code.push(
        '  '.repeat(depth + 1) +
          field.name +
          ': ' +
          generateSelector(field, depth + 1),
      )
    }
    let orNull = ''
    if (isNullableType(s.type)) {
      orNull = ' | null'
    }
    code.push('  '.repeat(depth) + close + orNull)
  } else {
    code.push(generateType(s.type))
  }
  return code.join('\n')
}

function generateType(t?: GraphQLType, orNull = ' | null'): string {
  if (t === undefined) {
    return 'unknown'
  }
  if (isNonNullType(t)) {
    return generateType(t.ofType, '')
  }
  if (isListType(t)) {
    return generateType(t.ofType) + '[]' + orNull
  }
  if (isEnumType(t)) {
    return t
      .getValues()
      .map((v) => `'${v.value}'`)
      .join(' | ')
  }
  if (isScalarType(t)) {
    switch (t.name) {
      case 'String':
        return 'string' + orNull
      case 'Int':
        return 'number' + orNull
      case 'Float':
        return 'number' + orNull
      case 'Boolean':
        return 'boolean' + orNull
      default:
        return 'string' + orNull
    }
  }
  throw new Error(`Cannot generate TypeScript type from GraphQL type "${t}".`)
}
