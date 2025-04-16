"use client"
import { Button } from "@/components/ui/button"
import { CheckCircle, AlertCircle, Sparkles, ArrowRight } from "lucide-react"
import { motion } from "framer-motion"

interface FeedbackSectionProps {
  onReset: () => void
}

export function FeedbackSection({ onReset }: FeedbackSectionProps) {
  const feedbackItems = [
    {
      type: "positive",
      title: "Excellent arm positioning",
      description:
        "Your arm extensions and positions closely match the reference video, showing good control and form.",
    },
    {
      type: "improvement",
      title: "Timing adjustment needed",
      description: "Your movements are slightly behind the beat. Try to anticipate the rhythm more.",
    },
    {
      type: "positive",
      title: "Good posture",
      description: "You maintain proper posture throughout most of the routine.",
    },
    {
      type: "improvement",
      title: "Foot placement",
      description: "Your foot placement could be more precise during turns. Focus on landing positions.",
    },
  ]

  return (
    <div className="max-w-4xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center mb-12"
      >
        <h1 className="text-3xl font-jakarta font-medium text-[#333333] mb-3">AI Feedback</h1>
        <p className="text-[#666666]">Here's how you can improve your performance based on AI analysis</p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="bg-white rounded-2xl shadow-sm overflow-hidden mb-10"
      >
        <div className="p-8 border-b border-[#f0f0f0] bg-[#f9f7fc]">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-6xl font-light text-[#333333]">
                82<span className="text-3xl">%</span>
              </div>
              <div className="text-[#666666] text-sm mt-1">Match score</div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-40 h-2 bg-[#f0f0f0] rounded-full overflow-hidden">
                <div className="h-full bg-[#b8a2db] rounded-full" style={{ width: "82%" }}></div>
              </div>
              <span className="text-[#b8a2db] font-medium">Great</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-[#f0f0f0]">
          {feedbackItems.map((item, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 + index * 0.1 }}
              className="p-6 bg-white flex gap-4 items-start"
            >
              <div
                className={`
                p-2 rounded-full mt-0.5
                ${item.type === "positive" ? "bg-[#f0f9f0] text-[#6bb86b]" : "bg-[#fff9f0] text-[#e6a23c]"}
              `}
              >
                {item.type === "positive" ? <CheckCircle className="h-5 w-5" /> : <AlertCircle className="h-5 w-5" />}
              </div>
              <div>
                <h3
                  className={`
                  font-medium text-base mb-1
                  ${item.type === "positive" ? "text-[#6bb86b]" : "text-[#e6a23c]"}
                `}
                >
                  {item.title}
                </h3>
                <p
                  className={`
                  text-sm
                  ${item.type === "positive" ? "text-[#4d8a4d]" : "text-[#b88230]"}
                `}
                >
                  {item.description}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.6 }}
        className="bg-white p-8 rounded-2xl shadow-sm mb-10"
      >
        <div className="flex items-center gap-3 mb-4">
          <Sparkles className="h-5 w-5 text-[#b8a2db]" />
          <h3 className="font-jakarta font-medium text-[#333333] text-lg">Detailed improvement suggestions</h3>
        </div>

        <ul className="space-y-3 text-[#666666] mb-6">
          <li className="flex gap-2 bg-[#f9f7fc] p-3 rounded-lg">
            <span className="text-[#b8a2db] font-bold">•</span>
            <span>Focus on synchronizing your movements with the beat, especially during the chorus section.</span>
          </li>
          <li className="flex gap-2 p-3">
            <span className="text-[#b8a2db] font-bold">•</span>
            <span>Practice the turn sequence at 0:45 to improve stability and precision.</span>
          </li>
          <li className="flex gap-2 bg-[#f9f7fc] p-3 rounded-lg">
            <span className="text-[#b8a2db] font-bold">•</span>
            <span>Your energy level drops slightly in the middle section - maintain consistent energy throughout.</span>
          </li>
          <li className="flex gap-2 p-3">
            <span className="text-[#b8a2db] font-bold">•</span>
            <span>The arm sequence at 1:20 needs more fluidity between positions.</span>
          </li>
        </ul>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.8 }}
        className="flex justify-center"
      >
        <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
          <Button
            onClick={onReset}
            className="bg-[#b8a2db] hover:bg-[#a28bc9] px-10 py-3 rounded-full text-white shadow-sm"
          >
            Start New Session
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </motion.div>
      </motion.div>
    </div>
  )
}
