import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Trash2, Leaf, Recycle, AlertTriangle } from "lucide-react";
import { EditPantryItemDialog } from "./edit-pantry-item-dialog";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

export function PantryItemCard({ item }) {
  const { toast } = useToast();

  const deleteMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("DELETE", `/api/pantry/${item.id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pantry"] });
      toast({
        title: "Item deleted",
        description: "Item has been removed from your pantry.",
      });
    },
  });

  const getCarbonFootprintIcon = (footprint) => {
    switch (footprint.toLowerCase()) {
      case "low":
        return <Leaf className="h-4 w-4 text-green-500" />;
      case "medium":
        return <Recycle className="h-4 w-4 text-yellow-500" />;
      case "high":
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      default:
        return <Leaf className="h-4 w-4 text-green-500" />;
    }
  };

  const getCarbonFootprintColor = (footprint) => {
    switch (footprint.toLowerCase()) {
      case "low":
        return "bg-green-500/10 text-green-600 border-green-200";
      case "medium":
        return "bg-yellow-500/10 text-yellow-600 border-yellow-200";
      case "high":
        return "bg-red-500/10 text-red-600 border-red-200";
      default:
        return "bg-green-500/10 text-green-600 border-green-200";
    }
  };

  const carbonFootprint = item.sustainabilityInfo?.carbonFootprint || "low";
  const sustainabilityScore = item.sustainabilityInfo?.score || 0;

  return (
    <Card className="overflow-hidden flex flex-col">
      {/* Title and buttons section */}
      <div className="flex justify-between items-center p-4 pb-2">
        <CardTitle className="text-lg font-medium">{item.name}</CardTitle>
        <div className="flex space-x-2">
          <EditPantryItemDialog item={item} />
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8 opacity-100"
            onClick={() => deleteMutation.mutate()}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <CardContent className="p-4 pt-2 flex-grow">
        {/* Image section */}
        {item.image_url && (
          <div className="relative aspect-[16/9] w-full overflow-hidden mb-4">
            <img
              src={item.image_url}
              alt={item.name}
              className="object-cover w-full h-full"
              onError={(e) => {
                e.currentTarget.src = `https://source.unsplash.com/1200x800/?${encodeURIComponent(
                  item.name.toLowerCase() + " food"
                )}`;
              }}
            />
          </div>
        )}

        <div className="grid gap-2">
          <div className="text-sm">
            <span className="text-muted-foreground">Quantity:</span> {item.quantity}
          </div>
          {item.category && (
            <div className="text-sm">
              <span className="text-muted-foreground">Category:</span> {item.category}
            </div>
          )}
          {item.expiryDate && (
            <div className="text-sm">
              <span className="text-muted-foreground">Expires:</span>{" "}
              {new Date(item.expiryDate).toLocaleDateString()}
            </div>
          )}

          {/* Sustainability Section */}
          <div className="mt-2 pt-2 border-t">
            <div className="flex flex-col space-y-2">
              <div className="flex items-center space-x-2">
                {getCarbonFootprintIcon(carbonFootprint)}
                <Badge className={getCarbonFootprintColor(carbonFootprint)}>
                  {carbonFootprint.charAt(0).toUpperCase() + carbonFootprint.slice(1)} Carbon Impact
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Impact Score:</span>
                <Badge
                  variant="outline"
                  className={`${
                    sustainabilityScore >= 70
                      ? "text-green-600"
                      : sustainabilityScore >= 40
                      ? "text-yellow-600"
                      : "text-red-600"
                  }`}
                >
                  {sustainabilityScore}/100
                </Badge>
              </div>
              <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${
                    carbonFootprint === "low"
                      ? "bg-green-500 w-1/3"
                      : carbonFootprint === "medium"
                      ? "bg-yellow-500 w-2/3"
                      : "bg-red-500 w-full"
                  }`}
                ></div>
              </div>
            </div>
          </div>

          {/* Nutrition Info */}
          {item.nutritionInfo && (
            <div className="mt-2 pt-2 border-t">
              <div className="grid grid-cols-2 gap-2 text-sm mt-2">
                <div>
                  <span className="text-muted-foreground">Calories:</span>{" "}
                  {item.nutritionInfo.calories}
                </div>
                <div>
                  <span className="text-muted-foreground">Protein:</span>{" "}
                  {item.nutritionInfo.protein}g
                </div>
                <div>
                  <span className="text-muted-foreground">Carbs:</span>{" "}
                  {item.nutritionInfo.carbs}g
                </div>
                <div>
                  <span className="text-muted-foreground">Fat:</span>{" "}
                  {item.nutritionInfo.fat}g
                </div>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
