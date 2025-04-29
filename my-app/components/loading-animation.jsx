"use client"

import { motion } from "framer-motion"

interface LoadingAnimationProps {
  text?: string
}

export function DancerLoadingAnimation({ text = "Loading..." }: LoadingAnimationProps) {
  return (
    <div className="flex items-center justify-center min-h-[200px] w-full">
      <div className="text-center">
        <div className="w-24 h-24 mx-auto mb-4 relative">
          {/* Head */}
          <motion.div
            className="w-6 h-6 bg-[#b8a2db] rounded-full absolute"
            animate={{
              y: [0, -3, 0, -2, 0],
            }}
            transition={{
              duration: 1.5,
              repeat: Number.POSITIVE_INFINITY,
              ease: "easeInOut",
            }}
            style={{ left: "calc(50% - 3px)", top: "0%" }}
          />

          {/* Body */}
          <motion.div
            className="w-2 h-10 bg-[#a28bc9] absolute"
            animate={{
              rotate: [0, 5, 0, -5, 0],
              y: [0, -2, 0, -1, 0],
            }}
            transition={{
              duration: 1.5,
              repeat: Number.POSITIVE_INFINITY,
              ease: "easeInOut",
            }}
            style={{ left: "calc(50% - 1px)", top: "25%" }}
          />

          {/* Left arm */}
          <motion.div
            className="w-8 h-2 bg-[#9370db] absolute origin-left"
            animate={{
              rotate: [0, 30, 0, -30, 0],
            }}
            transition={{
              duration: 1.5,
              repeat: Number.POSITIVE_INFINITY,
              ease: "easeInOut",
            }}
            style={{ left: "calc(50% - 1px)", top: "30%" }}
          />

          {/* Right arm */}
          <motion.div
            className="w-8 h-2 bg-[#9370db] absolute origin-right"
            animate={{
              rotate: [0, -30, 0, 30, 0],
            }}
            transition={{
              duration: 1.5,
              repeat: Number.POSITIVE_INFINITY,
              ease: "easeInOut",
              delay: 0.2,
            }}
            style={{ right: "calc(50% - 1px)", top: "30%" }}
          />

          {/* Left leg */}
          <motion.div
            className="w-2 h-10 bg-[#d8bfd8] absolute origin-top"
            animate={{
              rotate: [0, -20, 0, 20, 0],
            }}
            transition={{
              duration: 1.5,
              repeat: Number.POSITIVE_INFINITY,
              ease: "easeInOut",
            }}
            style={{ left: "calc(50% - 5px)", top: "60%" }}
          />

          {/* Right leg */}
          <motion.div
            className="w-2 h-10 bg-[#d8bfd8] absolute origin-top"
            animate={{
              rotate: [0, 20, 0, -20, 0],
            }}
            transition={{
              duration: 1.5,
              repeat: Number.POSITIVE_INFINITY,
              ease: "easeInOut",
              delay: 0.2,
            }}
            style={{ right: "calc(50% - 5px)", top: "60%" }}
          />
        </div>
        <motion.p
          className="text-[#666666] text-sm"
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 1.5, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
        >
          {text}
        </motion.p>
      </div>
    </div>
  )
}

export function FullscreenDancerLoadingAnimation({ text = "Loading..." }: LoadingAnimationProps) {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-black z-10">
      <div className="text-center">
        <div className="w-32 h-32 mx-auto mb-6 relative">
          {/* Head */}
          <motion.div
            className="w-8 h-8 bg-[#b8a2db] rounded-full absolute"
            animate={{
              y: [0, -5, 0, -3, 0],
            }}
            transition={{
              duration: 1.5,
              repeat: Number.POSITIVE_INFINITY,
              ease: "easeInOut",
            }}
            style={{ left: "calc(50% - 4px)", top: "0%" }}
          />

          {/* Body */}
          <motion.div
            className="w-3 h-14 bg-[#a28bc9] absolute"
            animate={{
              rotate: [0, 5, 0, -5, 0],
              y: [0, -2, 0, -1, 0],
            }}
            transition={{
              duration: 1.5,
              repeat: Number.POSITIVE_INFINITY,
              ease: "easeInOut",
            }}
            style={{ left: "calc(50% - 1.5px)", top: "25%" }}
          />

          {/* Left arm */}
          <motion.div
            className="w-12 h-3 bg-[#9370db] absolute origin-left"
            animate={{
              rotate: [0, 30, 0, -30, 0],
            }}
            transition={{
              duration: 1.5,
              repeat: Number.POSITIVE_INFINITY,
              ease: "easeInOut",
            }}
            style={{ left: "calc(50% - 1.5px)", top: "30%" }}
          />

          {/* Right arm */}
          <motion.div
            className="w-12 h-3 bg-[#9370db] absolute origin-right"
            animate={{
              rotate: [0, -30, 0, 30, 0],
            }}
            transition={{
              duration: 1.5,
              repeat: Number.POSITIVE_INFINITY,
              ease: "easeInOut",
              delay: 0.2,
            }}
            style={{ right: "calc(50% - 1.5px)", top: "30%" }}
          />

          {/* Left leg */}
          <motion.div
            className="w-3 h-14 bg-[#d8bfd8] absolute origin-top"
            animate={{
              rotate: [0, -20, 0, 20, 0],
            }}
            transition={{
              duration: 1.5,
              repeat: Number.POSITIVE_INFINITY,
              ease: "easeInOut",
            }}
            style={{ left: "calc(50% - 7px)", top: "60%" }}
          />

          {/* Right leg */}
          <motion.div
            className="w-3 h-14 bg-[#d8bfd8] absolute origin-top"
            animate={{
              rotate: [0, 20, 0, -20, 0],
            }}
            transition={{
              duration: 1.5,
              repeat: Number.POSITIVE_INFINITY,
              ease: "easeInOut",
              delay: 0.2,
            }}
            style={{ right: "calc(50% - 7px)", top: "60%" }}
          />
        </div>
        <motion.p
          className="text-white/80 text-base"
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 1.5, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
        >
          {text}
        </motion.p>
      </div>
    </div>
  )
}
