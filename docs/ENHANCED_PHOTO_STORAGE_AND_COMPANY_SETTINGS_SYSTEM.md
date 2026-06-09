# Enhanced Photo Storage and Company Settings System

## Overview

This document describes the comprehensive implementation of the enhanced photo storage system and unified company settings management for the StockFlow retail management platform. The system provides enterprise-grade photo storage with dual storage options (local and cloud) and a centralized company settings interface.

## Table of Contents

- [System Architecture](#system-architecture)
- [Photo Storage System](#photo-storage-system)
- [Company Settings Management](#company-settings-management)
- [Implementation Details](#implementation-details)
- [Database Schema Changes](#database-schema-changes)
- [Component Updates](#component-updates)
- [Security Features](#security-features)
- [Performance Optimizations](#performance-optimizations)
- [Usage Guide](#usage-guide)
- [Migration Guide](#migration-guide)
- [Troubleshooting](#troubleshooting)

## System Architecture

### Core Components

```
📁 Enhanced Photo Storage System
├── 🏗️ Dual Storage Architecture
│   ├── Local File System Storage
│   └── Cloud Storage (UploadThing)
├── ⚙️ Configuration Management
│   ├── Organization-level settings
│   └── Real-time switching
├── 🔧 Enhanced Components
│   ├── EnhancedImageUploadButton
│   └── Automatic storage detection
└── 🔒 Security & Access Control
    ├── Organization-scoped access
    └── Authentication-required serving
```

## Photo Storage System

### Storage Types

#### 1. Local Storage
- **Description**: Files stored on your server's file system
- **Benefits**:
  - Complete data control
  - No external dependencies
  - Cost-effective for high volume
  - Faster access for local users
- **Use Cases**: High-volume scenarios, data sovereignty requirements
- **Configuration**: Configurable storage directory path

#### 2. Cloud Storage
- **Description**: Files stored using UploadThing's cloud infrastructure
- **Benefits**:
  - Global CDN acceleration
  - Automatic backups & redundancy
  - Zero maintenance required
  - Unlimited scalable storage
- **Use Cases**: Distributed teams, automatic scaling requirements

### Key Features

- **🔄 Real-time Configuration Switching**: Change storage method without downtime
- **🏢 Organization-scoped**: Each organization manages its own storage settings
- **📏 File Restrictions**: Configurable file size limits and MIME type validation
- **🛡️ Secure Access**: Authentication-required file serving for local storage
- **⚡ Performance Optimized**: Smart caching and optimized data fetching

## Company Settings Management

### Unified Settings Interface

Located at `/dashboard/settings/company`, the interface provides:

#### 1. Organization Information
```typescript
interface OrganizationSettings {
  name: string           // Company name
  industry?: string      // Business industry
  country?: string       // Country location
  state?: string         // State/Province
  address?: string       // Business address
  currency: string       // Default currency (USD, EUR, GBP, etc.)
  timezone: string       // Organization timezone
  fiscalYearStart: string // Fiscal year start (MM-DD format)
  inventoryStartDate?: Date // Historical tracking start
}
```

#### 2. Financial & Regional Settings
- **Currency Management**: Support for 9 major currencies
- **Timezone Configuration**: Major timezone support
- **Fiscal Year Setup**: Configurable fiscal year start dates

#### 3. Photo Storage Configuration
- **Storage Type Selection**: Local vs Cloud
- **File Upload Policies**: Size limits and MIME type restrictions
- **Path Configuration**: Custom storage directory paths

## Implementation Details

### File Structure

```
📁 Project Structure
├── 📂 actions/
│   ├── organization/organization-settings-actions.ts
│   └── storage/
│       ├── storage-config-actions.ts
│       └── photo-upload-actions.ts
├── 📂 components/
│   ├── FormInputs/EnhancedImageUploadButton.tsx
│   └── settings/
│       ├── PhotoStorageConfiguration.tsx
│       └── OrganizationSettingsForm.tsx
├── 📂 hooks/
│   ├── useOrganizationSettings.ts
│   └── useStorageConfiguration.ts
├── 📂 lib/storage/
│   └── photo-storage.ts
├── 📂 types/
│   └── storage.ts
└── 📂 app/
    └── (dashboard)/dashboard/settings/company/page.tsx
```

### Core Classes

#### PhotoStorageManager
```typescript
class PhotoStorageManager {
  // Singleton pattern for storage management
  static getInstance(): PhotoStorageManager

  // Configuration management
  async setConfiguration(config: StorageConfiguration): Promise<void>

  // File operations
  async savePhoto(file: File, organizationId: string): Promise<string>
  async deletePhoto(photoPath: string): Promise<boolean>

  // Utility methods
  getStorageType(): StorageType | null
}
```

### Server Actions

#### Organization Settings
```typescript
// Get organization settings
export async function getOrganizationSettings(organizationId: string)

// Update organization settings
export async function updateOrganizationSettings(
  organizationId: string,
  data: Partial<OrganizationSettings>
)

// Specific update functions
export async function updateOrganizationCurrency(organizationId: string, currency: string)
export async function updateOrganizationTimezone(organizationId: string, timezone: string)
export async function updateInventoryStartDate(organizationId: string, date: Date)
export async function updateFiscalYearStart(organizationId: string, fiscalStart: string)
```

#### Storage Configuration
```typescript
// Get storage configuration
export async function getStorageConfiguration(organizationId: string)

// Update storage configuration
export async function updateStorageConfiguration(
  organizationId: string,
  storageType: StorageType,
  localStoragePath?: string,
  maxFileSize?: number,
  allowedFileTypes?: string[]
)

// Initialize storage for organization
export async function initializeStorageForOrganization(organizationId: string)
```

### TanStack Query Hooks

#### Organization Settings Hooks
```typescript
// Fetch organization settings
export function useOrganizationSettings(organizationId: string)

// Update organization settings
export function useUpdateOrganizationSettings()

// Update specific settings
export function useUpdateCurrency()
export function useUpdateTimezone()
```

#### Storage Configuration Hooks
```typescript
// Fetch storage configuration
export function useStorageConfiguration(organizationId: string)

// Update storage configuration
export function useUpdateStorageConfiguration()

// Initialize storage configuration
export function useInitializeStorageConfiguration()
```

## Database Schema Changes

### New PhotoStorageSettings Table
```sql
CREATE TABLE "photo_storage_settings" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "storageType" TEXT NOT NULL DEFAULT 'online',
  "localStoragePath" TEXT NOT NULL DEFAULT '/public/uploads',
  "maxFileSize" INTEGER NOT NULL DEFAULT 1048576,
  "allowedFileTypes" TEXT[] DEFAULT ARRAY['image/jpeg', 'image/png', 'image/gif'],
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "photo_storage_settings_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "photo_storage_settings_organizationId_key" UNIQUE ("organizationId"),
  CONSTRAINT "photo_storage_settings_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE
);
```

### Enhanced Organization Model
The Organization model now includes all business settings:
- Financial settings (currency, fiscal year)
- Regional settings (timezone, location)
- Inventory tracking configuration
- Photo storage relationship

## Component Updates

### EnhancedImageUploadButton

**Props Interface:**
```typescript
interface EnhancedImageUploadButtonProps {
  title: string
  imageUrl: string
  setImageUrl: (url: string) => void
  organizationId: string        // New required prop
  endpoint?: any               // For online storage compatibility
  maxFileSize?: string
  acceptedFileTypes?: string[]
  className?: string
  onUploadStart?: () => void
  onUploadComplete?: () => void
  onUploadError?: () => void
}
```

**Key Features:**
- Automatic storage type detection
- Visual storage type indicators
- Enhanced error handling
- Loading states
- Organization-scoped uploads

### Updated Components

All image upload components have been updated to use `EnhancedImageUploadButton`:

#### Inventory Management
- ✅ `ModernCreateItemForm.tsx`
- ✅ `ModernEditItemForm.tsx`
- ✅ `ItemForm.tsx`
- ✅ `ItemForm2.tsx`

#### Category Management
- ✅ `ModernCategoryForm.tsx`

#### UI Components
- ✅ All inventory group components
- ✅ Item creation workflows
- ✅ Item editing workflows

## Security Features

### Access Control
- **Organization Scoping**: All files are scoped to specific organizations
- **Authentication Required**: Local file serving requires user authentication
- **MIME Type Validation**: Configurable allowed file types
- **File Size Restrictions**: Configurable maximum file sizes

### File Serving Security
```typescript
// Secure local file serving
app/api/uploads/[...path]/route.ts
```
- Verifies user authentication
- Validates organization access
- Serves files with proper headers
- Prevents unauthorized access

## Performance Optimizations

### Caching Strategy
- **TanStack Query Caching**: 5-minute stale time, 10-minute garbage collection
- **Browser Caching**: Local files cached for 1 day
- **Optimistic Updates**: Immediate UI updates with rollback on failure

### Data Fetching
- **Parallel Queries**: Multiple independent queries executed simultaneously
- **Selective Loading**: Only fetch required data
- **Automatic Invalidation**: Smart cache invalidation on updates

## Usage Guide

### For System Administrators

#### Initial Setup
1. Navigate to `/dashboard/settings/company`
2. Configure organization basic information
3. Set up financial settings (currency, fiscal year)
4. Configure photo storage preferences

#### Photo Storage Configuration
1. **Choose Storage Type**:
   - **Local**: For cost control and data sovereignty
   - **Cloud**: For scalability and global access

2. **Configure Settings**:
   - Set maximum file size (recommended: 1-5MB)
   - Define allowed MIME types
   - For local storage: specify directory path

3. **Test Configuration**:
   - Upload a test image in any form
   - Verify storage type indicator
   - Confirm file access

### For Developers

#### Using Enhanced Image Upload
```typescript
import EnhancedImageUploadButton from '@/components/FormInputs/EnhancedImageUploadButton'

function MyForm({ organizationId }) {
  const [imageUrl, setImageUrl] = useState('')

  return (
    <EnhancedImageUploadButton
      title="Upload Image"
      imageUrl={imageUrl}
      setImageUrl={setImageUrl}
      organizationId={organizationId}
      endpoint="itemImageUpload"
    />
  )
}
```

#### Organization Settings Integration
```typescript
import { useOrganizationSettings, useUpdateOrganizationSettings } from '@/hooks/useOrganizationSettings'

function SettingsForm({ organizationId }) {
  const { data: organization } = useOrganizationSettings(organizationId)
  const updateMutation = useUpdateOrganizationSettings()

  const handleUpdate = (data) => {
    updateMutation.mutate({ organizationId, data })
  }

  return (
    // Your form JSX
  )
}
```

## Migration Guide

### From Old Image Upload System

#### Automatic Migration
- Existing online images remain accessible
- No data migration required
- Backward compatibility maintained

#### Component Updates
Replace old components:
```typescript
// Old
import ImageUploadButtonModernOriginal from '@/components/FormInputs/ImageUploadButtonModernOriginal'

// New
import EnhancedImageUploadButton from '@/components/FormInputs/EnhancedImageUploadButton'
```

Add `organizationId` prop:
```typescript
// Old
<ImageUploadButtonModernOriginal
  title="Upload Image"
  imageUrl={imageUrl}
  setImageUrl={setImageUrl}
  endpoint="itemImageUpload"
/>

// New
<EnhancedImageUploadButton
  title="Upload Image"
  imageUrl={imageUrl}
  setImageUrl={setImageUrl}
  organizationId={organizationId}  // Add this prop
  endpoint="itemImageUpload"
/>
```

### Database Migration
Run the Prisma migration:
```bash
npx prisma db push
```

This will:
- Create the `PhotoStorageSettings` table
- Add the relation to `Organization`
- Set up proper indexes

## Troubleshooting

### Common Issues

#### 1. "Storage configuration not found"
**Solution**: Initialize storage configuration
```typescript
// In your app initialization
await initializeStorageForOrganization(organizationId)
```

#### 2. Local storage uploads failing
**Possible Causes**:
- Directory permissions
- Invalid storage path
- Disk space issues

**Solutions**:
- Verify directory exists and has write permissions
- Check storage path configuration
- Monitor disk space

#### 3. File serving 404 errors (local storage)
**Possible Causes**:
- File not found
- Incorrect organization access
- Authentication issues

**Solutions**:
- Verify file exists in configured directory
- Check user organization membership
- Ensure user is authenticated

#### 4. Image upload component not showing storage type
**Possible Causes**:
- Missing `organizationId` prop
- Storage configuration not loaded
- Component not wrapped in query provider

**Solutions**:
- Ensure `organizationId` prop is provided
- Initialize storage configuration
- Wrap app in `QueryClient` provider

### Error Handling

The system provides comprehensive error handling:

- **Network Errors**: Automatic retry with exponential backoff
- **Validation Errors**: Client-side validation with user-friendly messages
- **Storage Errors**: Graceful fallbacks and error reporting
- **Authentication Errors**: Automatic redirect to login

### Performance Monitoring

Monitor these metrics:
- Upload success rates
- File serving response times
- Storage configuration load times
- Error rates by storage type

## API Reference

### Storage Configuration Endpoints

#### GET /api/storage/config
Get current storage configuration for organization.

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "config_123",
    "organizationId": "org_456",
    "storageType": "local",
    "localStoragePath": "/public/uploads",
    "maxFileSize": 1048576,
    "allowedFileTypes": ["image/jpeg", "image/png"],
    "createdAt": "2024-01-01T00:00:00Z",
    "updatedAt": "2024-01-01T00:00:00Z"
  }
}
```

#### POST /api/storage/init
Initialize storage configuration for organization.

#### File Serving Endpoints

#### GET /api/uploads/[organizationId]/[filename]
Serve local files with authentication.

**Security**: Requires authentication and organization membership.

## Conclusion

The Enhanced Photo Storage and Company Settings System provides:

- **🏢 Centralized Management**: Unified interface for all organization settings
- **🔄 Flexible Storage**: Choose between local and cloud storage
- **💰 Cost Control**: Local storage eliminates recurring costs
- **🛡️ Enterprise Security**: Comprehensive access control and validation
- **⚡ Optimized Performance**: Smart caching and efficient data handling
- **🎨 Professional UX**: Modern, responsive, enterprise-grade interface

This system ensures scalability, security, and flexibility while maintaining ease of use for both administrators and end users.

---

**Last Updated**: March 2026
**Version**: 1.0
**Author**: Claude Code Assistant
**Status**: Production Ready