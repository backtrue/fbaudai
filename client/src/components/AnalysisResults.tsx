import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Wand2, RotateCcw } from "lucide-react";

const formSchema = z.object({
  productName: z.string().min(1, "請輸入商品名稱"),
  priceRange: z.string().optional(),
  salesRegion: z.string().optional(),
});

interface AnalysisResultsProps {
  analysis: any;
  onGenerateAudiences: (data: any) => void;
  onStartOver: () => void;
  isLoading: boolean;
}

export function AnalysisResults({ 
  analysis, 
  onGenerateAudiences, 
  onStartOver, 
  isLoading 
}: AnalysisResultsProps) {
  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      productName: analysis.aiAnalysis.productName,
      priceRange: "",
      salesRegion: "",
    },
  });

  const handleSubmit = (values: any) => {
    onGenerateAudiences({
      productName: values.productName,
      productCategory: analysis.aiAnalysis.productCategory,
      targetAudience: analysis.aiAnalysis.targetAudience,
      keywords: analysis.aiAnalysis.keywords,
      priceRange: values.priceRange,
      salesRegion: values.salesRegion,
    });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* AI Analysis Results */}
      <Card>
        <CardHeader>
          <CardTitle>AI 分析結果</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <img 
                src={analysis.analysis.imageUrl} 
                alt="Analyzed product"
                className="w-16 h-16 rounded-lg object-cover"
              />
              <div className="flex-1">
                <p className="font-medium text-neutral-900">
                  {analysis.aiAnalysis.productName}
                </p>
                <p className="text-sm text-neutral-600">
                  信心度: {Math.round(analysis.aiAnalysis.confidence * 100)}%
                </p>
              </div>
            </div>
            
            <div className="border-t pt-4">
              <h4 className="font-medium text-neutral-900 mb-3">商品類別</h4>
              <div className="flex flex-wrap gap-2">
                {analysis.aiAnalysis.productCategory.map((category: string, index: number) => (
                  <Badge key={index} variant="secondary">
                    {category}
                  </Badge>
                ))}
              </div>
            </div>

            <div className="border-t pt-4">
              <h4 className="font-medium text-neutral-900 mb-3">目標族群</h4>
              <div className="flex flex-wrap gap-2">
                {analysis.aiAnalysis.targetAudience.map((audience: string, index: number) => (
                  <Badge key={index} variant="outline" className="border-green-200 text-green-700">
                    {audience}
                  </Badge>
                ))}
              </div>
            </div>

            <div className="border-t pt-4">
              <h4 className="font-medium text-neutral-900 mb-3">關鍵字</h4>
              <div className="flex flex-wrap gap-2">
                {analysis.aiAnalysis.keywords.map((keyword: string, index: number) => (
                  <Badge key={index} variant="outline" className="border-purple-200 text-purple-700">
                    {keyword}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* User Confirmation */}
      <Card>
        <CardHeader>
          <CardTitle>確認與調整</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-neutral-600 mb-4">
            請確認或調整 AI 分析結果，以提高廣告受眾建議的準確性
          </p>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="productName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>商品名稱</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="priceRange"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>目標價格區間</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="選擇價格區間" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="500-1000">$500-1000</SelectItem>
                        <SelectItem value="1000-2000">$1000-2000</SelectItem>
                        <SelectItem value="2000-5000">$2000-5000</SelectItem>
                        <SelectItem value="5000+">$5000+</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="salesRegion"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>主要銷售地區</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="選擇銷售地區" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="台灣">台灣</SelectItem>
                        <SelectItem value="香港">香港</SelectItem>
                        <SelectItem value="新加坡">新加坡</SelectItem>
                        <SelectItem value="馬來西亞">馬來西亞</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="flex space-x-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onStartOver}
                  disabled={isLoading}
                >
                  <RotateCcw className="w-4 h-4 mr-2" />
                  重新開始
                </Button>
                <Button type="submit" disabled={isLoading} className="flex-1">
                  <Wand2 className="w-4 h-4 mr-2" />
                  生成廣告受眾建議
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
