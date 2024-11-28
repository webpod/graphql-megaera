import {
  GraphQLType,
  isEnumType,
  isListType,
  isNonNullType,
  isNullableType,
  isScalarType,
} from 'graphql/type/definition.js'
import { Content, Selector, Variable } from './visitor.js'
import { isObjectType } from 'graphql/type/index.js'

export function generate(content: Content) {
  const code: string[] = []
  for (const f of content.fragments.values()) {
    code.push(`const ${f.name} = \`#graphql
${f.source}\`

export type ${f.name} = ${generateSelector(f, 0, true)}
`)
  }

  for (const q of content.operations) {
    if (!q.source) {
      throw new Error('Empty query source for operation ' + q.name)
    }

    let querySource = q.source

    for (const fName of usedFragments(q, content)) {
      querySource = '${' + fName + '}\n' + querySource
    }

    code.push(`export const ${q.name} = \`#graphql
${querySource}\` as string & ${q.name}

export type ${q.name} = (${generateVariables(q.variables)}) => ${generateSelector(q, 0, true)}
`)
  }

  return code.join('\n')
}

function usedFragments(q: Selector, content: Content): string[] {
  const fragments: string[] = []
  for (const field of q.fields) {
    if (field.isFragment) {
      fragments.push(field.name)
      const fragment = content.fragments.get(field.name)
      if (!fragment) {
        throw new Error(`Fragment ${field.name} is not defined.`)
      }
      fragments.push(...usedFragments(fragment, content))
    }
    fragments.push(...usedFragments(field, content))
  }
  for (const inlineFragment of q.inlineFragments) {
    fragments.push(...usedFragments(inlineFragment, content))
  }
  return fragments
}

function generateVariables(variables?: Variable[]) {
  if (!variables || variables.length === 0) {
    return ''
  }
  return (
    'vars: { ' +
    variables
      .map((v) => {
        return v.name + (v.required ? '' : '?') + ': ' + generateType(v.type)
      })
      .join(', ') +
    ' }'
  )
}

function generateSelector(s: Selector, depth = 0, nonNull = false): string {
  if (s.fields.length === 0 && s.inlineFragments.length === 0) {
    return generateType(s.type)
  }

  return (
    generateArray(s, depth) +
    (isNullableType(s.type) && !nonNull ? ' | null' : '')
  )
}

function generateArray(s: Selector, depth: number): string {
  const code =
    generateFields(s, depth) +
    generateFragments(s) +
    generateInlineFragments(s, depth - 1)
  return isListType(s.type) ? 'Array<' + code + '>' : code
}

function generateFragments(s: Selector): string {
  let code = ''
  for (const fragment of s.fields) {
    if (!fragment.isFragment) continue
    code += ' & ' + fragment.name
  }
  return code
}

function generateFields(s: Selector, depth: number): string {
  const nonFragmentFields = s.fields.filter((f) => !f.isFragment)
  if (nonFragmentFields.length === 0) {
    return '{}'
  }

  const code: string[] = []
  code.push('{')
  for (const field of nonFragmentFields) {
    code.push(
      '  '.repeat(depth + 1) +
        field.name +
        ': ' +
        generateSelector(field, depth + 1),
    )
  }
  code.push('  '.repeat(depth) + '}')
  return code.join('\n')
}

function generateInlineFragments(s: Selector, depth: number) {
  let code = ''
  let nullable = false
  for (const fragment of s.inlineFragments) {
    code += ' & ' + generateSelector(fragment, depth + 1, true)
    nullable ||= isNullableType(fragment.type)
  }
  return code + (nullable ? ' | null' : '')
}

export function generateType(t?: GraphQLType, orNull = ' | null'): string {
  if (t === undefined) {
    return 'unknown'
  }
  if (isNonNullType(t)) {
    return generateType(t.ofType, '')
  }
  if (isListType(t)) {
    const subType = generateType(t.ofType)
    if (subType.includes(' ')) {
      return '(' + subType + ')[]' + orNull
    }
    return subType + '[]' + orNull
  }
  if (isEnumType(t)) {
    return t
      .getValues()
      .map((v) => `'${v.value}'`)
      .join(' | ')
  }
  if (isObjectType(t)) {
    const code: string[] = []
    for (const field of Object.values(t.getFields())) {
      code.push(field.name + ': ' + generateType(field.type))
    }
    return '{' + code.join(', ') + '}'
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
