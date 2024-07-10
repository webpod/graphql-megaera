import { GraphQLNonNull, GraphQLOutputType, GraphQLType, isNonNullType } from 'graphql/type/definition.js'
import { typeFromAST, TypeInfo, visitWithTypeInfo } from 'graphql/utilities/index.js'
import { parse, print, Source, visit } from 'graphql/language/index.js'
import { GraphQLSchema } from 'graphql/type/index.js'
import { GraphQLError } from 'graphql/error/index.js'
import { firstLetterUpper } from './utils.js'

export type Variable = {
  name: string
  type: GraphQLType | undefined
  required: boolean
}

export type Selector = {
  name: string
  type?: GraphQLOutputType
  fields: Selector[]
  inlineFragments: Selector[]
  variables?: Variable[]
  isFragment?: boolean
  source?: string
}

export type Content = {
  operations: Selector[]
  fragments: Selector[]
}

export function traverse(schema: GraphQLSchema, source: Source): Content {
  const ast = parse(source)
  const typeInfo = new TypeInfo(schema)

  const content: Content = {
    operations: [],
    fragments: []
  }

  const stack: Selector[] = []

  const visitor = visitWithTypeInfo(typeInfo, {
    OperationDefinition: {
      enter: function(node) {
        if (node.name === undefined) {
          throw new GraphQLError(
            firstLetterUpper(node.operation) + ' name is required',
            node,
            source
          )
        }
        checkUnique(node.name.value, content)

        const variables: Variable[] = []
        for (const v of node.variableDefinitions ?? []) {
          const type = typeFromAST(schema, v.type)
          variables.push({
            name: v.variable.name.value,
            type: type,
            required: v.defaultValue === undefined && isNonNullType(type)
          })
        }

        const s: Selector = {
          name: node.name.value,
          type: typeInfo.getType() ?? undefined,
          fields: [],
          inlineFragments: [],
          variables: variables,
          source: print(node)
        }

        stack.push(s)
        content.operations.push(s)
      },
      leave() {
        stack.pop()
      }
    },

    FragmentDefinition: {
      enter(node) {
        checkUnique(node.name.value, content)

        const s: Selector = {
          name: node.name.value,
          type: typeInfo.getType() ?? undefined,
          fields: [],
          inlineFragments: [],
          source: print(node)
        }

        stack.push(s)
        content.fragments.push(s)
      },
      leave() {
        stack.pop()
      }
    },

    Field: {
      enter(node) {
        const s: Selector = {
          name: node.alias?.value ?? node.name.value,
          type: typeInfo.getType() ?? undefined,
          fields: [],
          inlineFragments: [],
        }
        stack.at(-1)?.fields.push(s)
        stack.push(s)
      },
      leave() {
        stack.pop()
      }
    },

    FragmentSpread: {
      enter(node) {
        stack.at(-1)?.fields.push({
          name: node.name.value,
          type: typeInfo.getType() ?? undefined,
          isFragment: true,
          fields: [],
          inlineFragments: [],
        })
      }
    },

    InlineFragment: {
      enter(node) {
        if (!node.typeCondition) {
          throw new GraphQLError('Inline fragment must have type condition.', node, source)
        }
        const s: Selector = {
          name: node.typeCondition.name.value,
          type: typeInfo.getType() ?? undefined,
          fields: [],
          inlineFragments: [],
        }
        stack.at(-1)?.inlineFragments.push(s)
        stack.push(s)
      },
      leave() {
        stack.pop()
      },
    }
  })

  visit(ast, visitor)

  return content
}

function checkUnique(name: string, content: Content) {
  if (content.operations.find((o) => o.name === name)) {
    throw new GraphQLError(`Operation with name "${name}" is already defined.`)
  }
  if (content.fragments.find((f) => f.name === name)) {
    throw new GraphQLError(`Fragment with name "${name}" is already defined.`)
  }
}
