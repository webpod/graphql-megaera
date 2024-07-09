import fs from 'node:fs'
import {
  buildSchema,
  TypeInfo,
  visitWithTypeInfo,
} from 'graphql/utilities/index.js'
import { DocumentNode, parse, print, visit } from 'graphql/language/index.js'
import {
  getNullableType,
  GraphQLOutputType,
  GraphQLType,
  isEnumType,
  isListType,
  isNonNullType,
  isNullableType,
  isScalarType,
} from 'graphql/type/definition.js'

const schema = buildSchema(`
type Query {
  User(login: String!): User
}

type User {
  name: String
  avatarUrl: String
}
`)
const typeInfo = new TypeInfo(schema)

const ast = parse(`
query User {
  user(login: "antonmedv") {
    name
    avatar: avatarUrl
  }
}
`)

type Selection = {
  name: string
  type?: GraphQLOutputType
  fields: Selection[]
}

const stack: Selection[] = []

type Query = {
  name: string
  selection: Selection
  queryString: string
}

const queries: Query[] = []

const visitor = visitWithTypeInfo(typeInfo, {
  OperationDefinition: {
    enter(node) {
      if (node.operation !== 'query') {
        return
      }
      if (node.name === undefined) {
        throw new Error('Query name is required')
      }
      const s: Selection = {
        name: node.name.value,
        type: typeInfo.getType() ?? undefined,
        fields: [],
      }
      stack.push(s)
      queries.push({
        name: node.name.value,
        selection: s,
        queryString: print(node),
      })
    },
    leave() {
      stack.pop()
    },
  },
  Field: {
    enter(node) {
      const s: Selection = {
        name: node.alias?.value ?? node.name.value,
        type: typeInfo.getType() ?? undefined,
        fields: [],
      }
      stack.at(-1)?.fields.push(s)
      stack.push(s)
    },
    leave() {
      stack.pop()
    },
  },
})

visit(ast, visitor)

for (const q of queries) {
  console.log(`export type ${q.name} = ${generate(q.selection)}

export const ${q.name} = \`#graphql
${q.queryString}\` as string & ${q.name}
`)
}

function generate(s: Selection, depth = 0) {
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
        '  '.repeat(depth + 1) + field.name + ': ' + generate(field, depth + 1),
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
