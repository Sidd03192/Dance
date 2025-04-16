"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Slider } from "@/components/ui/slider"
import { VideoUploader } from "@/components/video-uploader"
import { VideoRecorder } from "@/components/video-recorder"
import { VideoPlayer } from "@/components/video-player"
import { FeedbackPanel } from "@/components/feedback-panel"
import { Play, Pause, RotateCcw, X, ChevronRight } from "lucide-react"

type Step = "upload" | "record" | "compare" | "feedback"

export function DanceComparison() {
  const [currentStep, setCurrentStep] = useState<Step>("upload")
  const [referenceVideo, setReferenceVideo] = useState<string | null>(null)
  const [userVideo, setUserVideo] = useState<string | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [sensitivity, setSensitivity] = useState([50])

  const handleReferenceUpload = (videoUrl: string) => {
    setReferenceVideo(videoUrl)
    setCurrentStep("record")
  }

  const handleUserVideoRecorded = (videoUrl: string) => {
    setUserVideo(videoUrl)
    setCurrentStep("compare")
  }

  const handleComparisonComplete = () => {
    setCurrentStep("feedback")
  }

  const resetSession = () => {
    setReferenceVideo(null)
    setUserVideo(null)
    setCurrentStep("upload")
    setIsPlaying(false)
  }

  const togglePlayback = () => {
    setIsPlaying(!isPlaying)
    // In a real app, this would control the video playback
  }

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          {currentStep === "upload" && "Upload Reference Video"}
          {currentStep === "record" && "Record Your Dance"}
          {currentStep === "compare" && "Live Comparison"}
          {currentStep === "feedback" && "AI Feedback"}
        </h1>
        <p className="text-gray-600">
          {currentStep === "upload" && "Start by uploading a reference dance video"}
          {currentStep === "record" && "Now record yourself performing the same dance"}
          {currentStep === "compare" && "Watch both videos side by side"}
          {currentStep === "feedback" && "Review AI-generated improvement suggestions"}
        </p>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center justify-between mb-8 px-2">
        {["upload", "record", "compare", "feedback"].map((step, index) => (
          <div key={step} className="flex items-center">
            <div
              className={`flex items-center justify-center w-10 h-10 rounded-full ${
                currentStep === step
                  ? "bg-purple-500 text-white"
                  : currentStep === "upload" && step !== "upload"
                    ? "bg-gray-200 text-gray-500"
                    : ["record", "compare", "feedback"].indexOf(currentStep as Step) >=
                        ["record", "compare", "feedback"].indexOf(step as Step)
                      ? "bg-purple-200 text-purple-700"
                      : "bg-gray-200 text-gray-500"
              }`}
            >
              {index + 1}
            </div>
            {index < 3 && (
              <div
                className={`w-24 h-1 mx-2 ${
                  ["record", "compare", "feedback"].indexOf(currentStep as Step) > index
                    ? "bg-purple-200"
                    : "bg-gray-200"
                }`}
              />
            )}
          </div>
        ))}
      </div>

      {/* Main Content */}
      <div className="mb-8">
        {currentStep === "upload" && <VideoUploader onVideoUploaded={handleReferenceUpload} />}

        {currentStep === "record" && referenceVideo && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="overflow-hidden">
              <div className="aspect-video bg-black relative">
                <VideoPlayer src={referenceVideo} isPlaying={false} label="Reference Video" />
              </div>
            </Card>
            <VideoRecorder onVideoRecorded={handleUserVideoRecorded} />
          </div>
        )}

        {currentStep === "compare" && referenceVideo && userVideo && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <Card className="overflow-hidden">
                <div className="aspect-video bg-black relative">
                  <VideoPlayer src={referenceVideo} isPlaying={isPlaying} label="Reference Video" />
                </div>
              </Card>
              <Card className="overflow-hidden">
                <div className="aspect-video bg-black relative">
                  <VideoPlayer src={userVideo} isPlaying={isPlaying} label="Your Video" />
                </div>
              </Card>
            </div>
            <div className="flex flex-col items-center gap-6">
              <div className="flex gap-3">
                <Button onClick={togglePlayback} className="bg-purple-500 hover:bg-purple-600 text-white">
                  {isPlaying ? <Pause className="mr-2 h-4 w-4" /> : <Play className="mr-2 h-4 w-4" />}
                  {isPlaying ? "Pause" : "Play"}
                </Button>
                <Button variant="outline" onClick={() => setIsPlaying(false)}>
                  <RotateCcw className="mr-2 h-4 w-4" />
                  Restart
                </Button>
                <Button
                  variant="outline"
                  className="text-red-500 border-red-200 hover:bg-red-50 hover:text-red-600"
                  onClick={resetSession}
                >
                  <X className="mr-2 h-4 w-4" />
                  End
                </Button>
              </div>
              <div className="w-full max-w-md">
                <div className="flex justify-between mb-2 text-sm text-gray-600">
                  <span>Low Sensitivity</span>
                  <span>High Sensitivity</span>
                </div>
                <Slider value={sensitivity} onValueChange={setSensitivity} max={100} step={1} className="w-full" />
              </div>
              <Button onClick={handleComparisonComplete} className="mt-4 bg-purple-500 hover:bg-purple-600 text-white">
                Get AI Feedback
                <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </>
        )}

        {currentStep === "feedback" && <FeedbackPanel onReset={resetSession} />}
      </div>
    </div>
  )
}
