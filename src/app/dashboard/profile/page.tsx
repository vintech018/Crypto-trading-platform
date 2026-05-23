"use client";

import React, { useState, useEffect } from "react";
import { api, auth } from "@/lib/apiClient";
import { UploadCloud, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { AvatarUpload } from "@/components/profile/AvatarUpload";

interface UserProfile {
  name?: string;
  profilePicture?: string;
}

export default function ProfilePage() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [kycFile, setKycFile] = useState<File | null>(null);
  const [kycType, setKycType] = useState("PAN");
  const [uploadingKyc, setUploadingKyc] = useState(false);
  const [message, setMessage] = useState({ text: "", type: "" });

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const res = await api.get<{ data?: { user?: UserProfile } }>('/api/auth/me');
      if (res.data?.user) {
        setUser(res.data.user as UserProfile);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };



  const handleKycUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!kycFile) return;

    setUploadingKyc(true);
    setMessage({ text: "", type: "" });
    const formData = new FormData();
    formData.append("document", kycFile);
    formData.append("documentType", kycType);

    try {
      const token = auth.getAccessToken();
      const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5050"}/api/uploads/kyc`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`
        },
        body: formData,
      });

      const data = await res.json();
      if (res.ok) {
        setMessage({ text: "KYC document uploaded successfully!", type: "success" });
        setKycFile(null);
        // Normally we'd append to user state here or reload session
        loadUser();
      } else {
        throw new Error(data.message || "Failed to upload KYC document");
      }
    } catch (err: unknown) {
      setMessage({ text: err instanceof Error ? err.message : "Upload failed", type: "error" });
    } finally {
      setUploadingKyc(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-white">Loading profile...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8 text-white">
      <div>
        <h1 className="text-2xl font-bold mb-2">Profile & Identity</h1>
        <p className="text-gray-400">Manage your avatar and complete identity verification.</p>
      </div>

      {message.text && (
        <div className={`p-4 rounded-md flex items-center gap-3 ${message.type === 'success' ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
          {message.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
          {message.text}
        </div>
      )}

      {/* Avatar Upload */}
      <AvatarUpload 
        currentAvatarUrl={user?.profilePicture} 
        userName={user?.name} 
        onUploadSuccess={(newUrl) => setUser({ ...user, profilePicture: newUrl })} 
      />

      {/* KYC Upload */}
      <section className="bg-gray-800/50 border border-gray-700 rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4">KYC Verification</h2>
        <form onSubmit={handleKycUpload} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Document Type</label>
              <select
                value={kycType}
                onChange={(e) => setKycType(e.target.value)}
                className="w-full bg-gray-900 border border-gray-700 rounded-md px-3 py-2 text-white outline-none focus:border-blue-500"
              >
                <option value="PAN">PAN Card</option>
                <option value="AADHAAR">Aadhaar Card</option>
                <option value="PASSPORT">Passport</option>
                <option value="ID_CARD">National ID</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Upload Document (PDF/JPG/PNG)</label>
              <input
                type="file"
                accept="image/jpeg,image/png,application/pdf"
                onChange={(e) => setKycFile(e.target.files?.[0] || null)}
                className="block w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-gray-700 file:text-white hover:file:bg-gray-600"
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={!kycFile || uploadingKyc}
            className="bg-green-600 hover:bg-green-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white px-4 py-2 rounded-md font-medium flex items-center gap-2 transition-colors"
          >
            {uploadingKyc ? <Loader2 className="w-4 h-4 animate-spin" /> : <UploadCloud className="w-4 h-4" />}
            {uploadingKyc ? "Uploading..." : "Submit Document"}
          </button>
        </form>
      </section>
    </div>
  );
}
