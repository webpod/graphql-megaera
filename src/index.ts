import { buildSchema } from 'graphql/utilities/index.js'
import { parse, Source } from 'graphql/language/index.js'
import { generate } from './generate.js'
import { transform } from './visitor.js'

const schema = buildSchema(`
schema {
  query: Query
  mutation: Mutation
}

type Query {
  User(login: String!): User
}

type User {
  name: String
  avatarUrl: String
}

type Mutation {
  CreateUser(name: String!, avatarUrl: String): User
}
`)

const source = new Source(`
query User($login: String!) {
  user(login: $login) {
    name
    avatar: avatarUrl
  }
}
`)

console.log(generate(transform(source, schema)))
