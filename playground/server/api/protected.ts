import { getSession } from '#auth'

export default eventHandler(async (event) => {
  const session = await getSession(event)

  return {
    data: session,
  }
})
