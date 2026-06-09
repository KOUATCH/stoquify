#!/usr/bin/env ts-node

/**
 * Script to update all ImageUploadButtonModernOriginal components
 * to use the new EnhancedImageUploadButton with dual storage support
 */

import fs from 'fs'
import path from 'path'
import { glob } from 'glob'

const componentsDir = path.join(process.cwd(), 'components')
const appDir = path.join(process.cwd(), 'app')

// Files that need organizationId prop and where to find it
const fileUpdates = [
  {
    pattern: '**/inventory/ItemForm.tsx',
    organizationIdSource: 'organizationId', // prop name
    hasOrganizationId: true
  },
  {
    pattern: '**/inventory/CreateItemForm.tsx',
    organizationIdSource: 'organizationId',
    hasOrganizationId: true
  },
  {
    pattern: '**/inventory/ModernCreateItemForm1.tsx',
    organizationIdSource: 'formData.organizationId',
    hasOrganizationId: true
  },
  {
    pattern: '**/newItemForms/item-form-for-editing.tsx',
    organizationIdSource: 'organizationId',
    hasOrganizationId: true
  },
  {
    pattern: '**/dashboard/items/*.tsx',
    organizationIdSource: 'organizationId',
    hasOrganizationId: true
  },
  {
    pattern: '**/dashboard/categories/*.tsx',
    organizationIdSource: 'organizationId',
    hasOrganizationId: true
  }
]

async function updateFile(filePath: string, organizationIdSource: string) {
  try {
    let content = fs.readFileSync(filePath, 'utf8')
    let modified = false

    // Replace import statement
    if (content.includes('ImageUploadButtonModernOriginal')) {
      content = content.replace(
        /import ImageUploadButtonModernOriginal from "@\/components\/FormInputs\/ImageUploadButtonModernOriginal"/g,
        'import EnhancedImageUploadButton from "@/components/FormInputs/EnhancedImageUploadButton"'
      )
      modified = true
    }

    // Replace component usage - handle multiple patterns
    const patterns = [
      // Pattern 1: Simple component with just basic props
      {
        search: /<ImageUploadButtonModernOriginal\s+([^>]*?)endpoint="([^"]*)"([^>]*?)\/>/gs,
        replace: (match: string, beforeEndpoint: string, endpoint: string, afterEndpoint: string) => {
          if (!beforeEndpoint.includes('organizationId=')) {
            const orgIdProp = `organizationId={${organizationIdSource}}\n                    `
            return `<EnhancedImageUploadButton\n                    ${beforeEndpoint}${orgIdProp}endpoint="${endpoint}"${afterEndpoint}/>`
          }
          return `<EnhancedImageUploadButton\n                    ${beforeEndpoint}endpoint="${endpoint}"${afterEndpoint}/>`
        }
      },
      // Pattern 2: Component with closing tag
      {
        search: /<ImageUploadButtonModernOriginal\s+([^>]*?)>\s*<\/ImageUploadButtonModernOriginal>/gs,
        replace: (match: string, props: string) => {
          if (!props.includes('organizationId=')) {
            const orgIdProp = `organizationId={${organizationIdSource}}\n                    `
            return `<EnhancedImageUploadButton\n                    ${props}${orgIdProp}>\n                  </EnhancedImageUploadButton>`
          }
          return `<EnhancedImageUploadButton\n                    ${props}>\n                  </EnhancedImageUploadButton>`
        }
      }
    ]

    for (const pattern of patterns) {
      if (pattern.search.test(content)) {
        content = content.replace(pattern.search, pattern.replace as any)
        modified = true
      }
    }

    // Also handle the simple case
    content = content.replace(/ImageUploadButtonModernOriginal/g, 'EnhancedImageUploadButton')

    if (modified) {
      fs.writeFileSync(filePath, content)
      console.log(`✅ Updated: ${filePath}`)
      return true
    }
  } catch (error) {
    console.error(`❌ Error updating ${filePath}:`, error)
  }
  return false
}

async function main() {
  console.log('🔄 Starting image upload component updates...\n')

  // Find all files that might contain ImageUploadButtonModernOriginal
  const allFiles = await glob('**/*.{tsx,ts}', {
    cwd: process.cwd(),
    ignore: ['node_modules/**', '.next/**', 'scripts/**']
  })

  const filesToUpdate = allFiles.filter(file => {
    const content = fs.readFileSync(file, 'utf8')
    return content.includes('ImageUploadButtonModernOriginal')
  })

  console.log(`Found ${filesToUpdate.length} files to update:`)
  filesToUpdate.forEach(file => console.log(`  - ${file}`))
  console.log('')

  let updatedCount = 0

  for (const file of filesToUpdate) {
    // Try to determine the organization ID source for this file
    let organizationIdSource = 'organizationId' // default

    // Check if this is a component that receives organizationId as prop
    const content = fs.readFileSync(file, 'utf8')

    if (content.includes('formData.organizationId')) {
      organizationIdSource = 'formData.organizationId'
    } else if (content.includes('session.user.organizationId') || content.includes('session?.user?.organizationId')) {
      organizationIdSource = 'session.user.organizationId'
    }

    const updated = await updateFile(file, organizationIdSource)
    if (updated) updatedCount++
  }

  console.log(`\n🎉 Update complete! Updated ${updatedCount}/${filesToUpdate.length} files.`)

  if (updatedCount < filesToUpdate.length) {
    console.log('\n⚠️  Some files may need manual review for proper organizationId prop assignment.')
  }
}

// Run the script
main().catch(console.error)