"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Plus, Search, RefreshCw } from "lucide-react"

interface JobsHeaderProps {
  onRefresh?: () => void
}

export function JobsHeader({ onRefresh }: JobsHeaderProps) {
  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Job Postings</h1>
          <p className="text-slate-500 mt-1.5">
            Manage your open positions and recruitment
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button 
            variant="outline" 
            onClick={onRefresh}
            className="border-slate-200 text-slate-600 hover:bg-slate-50 transition-snappy"
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          <Button asChild className="bg-primary hover:bg-primary/90 rounded-lg btn-hover shadow-sm">
            <Link href="/jobs/new">
              <Plus className="mr-2 h-4 w-4" />
              Create Job
            </Link>
          </Button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search jobs by title, company, or location..."
            className="pl-11 h-12 bg-white border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
          />
        </div>
        <div className="flex gap-3">
          <Select defaultValue="all">
            <SelectTrigger className="w-full sm:w-40 h-12 bg-white border-slate-200 rounded-xl">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="archived">Archived</SelectItem>
            </SelectContent>
          </Select>
          <Select defaultValue="all">
            <SelectTrigger className="w-full sm:w-40 h-12 bg-white border-slate-200 rounded-xl">
              <SelectValue placeholder="All Types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="full-time">Full Time</SelectItem>
              <SelectItem value="part-time">Part Time</SelectItem>
              <SelectItem value="contract">Contract</SelectItem>
              <SelectItem value="remote">Remote</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  )
}
