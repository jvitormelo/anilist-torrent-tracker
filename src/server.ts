import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'

const anilistSchema = z.object({
  accessToken: z.string(),
})


export const greet = createServerFn({ method: 'GET' })
.validator(anilistSchema)

  .handler(async (ctx) => {
    const accessToken = ctx.data?.accessToken
    const response = await fetch('https://graphql.anilist.co', {
        method: 'POST',
        body: JSON.stringify({
          query: `
            query {
              User {
                id
              }
            }
          `,
        }),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },  
      })
      const data = await response.json()
      return data
  })


 