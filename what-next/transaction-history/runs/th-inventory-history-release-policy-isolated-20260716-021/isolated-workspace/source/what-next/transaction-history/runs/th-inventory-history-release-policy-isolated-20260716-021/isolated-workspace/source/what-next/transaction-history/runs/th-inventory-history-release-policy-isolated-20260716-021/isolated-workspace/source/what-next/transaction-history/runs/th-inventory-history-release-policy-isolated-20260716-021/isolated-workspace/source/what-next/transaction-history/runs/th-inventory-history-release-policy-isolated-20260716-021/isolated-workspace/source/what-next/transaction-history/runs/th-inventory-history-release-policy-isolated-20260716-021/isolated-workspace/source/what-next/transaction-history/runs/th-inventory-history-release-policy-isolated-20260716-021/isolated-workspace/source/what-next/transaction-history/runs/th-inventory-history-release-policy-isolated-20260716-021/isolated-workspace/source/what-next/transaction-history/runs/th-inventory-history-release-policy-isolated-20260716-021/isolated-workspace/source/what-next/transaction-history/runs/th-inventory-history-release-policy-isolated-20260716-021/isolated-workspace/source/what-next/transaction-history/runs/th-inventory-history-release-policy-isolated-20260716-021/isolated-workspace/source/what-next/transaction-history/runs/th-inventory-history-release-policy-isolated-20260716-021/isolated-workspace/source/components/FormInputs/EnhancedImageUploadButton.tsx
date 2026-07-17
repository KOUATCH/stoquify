"use client"

import { notify } from "@/lib/notifications/notify"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"import { UploadButton } from "@/lib/uploadthing"
import { ImageIcon, X, HardDrive, Cloud, Upload, Loader2 } from "lucide-react"
import Image from "next/image"
import { useState, useEffect, useCallback } from "react"
import { uploadPhoto, deletePhoto } from '@/actions/storage/photo-upload-actions'
import { getStorageConfiguration } from '@/actions/storage/storage-config-actions'

interface EnhancedImageUploadButtonProps {
  title: string
  imageUrl: string
  setImageUrl: (url: string) => void
  organizationId: string
  endpoint?: any // For online storage compatibility
  maxFileSize?: string
  acceptedFileTypes?: string[]
  className?: string
  onUploadStart?: () => void
  onUploadComplete?: () => void
  onUploadError?: () => void
}

const EnhancedImageUploadButton = ({
  title,
  imageUrl,
  setImageUrl,
  organizationId,
  endpoint,
  maxFileSize = "4MB",
  acceptedFileTypes = ["image/*"],
  className = "",
  onUploadStart,
  onUploadComplete,
  onUploadError,
}: EnhancedImageUploadButtonProps) => {
  const [isUploading, setIsUploading] = useState(false)
  const [storageType, setStorageType] = useState<'local' | 'online' | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const loadStorageConfiguration = useCallback(async () => {
    try {
      const result = await getStorageConfiguration(organizationId)
      if (result.success && result.data) {
        setStorageType(result.data.storageType as 'local' | 'online')
      } else {
        // Default to online if no configuration found
        setStorageType('online')
      }
    } catch (error) {
      console.error('Error loading storage configuration:', error)
      setStorageType('online') // Fallback to online
    } finally {
      setIsLoading(false)
    }
  }, [organizationId])

  useEffect(() => {
    loadStorageConfiguration()
  }, [loadStorageConfiguration])

  const handleLocalUpload = useCallback(async (file: File) => {
    try {
      setIsUploading(true)
      onUploadStart?.()

      const result = await uploadPhoto(file, organizationId)

      if (result.success && result.url) {
        setImageUrl(result.url)
        notify({
          title: "Upload successful",
          description: "Your image has been uploaded successfully.",
        })
        onUploadComplete?.()
      } else {
        notify({
          title: "Upload failed",
          description: result.error || "Failed to upload image",
          variant: "destructive",
        })
        onUploadError?.()
      }
    } catch (error) {
      console.error('Local upload error:', error)
      notify({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "Something went wrong during upload.",
        variant: "destructive",
      })
      onUploadError?.()
    } finally {
      setIsUploading(false)
    }
  }, [organizationId, setImageUrl, onUploadStart, onUploadComplete, onUploadError])

  const handleFileSelect = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file && storageType === 'local') {
      await handleLocalUpload(file)
    }
  }, [handleLocalUpload, storageType])

  const handleOnlineUploadComplete = (res: any[]) => {
    if (res && res[0]) {
      setImageUrl(res[0].url)
      notify({
        title: "Upload successful",
        description: "Your image has been uploaded successfully.",
      })
    }
    setIsUploading(false)
    onUploadComplete?.()
  }

  const handleOnlineUploadError = (error: Error) => {
    console.error("Upload error:", error)
    notify({
      title: "Upload failed",
      description: error.message || "Something went wrong during upload.",
      variant: "destructive",
    })
    setIsUploading(false)
    onUploadError?.()
  }

  const handleRemoveImage = async () => {
    if (imageUrl && storageType === 'local' && imageUrl.startsWith('/uploads/')) {
      // For local storage, call delete action
      const result = await deletePhoto(imageUrl, organizationId)
      if (!result.success) {
        notify({
          title: "Warning",
          description: "Image removed from form but file may still exist on server.",
          variant: "destructive",
        })
      }
    }

    setImageUrl("")
    notify({
      title: "Image removed",
      description: "The image has been removed successfully.",
    })
  }

  const hasImage = imageUrl && imageUrl !== ""

  if (isLoading) {
    return (
      <Card className={`overflow-hidden ${className}`}>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin mr-2" />
          <span>Loading storage configuration...</span>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={`overflow-hidden transition-all duration-200 hover:shadow-md ${className}`}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <ImageIcon className="h-5 w-5" />
          {title}
          <div className="ml-auto flex items-center gap-1 text-xs bg-muted px-2 py-1 rounded-full">
            {storageType === 'local' ? (
              <><HardDrive className="h-3 w-3" /> Local</>
            ) : (
              <><Cloud className="h-3 w-3" /> Online</>
            )}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Image Preview */}
        <div className="relative group">
          {hasImage ? (
            <div className="relative">
              <Image
                alt={title}
                className="h-48 w-full rounded-lg object-cover border-2 border-dashed border-transparent transition-all duration-200"
                height={300}
                src={imageUrl || "/placeholder.svg"}
                width={300}
              />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200 rounded-lg flex items-center justify-center">
                <Button variant="destructive" size="sm" onClick={handleRemoveImage} className="gap-2">
                  <X className="h-4 w-4" />
                  Remove
                </Button>
              </div>
            </div>
          ) : (
            <div className="h-48 w-full rounded-lg border-2 border-dashed border-muted-foreground/25 bg-muted/50 flex items-center justify-center transition-colors duration-200 hover:border-muted-foreground/50 hover:bg-muted/80">
              <div className="text-center space-y-2">
                <ImageIcon className="h-12 w-12 mx-auto text-muted-foreground/50" />
                <p className="text-sm text-muted-foreground">No image uploaded</p>
              </div>
            </div>
          )}
        </div>

        {/* Upload Button */}
        <div className="space-y-2">
          {storageType === 'local' ? (
            <>
              <input
                type="file"
                id="file-upload"
                accept={acceptedFileTypes.join(',')}
                onChange={handleFileSelect}
                disabled={isUploading}
                className="hidden"
              />
              <Button
                asChild
                className="w-full gap-2"
                disabled={isUploading}
              >
                <label htmlFor="file-upload" className="cursor-pointer">
                  {isUploading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4" />
                      {hasImage ? "Replace Image" : "Upload Image"}
                    </>
                  )}
                </label>
              </Button>
            </>
          ) : (
            <UploadButton
              endpoint={endpoint}
              onClientUploadComplete={handleOnlineUploadComplete}
              onUploadError={handleOnlineUploadError}
              onUploadBegin={() => {
                setIsUploading(true)
                onUploadStart?.()
              }}
              appearance={{
                button:
                  "w-full bg-primary hover:bg-primary/90 text-primary-foreground font-medium py-2 px-4 rounded-md transition-colors duration-200 flex items-center justify-center gap-2 ut-ready:bg-primary ut-uploading:bg-primary/80 ut-uploading:cursor-not-allowed",
                allowedContent: "text-xs text-muted-foreground text-center mt-2",
                container: "w-full",
              }}
              content={{
                button({ ready, isUploading }) {
                  if (isUploading) return "Uploading..."
                  if (ready) return hasImage ? "Replace Image" : "Upload Image"
                  return "Getting ready..."
                },
                allowedContent({ ready, fileTypes, isUploading }) {
                  if (!ready) return "Preparing upload..."
                  if (isUploading) return "Uploading your image..."
                  return `Accepted: ${acceptedFileTypes.join(", ")} (max ${maxFileSize})`
                },
              }}
            />
          )}

          {/* Upload Info */}
          <div className="text-xs text-muted-foreground text-center space-y-1">
            <p>Drag and drop or click to upload</p>
            <p>Maximum file size: {maxFileSize}</p>
            <div className="flex items-center justify-center gap-1 text-xs">
              {storageType === 'local' ? (
                <><HardDrive className="h-3 w-3" /> Stored locally on your server</>
              ) : (
                <><Cloud className="h-3 w-3" /> Stored in the cloud via UploadThing</>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default EnhancedImageUploadButton
