import { Source } from 'graphql/language/index.js'
import { generate } from './generate.js'
import { traverse } from './visitor.js'
import { GraphQLSchema } from 'graphql/type/index.js'

// Transpile a GraphQL schema and source to a TypeScript file.
export function transpile(schema: GraphQLSchema, source: Source) {
  return generate(traverse(schema, source))
}

// Query is a GraphQL query string with type information attached.
// Parameters of the query are the variables. The return type is the
// result of the query.
export type Query = string & ((vars: any) => any)

// Variables of a query are the first parameter of the query function.
export type Variables<T extends Query> = Parameters<T>[0]
