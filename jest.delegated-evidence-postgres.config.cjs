// Real services against the explicitly guarded AF06 synthetic local database only.
const nextJest=require("next/jest")
module.exports=nextJest()({
 rootDir:__dirname,testEnvironment:"node",roots:["<rootDir>/services/accounting/__tests__"],
 moduleNameMapper:{"^@/(.*)$":"<rootDir>/$1","^@prisma/client$":"<rootDir>/node_modules/@prisma/client"},
 testMatch:["**/delegated-evidence-desk.postgres.test.ts"],testTimeout:45000,collectCoverage:false,
})
