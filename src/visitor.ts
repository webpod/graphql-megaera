import { GraphQLInputType, GraphQLOutputType } from 'graphql/type/definition.js'
import { TypeInfo, visitWithTypeInfo } from 'graphql/utilities/index.js'
import { parse, print, Source, visit } from 'graphql/language/index.js'
import { GraphQLSchema } from 'graphql/type/index.js'
import { GraphQLError } from 'graphql/error/index.js'
import { firstLetterUpper } from './utils.js'

export type Operation = {
  name: string
  select: Selector
  variables: Record<string, GraphQLInputType>
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

        ops.push({
          name: node.name.value,
          select: s,
          variables: {},
          query: print(node),
        })
      },
      leave() {
        stack.pop()
      },
    },

    VariableDefinition: {
      enter(node) {
        const s = stack.at(-1)
        if (s === undefined) {
          throw new GraphQLError('Variable definition is not allowed here', node, source)
        }
        s.variables[node.variable.name.value] = typeInfo.getType()
      },
      leave() {
        stack.pop()
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
