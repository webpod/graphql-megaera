import { test, expect } from 'vitest'
import { buildSchema, typeFromAST } from 'graphql/utilities/index.js'
import { generateType } from './generate.js'
import { isObjectType } from 'graphql/type/index.js'

const schema = buildSchema(`
type User {
  name: String!
  birthday: Date!
  gender: Gender!
  favoriteBooks: [String]
}

type Object {
  name: String!
  age: Int
}

scalar Date

enum Gender {
  MALE
  FEMALE
}
`)

function getFieldType(name: string, fieldName: string) {
  const type = schema.getType(name)
  if (!isObjectType(type)) {
    throw new Error(`${name} is not object type.`)
  }
  const field = type.astNode?.fields?.find(
    (f) => f.name.value === fieldName,
  )?.type
  if (!field) {
    throw new Error(`Cannot find ${fieldName} field in ${name}.`)
  }
  return typeFromAST(schema, field)
}

test('scalar type', () => {
  const birthdayType = getFieldType('User', 'birthday')
  const code = generateType(birthdayType)
  expect(code).toEqual('string')
})

test('enum type', () => {
  const code = generateType(schema.getType('Gender'))
  expect(code).toEqual(`'MALE' | 'FEMALE'`)
})

test('list type', () => {
  const favoriteBooksType = getFieldType('User', 'favoriteBooks')
  const code = generateType(favoriteBooksType)
  expect(code).toEqual('(string | null)[] | null')
})

test('object type', () => {
  const code = generateType(schema.getType('Object'))
  expect(code).toEqual('{name: string, age: number | null}')
})
