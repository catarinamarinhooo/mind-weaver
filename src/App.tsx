import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppLayout } from "@/components/layout/AppLayout";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import Dashboard from "./pages/Dashboard";
import Capture from "./pages/Capture";
import LibraryPage from "./pages/LibraryPage";
import ThoughtsPage from "./pages/ThoughtsPage";
import BusinessIdeasPage from "./pages/BusinessIdeasPage";
import WorkIdeasPage from "./pages/WorkIdeasPage";
import PersonalIdeasPage from "./pages/PersonalIdeasPage";
import TopicsPage from "./pages/TopicsPage";
import GlossaryPage from "./pages/GlossaryPage";
import QuotesPage from "./pages/QuotesPage";
import WatchlistsPage from "./pages/WatchlistsPage";
import DiscoveryPage from "./pages/DiscoveryPage";
import ConnectionsPage from "./pages/ConnectionsPage";
import SearchPage from "./pages/SearchPage";
import AskPage from "./pages/AskPage";
import UserPage from "./pages/UserPage";
import UpdatesPage from "./pages/UpdatesPage";
import RecommendationsPage from "./pages/RecommendationsPage";
import AIHistoryPage from "./pages/AIHistoryPage";
import AdminPage from "./pages/AdminPage";
import LoginPage from "./pages/LoginPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/capture" element={<Capture />} />
            <Route path="/library" element={<LibraryPage />} />
            <Route path="/library/:id" element={<LibraryPage />} />
            <Route path="/thoughts" element={<ThoughtsPage />} />
            <Route path="/thoughts/:id" element={<ThoughtsPage />} />
            <Route path="/business-ideas" element={<BusinessIdeasPage />} />
            <Route path="/work-ideas" element={<WorkIdeasPage />} />
            <Route path="/personal-ideas" element={<PersonalIdeasPage />} />
            <Route path="/topics" element={<TopicsPage />} />
            <Route path="/glossary" element={<GlossaryPage />} />
            <Route path="/quotes" element={<QuotesPage />} />
            <Route path="/watchlists" element={<WatchlistsPage />} />
            <Route path="/discovery" element={<DiscoveryPage />} />
            <Route path="/connections" element={<ConnectionsPage />} />
            <Route path="/recommendations" element={<RecommendationsPage />} />
            <Route path="/ai-history" element={<AIHistoryPage />} />
            <Route path="/search" element={<SearchPage />} />
            <Route path="/ask" element={<AskPage />} />
            <Route path="/user" element={<UserPage />} />
            <Route path="/updates" element={<UpdatesPage />} />
            <Route path="/admin" element={<AdminPage />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
