import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { HelpCircle } from "lucide-react"

export function Navbar() {
  return (
    <header className="border-b bg-white">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center gap-2">
              <Image src="/logo.png" alt="Sync Logo" width={40} height={40} />
              <span className="text-xl font-semibold text-purple-800">Sync</span>
            </Link>
            <nav className="hidden md:flex">
              <ul className="flex gap-6">
                <li>
                  <Link href="/practice" className="text-purple-600 font-medium border-b-2 border-purple-600 pb-4">
                    Practice
                  </Link>
                </li>
                <li>
                  <Link href="/lessons" className="text-gray-600 hover:text-purple-600 transition-colors pb-4">
                    Lessons
                  </Link>
                </li>
                <li>
                  <Link href="/progress" className="text-gray-600 hover:text-purple-600 transition-colors pb-4">
                    Progress
                  </Link>
                </li>
                <li>
                  <Link href="/library" className="text-gray-600 hover:text-purple-600 transition-colors pb-4">
                    Library
                  </Link>
                </li>
              </ul>
            </nav>
          </div>
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" className="text-gray-600">
              <HelpCircle className="h-5 w-5" />
            </Button>
            <Avatar>
              <AvatarImage src="/placeholder.svg?height=40&width=40" alt="User" />
              <AvatarFallback>US</AvatarFallback>
            </Avatar>
          </div>
        </div>
      </div>
    </header>
  )
}
