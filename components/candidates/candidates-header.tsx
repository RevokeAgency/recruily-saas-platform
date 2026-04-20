"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Upload, Search, Loader2 } from "lucide-react"
import { toast } from "sonner"

export function CandidatesHeader() {
  const [isUploading, setIsUploading] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)

  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return

    setIsUploading(true)

    // Simulate processing
    await new Promise((resolve) => setTimeout(resolve, 2000))

    toast.success(`${files.length} Kandidat(en) hochgeladen`, {
      description: "Die CVs werden jetzt von der AI analysiert.",
    })

    setIsUploading(false)
    setDialogOpen(false)
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Kandidaten</h1>
          <p className="text-muted-foreground mt-1">
            Verwalte deinen Kandidatenpool
          </p>
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Upload className="mr-2 h-4 w-4" />
              Kandidaten hochladen
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Kandidaten hochladen</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div
                className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-primary/50 transition-colors cursor-pointer"
                onClick={() => document.getElementById("cv-upload")?.click()}
              >
                <input
                  id="cv-upload"
                  type="file"
                  accept=".pdf,.docx"
                  multiple
                  className="hidden"
                  onChange={(e) => handleFileUpload(e.target.files)}
                />
                {isUploading ? (
                  <>
                    <Loader2 className="h-10 w-10 text-primary mx-auto mb-3 animate-spin" />
                    <p className="text-sm font-medium text-foreground">
                      Analysiere CVs...
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      AI extrahiert Kandidatendaten
                    </p>
                  </>
                ) : (
                  <>
                    <Upload className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                    <p className="text-sm font-medium text-foreground">
                      CVs hierher ziehen oder klicken
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      PDF oder DOCX, mehrere Dateien möglich
                    </p>
                  </>
                )}
              </div>
              <p className="text-xs text-muted-foreground text-center">
                Powered by Gemini AI - Kandidatendaten werden automatisch extrahiert
              </p>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Kandidaten durchsuchen..."
            className="pl-9"
          />
        </div>

        <Tabs defaultValue="all" className="w-auto">
          <TabsList>
            <TabsTrigger value="all">Alle</TabsTrigger>
            <TabsTrigger value="unmatched">Unverknüpft</TabsTrigger>
            <TabsTrigger value="matched">Gematcht</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
    </div>
  )
}
