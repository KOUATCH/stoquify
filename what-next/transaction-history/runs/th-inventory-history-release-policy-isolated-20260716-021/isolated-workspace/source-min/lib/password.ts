import argon2 from "argon2"

const ARGON2ID_OPTIONS = {
  type: argon2.argon2id,
  memoryCost: 19_456,
  timeCost: 2,
  parallelism: 1,
} satisfies argon2.Options

function isArgon2Hash(value: string | null | undefined): value is string {
  return typeof value === "string" && value.startsWith("$argon2")
}

export async function hashPassword(password: string): Promise<string> {
  try {
    return await argon2.hash(password, ARGON2ID_OPTIONS)
  } catch (error) {
    console.error('Error hashing password:', error)
    throw new Error('Failed to hash password')
  }
}

export async function verifyPassword(
  plainTextPasswordOrHash: string | null | undefined,
  storedHashOrPlainTextPassword: string | null | undefined
): Promise<boolean> {
  try {
    const storedHash = isArgon2Hash(plainTextPasswordOrHash)
      ? plainTextPasswordOrHash
      : storedHashOrPlainTextPassword
    const plainTextPassword = isArgon2Hash(plainTextPasswordOrHash)
      ? storedHashOrPlainTextPassword
      : plainTextPasswordOrHash

    if (!plainTextPassword || !isArgon2Hash(storedHash)) {
      return false
    }

    return await argon2.verify(storedHash, plainTextPassword)
  } catch (error) {
    console.error('Error verifying password:', error)
    return false
  }
}
