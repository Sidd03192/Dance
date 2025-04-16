type AppStep = "upload" | "record" | "compare" | "feedback"

interface ProgressIndicatorProps {
  currentStep: AppStep
}

export function ProgressIndicator({ currentStep }: ProgressIndicatorProps) {
  const steps = [
    { id: "upload", label: "Upload" },
    { id: "record", label: "Record" },
    { id: "compare", label: "Compare" },
    { id: "feedback", label: "Feedback" },
  ]

  const currentIndex = steps.findIndex((step) => step.id === currentStep)

  return (
    <div className="mb-12 mt-4">
      <div className="flex justify-between items-center relative">
        {/* Progress Line */}
        <div className="absolute left-0 right-0 h-[1px] bg-[#e6e6e6]"></div>
        <div
          className="absolute left-0 h-[1px] bg-[#b8a2db] transition-all duration-700 ease-in-out"
          style={{
            width: currentIndex === 0 ? "0%" : currentIndex === 1 ? "33%" : currentIndex === 2 ? "66%" : "100%",
          }}
        ></div>

        {/* Steps */}
        {steps.map((step, index) => (
          <div key={step.id} className="flex flex-col items-center relative z-10">
            <div
              className={`w-3 h-3 rounded-full mb-2 transition-all duration-500 ${
                index < currentIndex
                  ? "bg-[#b8a2db] scale-90"
                  : index === currentIndex
                    ? "bg-[#b8a2db] scale-110 ring-4 ring-[#e6e6fa]"
                    : "bg-[#e6e6e6]"
              }`}
            ></div>
            <span
              className={`text-xs font-medium transition-all duration-500 ${
                index < currentIndex
                  ? "text-[#666666]"
                  : index === currentIndex
                    ? "text-[#333333] font-medium"
                    : "text-[#999999]"
              }`}
            >
              {step.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
