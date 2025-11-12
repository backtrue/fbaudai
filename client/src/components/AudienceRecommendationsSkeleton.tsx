import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export function AudienceRecommendationsSkeleton() {
  return (
    <div className="space-y-6 w-full max-w-4xl">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>
              <Skeleton className="h-6 w-56" />
            </CardTitle>
            <div className="flex items-center gap-3">
              <Button variant="outline" disabled>
                <Skeleton className="h-4 w-20" />
              </Button>
              <Button variant="outline" disabled>
                <Skeleton className="h-4 w-20" />
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-neutral-50">
                <tr>
                  {Array.from({ length: 6 }).map((_, index) => (
                    <th key={index} className="text-left p-4 font-medium text-neutral-400">
                      <Skeleton className="h-4 w-24" />
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200">
                {Array.from({ length: 3 }).map((_, rowIndex) => (
                  <tr key={rowIndex}>
                    {Array.from({ length: 6 }).map((_, colIndex) => (
                      <td key={colIndex} className="p-4">
                        <Skeleton className="h-4 w-32" />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <div className="flex items-start gap-3">
            <Skeleton className="h-10 w-10 rounded-lg" />
            <div className="space-y-2 w-full">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
