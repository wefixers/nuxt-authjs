export default eventHandler(async (event) => {
  const session = await getServerSession(event)

  return {
    data: session,
  }
})
