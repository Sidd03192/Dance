"use client"

import { useState } from "react"
import { Header } from "@/components/header"
import { UploadSection } from "@/components/upload-section"
import { RecordSection } from "@/components/record-section"
import { ComparisonSection } from "@/components/comparison-section"
import { FeedbackSection } from "@/components/feedback-section"
import { ProgressIndicator } from "@/components/progress-indicator"

type AppStep = "upload" | "record" | "compare" | "feedback"

export function DanceApp() {
  const [currentStep, setCurrentStep] = useState<AppStep>("upload")
  const [referenceVideo, setReferenceVideo] = useState<string | null>(null)
  const [userVideo, setUserVideo] = useState<string | null>(null)

  const handleReferenceUploaded = (videoUrl: string) => {
    setReferenceVideo(videoUrl)
    setCurrentStep("record")
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
    setUserVideo(null)
    setCurrentStep("upload")
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
          />
        )}

        {currentStep === "feedback" && <FeedbackSection onReset={handleReset} />}
      </main>
    </div>
  )
}
