import React, { useState, useEffect, useRef } from 'react'
import AceEditor from 'react-ace'

// --- ACE CONFIGURATION ---
import 'ace-builds/src-noconflict/mode-lua'
import 'ace-builds/src-noconflict/mode-json'
import 'ace-builds/src-noconflict/mode-markdown'
import 'ace-builds/src-noconflict/theme-dracula'
import 'ace-builds/src-noconflict/theme-monokai'
import 'ace-builds/src-noconflict/theme-twilight'
import 'ace-builds/src-noconflict/theme-solarized_dark'
import 'ace-builds/src-noconflict/theme-tomorrow_night'
import 'ace-builds/src-noconflict/theme-github'
import 'ace-builds/src-noconflict/ext-language_tools' 

// --- ICONS ---
import { 
  Files, Search, GitGraph, Settings, Minus, Square, X, 
  ChevronRight, Plus, Play, Save, FolderOpen, Trash2, Link, Unlink, Cloud, Eye, Copy, Download, ShieldCheck, ChevronLeft, Clock, Lock, Check, Folder
} from 'lucide-react'

// --- THEME DEFINITIONS ---
const THEMES = {
    dracula: { name: 'Dracula', bg: '#282a36', sidebar: '#21222c', accent: '#ff79c6', button: '#bd93f9', text: '#f8f8f2' },
    monokai: { name: 'Monokai', bg: '#272822', sidebar: '#1e1f1c', accent: '#a6e22e', button: '#f92672', text: '#f8f8f2' },
    // Simulated Acrylic (Solid colors to allow resizing)
    acrylic: { name: 'Acrylic', bg: '#09090b', sidebar: '#121214', accent: '#22d3ee', button: '#22d3ee', text: '#ffffff' },
}

// Fallback image for scripts
const PLACEHOLDER_IMG = "https://images.rbxcdn.com/28ab48fcd5d5b19b03c126d2b6aef4b8.jpg";

// --- FORMATTING HELPERS ---
const formatViews = (num) => {
    if (!num) return '0';
    if (num >= 1000000) return (num / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
    return num.toString();
}

const timeAgo = (dateString) => {
    const s = Math.floor((new Date() - new Date(dateString)) / 1000);
    if(isNaN(s)) return 'Unknown';
    if(s>31536000)return Math.floor(s/31536000)+"y";
    if(s>2592000)return Math.floor(s/2592000)+"mo";
    if(s>86400)return Math.floor(s/86400)+"d";
    if(s>3600)return Math.floor(s/3600)+"h";
    return Math.floor(s)+"s";
}

export default function App() {
  // --- APP STATE ---
  const [activeActivity, setActiveActivity] = useState('files')
  const [expandedFolders, setExpandedFolders] = useState({ 'src': true, 'scripts': true })
  const [isTerminalOpen, setIsTerminalOpen] = useState(true)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [isAttached, setIsAttached] = useState(false)
  const [logs, setLogs] = useState([{ type: 'info', text: 'Luminos Executor v3.0 initialized...' }])

  const [settings, setSettings] = useState({ theme: 'acrylic', fontSize: 14, showLineNumbers: true, autoSave: false })
  const colors = THEMES[settings.theme] || THEMES.dracula

  // --- EDITOR FILE SYSTEM ---
  const [files, setFiles] = useState([
    { id: '1', name: 'aimbot.lua', folder: 'scripts', content: 'print("Aimbot Loaded")', isTemp: false },
    { id: '2', name: 'esp.lua', folder: 'scripts', content: 'print("ESP On")', isTemp: false },
  ])
  const [openTabIds, setOpenTabIds] = useState(['1', '2']) 
  const [activeTabId, setActiveTabId] = useState('1')
  const [renamingId, setRenamingId] = useState(null)

  // --- SCRIPT HUB STATE ---
  const [hubScripts, setHubScripts] = useState([])
  const [selectedScript, setSelectedScript] = useState(null)
  const [hubQuery, setHubQuery] = useState('')
  const [hubPage, setHubPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [isLoading, setIsLoading] = useState(false)

  const [saveModal, setSaveModal] = useState({ open: false, fileId: null })

  // --- ACTIONS ---
  const addLog = (text, type = 'info') => setLogs(prev => [...prev, { type, text, time: new Date().toLocaleTimeString() }])
  const updateSetting = (key, value) => setSettings(prev => ({ ...prev, [key]: value }))

  // --- API FETCH ---
  const fetchScripts = async (resetPage = false) => {
      setIsLoading(true); const page = resetPage ? 1 : hubPage; if(resetPage) setHubPage(1);
      try {
          const mode = hubQuery.trim() ? 'search' : 'fetch'
          const data = await window.api.fetchScripts(mode, hubQuery, page)
          setHubScripts(data.scripts || [])
          setTotalPages(data.totalPages || 1)
      } catch (err) { setHubScripts([]) } finally { setIsLoading(false) }
  }
  useEffect(() => { if (activeActivity === 'scripts') fetchScripts() }, [activeActivity, hubPage]) 
  const handleSearchKeyDown = (e) => { if (e.key === 'Enter') fetchScripts(true) }

  // --- BUTTON HANDLERS ---
  const handleAttach = () => { setIsAttached(!isAttached); addLog(isAttached ? "Detached." : "Attached.", isAttached ? "error" : "success") }
  const handleExecute = () => { isAttached ? addLog(`Executed script`, "success") : addLog("Attach first!", "error") }
  const handleExecuteScript = (code, title) => { isAttached ? addLog(`Executed: ${title}`, "success") : addLog("Attach first!", "error") }
  const handleClear = () => { handleEditorChange(""); addLog("Editor cleared.", "warn") }
  
  const handleSave = () => {
      const file = files.find(f => f.id === activeTabId)
      if (file) {
          if (file.isTemp) {
            setSaveModal({ open: true, fileId: activeTabId })
          } else {
            addLog("File saved.", "info")
          }
      }
  }
  
  const confirmSave = (newName, targetFolder) => {
      if (!newName.trim()) return;
      setFiles(prev => prev.map(f => f.id === saveModal.fileId ? { ...f, name: newName, folder: targetFolder, isTemp: false } : f))
      setSaveModal({ open: false, fileId: null })
      addLog(`Saved '${newName}' to ${targetFolder}`, "success")
  }

  const handleOpen = async () => { try { const data = await window.api.openFile(); if(data) { handleNewFile(data.name, data.content, false); addLog(`Opened ${data.name}`, "info") } } catch(e) {} }
  
  const handleNewFile = (name, content = '', isTemp = true) => {
    const newId = Date.now().toString(); const newName = name || `Untitled.lua`
    setFiles([...files, { id: newId, name: newName, folder: 'root', content, isTemp }])
    setOpenTabIds([...openTabIds, newId]); setActiveTabId(newId)
  }

  const handleRename = (id, newName) => { if (newName.trim()) setFiles(files.map(f => f.id === id ? { ...f, name: newName } : f)); setRenamingId(null) }
  const handleCloseTab = (e, id) => { e.stopPropagation(); const newTabs = openTabIds.filter(t => t !== id); setOpenTabIds(newTabs); if(activeTabId === id) setActiveTabId(newTabs[newTabs.length - 1] || null) }
  const handleEditorChange = (val) => setFiles(files.map(f => f.id === activeTabId ? { ...f, content: val } : f))
  const toggleFolder = (folderName) => setExpandedFolders(prev => ({ ...prev, [folderName]: !prev[folderName] }))
  const activeFile = files.find(f => f.id === activeTabId)
  const getMode = (f) => f && f.endsWith('.json') ? 'json' : f && f.endsWith('.md') ? 'markdown' : 'lua'

  return (
    <div className="flex flex-col h-full absolute inset-0 font-sans overflow-hidden transition-colors duration-300 border border-white/10" style={{ backgroundColor: colors.bg, color: colors.text }}>
      
      {/* TITLE BAR */}
      <TitleBar isAttached={isAttached} onAttach={handleAttach} colors={colors} />

      <div className="flex flex-1 overflow-hidden relative">
        
        {/* ACTIVITY BAR */}
        <div className="w-12 flex flex-col items-center py-4 gap-4 z-20 border-r border-white/5" style={{ backgroundColor: colors.bg }}>
           <ActivityIcon icon={Files} id="files" active={activeActivity} onClick={setActiveActivity} colors={colors} />
           <ActivityIcon icon={Cloud} id="scripts" active={activeActivity} onClick={setActiveActivity} colors={colors} />
           <ActivityIcon icon={Settings} id="settings" active={isSettingsOpen ? 'settings' : activeActivity} onClick={() => setIsSettingsOpen(true)} colors={colors} />
        </div>

        {activeActivity === 'files' ? (
            <>
                {/* SIDEBAR */}
                <div className="w-56 flex flex-col border-r border-white/5" style={{ backgroundColor: colors.sidebar }}>
                    <div className="h-9 px-4 flex items-center text-[11px] font-bold tracking-widest opacity-60 uppercase">Explorer</div>
                    <div className="flex-1 overflow-y-auto px-2 pt-2">
                        <FolderItem name="LUMINOS-PROJECT" isOpen={true} isRoot colors={colors}>
                            <FolderItem name="src" isOpen={expandedFolders['src']} onClick={() => toggleFolder('src')} indent={1} colors={colors}>
                                <FolderItem name="scripts" isOpen={expandedFolders['scripts']} onClick={() => toggleFolder('scripts')} indent={2} colors={colors}>
                                    {files.filter(f => f.folder === 'scripts' && !f.isTemp).map(file => (
                                        <FileItem key={file.id} file={file} indent={3} active={activeTabId === file.id} isRenaming={renamingId === file.id} onClick={() => { if(!openTabIds.includes(file.id)) setOpenTabIds([...openTabIds, file.id]); setActiveTabId(file.id) }} setRenamingId={setRenamingId} onRename={handleRename} colors={colors} />
                                    ))}
                                </FolderItem>
                            </FolderItem>
                            {files.filter(f => f.folder === 'root' && !f.isTemp).map(file => (
                                <FileItem key={file.id} file={file} indent={1} active={activeTabId === file.id} isRenaming={renamingId === file.id} onClick={() => { if(!openTabIds.includes(file.id)) setOpenTabIds([...openTabIds, file.id]); setActiveTabId(file.id) }} setRenamingId={setRenamingId} onRename={handleRename} colors={colors} />
                            ))}
                        </FolderItem>
                    </div>
                </div>

                {/* EDITOR */}
                <div className="flex-1 flex flex-col relative min-w-0" style={{ backgroundColor: colors.bg }}>
                    <div className="flex h-9 border-b border-white/5 overflow-x-auto scrollbar-hide items-center pr-2" style={{ backgroundColor: colors.bg }}>
                        {openTabIds.map(id => {
                            const file = files.find(f => f.id === id)
                            if (!file) return null
                            return <Tab key={file.id} file={file} active={activeTabId === file.id} onClick={() => setActiveTabId(file.id)} onClose={(e) => handleCloseTab(e, file.id)} colors={colors} settings={settings} />
                        })}
                        <button onClick={() => handleNewFile()} className="ml-2 p-1 rounded hover:bg-white/10 opacity-60 hover:opacity-100 transition-colors"><Plus size={14} /></button>
                    </div>
                    
                    <div className="flex-1 overflow-hidden relative">
                        {activeFile ? (
                            <AceEditor
                                mode={getMode(activeFile.name)}
                                theme={settings.theme === 'acrylic' ? 'dracula' : settings.theme}
                                name="luminos_editor"
                                onChange={handleEditorChange}
                                fontSize={parseInt(settings.fontSize)}
                                showPrintMargin={false}
                                showGutter={settings.showLineNumbers}
                                highlightActiveLine={true}
                                value={activeFile.content}
                                setOptions={{ enableBasicAutocompletion: true, enableLiveAutocompletion: true, showLineNumbers: settings.showLineNumbers, tabSize: 4 }}
                                style={{ width: '100%', height: '100%', backgroundColor: 'transparent' }}
                            />
                        ) : <div className="flex items-center justify-center h-full opacity-50 select-none"><p className="text-sm">No file open</p></div>}
                        <style>{`.ace_editor, .ace_gutter, .ace_scroller, .ace_content { background-color: transparent !important; }`}</style>
                    </div>

                    <div className="absolute bottom-6 right-6 flex items-center gap-4 z-20">
                        <div className="flex items-center backdrop-blur-md border border-white/10 rounded-full p-1 shadow-lg" style={{ backgroundColor: `${colors.sidebar}aa` }}>
                            <TooltipButton icon={<FolderOpen size={16} />} onClick={handleOpen} title="Open" colors={colors} />
                            <TooltipButton icon={<Save size={16} />} onClick={handleSave} title="Save" colors={colors} />
                            <div className="w-px h-4 bg-white/10 mx-1"></div>
                            <TooltipButton icon={<Trash2 size={16} />} onClick={handleClear} title="Clear" hoverColor="hover:text-red-400" colors={colors} />
                        </div>
                        <button onClick={handleExecute} className="flex items-center justify-center w-12 h-12 rounded-full border border-white/10 transition-all duration-300 hover:scale-110 shadow-lg" style={{ backgroundColor: `${colors.bg}cc`, color: colors.text, boxShadow: `0 0 15px ${colors.button}40` }} onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = colors.button; e.currentTarget.style.color = '#fff'; }} onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = `${colors.bg}cc`; e.currentTarget.style.color = colors.text; }}><Play size={20} fill="currentColor" className="ml-0.5" /></button>
                    </div>
                    
                    {isTerminalOpen && <DraggableTerminal logs={logs} onClose={() => setIsTerminalOpen(false)} colors={colors} settings={settings} />}
                </div>
            </>
        ) : (
            // --- SCRIPT HUB ---
            <div className="flex-1 flex flex-col overflow-hidden" style={{ backgroundColor: colors.bg }}>
                <div className="h-16 border-b border-white/5 flex items-center justify-between px-6" style={{ backgroundColor: colors.sidebar }}>
                    <div className="flex items-center gap-2 text-sm font-medium opacity-80">Powered by <img src="https://scriptblox.com/img/logo.png" alt="ScriptBlox" className="h-5 opacity-80" /></div>
                    <div className="flex items-center gap-3">
                        <div className="flex items-center rounded-full border border-white/5 p-1 h-9" style={{ backgroundColor: `${colors.bg}50` }}><button onClick={() => setHubPage(p => Math.max(1, p - 1))} disabled={hubPage === 1} className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-white/10 disabled:opacity-30 transition-colors"><ChevronLeft size={14} /></button><span className="px-3 text-xs font-mono font-bold opacity-80">Page {hubPage}</span><button onClick={() => setHubPage(p => p + 1)} className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors"><ChevronRight size={14} /></button></div>
                        <div className="relative group"><Search className="absolute left-3 top-1/2 -translate-y-1/2 opacity-50 transition-colors" size={14} style={{ color: colors.accent }} /><input type="text" placeholder="Search..." className="border border-white/10 rounded-full pl-9 pr-4 py-1.5 w-48 text-sm focus:outline-none transition-all" style={{ backgroundColor: `${colors.bg}50`, color: colors.text }} value={hubQuery} onChange={(e) => setHubQuery(e.target.value)} onKeyDown={handleSearchKeyDown} /></div>
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto p-6" style={{ backgroundColor: colors.bg }}>
                    {isLoading ? <div className="flex items-center justify-center h-full animate-pulse font-medium" style={{ color: colors.accent }}>Loading scripts...</div> : (
                        <div className="grid grid-cols-3 gap-4">
                            {hubScripts.map((script) => (
                                <div key={script._id} onClick={() => setSelectedScript({...script, imageUrl: PLACEHOLDER_IMG})} className="group relative border border-white/5 rounded-xl p-3 cursor-pointer transition-all flex flex-col gap-3 h-[260px] overflow-hidden shadow-sm hover:shadow-md" style={{ backgroundColor: colors.sidebar }} onMouseEnter={(e) => e.currentTarget.style.borderColor = `${colors.accent}60`} onMouseLeave={(e) => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.05)'}>
                                    <div className="w-full h-32 flex-shrink-0 relative rounded-lg overflow-hidden bg-black/20 border border-white/5"><img src={PLACEHOLDER_IMG} className="w-full h-full object-cover transition-transform group-hover:scale-105" /><div className="absolute top-2 right-2 flex items-center gap-1 border border-white/10 backdrop-blur-md px-2 py-0.5 rounded-md text-[10px] font-bold shadow-sm z-20 bg-black/60 text-white"><Lock size={10} /> {script.scriptType === 'paid' ? 'Paid' : 'Free'}</div></div>
                                    <div className="flex-1 flex flex-col overflow-hidden z-10"><h3 className="font-bold text-[14px] leading-snug transition-colors line-clamp-2 mb-1 group-hover:text-white" style={{ color: colors.text }}>{script.title}</h3><p className="text-xs truncate opacity-60">{script.game.name}</p><div className="mt-auto flex items-center justify-between text-[11px] font-medium opacity-60 pt-2 border-t border-white/5"><span className="flex items-center gap-1"><Eye size={12} /> {formatViews(script.views)}</span><span className="flex items-center gap-0.5 truncate"><Clock size={12} /> {timeAgo(script.createdAt)}</span></div></div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
                {selectedScript && (
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-8" onClick={() => setSelectedScript(null)}>
                        <div className="border border-white/10 w-full max-w-2xl rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-full animate-in fade-in zoom-in-95 duration-200" style={{ backgroundColor: colors.bg }} onClick={e => e.stopPropagation()}>
                            <div className="h-40 relative flex items-end p-6 overflow-hidden"><div className="absolute inset-0 bg-gradient-to-t via-black/60 to-transparent z-10" style={{ from: colors.bg }} /><img src={PLACEHOLDER_IMG} className="absolute inset-0 w-full h-full object-cover opacity-40 blur-sm" /><div className="z-20 relative flex gap-4 items-end w-full"><img src={PLACEHOLDER_IMG} className="w-20 h-20 rounded-xl object-cover border-2 border-white/10 shadow-lg bg-zinc-800" /><div className="flex-1 overflow-hidden pb-1"><h1 className="text-2xl font-bold text-white leading-tight shadow-sm truncate">{selectedScript.title}</h1></div></div><button onClick={() => setSelectedScript(null)} className="absolute top-4 right-4 p-2 bg-black/50 backdrop-blur-md rounded-full hover:bg-white/20 text-white z-30 transition-colors"><X size={18} /></button></div>
                            <div className="p-6 flex-1 overflow-hidden flex flex-col"><div className="flex-1 border border-white/5 rounded-xl p-4 font-mono text-xs overflow-auto relative group custom-scrollbar shadow-inner" style={{ backgroundColor: colors.sidebar, color: colors.text }}><pre className="whitespace-pre-wrap">{selectedScript.script}</pre><button className="absolute top-2 right-2 p-2 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-all hover:scale-105 flex items-center gap-2 text-xs font-bold shadow-lg" style={{ backgroundColor: colors.button }} onClick={() => { navigator.clipboard.writeText(selectedScript.script); addLog("Copied to clipboard", "success") }}><Copy size={14} /> Copy Code</button></div><div className="mt-6 flex gap-3"><button onClick={() => handleExecuteScript(selectedScript.script, selectedScript.title)} className="flex-1 text-white py-3 rounded-xl font-bold text-sm transition-all hover:scale-[1.02] flex items-center justify-center gap-2 shadow-lg" style={{ backgroundColor: colors.button }}><Play size={16} fill="currentColor" /> Execute Script</button></div></div>
                        </div>
                    </div>
                )}
            </div>
        )}
      </div>

      {isSettingsOpen && <SettingsModal onClose={() => setIsSettingsOpen(false)} settings={settings} onUpdate={updateSetting} colors={colors} />}
      {saveModal.open && <SaveFileModal onClose={() => setSaveModal({ open: false, fileId: null })} onConfirm={confirmSave} currentName={files.find(f => f.id === saveModal.fileId)?.name} colors={colors} />}
      
      <div className="h-7 backdrop-blur-md border-t border-white/5 flex items-center px-3 text-[11px] justify-between select-none z-40" style={{ backgroundColor: `${colors.bg}dd`, color: colors.text }}>
         <div className="flex gap-4"><span className={`flex items-center gap-2`}><div className={`w-2 h-2 rounded-full ${isAttached ? 'animate-pulse' : ''}`} style={{ backgroundColor: isAttached ? colors.accent : '#ef4444' }} />{isAttached ? 'Attached' : 'Unattached'}</span></div>
         <div className={`flex gap-2 cursor-pointer px-2 py-0.5 rounded transition-colors hover:bg-white/5`} onClick={() => setIsTerminalOpen(!isTerminalOpen)}><span className="font-semibold">Terminal</span></div>
      </div>
    </div>
  )
}

// --- HELPER COMPONENTS ---
function SaveFileModal({ onClose, onConfirm, currentName, colors }) { const [name, setName] = useState(currentName); const [folder, setFolder] = useState('scripts'); return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}><div className="w-[400px] p-6 border border-white/10 rounded-xl shadow-2xl flex flex-col gap-4 backdrop-blur-xl" style={{ backgroundColor: `${colors.bg}ee` }} onClick={(e) => e.stopPropagation()}><h2 className="text-lg font-bold" style={{ color: colors.text }}>Save File</h2><div><label className="text-xs font-medium opacity-70 block mb-1" style={{ color: colors.text }}>Filename</label><input autoFocus value={name} onChange={(e) => setName(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-white/10 text-sm focus:outline-none focus:border-opacity-50" style={{ backgroundColor: `${colors.sidebar}80`, color: colors.text, borderColor: colors.accent }} /></div><div><label className="text-xs font-medium opacity-70 block mb-1" style={{ color: colors.text }}>Folder</label><div className="grid grid-cols-2 gap-2"><div onClick={() => setFolder('scripts')} className={`px-3 py-2 rounded-lg border cursor-pointer flex items-center gap-2 text-sm transition-all ${folder === 'scripts' ? 'opacity-100' : 'opacity-50'}`} style={{ backgroundColor: folder === 'scripts' ? `${colors.accent}20` : 'transparent', borderColor: folder === 'scripts' ? colors.accent : 'transparent', color: colors.text }}><Folder size={14} /> Scripts</div><div onClick={() => setFolder('root')} className={`px-3 py-2 rounded-lg border cursor-pointer flex items-center gap-2 text-sm transition-all ${folder === 'root' ? 'opacity-100' : 'opacity-50'}`} style={{ backgroundColor: folder === 'root' ? `${colors.accent}20` : 'transparent', borderColor: folder === 'root' ? colors.accent : 'transparent', color: colors.text }}><Files size={14} /> Root</div></div></div><button onClick={() => onConfirm(name, folder)} className="w-full py-2.5 rounded-lg font-bold text-sm transition-all hover:opacity-90 mt-2" style={{ backgroundColor: colors.button, color: '#fff' }}>Save File</button></div></div> }
function TooltipButton({ icon, onClick, title, hoverColor, colors }) { return <button onClick={onClick} title={title} className={`p-2 rounded-full transition-all duration-200 hover:bg-white/10 hover:scale-110 ${hoverColor || ''}`} style={{ color: colors.text }}>{icon}</button> }
function TitleBar({ isAttached, onAttach, colors }) { return <div className="h-8 flex items-center justify-between select-none border-b border-white/5 pl-2" style={{ backgroundColor: colors.bg, WebkitAppRegion: 'drag' }}><div className="flex items-center gap-3"><button onClick={onAttach} className={`p-1 rounded hover:bg-white/10 transition-colors`} style={{ color: isAttached ? colors.accent : '#ef4444', WebkitAppRegion: 'no-drag' }} title={isAttached ? "Attached to process" : "Click to Attach"}>{isAttached ? <Link size={14} /> : <Unlink size={14} />}</button><div className="text-[11px] font-medium tracking-wide" style={{ color: colors.text }}>Luminos</div></div><div className="flex h-full" style={{ WebkitAppRegion: 'no-drag' }}><WindowButton icon={<Minus size={14} />} onClick={() => window.api.minimize()} colors={colors} /><WindowButton icon={<Square size={10} />} onClick={() => window.api.maximize()} colors={colors} /><WindowButton icon={<X size={14} />} onClick={() => window.api.close()} isClose colors={colors} /></div></div> }
function DraggableTerminal({ onClose, logs, colors, settings }) { const [position, setPosition] = useState({ x: 20, y: -220 }); const [isDragging, setIsDragging] = useState(false); const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 }); const [isMaximized, setIsMaximized] = useState(false); const terminalRef = useRef(null); const logsEndRef = useRef(null); useEffect(() => { logsEndRef.current?.scrollIntoView({ behavior: "smooth" }) }, [logs]); const handleMouseDown = (e) => { if (isMaximized) return; setIsDragging(true); const rect = terminalRef.current.getBoundingClientRect(); setDragOffset({ x: e.clientX - rect.left, y: e.clientY - rect.top }) }; useEffect(() => { const handleMouseMove = (e) => { if (isDragging) { setPosition({ x: e.clientX - dragOffset.x, y: e.clientY - dragOffset.y }) } }; const handleMouseUp = () => setIsDragging(false); if (isDragging) { document.addEventListener('mousemove', handleMouseMove); document.addEventListener('mouseup', handleMouseUp) } return () => { document.removeEventListener('mousemove', handleMouseMove); document.removeEventListener('mouseup', handleMouseUp) } }, [isDragging, dragOffset]); const style = isMaximized ? { inset: 0, width: '100%', height: '100%', borderRadius: 0 } : { left: position.x, bottom: 60, width: 500, height: 200 }; const bgColor = `${colors.bg}ee`; return <div ref={terminalRef} style={{...style, backgroundColor: bgColor}} className="absolute backdrop-blur-xl border border-white/10 shadow-2xl flex flex-col overflow-hidden z-50 rounded-lg"><div className="h-8 flex items-center justify-between px-3 border-b border-white/5 select-none cursor-move" style={{ backgroundColor: `${colors.sidebar}50` }} onMouseDown={handleMouseDown}><span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: colors.text }}>Terminal</span><div className="flex gap-2 opacity-50"><button onClick={() => setIsMaximized(!isMaximized)}><Square size={10} /></button><button onClick={onClose}><X size={14} /></button></div></div><div className="flex-1 p-3 font-mono text-xs overflow-y-auto" style={{ color: colors.text }}>{logs.map((log, i) => (<div key={i} className="mb-1 flex gap-2"><span className="opacity-30">[{log.time}]</span><span style={{ color: log.type === 'error' ? '#ef4444' : log.type === 'success' ? colors.accent : colors.text }}>{log.text}</span></div>))}<div ref={logsEndRef} /></div></div> }
function SettingsModal({ onClose, settings, onUpdate, colors }) { const [activeTab, setActiveTab] = useState('general'); const modalBg = colors.bg; return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}><div className="w-[700px] h-[500px] border border-white/10 rounded-xl shadow-2xl flex overflow-hidden flex-col md:flex-row backdrop-blur-md" style={{ backgroundColor: modalBg }} onClick={(e) => e.stopPropagation()}><div className="w-48 border-r border-white/5 p-3 flex flex-col gap-1" style={{ backgroundColor: colors.sidebar }}><div className="text-xs font-bold uppercase tracking-widest mb-3 px-3 mt-2" style={{ color: colors.text, opacity: 0.5 }}>Settings</div><SettingsTab label="General" id="general" active={activeTab} onClick={setActiveTab} colors={colors} /><SettingsTab label="Editor" id="editor" active={activeTab} onClick={setActiveTab} colors={colors} /><SettingsTab label="Themes" id="themes" active={activeTab} onClick={setActiveTab} colors={colors} /></div><div className="flex-1 flex flex-col"><div className="h-14 border-b border-white/5 flex items-center justify-between px-6"><h2 className="text-lg font-medium capitalize" style={{ color: colors.text }}>{activeTab}</h2><button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg transition-colors" style={{ color: colors.text }}><X size={18} /></button></div><div className="flex-1 overflow-y-auto p-6 space-y-6">{activeTab === 'general' && (<><SettingToggle label="Auto Save" desc="Automatically save files after a delay." checked={settings.autoSave} onChange={(val) => onUpdate('autoSave', val)} colors={colors} /><SettingToggle label="Acrylic Blur" desc="Enable background transparency for other themes." checked={settings.acrylicBlur} onChange={(val) => onUpdate('acrylicBlur', val)} colors={colors} /></>)} {activeTab === 'editor' && (<><SettingInput label="Font Size" value={settings.fontSize} onChange={(e) => onUpdate('fontSize', e.target.value)} colors={colors} /><SettingToggle label="Line Numbers" desc="Show gutter numbers." checked={settings.showLineNumbers} onChange={(val) => onUpdate('showLineNumbers', val)} colors={colors} /></>)} {activeTab === 'themes' && (<div className="grid grid-cols-2 gap-3">{Object.entries(THEMES).map(([key, t]) => (<div key={key} onClick={() => onUpdate('theme', key)} className={`p-3 rounded-xl border cursor-pointer flex items-center justify-between transition-all`} style={{ backgroundColor: settings.theme === key ? `${colors.accent}20` : 'rgba(255,255,255,0.05)', borderColor: settings.theme === key ? colors.accent : 'transparent' }}><div className="flex items-center gap-3"><div className="w-6 h-6 rounded-full border border-white/10" style={{ backgroundColor: t.bg }}></div><span className="text-sm font-medium" style={{ color: colors.text }}>{t.name}</span></div>{settings.theme === key && <Check size={16} style={{ color: colors.accent }} />}</div>))}</div>)}</div></div></div></div> }
function WindowButton({ icon, onClick, isClose, colors }) { return <button onClick={onClick} className={`w-10 h-full flex items-center justify-center transition-colors hover:bg-white/10`} style={{ color: colors.text }}>{icon}</button> }
function ActivityIcon({ icon: Icon, id, active, onClick, colors }) { return <div onClick={() => onClick(id)} className={`p-2 rounded-lg cursor-pointer transition-all duration-200`} style={{ color: active === id ? '#fff' : colors.text, backgroundColor: active === id ? colors.button : 'transparent', opacity: active === id ? 1 : 0.6 }}><Icon size={20} strokeWidth={1.5} /></div> }
function FolderItem({ name, isOpen, children, onClick, indent = 0, isRoot, colors }) { return <div><div onClick={onClick} className={`flex items-center gap-2 py-1 cursor-pointer hover:bg-white/5 select-none transition-colors`} style={{ paddingLeft: indent * 12 + 8, color: colors.text }}><ChevronRight size={14} className={`transition-transform duration-200 ${isOpen ? 'rotate-90' : ''}`} /><span className={`text-[13px] ${isRoot ? 'font-bold' : ''}`}>{name}</span></div>{isOpen && children}</div> }
function FileItem({ file, indent, active, onClick, isRenaming, onRename, setRenamingId, colors }) { const [tempName, setTempName] = useState(file.name); const inputRef = useRef(null); useEffect(() => { if (isRenaming && inputRef.current) { inputRef.current.focus(); inputRef.current.select(); } }, [isRenaming]); const finishRename = () => { onRename(file.id, tempName) }; return <div onClick={onClick} onDoubleClick={(e) => { e.stopPropagation(); setRenamingId(file.id); }} className={`flex items-center gap-2 py-1 cursor-pointer select-none transition-all duration-200 border-l-2`} style={{ paddingLeft: indent * 12 + 10, borderColor: active ? colors.accent : 'transparent', backgroundColor: active ? `${colors.accent}10` : 'transparent', color: active ? '#fff' : colors.text }}>{isRenaming ? (<input ref={inputRef} className="bg-transparent border outline-none w-full mr-2 px-1 rounded" style={{ borderColor: colors.accent, color: colors.text }} value={tempName} onChange={(e) => setTempName(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') finishRename() }} onBlur={finishRename} onClick={(e) => e.stopPropagation()}/>) : (<span className="text-[13px] truncate">{file.name}</span>)}</div> }
function Tab({ file, active, onClick, onClose, isRenaming, onRename, setRenamingId, colors, settings }) { const [tempName, setTempName] = useState(file.name); const inputRef = useRef(null); useEffect(() => { if (isRenaming && inputRef.current) { inputRef.current.focus(); inputRef.current.select(); } }, [isRenaming]); const finishRename = () => { onRename(file.id, tempName) }; return <div onClick={onClick} onDoubleClick={(e) => { e.stopPropagation(); setRenamingId(file.id); }} className={`px-4 min-w-[120px] max-w-[200px] h-full flex items-center gap-2 text-xs cursor-pointer select-none border-r border-white/5 transition-colors flex-shrink-0 group`} style={{ backgroundColor: active ? (settings.theme === 'acrylic' ? 'rgba(0,0,0,0.2)' : colors.bg) : (settings.theme === 'acrylic' ? 'rgba(0,0,0,0)' : colors.sidebar), borderTop: active ? `2px solid ${colors.accent}` : '2px solid transparent', color: colors.text }}><span style={{ color: active ? colors.accent : colors.text, opacity: 0.7 }}>{file.name.endsWith('lua') ? 'Lua' : 'File'}</span>{isRenaming ? (<input ref={inputRef} className="bg-transparent border outline-none w-24 px-1 rounded" style={{ borderColor: colors.accent, color: colors.text }} value={tempName} onChange={(e) => setTempName(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') finishRename() }} onBlur={finishRename} onClick={(e) => e.stopPropagation()}/>) : (<span className="truncate">{file.name}</span>)}<div onClick={onClose} className={`ml-auto p-0.5 rounded hover:bg-white/20 ${active ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}><X size={12} /></div></div> }
function SettingsTab({ label, id, active, onClick, colors }) { return <button onClick={() => onClick(id)} className={`text-left px-3 py-2 rounded-lg text-sm font-medium transition-all`} style={{ backgroundColor: active === id ? `${colors.accent}15` : 'transparent', color: active === id ? colors.accent : colors.text }}>{label}</button> }
function SettingToggle({ label, desc, checked, onChange, colors }) { return <div className="flex items-center justify-between group"><div><div className="text-sm font-medium" style={{ color: colors.text }}>{label}</div>{desc && <div className="text-xs mt-0.5 opacity-60" style={{ color: colors.text }}>{desc}</div>}</div><div onClick={() => onChange(!checked)} className={`w-10 h-5 rounded-full relative cursor-pointer transition-colors`} style={{ backgroundColor: checked ? colors.button : `${colors.text}30` }}><div className={`absolute top-1 left-1 w-3 h-3 bg-white rounded-full transition-transform ${checked ? 'translate-x-5' : 'translate-x-0'}`} /></div></div> }
function SettingInput({ label, value, onChange, colors }) { return <div><div className="text-sm font-medium mb-2" style={{ color: colors.text }}>{label}</div><input type="number" value={value} onChange={onChange} className="w-full border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none transition-colors" style={{ backgroundColor: `${colors.bg}50`, color: colors.text, borderColor: `${colors.accent}50` }} /></div> }