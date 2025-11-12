import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { AuthButton } from "@/components/AuthButton";
import { Link, useLocation } from "wouter";
import { 
  Home, 
  Upload, 
  History, 
  BarChart3, 
  Settings, 
  LogOut 
} from "lucide-react";

export function Sidebar() {
  const { user } = useAuth();
  const [location] = useLocation();
  
  const { data: stats } = useQuery({
    queryKey: ["/api/dashboard/stats"],
    retry: false,
  });

  const usagePercentage = stats ? (stats.currentMonthAnalyses / stats.monthlyLimit) * 100 : 0;

  const navItems = [
    { href: "/", icon: Home, label: "儀表板", active: location === "/" },
    { href: "/analysis", icon: Upload, label: "圖片分析", active: location === "/analysis" },
    { href: "/history", icon: History, label: "歷史記錄", active: location === "/history" },
    { href: "/stats", icon: BarChart3, label: "使用統計", active: location === "/stats" },
    { href: "/settings", icon: Settings, label: "設定", active: location === "/settings" },
  ];

  return (
    <div className="w-64 bg-white border-r border-neutral-200 flex flex-col">
      {/* Navigation */}
      <div className="flex-1 overflow-y-auto py-6">
        <nav className="px-3">
          <div className="space-y-1">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`group flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                  item.active
                    ? "bg-primary text-white"
                    : "text-neutral-600 hover:bg-neutral-50"
                }`}
              >
                <item.icon className="w-5 h-5 mr-3" />
                {item.label}
              </Link>
            ))}
          </div>
        </nav>
      </div>

      {/* User section */}
      <div className="px-3 py-4 border-t border-neutral-200">
        {/* Usage Stats */}
        <div className="bg-neutral-50 rounded-lg p-3 mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-neutral-600">本月使用量</span>
            <span className="text-sm font-medium text-primary">
              {stats?.currentMonthAnalyses || 0}
            </span>
          </div>
          <Progress value={usagePercentage} className="h-2 mb-2" />
          <p className="text-xs text-neutral-500">
            剩餘 {(stats?.monthlyLimit || 50) - (stats?.currentMonthAnalyses || 0)} 次分析
          </p>
        </div>

        {/* User Auth Button */}
        <AuthButton />
      </div>
    </div>
  );
}
