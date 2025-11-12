import { useEffect, useMemo, useRef } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { trackEvent } from "@/lib/analytics";

const confirmationSchema = z.object({
  productNameHint: z.string().min(1, "請輸入商品名稱或描述"),
  confirmedProductName: z.string().min(1, "請輸入 AI 需確認的商品名稱"),
  priceRange: z.string().optional(),
  salesRegion: z.string().optional(),
  enableFallback: z.boolean(),
  isConfirmed: z.boolean(),
});

export type ConfirmationFormValues = z.infer<typeof confirmationSchema>;

interface ProductConfirmationFormProps {
  files: File[];
  isSubmitting: boolean;
  isProUser: boolean;
  initialValues?: Partial<ConfirmationFormValues>;
  onSubmit: (values: ConfirmationFormValues) => void;
  onBack: () => void;
}

const priceRangeOptions = [
  { label: "$500-1000", value: "500-1000" },
  { label: "$1000-2000", value: "1000-2000" },
  { label: "$2000-5000", value: "2000-5000" },
  { label: "$5000+", value: "5000+" },
];

const salesRegionOptions = [
  { label: "台灣", value: "台灣" },
  { label: "香港", value: "香港" },
  { label: "新加坡", value: "新加坡" },
  { label: "馬來西亞", value: "馬來西亞" },
];

export function ProductConfirmationForm({
  files,
  isSubmitting,
  isProUser,
  initialValues,
  onSubmit,
  onBack,
}: ProductConfirmationFormProps) {
  const upgradeViewedRef = useRef(false);
  const fallbackName = useMemo(() => {
    if (initialValues?.productNameHint && initialValues.productNameHint.length > 0) {
      return initialValues.productNameHint;
    }
    if (!files.length) return "";
    const firstFile = files[0];
    const nameWithoutExt = firstFile.name.replace(/\.[^/.]+$/, "");
    return nameWithoutExt.length > 0 ? nameWithoutExt : "商品";
  }, [files, initialValues?.productNameHint]);

  const form = useForm<ConfirmationFormValues>({
    resolver: zodResolver(confirmationSchema),
    defaultValues: {
      productNameHint: fallbackName,
      confirmedProductName: initialValues?.confirmedProductName ?? fallbackName,
      priceRange: initialValues?.priceRange ?? "",
      salesRegion: initialValues?.salesRegion ?? "",
      enableFallback: initialValues?.enableFallback ?? false,
      isConfirmed: initialValues?.isConfirmed ?? false,
    },
  });

  useEffect(() => {
    form.reset({
      productNameHint: fallbackName,
      confirmedProductName: initialValues?.confirmedProductName ?? fallbackName,
      priceRange: initialValues?.priceRange ?? "",
      salesRegion: initialValues?.salesRegion ?? "",
      enableFallback: initialValues?.enableFallback ?? false,
      isConfirmed: initialValues?.isConfirmed ?? false,
    });
  }, [fallbackName, initialValues, form]);

  useEffect(() => {
    if (!isProUser && !upgradeViewedRef.current) {
      trackEvent('upgrade_cta_view', 'analysis', 'fallback_toggle');
      upgradeViewedRef.current = true;
    }
  }, [isProUser]);

  const handleSubmit = (values: ConfirmationFormValues) => {
    const sanitized: ConfirmationFormValues = {
      ...values,
      priceRange: values.priceRange ? values.priceRange : undefined,
      salesRegion: values.salesRegion ? values.salesRegion : undefined,
      enableFallback: isProUser ? values.enableFallback : false,
    } as ConfirmationFormValues;

    onSubmit(sanitized);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>確認分析設定</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <p className="text-sm text-neutral-600">
            已選擇 {files.length} 張圖片，最多可上傳 10 張。請提供產品基本資訊，協助 AI 完成分析。
          </p>
          <div className="flex flex-wrap gap-2 mt-3">
            {files.map((file) => (
              <span key={file.name}>
                <Badge variant="outline" className="text-xs">
                  {file.name}
                </Badge>
              </span>
            ))}
          </div>
        </div>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="grid grid-cols-1 lg:grid-cols-2 gap-6"
          >
            <div className="space-y-4">
              <FormField
                control={form.control}
                name="productNameHint"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>產品名稱／描述</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="範例：天然手工皂禮盒" />
                    </FormControl>
                    <FormDescription>
                      A 步：提供 AI 參考的產品名稱或敘述以便識別素材
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="confirmedProductName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>最終商品名稱</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="請輸入最終確認商品名稱" />
                    </FormControl>
                    <FormDescription>
                      B 步：確認或調整最終商品名稱，作為分析與受眾推薦依據
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="isConfirmed"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div>
                      <FormLabel className="text-base">我確認此名稱無誤</FormLabel>
                      <FormDescription>
                        若未達 80% 信心，可先不勾選，保留後續調整空間
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            <div className="space-y-4">
              <FormField
                control={form.control}
                name="priceRange"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>目標價格區間</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value ?? ""}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="選擇價格區間" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {priceRangeOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>可選填，用於後續受眾建議篩選</FormDescription>
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
                    <Select onValueChange={field.onChange} value={field.value ?? ""}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="選擇銷售地區" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {salesRegionOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>可選填，用於受眾語系與區域設定</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="enableFallback"
                render={({ field }) => (
                  <div className="relative">
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div>
                        <FormLabel className="text-base">啟用 Fallback 全面摘要</FormLabel>
                        <FormDescription>
                          {isProUser
                            ? "將額外消耗 5 點 Credits，生成完整產品摘要"
                            : "升級 Pro 會員即可解鎖完整摘要"}
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value && isProUser}
                          onCheckedChange={(checked: boolean) => field.onChange(checked && isProUser)}
                          disabled={!isProUser}
                        />
                      </FormControl>
                    </FormItem>
                    {!isProUser && (
                      <div className="absolute inset-0 rounded-lg bg-white/70 backdrop-blur-sm flex flex-col items-center justify-center gap-3 text-center p-4">
                        <p className="text-sm text-neutral-700">
                          升級 Pro 會員即可生成完整產品摘要與備援內容。
                        </p>
                        <Button
                          size="sm"
                          onClick={() => {
                            trackEvent('upgrade_cta_click', 'analysis', 'fallback_toggle');
                            window.open('/settings?tab=membership', '_blank');
                          }}
                        >
                          立即升級
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              />
            </div>

            <div className="lg:col-span-2 flex flex-col sm:flex-row justify-end gap-3">
              <Button type="button" variant="outline" onClick={onBack} disabled={isSubmitting}>
                返回重新選圖
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "分析中..." : "開始分析"}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
