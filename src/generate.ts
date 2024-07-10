import {
  GraphQLType,
  isEnumType,
  isListType,
  isNonNullType,
  isNullableType,
  isScalarType
} from 'graphql/type/definition.js'
import { Content, Selector, Variable } from './visitor.js'
import { isObjectType } from 'graphql/type/index.js'

export function generate(content: Content) {
  const code: string[] = []
  for (const f of content.fragments) {
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
    for (const f of content.fragments) {
      querySource = querySource.replace('...' + f.name, '${' + f.name + '}')
    }

    code.push(`export const ${q.name} = \`#graphql
${querySource}\` as string & ${q.name}

export type ${q.name} = (${generateVariables(q.variables)}) => ${generateSelector(q)}
`)
  }

  return code.join('\n\n')
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

function generateSelector(s: Selector, depth = 0, nonNull = false) {
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
      if (field.isFragment) continue

      code.push(
        '  '.repeat(depth + 1) +
        field.name +
        ': ' +
        generateSelector(field, depth + 1)
      )
    }

    let fragments = ''
    for (const fragment of s.fields) {
      if (!fragment.isFragment) continue
      fragments += ' & ' + fragment.name
    }

    let inlineFragments = ''
    if (s.inlineFragments.length > 0) {
      inlineFragments = generateInlineFragments(s.inlineFragments, depth - 1)
    }

    let orNull = ''
    if (isNullableType(s.type) && !nonNull) {
      orNull = ' | null'
    }

    code.push('  '.repeat(depth) + fragments + inlineFragments + close + orNull)
  } else if (s.inlineFragments.length > 0) {
    code.push(generateInlineFragments(s.inlineFragments, depth))
  } else {
    code.push(generateType(s.type))
  }
  return code.join('\n')
}

function generateInlineFragments(inlineFragments: Selector[], depth: number) {
  // TODO: inline common fragments fields for better TypeScript definition.
  // TODO: deduplicate "| null" from different inline fragments.
  let code = ''
  for (const fragment of inlineFragments) {
    code += '\n' + '  '.repeat(depth + 1) + '| (' + generateSelector(fragment, depth + 1) + ')'
  }
  return code
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
