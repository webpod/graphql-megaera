# GraphQL Megaera – GraphQL to TypeScript generator

<p align="center"><img src=".github/graphql-megaera.svg" width="220" alt="GraphQL Megaera"></p>

<table>
<tr>
  <th>From GraphQL</th>
  <th>To TypeScript</th>
</tr>
<tr>
  <td>

```graphql
query IssuesQuery {
  issues(first: 100) {
    totalCount
    nodes {
      createdAt
      closedAt
      closed
      author {
        login
      }
      number
      title
      labels(first: 10) {
        totalCount
        nodes {
          name
        }
      }
      body
      comments(first: 10) {
        totalCount
        nodes {
          body
        }
      }
      repository {
        owner {
          login
        }
        name
      }
    }
    pageInfo {
      hasNextPage
      endCursor
    }
  }
  rateLimit {
    limit
    cost
    remaining
    resetAt
  }
}
```

</td>
<td>

```ts
type IssuesQuery = () => {
  issues: {
    totalCount: number
    nodes: Array<{
      createdAt: string
      closedAt: string | null
      closed: boolean
      author: {
        login: string
      }
      number: number
      title: string
      labels: {
        totalCount: number
        nodes: Array<{
          name: string
        }> 
      }
      body: string
      comments: {
        totalCount: number
        nodes: Array<{
          body: string
        }>
      }
      repository: {
        owner: {
          login: string
        }
        name: string
      }
    }>
    pageInfo: {
      hasNextPage: boolean
      endCursor: string | null
    }
  }
  rateLimit: {
    limit: number
    cost: number
    remaining: number
    resetAt: string
  }
}
```

  </td>
</tr>
</table>

## License

[MIT](LICENSE)
