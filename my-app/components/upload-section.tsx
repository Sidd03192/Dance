import { useState, useRef } from "react"
import { FileVideo, Upload, CheckCircle, ArrowRight } from "lucide-react"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import { motion } from "framer-motion"

interface UploadSectionProps {
  onVideoUploaded: (videoUrl: string) => void
}

export function UploadSection({ onVideoUploaded }: UploadSectionProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

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
    setError(null)

    const files = e.dataTransfer.files
    if (files.length > 0) {
      if (files[0].type.startsWith("video/")) {
        handleFileUpload(files[0])
      } else {
        setError("Please upload a video file")
      }
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null)
    const files = e.target.files
    if (files && files.length > 0) {
      if (files[0].type.startsWith("video/")) {
        handleFileUpload(files[0])
      } else {
        setError("Please upload a video file")
      }
    }
  }

  // Updated function that calls the backend's upload endpoint
  const handleFileUpload = async (file: File) => {
    setIsUploading(true)
    setUploadProgress(0)

    // Prepare the file upload using FormData
    const formData = new FormData()
    formData.append("video", file, file.name)

    try {
      const response = await fetch("http://localhost:5000/upload", {
        method: "POST",
        body: formData,
      })

      // Optionally, you can simulate the progress here, or update if your backend supports it.
      // For now, we simply set progress to 100 upon completion.
      setUploadProgress(100)

      const result = await response.json()
      if (!response.ok) {
        throw new Error(result.error)
      }

      // The backend should return a processed (annotated) video URL.
      setPreviewUrl(result.video_url)
      // Trigger the callback to move to the next step
      onVideoUploaded(result.video_url)
    } catch (err: any) {
      console.error("Error uploading and processing video:", err)
      setError("Failed to process video: " + err.message)
    } finally {
      setIsUploading(false)
    }
  }

  const triggerFileInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click()
    }
  }

  // For demo purposes: allow skipping to next step
  const skipToNext = () => {
    onVideoUploaded("/placeholder.svg?height=720&width=1280")
  }

  const continueToNextStep = () => {
    if (previewUrl) {
      onVideoUploaded(previewUrl)
    }
  }

  return (
    <div className="max-w-2xl mx-auto py-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center mb-10"
      >
        <h1 className="text-3xl font-jakarta font-medium text-[#333333] mb-3">
          Upload Reference Video
        </h1>
        <p className="text-[#666666] max-w-md mx-auto">
          Start by uploading a professional dance video that you want to compare your performance against
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className={`
          bg-white rounded-2xl transition-all shadow-sm
          ${isDragging ? "ring-2 ring-[#b8a2db] bg-[#f5f5f7]" : "hover:shadow-md"}
          ${isUploading ? "bg-white" : ""}
          overflow-hidden
        `}
      >
        <div
          className="relative p-10"
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={!isUploading && !previewUrl ? triggerFileInput : undefined}
          style={{ cursor: !isUploading && !previewUrl ? "pointer" : "default" }}
        >
          {!isUploading && !previewUrl ? (
            <div className="flex flex-col items-center text-center relative z-10">
              <motion.div
                whileHover={{ scale: 1.03 }}
                className="w-16 h-16 bg-[#f5f5f7] rounded-full flex items-center justify-center mb-6"
              >
                <FileVideo className="h-8 w-8 text-[#b8a2db]" />
              </motion.div>
              <h3 className="text-lg font-jakarta font-medium text-[#333333] mb-2">
                Drag and drop your video
              </h3>
              <p className="text-[#666666] mb-6 max-w-sm">
                Or click anywhere in this area to browse files
              </p>
              <motion.div
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                className="bg-[#f5f5f7] rounded-full px-6 py-2 flex items-center gap-2 text-[#666666] font-medium"
              >
                <Upload className="h-4 w-4" />
                <span>Browse Files</span>
              </motion.div>
              <input
                ref={fileInputRef}
                id="video-upload"
                type="file"
                accept="video/*"
                className="hidden"
                onChange={handleFileChange}
              />
              {error && (
                <motion.p
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-[#e25c5c] text-sm mt-4 bg-[#fff5f5] px-4 py-2 rounded-full"
                >
                  {error}
                </motion.p>
              )}
            </div>
          ) : isUploading ? (
            <div className="flex flex-col items-center py-8 relative z-10">
              <h3 className="text-lg font-jakarta font-medium text-[#333333] mb-6">
                Uploading and processing video...
              </h3>
              {previewUrl && (
                <div className="w-full max-w-md mb-6 aspect-video rounded-lg overflow-hidden bg-black">
                  <video
                    src={previewUrl}
                    className="w-full h-full object-contain"
                    controls={false}
                    muted
                    autoPlay={false}
                  />
                </div>
              )}
              <div className="w-full max-w-md mb-4">
                <Progress value={uploadProgress} className="h-1" />
              </div>
              <div className="flex items-center gap-2">
                <p className="text-sm text-[#666666]">{uploadProgress}% complete</p>
                {uploadProgress === 100 && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 500, damping: 15 }}
                  >
                    <CheckCircle className="h-5 w-5 text-[#6bb86b]" />
                  </motion.div>
                )}
              </div>
            </div>
          ) : previewUrl ? (
            <div className="flex flex-col items-center py-8 relative z-10">
              <h3 className="text-lg font-jakarta font-medium text-[#333333] mb-6">
                Preprocessed Video Preview
              </h3>
              <div className="w-full max-w-md mb-6 aspect-video rounded-lg overflow-hidden bg-black">
                {/* Display the preprocessed (annotated) video */}
                <video src={previewUrl} className="w-full h-full object-contain" controls autoPlay={false} />
              </div>
              <Button
                onClick={continueToNextStep}
                className="bg-[#b8a2db] hover:bg-[#a28bc9] px-8 py-3 rounded-full text-white shadow-sm mt-4"
              >
                <ArrowRight className="mr-2 h-4 w-4" />
                Continue to Recording
              </Button>
            </div>
          ) : null}
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.4 }}
        className="mt-6 text-center"
      >
        <p className="text-xs text-[#999999]">
          Supported formats: MP4, MOV, AVI (max 100MB)
        </p>
        {/* Skip button for demo purposes */}
        <Button
          onClick={skipToNext}
          variant="ghost"
          className="text-[#999999] hover:text-[#666666] hover:bg-transparent underline text-sm mt-4"
        >
          Skip upload (demo only)
        </Button>
      </motion.div>
    </div>
  )
}
