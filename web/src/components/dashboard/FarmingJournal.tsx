import React, { useState, useEffect } from 'react';
import { FileText, Loader2, RefreshCw, AlertCircle, ExternalLink, Trash2 } from 'lucide-react';
import { supabase } from '../../lib/supabase/client';
import { createFarmingJournalSheet } from '../../lib/sheets/googleSheets';

export default function FarmingJournal() {
  const [token, setToken] = useState<string | null>(null);
  const [sheetId, setSheetId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    checkAuthAndSheet();
  }, []);

  const checkAuthAndSheet = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        setError("User is not authenticated.");
        setIsLoading(false);
        return;
      }
      
      const providerToken = session.provider_token;
      if (!providerToken) {
        setError("Google Sheets access token is missing. Please re-login with Google to grant Google Sheets access.");
        setIsLoading(false);
        return;
      }
      
      setToken(providerToken);

      const metaSheetId = session.user.user_metadata?.sheet_id;
      if (metaSheetId) {
        setSheetId(metaSheetId);
      } else {
        setShowOnboarding(true);
      }
    } catch (err: any) {
      console.error(err);
      setError("Failed to initialize Google Sheets integration.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateSheet = async () => {
    if (!token) return;
    setIsLoading(true);
    try {
      const { data, error: facError } = await supabase.from('device_configs').select('description, device_id').order('device_id', { ascending: true });
      if (facError) throw facError;
      
      const facilities = (data && data.length > 0) ? data.map(f => f.description || f.device_id) : ["기본 온실"];

      const newId = await createFarmingJournalSheet(token, facilities);
      
      const { error: updateError } = await supabase.auth.updateUser({
        data: { sheet_id: newId }
      });
      
      if (updateError) throw updateError;
      
      setSheetId(newId);
      setShowOnboarding(false);
    } catch (err: any) {
      console.error(err);
      if (err.message.includes("403") || err.message.includes("permission") || err.message.includes("not been used in project")) {
          setError(`Google API Error: ${err.message}\n\n* Tip: If the API is disabled, please visit the Google Cloud Console link in the error above to enable the 'Google Sheets API'. If it is a permission issue, click 'Re-connect Google Account' below and make sure to check the box to allow Google Sheets access.`);
      } else {
          setError("Failed to create Google Sheet: " + err.message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleReLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/dashboard`,
        scopes: 'https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/spreadsheets',
        queryParams: {
          prompt: 'consent',
        }
      }
    });
  };

  if (isLoading && !showOnboarding && !sheetId) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="animate-spin text-secondary" size={32} />
      </div>
    );
  }

  return (
    <div className="max-w-[1400px] w-full flex flex-col h-[calc(100vh-100px)]">
      <div className="flex justify-between items-center mb-6 shrink-0">
        <div>
          <h2 className="text-2xl font-semibold text-primary">Farming Journal</h2>
          <p className="text-sm text-gray-500 mt-1">Record your daily farming activities securely using Google Sheets</p>
        </div>
        {sheetId && (
          <div className="flex gap-2">
            <button
              onClick={async () => {
                if (confirm("정말로 연동을 해제하시겠습니까? (구글 드라이브의 실제 파일은 삭제되지 않습니다)")) {
                  await supabase.auth.updateUser({ data: { sheet_id: null } });
                  setSheetId(null);
                  setShowOnboarding(true);
                }
              }}
              className="flex items-center gap-2 bg-white border border-red-200 hover:bg-red-50 text-red-600 px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm"
            >
              <Trash2 size={16} /> Disconnect
            </button>
            <a 
              href={`https://docs.google.com/spreadsheets/d/${sheetId}/edit`}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm"
            >
              <ExternalLink size={16} /> Open in New Tab
            </a>
          </div>
        )}
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-lg flex items-start gap-3 mb-6 shrink-0">
          <AlertCircle size={20} className="mt-0.5" />
          <div className="flex-1">
            <p className="font-medium text-sm whitespace-pre-wrap">{error}</p>
            {(error.includes('login') || error.includes('access')) && (
              <button 
                onClick={handleReLogin}
                className="mt-3 flex items-center gap-2 bg-white border border-red-200 text-red-600 px-4 py-2 rounded-lg font-medium text-sm hover:bg-red-50 transition-colors shadow-sm"
              >
                <RefreshCw size={16} /> Re-connect Google Account
              </button>
            )}
          </div>
        </div>
      )}

      {showOnboarding ? (
        <div className="bg-white rounded-xl p-8 text-center shadow-sm border border-gray-100 max-w-lg mx-auto mt-10 shrink-0">
          <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <FileText size={32} />
          </div>
          <h3 className="text-xl font-bold text-gray-800 mb-2">Initialize Farming Journal</h3>
          <p className="text-gray-500 mb-6 text-sm">
            This will create a new Google Sheet named <strong>"SmartFarm Farming Journal"</strong> in your Google Drive with all the necessary columns for your daily records.
          </p>
          <button
            onClick={handleCreateSheet}
            disabled={isLoading}
            className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-medium py-3 rounded-lg transition-colors flex justify-center items-center gap-2 shadow-sm"
          >
            {isLoading ? <Loader2 className="animate-spin" size={20} /> : <FileText size={20} />}
            {isLoading ? 'Creating Sheet...' : 'Create Google Sheet'}
          </button>
        </div>
      ) : null}

      {/* Spreadsheet Iframe Embed */}
      {sheetId && !showOnboarding && (
        <>
          {/* Mobile-only view: Big Button, No Iframe */}
          <div className="md:hidden bg-white rounded-xl shadow-sm border border-gray-200 p-8 flex flex-col items-center justify-center text-center mt-4 mb-4">
            <div className="w-16 h-16 bg-secondary/10 text-secondary rounded-full flex items-center justify-center mb-4">
              <ExternalLink size={32} />
            </div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">Open Farming Journal</h3>
            <p className="text-gray-500 mb-6 text-sm max-w-[280px]">
              For the best editing experience on mobile, please open the spreadsheet directly in Google Sheets.
            </p>
            <a 
              href={`https://docs.google.com/spreadsheets/d/${sheetId}/edit`} 
              target="_blank" 
              rel="noopener noreferrer"
              className="w-full bg-secondary hover:bg-secondary-dark text-white font-medium py-3 rounded-lg transition-colors flex justify-center items-center gap-2 shadow-sm"
            >
              <ExternalLink size={20} /> Open Google Sheets
            </a>
          </div>

          {/* Desktop-only view: Iframe and small top button */}
          <div className="hidden md:flex flex-col flex-1 mt-4">
            <div className="flex justify-end mb-2">
              <a 
                href={`https://docs.google.com/spreadsheets/d/${sheetId}/edit`} 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-secondary hover:text-secondary-dark font-medium px-3 py-1.5 bg-secondary/10 rounded-full transition-colors"
              >
                <ExternalLink size={16} /> Open in Google Sheets
              </a>
            </div>
            <div 
              className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex-1 relative mb-4 min-h-[500px]"
            >
              <iframe 
                src={`https://docs.google.com/spreadsheets/d/${sheetId}/edit?widget=true&headers=false`}
                style={{ border: 0 }} 
                className="absolute inset-0 w-full h-full"
                frameBorder="0"
                scrolling="yes" 
              ></iframe>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
