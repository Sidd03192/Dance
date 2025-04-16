import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Upload, FileVideo } from "lucide-react"

interface VideoUploaderProps {
  onVideoUploaded: (videoUrl: string, landmarkUrl: string) => void
}

export function VideoUploader({ onVideoUploaded }: VideoUploaderProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => {
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const files = e.dataTransfer.files
    if (files.length > 0 && files[0].type.startsWith("video/")) {
      handleFileUpload(files[0])
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      handleFileUpload(files[0])
    }
  }

  const handleFileUpload = async (file: File) => {
    setIsUploading(true)
    const formData = new FormData()
    formData.append("video", file, file.name)

    try {
      const response = await fetch("http://localhost:5000/upload", {
        method: "POST",
        body: formData,
      })

      const result = await response.json()
      if (!response.ok) {
        throw new Error(result.error)
      }

      // Once processed, pass the video URL and landmark file URL to next stage.
      onVideoUploaded(result.video_url, result.landmark_url)
    } catch (err: any) {
      console.error("Error uploading and processing video:", err)
      alert("Failed to process video: " + err.message)
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <Card className={`border-2 border-dashed ${isDragging ? "border-purple-500 bg-purple-50" : "border-gray-200"} transition-colors`}>
      <CardContent className="flex flex-col items-center justify-center p-12">
        <div className="w-full h-full" onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}>
          <div className="flex flex-col items-center justify-center gap-4">
            <div className="rounded-full bg-purple-100 p-4">
              <FileVideo className="h-10 w-10 text-purple-500" />
            </div>
            <div className="text-center">
              <h3 className="text-lg font-medium text-gray-900 mb-1">Upload reference video</h3>
              <p className="text-sm text-gray-500 mb-4">Drag and drop your video file or click to browse</p>
              <div className="flex justify-center">
                <label htmlFor="video-upload">
                  <Button className="bg-purple-500 hover:bg-purple-600 text-white" disabled={isUploading}>
                    {isUploading ? "Uploading..." : (
                      <>
                        <Upload className="mr-2 h-4 w-4" />
                        Select Video
                      </>
                    )}
                  </Button>
                  <input
                    id="video-upload"
                    type="file"
                    accept="video/*"
                    className="hidden"
                    onChange={handleFileChange}
                    disabled={isUploading}
                  />
                </label>
              </div>
              <p className="text-xs text-gray-500 mt-4">Supported formats: MP4, MOV, AVI (max 100MB)</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
