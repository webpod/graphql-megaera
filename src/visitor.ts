import {
  GraphQLInputType,
  GraphQLOutputType,
  GraphQLType,
} from 'graphql/type/definition.js'
import {
  typeFromAST,
  TypeInfo,
  visitWithTypeInfo,
} from 'graphql/utilities/index.js'
import { parse, print, Source, visit } from 'graphql/language/index.js'
import { GraphQLSchema } from 'graphql/type/index.js'
import { GraphQLError } from 'graphql/error/index.js'
import { firstLetterUpper } from './utils.js'

export type Operation = {
  name: string
  select: Selector
  variables: Record<string, GraphQLType | undefined>
  query: string
}

export type Selector = {
  name: string
  type?: GraphQLOutputType
  fields: Selector[]
}

export function transform(source: Source, schema: GraphQLSchema): Operation[] {
  const ast = parse(source)
  const typeInfo = new TypeInfo(schema)

  const ops: Operation[] = []
  const stack: Selector[] = []

  const visitor = visitWithTypeInfo(typeInfo, {
    OperationDefinition: {
      enter: function (node) {
        if (node.name === undefined) {
          throw new GraphQLError(
            firstLetterUpper(node.operation) + ' name is required',
            node,
            source,
          )
        }
        const s: Selector = {
          name: node.name.value,
          type: typeInfo.getType() ?? undefined,
          fields: [],
        }
        stack.push(s)

        const variables: Record<string, GraphQLType | undefined> = {}
        for (const v of node.variableDefinitions ?? []) {
          variables[v.variable.name.value] = typeFromAST(schema, v.type)
        }

        ops.push({
          name: node.name.value,
          select: s,
          variables: variables,
          query: print(node),
        })
      },
      leave() {
        stack.pop()
      },
    },

    Field: {
      enter(node) {
        const s: Selector = {
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

  return ops
}
