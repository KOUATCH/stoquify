import { runCurrentSeed, seedCurrentDemo } from "./seed"

export async function seedIntegratedRbacDemo() {
  console.log("Integrated RBAC seed now delegates to the current schema demo seed")
  await seedCurrentDemo()
}

export default seedIntegratedRbacDemo

if (require.main === module) {
  runCurrentSeed().catch((error) => {
    console.error(error)
    process.exit(1)
  })
}
