import { useEffect, useState, useCallback, useRef } from 'react';
import { adminApi } from '../../lib/api';

// ── Constants ──────────────────────────────────────────────────────────────────

const FILE_TYPES = [
  {
    key:   'source',
    label: 'Source File',
    desc:  'ZIP, .pkt, .gns3, .yml — the main downloadable project',
    color: 'cyan',
    accept: '.zip,.pkt,.gns3,.yml,.yaml,.txt',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
      </svg>
    ),
  },
  {
    key:   'preview',
    label: 'Preview Image',
    desc:  'PNG, JPEG, WebP, SVG — listing thumbnail',
    color: 'purple',
    accept: '.png,.jpg,.jpeg,.webp,.svg',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
  },
  {
    key:   'diagram',
    label: 'Topology Diagram',
    desc:  'PNG, JPEG, SVG, PDF — network diagrams',
    color: 'blue',
    accept: '.png,.jpg,.jpeg,.svg,.pdf',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18" />
      </svg>
    ),
  },
  {
    key:   'documentation',
    label: 'Implementation Guide',
    desc:  'PDF, DOCX, TXT, MD — step-by-step guides',
    color: 'green',
    accept: '.pdf,.doc,.docx,.txt,.md',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
  },
];

const COLOR = {
  cyan:   { bg: 'bg-cyan-500/10',   border: 'border-cyan-500/30',   text: 'text-cyan-400',   hover: 'hover:border-cyan-500/60' },
  purple: { bg: 'bg-purple-500/10', border: 'border-purple-500/30', text: 'text-purple-400', hover: 'hover:border-purple-500/60' },
  blue:   { bg: 'bg-blue-500/10',   border: 'border-blue-500/30',   text: 'text-blue-400',   hover: 'hover:border-blue-500/60' },
  green:  { bg: 'bg-green-500/10',  border: 'border-green-500/30',  text: 'text-green-400',  hover: 'hover:border-green-500/60' },
};

// ── Helpers ────────────────────────────────────────────────────────────────────

function fmtBytes(b) {
  const n = parseFloat(b);
  if (!n || n <= 0 || isNaN(n)) return '0 B';
  const k = 1024, s = ['B', 'KB', 'MB', 'GB'];
  const i = Math.min(Math.floor(Math.log(n) / Math.log(k)), s.length - 1);
  return `${(n / Math.pow(k, i)).toFixed(1)} ${s[i]}`;
}

function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function fileTypeLabel(key) {
  return FILE_TYPES.find((t) => t.key === key)?.label || key;
}

function fileTypeColor(key) {
  const map = { source: 'cyan', preview: 'purple', diagram: 'blue', documentation: 'green', other: 'cyan' };
  return COLOR[map[key] || 'cyan'];
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function FileTypeBadge({ type }) {
  const c = fileTypeColor(type);
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${c.bg} ${c.border} ${c.text} capitalize`}>
      {fileTypeLabel(type)}
    </span>
  );
}

function ProgressBar({ progress }) {
  return (
    <div className="w-full bg-gray-800 rounded-full h-1.5 overflow-hidden">
      <div
        className="h-full bg-cyan-500 rounded-full transition-all duration-300"
        style={{ width: `${progress}%` }}
      />
    </div>
  );
}

// ── Drop Zone ──────────────────────────────────────────────────────────────────

function DropZone({ fileType, onFilesSelected, disabled }) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef(null);
  const ft = FILE_TYPES.find((t) => t.key === fileType);
  const c  = COLOR[ft?.color || 'cyan'];

  function handleDrop(e) {
    e.preventDefault();
    setDragging(false);
    if (disabled) return;
    const files = Array.from(e.dataTransfer.files);
    if (files.length) onFilesSelected(files);
  }

  function handleChange(e) {
    const files = Array.from(e.target.files || []);
    if (files.length) onFilesSelected(files);
    e.target.value = '';
  }

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); if (!disabled) setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      onClick={() => !disabled && inputRef.current?.click()}
      className={`
        relative border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer
        transition-all duration-200 select-none
        ${dragging ? `${c.bg} ${c.border} scale-[1.01]` : `border-gray-700 hover:${c.border} ${c.hover}`}
        ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
      `}
    >
      <input
        ref={inputRef}
        type="file"
        multiple
        accept={ft?.accept}
        className="hidden"
        onChange={handleChange}
        disabled={disabled}
      />
      <div className={`w-12 h-12 ${c.bg} rounded-2xl flex items-center justify-center mx-auto mb-3 ${c.text}`}>
        {ft?.icon}
      </div>
      <p className="text-white font-semibold text-sm mb-1">
        {dragging ? 'Drop files here' : `Drop ${ft?.label} files here`}
      </p>
      <p className="text-gray-500 text-xs">{ft?.desc}</p>
      <p className="text-gray-600 text-xs mt-2">or click to browse</p>
    </div>
  );
}

// ── Upload Queue Item ──────────────────────────────────────────────────────────

function QueueItem({ item, onRemove }) {
  const c = fileTypeColor(item.fileType);
  return (
    <div className="flex items-center gap-3 bg-gray-800 rounded-xl px-4 py-3">
      <div className={`w-8 h-8 ${c.bg} rounded-lg flex items-center justify-center ${c.text} shrink-0`}>
        {FILE_TYPES.find((t) => t.key === item.fileType)?.icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-white text-sm font-medium truncate">{item.file.name}</p>
        <div className="flex items-center gap-2 mt-0.5">
          <FileTypeBadge type={item.fileType} />
          <span className="text-gray-500 text-xs">{fmtBytes(item.file.size)}</span>
          {item.version && <span className="text-gray-600 text-xs">v{item.version}</span>}
          {item.isPrimary && (
            <span className="text-xs text-yellow-400 font-semibold">★ Primary</span>
          )}
        </div>
        {item.status === 'uploading' && (
          <div className="mt-1.5"><ProgressBar progress={item.progress || 0} /></div>
        )}
        {item.status === 'done' && (
          <p className="text-green-400 text-xs mt-1">✓ Uploaded</p>
        )}
        {item.status === 'error' && (
          <p className="text-red-400 text-xs mt-1">{item.error}</p>
        )}
      </div>
      {item.status !== 'uploading' && item.status !== 'done' && (
        <button
          onClick={() => onRemove(item.id)}
          className="text-gray-600 hover:text-red-400 transition-colors shrink-0"
          aria-label="Remove"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  );
}

// ── Existing File Row ──────────────────────────────────────────────────────────

function FileRow({ file, onDelete, onSetPrimary }) {
  const [deleting,  setDeleting]  = useState(false);
  const [promoting, setPromoting] = useState(false);

  async function handleDelete() {
    if (!confirm(`Delete "${file.file_name}"?`)) return;
    setDeleting(true);
    try { await onDelete(file.id); }
    catch (e) { alert(e.message); setDeleting(false); }
  }

  async function handleSetPrimary() {
    setPromoting(true);
    try { await onSetPrimary(file.id, file.file_type); }
    catch (e) { alert(e.message); }
    finally { setPromoting(false); }
  }

  const c = fileTypeColor(file.file_type);

  return (
    <div className={`flex items-center gap-3 rounded-xl px-4 py-3 border transition-colors ${
      file.is_primary ? `${c.bg} ${c.border}` : 'bg-gray-800/50 border-gray-800'
    }`}>
      <div className={`w-8 h-8 ${c.bg} rounded-lg flex items-center justify-center ${c.text} shrink-0`}>
        {FILE_TYPES.find((t) => t.key === file.file_type)?.icon || (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-white text-sm font-medium truncate max-w-[200px]">{file.file_name}</p>
          <FileTypeBadge type={file.file_type} />
          {file.is_primary && <span className="text-xs text-yellow-400 font-semibold">★ Primary</span>}
        </div>
        <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-500">
          <span>{fmtBytes(file.file_size_bytes)}</span>
          <span>v{file.version || '1.0'}</span>
          <span>{file.download_count} downloads</span>
          <span>{fmtDate(file.created_at)}</span>
        </div>
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        {!file.is_primary && (
          <button
            onClick={handleSetPrimary}
            disabled={promoting}
            className="text-xs px-2.5 py-1 bg-yellow-500/10 text-yellow-400 hover:bg-yellow-500/20 rounded-lg transition-colors disabled:opacity-50"
          >
            {promoting ? '…' : 'Set Primary'}
          </button>
        )}
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="text-xs px-2.5 py-1 bg-red-500/10 text-red-400 hover:bg-red-500/20 rounded-lg transition-colors disabled:opacity-50"
        >
          {deleting ? '…' : 'Delete'}
        </button>
      </div>
    </div>
  );
}

// ── Storage Stats Panel ────────────────────────────────────────────────────────

function StorageStats() {
  const [stats,   setStats]   = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminApi.getUploadStats()
      .then((r) => setStats(r.data))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 flex items-center justify-center h-32">
      <div className="w-5 h-5 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!stats) return null;

  const { byType = [], recent = [] } = stats;
  const totals = {
    total_files:         parseInt(stats.totals?.total_files         ?? 0, 10),
    total_bytes:         parseFloat(stats.totals?.total_bytes       ?? 0),
    total_downloads:     parseInt(stats.totals?.total_downloads     ?? 0, 10),
    projects_with_files: parseInt(stats.totals?.projects_with_files ?? 0, 10),
  };

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 space-y-5">
      <h2 className="text-white font-semibold text-sm">Storage Overview</h2>

      {/* Totals */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total Files',       value: totals.total_files },
          { label: 'Total Size',        value: fmtBytes(totals.total_bytes) },
          { label: 'Downloads',         value: totals.total_downloads },
          { label: 'Projects w/ Files', value: totals.projects_with_files },
        ].map(({ label, value }) => (
          <div key={label} className="bg-gray-800 rounded-xl p-3 text-center">
            <p className="text-white font-bold text-lg">{value ?? 0}</p>
            <p className="text-gray-500 text-xs mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* By type */}
      {byType.length > 0 && (
        <div>
          <p className="text-gray-500 text-xs font-medium mb-2">By File Type</p>
          <div className="space-y-2">
            {byType.map((t) => {
              const c = fileTypeColor(t.file_type);
              const typeBytes = parseFloat(t.total_bytes ?? 0);
              const pct = totals.total_bytes > 0
                ? Math.round((typeBytes / totals.total_bytes) * 100)
                : 0;
              return (
                <div key={t.file_type} className="flex items-center gap-3">
                  <FileTypeBadge type={t.file_type} />
                  <div className="flex-1 bg-gray-800 rounded-full h-1.5 overflow-hidden">
                    <div className={`h-full rounded-full ${c.text.replace('text-', 'bg-')}`}
                      style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-gray-400 text-xs w-16 text-right">{fmtBytes(typeBytes)}</span>
                  <span className="text-gray-600 text-xs w-12 text-right">{t.file_count ?? 0} files</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Recent uploads */}
      {recent.length > 0 && (
        <div>
          <p className="text-gray-500 text-xs font-medium mb-2">Recent Uploads</p>
          <div className="space-y-1.5">
            {recent.slice(0, 5).map((f) => (
              <div key={f.id} className="flex items-center gap-2 text-xs">
                <FileTypeBadge type={f.file_type} />
                <span className="text-gray-300 truncate flex-1">{f.file_name}</span>
                <span className="text-gray-500 shrink-0">{f.project_title?.slice(0, 20)}</span>
                <span className="text-gray-600 shrink-0">{fmtDate(f.created_at)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Project File Manager ───────────────────────────────────────────────────────

function ProjectFileManager({ projectId, onClose }) {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');

  // Upload queue state
  const [queue,       setQueue]       = useState([]);
  const [fileType,    setFileType]    = useState('source');
  const [version,     setVersion]     = useState('1.0');
  const [isPrimary,   setIsPrimary]   = useState(false);
  const [uploading,   setUploading]   = useState(false);
  const [uploadError, setUploadError] = useState('');

  const loadFiles = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const res = await adminApi.listProjectFiles(projectId);
      setData(res.data);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, [projectId]);

  useEffect(() => { loadFiles(); }, [loadFiles]);

  function addToQueue(files) {
    const items = files.map((f) => ({
      id:       `${Date.now()}_${Math.random()}`,
      file:     f,
      fileType,
      version,
      isPrimary,
      status:   'pending',
      progress: 0,
    }));
    setQueue((q) => [...q, ...items]);
  }

  function removeFromQueue(id) {
    setQueue((q) => q.filter((i) => i.id !== id));
  }

  async function uploadAll() {
    const pending = queue.filter((i) => i.status === 'pending');
    if (!pending.length) return;
    setUploading(true); setUploadError('');

    for (const item of pending) {
      setQueue((q) => q.map((i) => i.id === item.id ? { ...i, status: 'uploading', progress: 10 } : i));
      try {
        const fd = new FormData();
        fd.append('file',       item.file);
        fd.append('file_type',  item.fileType);
        fd.append('version',    item.version);
        fd.append('is_primary', item.isPrimary ? '1' : '0');

        await adminApi.uploadFile(projectId, fd);
        setQueue((q) => q.map((i) => i.id === item.id ? { ...i, status: 'done', progress: 100 } : i));
      } catch (e) {
        setQueue((q) => q.map((i) => i.id === item.id ? { ...i, status: 'error', error: e.message } : i));
        setUploadError(`Some files failed to upload`);
      }
    }

    setUploading(false);
    // Reload file list
    await loadFiles();
    // Clear done items after a short delay
    setTimeout(() => setQueue((q) => q.filter((i) => i.status !== 'done')), 2000);
  }

  async function handleDelete(fileId) {
    await adminApi.deleteProjectFile(fileId);
    await loadFiles();
  }

  async function handleSetPrimary(fileId, fileType) {
    await adminApi.updateFileMeta(fileId, { is_primary: '1', file_type: fileType });
    await loadFiles();
  }

  const pendingCount = queue.filter((i) => i.status === 'pending').length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-950/80 backdrop-blur-sm">
      <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800 shrink-0">
          <div>
            <h2 className="text-white font-semibold">Manage Project Files</h2>
            {data && <p className="text-gray-500 text-xs mt-0.5">{data.project.title}</p>}
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Upload section */}
          <div className="space-y-4">
            <h3 className="text-white text-sm font-semibold">Upload New Files</h3>

            {/* File type + options row */}
            <div className="flex flex-wrap gap-3 items-end">
              <div>
                <label className="block text-xs text-gray-500 mb-1">File Type</label>
                <select
                  value={fileType}
                  onChange={(e) => setFileType(e.target.value)}
                  className="bg-gray-800 border border-gray-700 text-gray-200 text-sm px-3 py-2 rounded-xl outline-none focus:border-cyan-500 transition-colors"
                >
                  {FILE_TYPES.map((t) => (
                    <option key={t.key} value={t.key}>{t.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Version</label>
                <input
                  type="text"
                  value={version}
                  onChange={(e) => setVersion(e.target.value)}
                  placeholder="1.0"
                  className="bg-gray-800 border border-gray-700 text-gray-200 text-sm px-3 py-2 rounded-xl outline-none focus:border-cyan-500 transition-colors w-24"
                />
              </div>
              <label className="flex items-center gap-2 cursor-pointer pb-2">
                <input
                  type="checkbox"
                  checked={isPrimary}
                  onChange={(e) => setIsPrimary(e.target.checked)}
                  className="w-4 h-4 accent-cyan-500"
                />
                <span className="text-gray-300 text-sm">Set as primary</span>
              </label>
            </div>

            {/* Drop zone */}
            <DropZone
              fileType={fileType}
              onFilesSelected={addToQueue}
              disabled={uploading}
            />

            {/* Queue */}
            {queue.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-gray-400 text-xs">{queue.length} file(s) in queue</p>
                  {pendingCount > 0 && !uploading && (
                    <button
                      onClick={() => setQueue([])}
                      className="text-xs text-gray-600 hover:text-gray-400 transition-colors"
                    >
                      Clear all
                    </button>
                  )}
                </div>
                {queue.map((item) => (
                  <QueueItem key={item.id} item={item} onRemove={removeFromQueue} />
                ))}
              </div>
            )}

            {uploadError && (
              <p className="text-red-400 text-xs">{uploadError}</p>
            )}

            {pendingCount > 0 && (
              <button
                onClick={uploadAll}
                disabled={uploading}
                className="w-full bg-cyan-500 hover:bg-cyan-400 disabled:opacity-60 text-gray-950 font-semibold py-2.5 rounded-xl text-sm transition-colors flex items-center justify-center gap-2"
              >
                {uploading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-gray-950/40 border-t-gray-950 rounded-full animate-spin" />
                    Uploading…
                  </>
                ) : (
                  `Upload ${pendingCount} file${pendingCount > 1 ? 's' : ''}`
                )}
              </button>
            )}
          </div>

          {/* Existing files */}
          <div>
            <h3 className="text-white text-sm font-semibold mb-3">
              Attached Files {data && `(${data.total})`}
            </h3>

            {loading ? (
              <div className="flex justify-center py-8">
                <div className="w-5 h-5 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : error ? (
              <p className="text-red-400 text-sm">{error}</p>
            ) : !data?.files.length ? (
              <p className="text-gray-600 text-sm text-center py-6">No files attached yet</p>
            ) : (
              <div className="space-y-2">
                {FILE_TYPES.map((ft) => {
                  const group = data.grouped[ft.key] || [];
                  if (!group.length) return null;
                  return (
                    <div key={ft.key}>
                      <p className="text-gray-500 text-xs font-medium mb-1.5 mt-3 first:mt-0">{ft.label}</p>
                      {group.map((f) => (
                        <FileRow
                          key={f.id}
                          file={f}
                          onDelete={handleDelete}
                          onSetPrimary={handleSetPrimary}
                        />
                      ))}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────

export default function AdminUpload() {
  const [projects,    setProjects]    = useState([]);
  const [pagination,  setPagination]  = useState({ page: 1, totalPages: 1, total: 0 });
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState('');
  const [search,      setSearch]      = useState('');
  const [page,        setPage]        = useState(1);
  const [selected,    setSelected]    = useState(null); // projectId for modal

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const params = { page, limit: 20 };
      if (search) params.search = search;
      const res = await adminApi.listProjects(params);
      setProjects(res.data);
      setPagination(res.pagination);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, [page, search]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white">File Upload Manager</h1>
        <p className="text-gray-500 text-sm mt-1">
          Upload and manage source ZIPs, topology images, PDFs, and implementation guides per project.
        </p>
      </div>

      {/* Storage stats */}
      <StorageStats />

      {/* File type legend */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {FILE_TYPES.map((ft) => {
          const c = COLOR[ft.color];
          return (
            <div key={ft.key} className={`${c.bg} border ${c.border} rounded-xl p-4`}>
              <div className={`${c.text} mb-2`}>{ft.icon}</div>
              <p className={`text-sm font-semibold ${c.text}`}>{ft.label}</p>
              <p className="text-gray-500 text-xs mt-0.5">{ft.desc}</p>
            </div>
          );
        })}
      </div>

      {/* Project list */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h2 className="text-white font-semibold">Select a Project to Manage Files</h2>
          <input
            type="text"
            placeholder="Search projects…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="bg-gray-900 border border-gray-700 text-white placeholder-gray-600 text-sm px-3 py-2 rounded-xl outline-none focus:border-cyan-500 transition-colors w-56"
          />
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl p-4 text-sm">{error}</div>
        )}

        <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="w-6 h-6 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : projects.length === 0 ? (
            <p className="text-center text-gray-600 py-12">No projects found</p>
          ) : (
            <div className="divide-y divide-gray-800">
              {projects.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center gap-4 px-5 py-4 hover:bg-gray-800/40 transition-colors"
                >
                  <div className="w-10 h-10 bg-gray-800 rounded-xl flex items-center justify-center shrink-0">
                    <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-medium text-sm truncate">{p.title}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-gray-500 text-xs">{p.vendor}</span>
                      <span className="text-gray-700">·</span>
                      <span className="text-gray-500 text-xs">{p.category}</span>
                      <span className="text-gray-700">·</span>
                      <span className={`text-xs font-medium ${p.is_published ? 'text-green-400' : 'text-yellow-400'}`}>
                        {p.is_published ? 'Published' : 'Pending'}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {p.project_file_path ? (
                      <span className="text-xs text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 px-2 py-0.5 rounded-full">
                        Has file
                      </span>
                    ) : (
                      <span className="text-xs text-gray-600 bg-gray-800 border border-gray-700 px-2 py-0.5 rounded-full">
                        No file
                      </span>
                    )}
                    <button
                      onClick={() => setSelected(p.id)}
                      className="bg-cyan-500/10 hover:bg-cyan-500 text-cyan-400 hover:text-gray-950 text-xs font-semibold px-3 py-1.5 rounded-lg transition-all duration-200"
                    >
                      Manage Files
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between px-5 py-3 border-t border-gray-800">
              <span className="text-xs text-gray-500">Page {pagination.page} of {pagination.totalPages}</span>
              <div className="flex gap-2">
                <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
                  className="text-xs px-3 py-1.5 bg-gray-800 text-gray-300 rounded-lg disabled:opacity-40 hover:bg-gray-700 transition-colors">
                  Previous
                </button>
                <button onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))} disabled={page === pagination.totalPages}
                  className="text-xs px-3 py-1.5 bg-gray-800 text-gray-300 rounded-lg disabled:opacity-40 hover:bg-gray-700 transition-colors">
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* File manager modal */}
      {selected && (
        <ProjectFileManager
          projectId={selected}
          onClose={() => { setSelected(null); load(); }}
        />
      )}
    </div>
  );
}
