import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { useQuery } from "@tanstack/react-query";
import { SEOHead } from "@/components/SEOHead";
import { getPageSEO } from "@/lib/seo";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { User, Settings as SettingsIcon, Bell, Shield, CreditCard } from "lucide-react";
import { Sidebar } from "@/components/Sidebar";
import { useEffect } from "react";

export default function Settings() {
  const { toast } = useToast();
  const { user, isAuthenticated, isLoading } = useAuth();

  // 移除重定向邏輯，由 App.tsx 統一處理認證狀態

  if (isLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-neutral-50">
      <SEOHead {...getPageSEO('settings')} />
      <Sidebar />
      
      <div className="flex-1 overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-neutral-900">設定</h2>
            <p className="text-neutral-600 mt-1">管理您的帳戶設定和偏好</p>
          </div>

          {/* User Profile */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5" />
                用戶資料
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-4">
                <img 
                  src={user?.picture || 'https://via.placeholder.com/64'} 
                  alt="用戶頭像" 
                  className="w-16 h-16 rounded-full"
                />
                <div>
                  <h3 className="text-lg font-semibold">{user?.name || 'Unknown User'}</h3>
                  <p className="text-neutral-600">{user?.email || 'No email'}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge variant="secondary">
                      {user?.membership || 'Free'}
                    </Badge>
                    <span className="text-sm text-green-600">
                      {user?.credits || 0} 點數
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Account Settings */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <SettingsIcon className="w-5 h-5" />
                帳戶設定
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <Label htmlFor="email-notifications" className="text-base">
                  電子郵件通知
                </Label>
                <Switch id="email-notifications" />
              </div>
              
              <div className="flex items-center justify-between">
                <Label htmlFor="analysis-alerts" className="text-base">
                  分析完成提醒
                </Label>
                <Switch id="analysis-alerts" defaultChecked />
              </div>
              
              <div className="flex items-center justify-between">
                <Label htmlFor="monthly-report" className="text-base">
                  月度報告
                </Label>
                <Switch id="monthly-report" />
              </div>
            </CardContent>
          </Card>

          {/* Security */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                安全性
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">雙因素認證</p>
                    <p className="text-sm text-neutral-600">為您的帳戶增加額外安全層</p>
                  </div>
                  <Button variant="outline" size="sm">
                    啟用
                  </Button>
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">更改密碼</p>
                    <p className="text-sm text-neutral-600">定期更新您的密碼</p>
                  </div>
                  <Button variant="outline" size="sm">
                    更改
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Membership */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="w-5 h-5" />
                會員資格
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="p-4 bg-blue-50 rounded-lg">
                  <h4 className="font-medium text-blue-900">當前方案: {user?.membership || 'Free'}</h4>
                  <p className="text-sm text-blue-700 mt-1">
                    每月分析次數: {user?.membership === 'PRO' ? '無限制' : '10 次'}
                  </p>
                </div>
                
                {user?.membership !== 'PRO' && (
                  <Button className="w-full">
                    升級為 PRO
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}