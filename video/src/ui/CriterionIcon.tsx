import React from "react"
import { Briefcase, Building, Globe, GraduationCap, Heart, MapPin, MessageSquare, Target, Wallet } from "lucide-react"

import type { CriterionIcon as IconKey } from "../data/mock"

// Dieselben Icons wie in candidate-match-modal.tsx.
const ICONS = {
  target: Target,
  briefcase: Briefcase,
  graduation: GraduationCap,
  message: MessageSquare,
  globe: Globe,
  pin: MapPin,
  building: Building,
  wallet: Wallet,
  heart: Heart,
} as const

export const CriterionIcon: React.FC<{ icon: IconKey; size: number; color: string }> = ({ icon, size, color }) => {
  const Icon = ICONS[icon]
  return <Icon size={size} color={color} strokeWidth={2} />
}
