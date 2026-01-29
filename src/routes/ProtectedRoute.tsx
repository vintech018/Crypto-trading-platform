import { Navigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { Loader2 } from "lucide-react";

export const ProtectedRoute = ({ children }: { children: React.ReactElement }) => {
    const { user, loading, accessToken } = useAuth();

    if (loading) {
        return (
            <div className="h-screen w-full flex items-center justify-center bg-slate-950 text-indigo-500">
                <Loader2 className="w-8 h-8 animate-spin" />
            </div>
        );
    }

    if (!accessToken || !user) {
        return <Navigate to="/login" replace />;
    }

    return children;
};
