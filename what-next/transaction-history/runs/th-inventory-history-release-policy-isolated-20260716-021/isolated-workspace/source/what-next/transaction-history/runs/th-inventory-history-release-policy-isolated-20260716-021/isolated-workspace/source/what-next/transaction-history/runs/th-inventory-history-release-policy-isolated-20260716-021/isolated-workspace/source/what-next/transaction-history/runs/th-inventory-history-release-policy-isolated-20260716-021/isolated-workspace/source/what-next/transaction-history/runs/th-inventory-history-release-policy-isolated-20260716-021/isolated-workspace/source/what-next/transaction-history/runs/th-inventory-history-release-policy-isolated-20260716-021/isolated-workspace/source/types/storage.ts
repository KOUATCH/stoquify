export type StorageType = 'local' | 'online'

export interface StorageConfiguration {
  type: StorageType
  localPath?: string
  maxFileSize: string
  acceptedFileTypes: string[]
  organizationId: string
}

export interface PhotoStorageSettings {
  id: string
  organizationId: string
  storageType: StorageType
  localStoragePath: string
  maxFileSize: number
  allowedFileTypes: string[]
  createdAt: Date
  updatedAt: Date
}