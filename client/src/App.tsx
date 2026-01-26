import { Switch, Route, Redirect, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { TrackingProvider } from "@/contexts/TrackingContext";
import Home from "@/pages/home";
import Rankings from "@/pages/rankings";
import Login from "@/pages/login";
import NotFound from "@/pages/not-found";

function PrivateRoute({ path, component: Component }: { path: string; component: any }) {
  const user = localStorage.getItem("teleflix_user");
  if (!user) {
    return <Redirect to="/login" />;
  }
  return <Route path={path} component={Component} />;
}

function Router() {
  return (
    <Switch>
      <Route path="/login" component={Login} />
      <PrivateRoute path="/" component={Home} />
      <PrivateRoute path="/rankings" component={Rankings} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <TrackingProvider>
          <Toaster />
          <Router />
        </TrackingProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
