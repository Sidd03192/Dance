"use client"

import { useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import { Header } from "@/components/header"
import { UploadSection } from "@/components/upload-section"
import { RecordSection } from "@/components/record-section"
import { ComparisonSection } from "@/components/comparison-section"
import { FeedbackSection } from "@/components/feedback-section"
import { ProgressIndicator } from "@/components/progress-indicator"
import { DancerLoadingAnimation } from "@/components/loading-animation"

type AppStep = "upload" | "record" | "compare" | "feedback"

export function DanceApp() {
  const searchParams = useSearchParams()
  const lessonId = searchParams.get("lessonId")
  const stepParam = searchParams.get("step") as AppStep | null

  const [currentStep, setCurrentStep] = useState<AppStep>(stepParam || "upload")
  const [referenceVideo, setReferenceVideo] = useState<string | null>(null)
  const [userVideo, setUserVideo] = useState<string | null>("/demo-dance.mp4") // Set the demo video as user performance
  const [isLoading, setIsLoading] = useState(!!lessonId)

  // Handle URL parameters for lesson and step
  useEffect(() => {
    if (lessonId) {
      setIsLoading(true)
      // In a real app, fetch the lesson data from an API
      // For now, simulate loading the reference video
      setTimeout(() => {
        setReferenceVideo("/placeholder.svg?height=720&width=1280")
        setCurrentStep(stepParam || "record")
        setIsLoading(false)
      }, 1000)
    }
  }, [lessonId, stepParam])

  const handleReferenceUploaded = (videoUrl: string) => {
    setReferenceVideo(videoUrl)
    setCurrentStep("compare") // Skip the record step and go directly to compare
  }

  const handleUserVideoRecorded = (videoUrl: string) => {
    setUserVideo(videoUrl)
    setCurrentStep("compare")
  }

  const handleGetFeedback = () => {
    setCurrentStep("feedback")
  }

  const handleReset = () => {
    setReferenceVideo(null)
    setUserVideo("/demo-dance.mp4") // Reset to the demo video
    setCurrentStep("upload")
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#f7f7f7] flex flex-col">
        <Header currentStep={undefined} />
        <main className="flex-1 container mx-auto px-4 py-8 max-w-5xl flex items-center justify-center">
          <DancerLoadingAnimation text="Loading your lesson..." />
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#f7f7f7] flex flex-col">
      {/* Subtle background elements */}
      <div className="absolute top-0 left-0 w-full h-64 bg-gradient-to-r from-[#f0e6ff]/20 via-[#e6f0ff]/10 to-[#ffe6f0]/20 -z-10"></div>
      <div className="absolute bottom-0 right-0 w-full h-64 bg-gradient-to-l from-[#f0e6ff]/20 via-[#e6f0ff]/10 to-[#ffe6f0]/20 -z-10"></div>

      <Header currentStep={currentStep} />

      <main className="flex-1 container mx-auto px-4 py-8 max-w-5xl">
        <ProgressIndicator currentStep={currentStep} />

        {currentStep === "upload" && <UploadSection onVideoUploaded={handleReferenceUploaded} />}

        {currentStep === "record" && referenceVideo && (
          <RecordSection referenceVideo={referenceVideo} onVideoRecorded={handleUserVideoRecorded} />
        )}

        {currentStep === "compare" && referenceVideo && userVideo && (
          <ComparisonSection
            referenceVideo={referenceVideo}
            userVideo={userVideo}
            onGetFeedback={handleGetFeedback}
            onReset={handleReset}
            autoPlay={true} // Add autoPlay prop
          />
        )}

        {currentStep === "feedback" && <FeedbackSection onReset={handleReset} />}
      </main>
    </div>
  )
}
