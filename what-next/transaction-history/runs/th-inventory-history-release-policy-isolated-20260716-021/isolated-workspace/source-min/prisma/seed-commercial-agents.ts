import { runCurrentSeed, seedCurrentDemo } from "./seed"

export async function seedCommercialAgents() {
  console.log("Commercial agent seed is deprecated for the current schema; running the canonical demo seed")
  await seedCurrentDemo()
}

export default seedCommercialAgents

if (require.main === module) {
  runCurrentSeed().catch((error) => {
    console.error(error)
    process.exit(1)
  })
}
