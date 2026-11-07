import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Plus, Minus } from "lucide-react"

export function EditCulturalDetailsDialog({
  open,
  onOpenChange,
  onSubmit,
  currentDetails
}) {
  const [culturalContext, setCulturalContext] = useState(
    Object.entries(currentDetails.culturalContext || {})
  )
  const [servingEtiquette, setServingEtiquette] = useState(
    Object.entries(currentDetails.servingEtiquette || {})
  )

  const handleAddCulturalContext = () => {
    setCulturalContext([...culturalContext, ["", ""]])
  }

  const handleAddServingEtiquette = () => {
    setServingEtiquette([...servingEtiquette, ["", ""]])
  }

  const handleRemoveCulturalContext = index => {
    setCulturalContext(culturalContext.filter((_, i) => i !== index))
  }

  const handleRemoveServingEtiquette = index => {
    setServingEtiquette(servingEtiquette.filter((_, i) => i !== index))
  }

  const handleSubmit = e => {
    e.preventDefault()
    onSubmit({
      culturalContext: Object.fromEntries(
        culturalContext.filter(([key, value]) => key && value)
      ),
      servingEtiquette: Object.fromEntries(
        servingEtiquette.filter(([key, value]) => key && value)
      )
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Edit Cultural Details</DialogTitle>
        </DialogHeader>
        <ScrollArea className="max-h-[80vh] overflow-y-auto">
          <form onSubmit={handleSubmit} className="space-y-6 py-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium">Cultural Context</h3>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddCulturalContext}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Detail
                </Button>
              </div>
              {culturalContext.map(([key, value], index) => (
                <div key={index} className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Input
                      placeholder="Title (e.g., History, Significance)"
                      value={key}
                      onChange={e => {
                        const newContext = [...culturalContext]
                        newContext[index][0] = e.target.value
                        setCulturalContext(newContext)
                      }}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveCulturalContext(index)}
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                  </div>
                  <Textarea
                    placeholder="Description"
                    value={value}
                    onChange={e => {
                      const newContext = [...culturalContext]
                      newContext[index][1] = e.target.value
                      setCulturalContext(newContext)
                    }}
                  />
                </div>
              ))}
            </div>

            <Separator />

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium">Serving Etiquette</h3>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddServingEtiquette}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Rule
                </Button>
              </div>
              {servingEtiquette.map(([key, value], index) => (
                <div key={index} className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Input
                      placeholder="Title (e.g., Table Manners, Serving Order)"
                      value={key}
                      onChange={e => {
                        const newEtiquette = [...servingEtiquette]
                        newEtiquette[index][0] = e.target.value
                        setServingEtiquette(newEtiquette)
                      }}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveServingEtiquette(index)}
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                  </div>
                  <Textarea
                    placeholder="Description"
                    value={value}
                    onChange={e => {
                      const newEtiquette = [...servingEtiquette]
                      newEtiquette[index][1] = e.target.value
                      setServingEtiquette(newEtiquette)
                    }}
                  />
                </div>
              ))}
            </div>

            <Button type="submit" className="w-full">
              Save Changes
            </Button>
          </form>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}
