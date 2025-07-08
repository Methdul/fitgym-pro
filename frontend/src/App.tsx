import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";


// Components
import Navbar from "@/components/Navbar";

// Public Pages (No Authentication Required)
import Home from "./pages/Home";
import About from "./pages/About";
import Branches from "./pages/Branches";
import Partnerships from "./pages/Partnerships";
import Login from "./pages/Login";
import NotFound from "./pages/NotFound";
import TestPinVerification from './pages/TestPinVerification';

// Protected Pages
import StaffDashboard from "./pages/StaffDashboard";
import MemberDashboard from "./pages/MemberDashboard";
import AdminDashboard from "./pages/AdminDashboard";

// Temporary Route Protection Components (work with your current auth)
import StaffRoute from "@/components/auth/StaffRoute";
import AdminRoute from "@/components/auth/AdminRoute";
import MemberRoute from "@/components/auth/MemberRoute";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <div className="min-h-screen bg-background">
            <Navbar />
            <Routes>
              {/* 🌐 PUBLIC ROUTES (No Authentication Required) */}
              <Route path="/" element={<Home />} />
              <Route path="/about" element={<About />} />
              <Route path="/branches" element={<Branches />} />
              <Route path="/partnerships" element={<Partnerships />} />
              <Route path="/login" element={<Login />} />
              <Route path="/404" element={<NotFound />} />
              <Route path="/test-pin" element={<TestPinVerification />} />

              {/* 🔐 PROTECTED ROUTES (Temporary - work with your current auth) */}
              
              {/* Admin Dashboard */}
              <Route 
                path="/admin" 
                element={
                  <AdminRoute>
                    <AdminDashboard />
                  </AdminRoute>
                } 
              />

              {/* Member Dashboard */}
              <Route 
                path="/member" 
                element={
                  <MemberRoute>
                    <MemberDashboard />
                  </MemberRoute>
                } 
              />

              {/* ✅ NEW: Member Dashboard for Staff View - Individual Member Access */}
              <Route 
                path="/member-dashboard/:memberId" 
                element={
                  <MemberRoute>
                    <MemberDashboard />
                  </MemberRoute>
                } 
              />

              {/* Staff Dashboard - Uses your existing branch auth */}
              <Route 
                path="/dashboard/staff/:branchId" 
                element={
                  <StaffRoute>
                    <StaffDashboard />
                  </StaffRoute>
                } 
              />

              {/* 404 Fallback */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </div>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;