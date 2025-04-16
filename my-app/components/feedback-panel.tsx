"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { RotateCcw, ThumbsUp, AlertCircle, CheckCircle, ArrowRight } from "lucide-react"

interface FeedbackPanelProps {
  onReset: () => void
}

export function FeedbackPanel({ onReset }: FeedbackPanelProps) {
  // In a real app, this would be actual AI-generated feedback
  const feedbackItems = [
    {
      type: "positive",
      title: "Good arm extension",
      description: "Your arm extensions match the reference video well, showing good form and control.",
      icon: ThumbsUp,
    },
    {
      type: "improvement",
      title: "Timing needs adjustment",
      description: "Your movements are slightly behind the reference. Try to anticipate the beats more.",
      icon: AlertCircle,
    },
    {
      type: "improvement",
      title: "Posture adjustment needed",
      description: "Keep your back straighter during the turns to maintain better balance and form.",
      icon: AlertCircle,
    },
    {
      type: "positive",
      title: "Excellent footwork",
      description: "Your footwork is precise and matches the reference video very well.",
      icon: ThumbsUp,
    },
  ]

  return (
    <div className="space-y-6">
      <Card className="bg-purple-50 border-purple-200">
        <CardHeader className="pb-2">
          <CardTitle className="text-purple-800 flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-purple-600" />
            AI Analysis Complete
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-purple-800">
            We've analyzed your dance performance and compared it to the reference video. Here are some insights to help
            you improve.
          </p>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {feedbackItems.map((item, index) => (
          <Card key={index} className={item.type === "positive" ? "border-green-200" : "border-amber-200"}>
            <CardHeader className="pb-2">
              <CardTitle
                className={`text-base flex items-center gap-2 ${
                  item.type === "positive" ? "text-green-700" : "text-amber-700"
                }`}
              >
                <item.icon className={`h-5 w-5 ${item.type === "positive" ? "text-green-500" : "text-amber-500"}`} />
                {item.title}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 text-sm">{item.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Overall Score</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-4xl font-bold text-purple-600">78%</div>
              <p className="text-gray-500 text-sm">Match with reference</p>
            </div>
            <div className="w-32 h-32 rounded-full border-8 border-purple-200 flex items-center justify-center relative">
              <div className="absolute inset-0 rounded-full border-8 border-purple-500 border-t-transparent transform -rotate-45"></div>
              <div className="text-xl font-bold text-purple-800">Good</div>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-4">
            <Button variant="outline" onClick={onReset} className="w-full">
              <RotateCcw className="mr-2 h-4 w-4" />
              New Session
            </Button>
            <Button className="w-full bg-purple-500 hover:bg-purple-600 text-white">
              Save Progress
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
