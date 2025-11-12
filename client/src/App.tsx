import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import { useAnalytics } from "@/hooks/use-analytics";
import { useEffect } from "react";
import { initGA, initMetaPixel } from "./lib/analytics";
import NotFound from "@/pages/not-found";
import Landing from "@/pages/landing";
import LandingSimple from "@/pages/landing-simple";
import Dashboard from "@/pages/dashboard";
import Analysis from "@/pages/analysis";
import History from "@/pages/history";
import Settings from "@/pages/settings";
import Stats from "@/pages/stats";

function Router() {
  const { isAuthenticated, isLoading } = useAuth();
  
  // Track page views when routes change
  useAnalytics();

  console.log('認證狀態:', { isAuthenticated, isLoading });

  return (
    <Switch>
      {isLoading || !isAuthenticated ? (
        <Route path="/" component={LandingSimple} />
      ) : (
        <>
          <Route path="/" component={Dashboard} />
          <Route path="/dashboard" component={Dashboard} />
          <Route path="/analysis" component={Analysis} />
          <Route path="/history" component={History} />
          <Route path="/settings" component={Settings} />
          <Route path="/stats" component={Stats} />
        </>
      )}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  // Initialize Google Analytics and Meta Pixel when app loads
  useEffect(() => {
    // Initialize Google Analytics
    if (!import.meta.env.VITE_GA_MEASUREMENT_ID) {
      console.warn('Missing required Google Analytics key: VITE_GA_MEASUREMENT_ID');
    } else {
      initGA();
    }
    
    // Initialize Meta Pixel
    if (!import.meta.env.VITE_META_PIXEL_ID) {
      console.warn('Missing required Meta Pixel ID: VITE_META_PIXEL_ID');
    } else {
      initMetaPixel();
    }
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
