# GraphQL Megaera

<p align="center">
<strong>GraphQL TypeScript Generator</strong>
</p>

<table>
<tr>
  <th>From GraphQL</th>
  <th>To TypeScript</th>
</tr>
<tr>
  <td>

```graphql
query IssuesQuery($username: String!) {
  repository(owner: "webpod", name: "graphql-megaera") {
    issues(first: 100, filterBy: { createdBy: $username }) {
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
type IssuesQuery = (vars: { username: string }) => {
  repository: {
    issues: {
      totalCount: number
      nodes: Array<{
        createdAt: string
        closedAt: string | null
        closed: boolean
        author: {
          login: string
        } | null
        number: number
        title: string
        labels: {
          totalCount: number
          nodes: Array<{
            name: string
          }> | null
        } | null
        body: string
        comments: {
          totalCount: number
          nodes: Array<{
            body: string
          }> | null
        }
        repository: {
          owner: {
            login: string
          }
          name: string
        }
      }> | null
      pageInfo: {
        hasNextPage: boolean
        endCursor: string | null
      }
    }
  } | null
  rateLimit: {
    limit: number
    cost: number
    remaining: number
    resetAt: string
  } | null
} | null
```

  </td>
</tr>
</table>

## License

[MIT](LICENSE)
