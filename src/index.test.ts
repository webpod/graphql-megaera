import * as assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { parse, Source } from 'graphql/language/index.js'
import { transform } from './visitor.js'
import { buildSchema } from 'graphql/utilities/index.js'
import { generate } from './generate.js'

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
  CreateUser(name: String!, avatarUrl: String!): User
}
`)

describe('index', () => {
  it('simple query', () => {
    const source = new Source(`
query User {
  user(login: "antonmedv") {
    name
    avatar: avatarUrl
  }
}
`)
    const code = generate(transform(source, schema))
    assert.equal(
      code,
      `export type User = {
  name: string
  avatar: string
}

export const User = \`#graphql
query User {
  user(login: "antonmedv") {
    name
    avatar: avatarUrl
  }
}
\` as string & User
`,
    )
  })
})
