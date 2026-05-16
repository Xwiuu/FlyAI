"use client"

import { motion, useInView } from "framer-motion"
import { useRef } from "react"
import { cn } from "@/lib/utils"

const variants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0 },
}

interface MotionCardProps extends React.HTMLAttributes<HTMLDivElement> {
  delay?: number
  hover?: boolean
}

export function MotionCard({ children, className, delay = 0, hover = true, ...props }: MotionCardProps) {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: "-40px" })

  return (
    <motion.div
      ref={ref}
      variants={variants}
      initial="hidden"
      animate={inView ? "visible" : "hidden"}
      transition={{ duration: 0.4, delay, ease: [0.25, 0.46, 0.45, 0.94] }}
      whileHover={hover ? { y: -2, transition: { duration: 0.15 } } : undefined}
      className={cn(
        "rounded-xl border border-border bg-card p-5 transition-shadow duration-200",
        hover && "hover:shadow-md",
        className,
      )}
      {...(props as React.ComponentPropsWithoutRef<typeof motion.div>)}
    >
      {children}
    </motion.div>
  )
}
