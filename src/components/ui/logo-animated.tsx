'use client'

import { motion } from 'motion/react'
import Image from 'next/image'
import { cn } from '@/lib/cn'

interface LogoAnimatedProps {
  width?: number
  height?: number
  className?: string
  priority?: boolean
}

export function LogoAnimated({
  width = 40,
  height = 40,
  className,
  priority = false,
}: LogoAnimatedProps) {
  return (
    <motion.div
      animate={{
        y: [0, -4, 0],
      }}
      transition={{
        duration: 3,
        repeat: Infinity,
        ease: 'easeInOut',
      }}
      className={cn('flex-shrink-0', className)}
    >
      <Image
        src="/logo.png"
        alt="Caderneta"
        width={width}
        height={height}
        className="object-contain"
        priority={priority}
      />
    </motion.div>
  )
}
