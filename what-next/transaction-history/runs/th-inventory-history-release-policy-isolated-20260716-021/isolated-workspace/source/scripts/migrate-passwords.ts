import { PrismaClient } from '@prisma/client'
import { hashPassword } from '../lib/password'

const prisma = new PrismaClient()

async function migratePasswords() {
  try {
    console.log('🔄 Starting password migration to Argon2id...')

    // Find all users with legacy password hashes (not starting with $argon2)
    const usersToMigrate = await prisma.user.findMany({
      where: {
        AND: [
          { password: { not: { startsWith: '$argon2' } } },
          { password: { not: null } }
        ]
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
      }
    })

    console.log(`📊 Found ${usersToMigrate.length} users with legacy password hashes`)

    if (usersToMigrate.length === 0) {
      console.log('✅ No users need password migration')
      return
    }

    // Create a temporary secure password for all migrated users
    const tempPassword = 'TempPassword2024!' // Users will need to reset this
    const hashedTempPassword = await hashPassword(tempPassword)

    console.log('🔒 Generated temporary Argon2id password hash')

    // Update all users to use the new Argon2id hash
    const updateResult = await prisma.user.updateMany({
      where: {
        id: {
          in: usersToMigrate.map(user => user.id)
        }
      },
      data: {
        password: hashedTempPassword,
        // Mark that they need to reset their password
        isVerified: false
      }
    })

    console.log(`✅ Successfully migrated ${updateResult.count} user passwords to Argon2id`)

    // Log the migrated users for reference
    console.log('📋 Migrated users (they will need to reset their passwords):')
    usersToMigrate.forEach(user => {
      console.log(`  - ${user.email} (${user.firstName} ${user.lastName})`)
    })

    console.log(`\n🔑 Temporary password for all migrated users: ${tempPassword}`)
    console.log('⚠️  IMPORTANT: All migrated users should reset their passwords immediately!')
    console.log('📧 Consider sending password reset emails to all migrated users.')

  } catch (error) {
    console.error('❌ Error during password migration:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Run the migration
if (require.main === module) {
  migratePasswords()
    .then(() => {
      console.log('🎉 Password migration completed successfully!')
      process.exit(0)
    })
    .catch((error) => {
      console.error('💥 Password migration failed:', error)
      process.exit(1)
    })
}

export { migratePasswords }
