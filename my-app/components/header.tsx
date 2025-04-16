import Image from "next/image"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { HelpCircle, Settings } from "lucide-react"

type AppStep = "upload" | "record" | "compare" | "feedback"

interface HeaderProps {
  currentStep?: AppStep
}

export function Header({ currentStep }: HeaderProps) {
  const stepLabels = {
    upload: "Upload reference video",
    record: "Record your dance",
    compare: "Compare performances",
    feedback: "AI feedback",
  }

  return (
    <header className="bg-white/80 backdrop-blur-md sticky top-0 z-10 border-b border-[#e6e6e6]">
      <div className="container mx-auto px-6 max-w-5xl">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="relative">
              <Image src="/logo.png" alt="Sync Logo" width={28} height={28} className="h-7 w-7" />
            </div>
            <span className="text-xl font-jakarta font-medium text-[#333333]">Sync</span>
          </div>

          {currentStep && (
            <div className="hidden md:block">
              <div className="px-4 py-1.5 rounded-full bg-[#f5f5f7] text-[#666666] text-sm font-medium">
                {stepLabels[currentStep]}
              </div>
            </div>
          )}

          <div className="flex items-center gap-4">
            <button className="p-2 text-[#666666] hover:text-[#333333] transition-colors rounded-full hover:bg-[#f5f5f7]">
              <Settings className="h-5 w-5" />
            </button>
            <button className="p-2 text-[#666666] hover:text-[#333333] transition-colors rounded-full hover:bg-[#f5f5f7]">
              <HelpCircle className="h-5 w-5" />
            </button>
            <Avatar className="h-8 w-8 ring-2 ring-[#f5f5f7]">
              <AvatarImage src="/placeholder.svg?height=32&width=32" alt="User" />
              <AvatarFallback className="bg-[#e6e6fa] text-[#666666]">U</AvatarFallback>
            </Avatar>
          </div>
        </div>
      </div>
    </header>
  )
}
