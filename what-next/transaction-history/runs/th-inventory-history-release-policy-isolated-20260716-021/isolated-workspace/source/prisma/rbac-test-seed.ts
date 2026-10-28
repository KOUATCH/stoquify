import { runCurrentSeed, seedCurrentDemo } from "./seed"

export async function seedRbacTestDemo() {
  console.log("RBAC test seed now delegates to the current schema demo seed")
  await seedCurrentDemo()
}

export default seedRbacTestDemo

if (require.main === module) {
  runCurrentSeed().catch((error) => {
    console.error(error)
    process.exit(1)
  })
}
