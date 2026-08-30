import React, { useState, useRef } from 'react';
import { X, Upload, FileText, Check, User, ArrowRight, Loader2, FileSpreadsheet, FileCode } from 'lucide-react';
import { request } from '../services/api';

const whatsappLineRegex = /^\[?(\d{1,2}\/\d{1,2}\/\d{2,4})[,\s]+(\d{1,2}:\d{2}(?::\d{2})?(?:\s*[APap][Mm])?)\]?\s*[-–]?\s*([^:]+):\s(.*)$/;
const datePrefixRegex = /^\[?(\d{1,2}\/\d{1,2}\/\d{2,4})[,\s]+(\d{1,2}:\d{2}(?::\d{2})?(?:\s*[APap][Mm])?)\]?\s*[-–]?\s*/;

function parseAnyTimestamp(dateStr, timeStr = '') {
  try {
    if (!dateStr) return new Date().toISOString().slice(0, 19).replace('T', ' ');

    // 1. Check if ISO string (e.g. "2025-05-14T10:15:30" or "2025-05-14 10:15:30")
    if (dateStr.includes('T') || (dateStr.includes('-') && dateStr.length >= 10)) {
      const dt = new Date(dateStr);
      if (!isNaN(dt.getTime())) {
        return dt.toISOString().slice(0, 19).replace('T', ' ');
      }
    }

    // 2. Parse slash/dot separated dates (DD/MM/YYYY or MM/DD/YYYY or DD.MM.YYYY)
    const cleanDate = dateStr.replace(/[\[\]]/g, '').trim();
    const parts = cleanDate.split(/[\/\-\.]/).map(p => parseInt(p, 10));
    if (parts.length === 3 && !parts.some(isNaN)) {
      let year = 2026, month = 1, day = 1;
      if (parts[0] > 1000) {
        year = parts[0];
        month = parts[1];
        day = parts[2];
      } else {
        year = parts[2] < 100 ? (parts[2] < 70 ? 2000 + parts[2] : 1900 + parts[2]) : parts[2];
        if (parts[0] > 12) {
          day = parts[0];
          month = parts[1];
        } else if (parts[1] > 12) {
          month = parts[0];
          day = parts[1];
        } else {
          day = parts[0];
          month = parts[1];
        }
      }

      month = Math.max(1, Math.min(12, month));
      day = Math.max(1, Math.min(31, day));

      let hr = 0, min = 0, sec = 0;
      if (timeStr) {
        let timeParts = timeStr.trim().split(/\s+/);
        let time = timeParts[0] || '00:00';
        let ampm = timeParts[1] ? timeParts[1].toUpperCase() : null;

        let [hrStr, minStr, secStr] = time.split(':');
        hr = parseInt(hrStr || '0', 10);
        min = parseInt(minStr || '0', 10);
        sec = secStr ? parseInt(secStr, 10) : 0;

        if (ampm === 'PM' && hr < 12) hr += 12;
        if (ampm === 'AM' && hr === 12) hr = 0;
      }

      hr = Math.max(0, Math.min(23, hr));
      min = Math.max(0, Math.min(59, min));
      sec = Math.max(0, Math.min(59, sec));

      return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')} ${String(hr).padStart(2, '0')}:${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
    }

    const dt = new Date(dateStr + (timeStr ? ' ' + timeStr : ''));
    if (!isNaN(dt.getTime())) {
      return dt.toISOString().slice(0, 19).replace('T', ' ');
    }
  } catch (e) {}

  return new Date().toISOString().slice(0, 19).replace('T', ' ');
}

// 1. WhatsApp TXT Parser
function parseWhatsAppExport(text) {
  const lines = text.split(/\r?\n/);
  const messages = [];
  const participantsSet = new Set();
  let currentMsg = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;

    const match = line.match(whatsappLineRegex);
    if (match) {
      if (currentMsg && currentMsg.senderName && currentMsg.content.trim()) {
        messages.push(currentMsg);
      }

      const dateStr = match[1];
      const timeStr = match[2];
      let sender = match[3].trim();
      let content = match[4];

      if (content.includes('<Media omitted>') || content.includes('<Media omitted')) {
        content = '[Media file]';
      }

      if (sender.includes('end-to-end') || sender.includes('changed the group') || sender.includes('created group')) {
        currentMsg = null;
        continue;
      }

      participantsSet.add(sender);

      currentMsg = {
        senderName: sender,
        content: content,
        timestamp: parseAnyTimestamp(dateStr, timeStr)
      };
    } else {
      if (datePrefixRegex.test(line)) {
        if (currentMsg && currentMsg.senderName && currentMsg.content.trim()) {
          messages.push(currentMsg);
          currentMsg = null;
        }
        continue;
      }

      if (currentMsg) {
        currentMsg.content += '\n' + line;
      }
    }
  }

  if (currentMsg && currentMsg.senderName && currentMsg.content.trim()) {
    messages.push(currentMsg);
  }

  return { messages, participants: Array.from(participantsSet) };
}

// 2. Telegram CSV Parser
function parseTelegramCSVExport(text) {
  const lines = text.split(/\r?\n/);
  const messages = [];
  const participantsSet = new Set();

  if (lines.length === 0) return { messages: [], participants: [] };

  let dateIdx = -1, fromIdx = -1, textIdx = -1;

  // Header detection
  const headerCols = lines[0].split(',').map(c => c.replace(/["']/g, '').trim().toLowerCase());
  dateIdx = headerCols.findIndex(c => c.includes('date') || c.includes('time'));
  fromIdx = headerCols.findIndex(c => c.includes('from') || c.includes('sender') || c.includes('author') || c.includes('user'));
  textIdx = headerCols.findIndex(c => c.includes('text') || c.includes('message') || c.includes('content'));

  const startIndex = (dateIdx !== -1 || fromIdx !== -1) ? 1 : 0;

  for (let i = startIndex; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Parse CSV line handling quotes
    const cells = line.match(/(?:^|,)(?:"([^"]*)"|([^,]*))/g)?.map(p => p.replace(/^,?"?|"?$/g, '').trim()) || line.split(',');
    if (cells.length < 2) continue;

    let dateStr = dateIdx !== -1 ? cells[dateIdx] : cells[0];
    let sender = fromIdx !== -1 ? cells[fromIdx] : cells[1];
    let content = textIdx !== -1 ? cells[textIdx] : cells.slice(2).join(', ');

    if (!sender || !content || sender.includes('Telegram') || sender.includes('System')) continue;

    participantsSet.add(sender);
    messages.push({
      senderName: sender,
      content: content,
      timestamp: parseAnyTimestamp(dateStr)
    });
  }

  return { messages, participants: Array.from(participantsSet) };
}

// 3. Telegram JSON Parser
function parseTelegramJSONExport(text) {
  const data = JSON.parse(text);
  const rawMsgs = data.messages || (Array.isArray(data) ? data : []);
  const messages = [];
  const participantsSet = new Set();

  for (const m of rawMsgs) {
    if (m.type !== 'message' && m.type) continue;
    
    let sender = m.from || m.actor || m.from_id || 'User';
    if (typeof sender !== 'string') sender = `User_${sender}`;

    let textVal = m.text;
    if (Array.isArray(textVal)) {
      textVal = textVal.map(part => (typeof part === 'string' ? part : part.text || '')).join('');
    }

    if (!textVal || typeof textVal !== 'string' || !textVal.trim()) continue;

    participantsSet.add(sender);
    messages.push({
      senderName: sender,
      content: textVal,
      timestamp: parseAnyTimestamp(m.date || m.date_unixtime)
    });
  }

  return { messages, participants: Array.from(participantsSet) };
}

export function WhatsAppImportModal({
  isOpen,
  onClose,
  conversationId,
  currentUser,
  partnerUser,
  onImportComplete
}) {
  const [step, setStep] = useState(1);
  const [parsedData, setParsedData] = useState(null);
  const [error, setError] = useState('');
  
  const [myWhatsAppName, setMyWhatsAppName] = useState(null);
  const [isImporting, setIsImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [totalMessages, setTotalMessages] = useState(0);
  const [importedCount, setImportedCount] = useState(0);
  const [skippedCount, setSkippedCount] = useState(0);

  const fileInputRef = useRef(null);

  if (!isOpen) return null;

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    const ext = file.name.split('.').pop().toLowerCase();
    if (!['txt', 'csv', 'json'].includes(ext)) {
      setError('Please select a valid .txt, .csv, or .json file');
      return;
    }
    
    setError('');
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target.result;
        let data = { messages: [], participants: [] };

        if (ext === 'json') {
          data = parseTelegramJSONExport(text);
        } else if (ext === 'csv') {
          data = parseTelegramCSVExport(text);
        } else {
          data = parseWhatsAppExport(text);
          if (data.messages.length === 0) {
            data = parseTelegramCSVExport(text);
          }
        }

        if (data.messages.length === 0) {
          setError('No valid messages found in the file.');
          return;
        }

        // Sort messages chronologically by timestamp (earliest first, latest last)
        data.messages.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

        setParsedData(data);
        setStep(2);
      } catch (err) {
        setError('Error parsing the file. Make sure it is a valid WhatsApp or Telegram export.');
      }
    };
    reader.onerror = () => {
      setError('Failed to read the file.');
    };
    reader.readAsText(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) {
      fileInputRef.current.files = e.dataTransfer.files;
      handleFileChange({ target: { files: e.dataTransfer.files } });
    }
  };

  const startImport = async () => {
    if (!myWhatsAppName) return;
    
    setIsImporting(true);
    setStep(3);
    setImportedCount(0);
    setSkippedCount(0);
    
    // Map messages
    const mappedMessages = parsedData.messages.map(msg => ({
      content: msg.content,
      sender_id: msg.senderName === myWhatsAppName ? currentUser.id : partnerUser.id,
      message_type: 'text',
      created_at: msg.timestamp
    }));
    
    setTotalMessages(mappedMessages.length);
    
    const BATCH_SIZE = 50;
    let successCount = 0;
    let totalImp = 0;
    let totalSkip = 0;
    
    try {
      for (let i = 0; i < mappedMessages.length; i += BATCH_SIZE) {
        const batch = mappedMessages.slice(i, i + BATCH_SIZE);
        
        const res = await request(`/conversations/${conversationId}/import-messages`, {
          method: 'POST',
          body: JSON.stringify({ messages: batch })
        });

        if (res) {
          totalImp += (res.imported_count || 0);
          totalSkip += (res.skipped_count || 0);
        }
        
        successCount += batch.length;
        setProgress(Math.floor((successCount / mappedMessages.length) * 100));
      }
      
      setImportedCount(totalImp);
      setSkippedCount(totalSkip);
      setStep(4);
    } catch (err) {
      console.error(err);
      setError('An error occurred during import. Some messages might not be imported.');
      setStep(2);
      setIsImporting(false);
    }
  };

  const handleClose = () => {
    setStep(1);
    setParsedData(null);
    setError('');
    setMyWhatsAppName(null);
    setIsImporting(false);
    setProgress(0);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
      <div className="w-full max-w-md bg-[#0B0E14] border border-white/10 rounded-3xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10 bg-[#131822]">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Upload className="w-5 h-5 text-indigo-400" />
            Import WhatsApp / Telegram Chat
          </h2>
          {!isImporting && (
            <button onClick={handleClose} className="p-1 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors">
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Content */}
        <div className="p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-xl">
              {error}
            </div>
          )}

          {step === 1 && (
            <div className="flex flex-col items-center">
              <div 
                className="w-full border-2 border-dashed border-white/20 rounded-2xl p-8 flex flex-col items-center justify-center text-center hover:border-indigo-500/50 hover:bg-white/5 transition-all cursor-pointer group"
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <div className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center mb-3 group-hover:bg-indigo-500/20 transition-colors">
                  <FileSpreadsheet className="w-6 h-6 text-indigo-400" />
                </div>
                <h3 className="text-white font-bold text-sm mb-1">Upload Chat Export File</h3>
                <p className="text-xs text-gray-400 mb-4">Supports WhatsApp (.txt) & Telegram (.csv / .json / .txt)</p>
                <button className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-colors shadow-md">
                  Select Export File
                </button>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileChange} 
                  accept=".txt,.csv,.json" 
                  className="hidden" 
                />
              </div>
              
              <div className="mt-4 text-[11px] text-gray-400 space-y-1 w-full text-left">
                <p>• WhatsApp (.txt) & Telegram (.csv, .json) supported</p>
                <p>• Smart Date Detector merges historic chats chronologically</p>
                <p>• Previous 1-year messages will automatically load at the top</p>
              </div>
            </div>
          )}

          {step === 2 && parsedData && (
            <div className="flex flex-col animate-in fade-in slide-in-from-bottom-4">
              <div className="text-center mb-5">
                <div className="w-12 h-12 bg-indigo-500/20 text-indigo-400 rounded-full flex items-center justify-center mx-auto mb-2">
                  <Check className="w-6 h-6" />
                </div>
                <h3 className="text-white font-bold text-base">File Parsed Successfully</h3>
                <p className="text-xs text-gray-400 mt-1">
                  Found {parsedData.messages.length} messages
                </p>
              </div>

              <div className="mb-3 text-xs font-bold text-white">Who are you in this chat export?</div>
              
              <div className="space-y-2.5 max-h-48 overflow-y-auto pr-1">
                {parsedData.participants.slice(0, 6).map((name, i) => (
                  <div 
                    key={i}
                    onClick={() => setMyWhatsAppName(name)}
                    className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                      myWhatsAppName === name 
                        ? 'bg-indigo-600/20 border-indigo-500 text-white font-bold' 
                        : 'bg-[#131822] border-white/5 text-gray-300 hover:border-white/20 hover:bg-white/5'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center ${myWhatsAppName === name ? 'bg-indigo-600' : 'bg-white/10'}`}>
                        <User className={`w-3.5 h-3.5 ${myWhatsAppName === name ? 'text-white' : 'text-gray-400'}`} />
                      </div>
                      <span className="text-xs font-semibold">{name}</span>
                    </div>
                    {myWhatsAppName === name && (
                      <Check className="w-4 h-4 text-indigo-400" />
                    )}
                  </div>
                ))}
              </div>

              <button 
                onClick={startImport}
                disabled={!myWhatsAppName}
                className="mt-5 w-full py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-800 disabled:text-gray-500 disabled:cursor-not-allowed text-white rounded-xl font-bold text-xs transition-colors flex items-center justify-center gap-2 shadow-lg"
              >
                Start Importing Messages <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {step === 3 && (
            <div className="flex flex-col items-center py-8">
              <Loader2 className="w-10 h-10 text-indigo-400 animate-spin mb-4" />
              <h3 className="text-white font-bold text-base mb-1">Importing Messages...</h3>
              <p className="text-xs text-gray-400 mb-5 text-center">
                Merging historic chats chronologically into your timeline...
              </p>
              
              <div className="w-full bg-white/10 rounded-full h-2 mb-2 overflow-hidden">
                <div 
                  className="bg-indigo-500 h-2 rounded-full transition-all duration-300 ease-out" 
                  style={{ width: `${progress}%` }}
                />
              </div>
              <div className="w-full flex justify-between text-[11px] text-gray-400 font-mono">
                <span>{progress}%</span>
                <span>{totalMessages} messages</span>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="flex flex-col items-center py-6 text-center animate-in fade-in zoom-in">
              <div className="w-14 h-14 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-3 border border-emerald-500/30">
                <Check className="w-7 h-7" />
              </div>
              <h3 className="text-white font-bold text-lg mb-1">Import Complete!</h3>
              
              <div className="flex flex-col gap-2 my-4 w-full text-xs">
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center justify-between text-emerald-300 font-semibold">
                  <span>✅ New Messages Imported:</span>
                  <span className="font-mono text-sm font-bold">{importedCount}</span>
                </div>
                {skippedCount > 0 && (
                  <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-center justify-between text-amber-300 font-semibold">
                    <span>⚠️ Duplicate Messages Skipped:</span>
                    <span className="font-mono text-sm font-bold">{skippedCount}</span>
                  </div>
                )}
              </div>
              
              <button 
                onClick={() => {
                  handleClose();
                  if (onImportComplete) onImportComplete();
                }}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs transition-colors shadow-lg"
              >
                Done & Reload Chat
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
