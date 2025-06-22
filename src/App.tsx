import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import { listen } from "@tauri-apps/api/event";
import { KanbanBoard } from "./components/KanbanBoard";
import { Analytics } from "./components/Analytics";
import { KanbanData } from "./types";
import { parseMarkdown } from "./utils/markdownParser";
import { FolderOpen, BarChart3 } from "lucide-react";
import "./App.css";

function App() {
  const [folderPath, setFolderPath] = useState<string>("");
  const [kanbanData, setKanbanData] = useState<KanbanData | null>(null);
  const [loading, setLoading] = useState(false);
  const [isInternalChange, setIsInternalChange] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);

  useEffect(() => {
    // Auto-load from current directory on startup
    loadFromCurrentDirectory();
  }, []);

  useEffect(() => {
    let unlisten: (() => void) | undefined;
    let reloadTimeout: number | undefined;

    const setupFileWatcher = async () => {
      if (folderPath) {
        // Start file watcher
        try {
          await invoke("start_file_watcher", { folderPath });

          // Listen for file change events
          unlisten = await listen("file-changed", async () => {
            // Skip if this was an internal change
            if (isInternalChange) {
              // Reset flag after a delay to ensure all file writes are complete
              setTimeout(() => setIsInternalChange(false), 1000);
              return;
            }

            // Debounce file reloads
            if (reloadTimeout) {
              clearTimeout(reloadTimeout);
            }

            reloadTimeout = setTimeout(async () => {
              console.log("File changed externally, reloading...");
              await loadFolderData(folderPath);
            }, 1000); // Wait 1000ms before reloading
          });
        } catch (error) {
          console.error("Failed to start file watcher:", error);
        }
      }
    };

    setupFileWatcher();

    // Cleanup function
    return () => {
      if (unlisten) {
        unlisten();
      }
      if (reloadTimeout) {
        clearTimeout(reloadTimeout);
      }
      if (folderPath) {
        invoke("stop_file_watcher").catch(console.error);
      }
    };
  }, [folderPath, isInternalChange]);

  const loadFromCurrentDirectory = async () => {
    try {
      setLoading(true);
      const path = await invoke<string>("select_folder");
      await loadFolderData(path);
    } catch (error) {
      console.error("Failed to load folder:", error);
    } finally {
      setLoading(false);
    }
  };

  const selectAndLoadFolder = async () => {
    try {
      setLoading(true);

      // Open folder selection dialog
      const selected = await open({
        directory: true,
        multiple: false,
        title: 'Select folder containing todo.md'
      });

      if (selected && typeof selected === 'string') {
        await loadFolderData(selected);
      }
    } catch (error) {
      console.error("Failed to select folder:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadFolderData = async (path: string) => {
    setFolderPath(path);

    const todoContent = await invoke<string>("read_todo_file", { folderPath: path });
    const automationContent = await invoke<string>("read_automation_file", { folderPath: path });

    const data = parseMarkdown(todoContent);

    // Parse automation file if exists
    if (automationContent) {
      const automationLines = automationContent.split('\n');
      automationLines.forEach(line => {
        const match = line.match(/^(\S+):(\S+):\[(.*)\]$/);
        if (match) {
          const [, type, lane, todosStr] = match;
          const todos = todosStr.split(',').map(t => t.trim()).filter(t => t);
          data.automations.push({ type, lane, todos });
        }
      });
    }

    setKanbanData(data);
  };

  const handleDataChange = (data: KanbanData) => {
    setIsInternalChange(true);
    setKanbanData(data);
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading...</p>
      </div>
    );
  }

  if (!kanbanData) {
    return (
      <div className="welcome-container">
        <h1>Todo Kanban</h1>
        <p>Manage your todos in Kanban style with markdown files</p>
        <button onClick={selectAndLoadFolder} className="select-folder-btn">
          <FolderOpen size={20} />
          Select Folder
        </button>
      </div>
    );
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>Todo Kanban</h1>
        <div className="header-info">
          <span>{folderPath}</span>
          <button onClick={() => setShowAnalytics(!showAnalytics)} className="analytics-btn" title="分析を表示">
            <BarChart3 size={16} />
          </button>
          <button onClick={selectAndLoadFolder} className="folder-btn">
            <FolderOpen size={16} />
          </button>
        </div>
      </header>

      <main className="app-main">
        {showAnalytics ? (
          <Analytics data={kanbanData} onClose={() => setShowAnalytics(false)} />
        ) : (
          <KanbanBoard
            data={kanbanData}
            folderPath={folderPath}
            onDataChange={handleDataChange}
          />
        )}
      </main>
    </div>
  );
}

export default App;