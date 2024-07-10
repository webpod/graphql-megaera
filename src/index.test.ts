import { test, expect } from 'vitest'
import { Source } from 'graphql/language/index.js'
import { buildSchema } from 'graphql/utilities/index.js'
import { transpile } from './index.js'

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
    favoriteAnimal: Animal
  }
  
  type Mutation {
    CreateUser(name: String, avatarUrl: String!): User
  }
  
  union Animal = User | Dog
  
  type Dog {
    name: String
    barks: Boolean
  }
  
  type Cat {
    name: String
    meows: Boolean
  }
`)

test('optional variable with default value', () => {
  const source = new Source(`
    query User($login: String! = "antonmedv") {
      user(login: $login) {
        name
      }
    }
  `)
  const code = transpile(schema, source)
  expect(code).includes('type User = (vars: { login?: string })')
})

test('optional variable with nullable type', () => {
  const source = new Source(`
    query User($login: String) {
      user(login: $login) {
        name
      }
    }
  `)
  const code = transpile(schema, source)
  expect(code).includes('type User = (vars: { login?: string | null })')
})

test('multiple queries', () => {
  const source = new Source(`
    query User1 {
      user(login: "anton") {
        name
      }
    }

    query User2 {
      user(login: "anna") {
        name
      }
    }
  `)
  const code = transpile(schema, source)
  expect(code).includes('type User1')
  expect(code).includes('type User2')
})

test('mutations', () => {
  const source = new Source(`
    mutation CreateUser($name: String!, $avatarUrl: String) {
      createUser(name: $name, avatarUrl: $avatarUrl) {
        name
      }
    }
  `)
  const code = transpile(schema, source)
  expect(code).includes(
    'type CreateUser = (vars: { name: string, avatarUrl?: string | null }) =>',
  )
})

test('fragments', () => {
  const source = new Source(`
    fragment UserName on User {
      name
    }
  
    query User {
      user(login: "antonmedv") {
        ...UserName
      }
    }
  `)
  const code = transpile(schema, source)
  expect(code).includes('name: string | null\n')
  expect(code).includes('type UserName = {\n  name: string | null\n}\n')
})

test('fragments with variables', () => {
  const source = new Source(`
    query User($login: String!) {
      ...UserName 
    }
    
    fragment UserName on Query {
      user(login: $login) {
        name
      }
    }
  `)
  const code = transpile(schema, source)
  expect(code).includes(
    'const UserName = `#graphql\nfragment UserName on Query',
  )
})

test('inline interfaces', () => {
  const source = new Source(`
    query User {
      user(login: "antonmedv") {
        favoriteAnimal {
          __typename
          ...on Dog {
            name
            barks
          }
          ...on Cat {
            name
            meows
          }
        }
      }
    }
  `)
  const code = transpile(schema, source)
  expect(code).includes('__typename: unknown\n')
  expect(code).includes('barks: boolean | null\n')
  expect(code).includes('meows: boolean | null\n')
})
