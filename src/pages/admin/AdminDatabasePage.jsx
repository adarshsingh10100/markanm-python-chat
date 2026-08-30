import React, { useState, useEffect } from 'react';
import { Database, Lock, Table, ChevronLeft, ChevronRight, Eye, AlertCircle } from 'lucide-react';
import { adminService } from '../../services/adminService';
import { useToast } from '../../context/ToastContext';

export function AdminDatabasePage() {
  const { addToast } = useToast();

  const [tables, setTables] = useState([]);
  const [selectedTable, setSelectedTable] = useState('users');
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, total_pages: 1, total: 0 });

  const fetchTables = async () => {
    try {
      const res = await adminService.getDatabaseTables();
      if (res.tables) {
        setTables(res.tables);
        if (res.tables.length > 0 && !selectedTable) {
          setSelectedTable(res.tables[0]);
        }
      }
    } catch (err) {
      addToast(err.message || 'Failed to fetch table allowlist', 'error');
    }
  };

  const fetchTableRows = async () => {
    if (!selectedTable) return;
    setLoading(true);
    try {
      const res = await adminService.getDatabaseTableRows(selectedTable, page);
      if (res.rows) {
        setRows(res.rows);
        setPagination(res.pagination);
      }
    } catch (err) {
      addToast(err.message || 'Failed to load table rows', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTables();
  }, []);

  useEffect(() => {
    fetchTableRows();
  }, [selectedTable, page]);

  const columns = rows.length > 0 ? Object.keys(rows[0]) : [];

  return (
    <div className="h-full bg-[#0B0E14] text-white p-6 md:p-8 overflow-y-auto custom-scrollbar space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-white/10 pb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-purple-600/20 text-purple-400 border border-purple-500/30 flex items-center justify-center">
            <Database className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-white">Database Row Inspector</h1>
            <p className="text-xs text-gray-400">Read-only allowlisted database table viewer with server-enforced data redaction</p>
          </div>
        </div>
      </div>

      {/* Security Redaction Banner */}
      <div className="p-4 bg-purple-950/30 border border-purple-500/30 rounded-2xl text-purple-300 text-xs flex items-center gap-3">
        <Lock className="w-5 h-5 text-purple-400 shrink-0" />
        <div>
          <strong className="block text-white text-xs font-bold">Server-Enforced Blanket Redaction Active</strong>
          <span>All sensitive columns matching tokens, passwords, secrets, hashes, or API keys are replaced server-side with <code className="bg-black/40 px-1.5 py-0.5 rounded text-amber-300">***REDACTED***</code> before transmission.</span>
        </div>
      </div>

      {/* Table Selector */}
      <div className="flex items-center gap-2 overflow-x-auto custom-scrollbar pb-1">
        {tables.map((t) => (
          <button
            key={t}
            onClick={() => {
              setSelectedTable(t);
              setPage(1);
            }}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-2 border ${
              selectedTable === t
                ? 'bg-purple-600 text-white border-purple-400 shadow-lg shadow-purple-600/20'
                : 'bg-[#131822] text-gray-400 hover:text-white border-white/10 hover:border-white/20'
            }`}
          >
            <Table className="w-3.5 h-3.5" />
            <span>{t}</span>
          </button>
        ))}
      </div>

      {/* Table Grid Viewer */}
      <div className="bg-[#131822] border border-white/10 rounded-3xl overflow-hidden shadow-2xl">
        <div className="p-4 bg-white/5 border-b border-white/10 flex items-center justify-between">
          <span className="text-xs font-bold uppercase text-gray-300">
            Table: <strong className="text-purple-300 font-mono">{selectedTable}</strong> ({pagination.total} rows)
          </span>
        </div>

        <div className="overflow-x-auto max-h-[600px] custom-scrollbar">
          <table className="w-full text-left text-xs text-gray-300">
            <thead className="bg-white/5 border-b border-white/10 uppercase text-[10px] font-bold text-gray-400 sticky top-0 backdrop-blur-md">
              <tr>
                {columns.map((col) => (
                  <th key={col} className="p-4 whitespace-nowrap">
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 font-mono text-[11px]">
              {loading ? (
                <tr>
                  <td colSpan={columns.length || 1} className="p-8 text-center text-gray-500">
                    Loading table data...
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={columns.length || 1} className="p-8 text-center text-gray-500">
                    No rows found in table '{selectedTable}'.
                  </td>
                </tr>
              ) : (
                rows.map((row, idx) => (
                  <tr key={idx} className="hover:bg-white/5 transition-colors">
                    {columns.map((col) => {
                      const val = row[col];
                      const isRedacted = val === '***REDACTED***';
                      return (
                        <td key={col} className="p-4 max-w-xs truncate">
                          {isRedacted ? (
                            <span className="px-2 py-0.5 rounded bg-red-500/20 text-red-300 border border-red-500/30 text-[10px] font-bold">
                              ***REDACTED***
                            </span>
                          ) : val === null ? (
                            <span className="text-gray-600 italic">null</span>
                          ) : (
                            String(val)
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="p-4 border-t border-white/10 flex items-center justify-between text-xs text-gray-400">
          <span>Showing page {pagination.page} of {pagination.total_pages}</span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="p-2 bg-white/5 border border-white/10 rounded-xl disabled:opacity-40"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setPage((p) => Math.min(pagination.total_pages, p + 1))}
              disabled={page >= pagination.total_pages}
              className="p-2 bg-white/5 border border-white/10 rounded-xl disabled:opacity-40"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
