import { runCurrentSeed, seedCurrentDemo } from "./seed"

export async function seedFinanceDemo() {
  console.log("Finance seed is deprecated for the current schema; running the canonical demo seed")
  await seedCurrentDemo()
}

export default seedFinanceDemo

if (require.main === module) {
  runCurrentSeed().catch((error) => {
    console.error(error)
    process.exit(1)
  })
}
