use std::sync::Mutex;
use notify::{RecommendedWatcher, RecursiveMode, Watcher, Config};
use std::sync::mpsc::channel;
use std::time::Duration;
use tauri::Emitter;

#[derive(Default)]
struct AppState {
    #[allow(dead_code)]
    selected_folder: Mutex<Option<String>>,
    file_watcher: Mutex<Option<RecommendedWatcher>>,
}

#[tauri::command]
fn select_folder() -> Result<String, String> {
    use std::env;
    // Return a default folder path for now
    // In production, this would use the dialog plugin
    Ok(env::current_dir().unwrap().to_string_lossy().to_string())
}

#[tauri::command]
fn read_todo_file(folder_path: String) -> Result<String, String> {
    use std::fs;
    use std::path::Path;
    
    let todo_path = Path::new(&folder_path).join("todo.md");
    
    if !todo_path.exists() {
        // Create empty todo.md if it doesn't exist
        fs::write(&todo_path, "## IceBox\n\n## Todo\n\n## Doing\n\n## Pending\n\n## Done\n\n## Reject\n\n## Archive\n")
            .map_err(|e| e.to_string())?;
    }
    
    fs::read_to_string(todo_path)
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn write_todo_file(folder_path: String, content: String) -> Result<(), String> {
    use std::fs;
    use std::path::Path;
    
    let todo_path = Path::new(&folder_path).join("todo.md");
    fs::write(todo_path, content)
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn read_automation_file(folder_path: String) -> Result<String, String> {
    use std::fs;
    use std::path::Path;
    
    let automation_path = Path::new(&folder_path).join("automation.md");
    
    if !automation_path.exists() {
        return Ok(String::new());
    }
    
    fs::read_to_string(automation_path)
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn start_file_watcher(
    app_handle: tauri::AppHandle,
    state: tauri::State<AppState>,
    folder_path: String,
) -> Result<(), String> {
    use std::path::Path;
    
    let todo_path = Path::new(&folder_path).join("todo.md");
    
    // Create a channel to receive the events
    let (tx, rx) = channel();
    
    // Create a watcher object, delivering debounced events
    let mut watcher = RecommendedWatcher::new(
        tx,
        Config::default().with_poll_interval(Duration::from_secs(1))
    ).map_err(|e| e.to_string())?;
    
    // Add a path to be watched
    watcher.watch(&todo_path, RecursiveMode::NonRecursive)
        .map_err(|e| e.to_string())?;
    
    // Spawn a thread to handle file change events
    let app_handle_clone = app_handle.clone();
    std::thread::spawn(move || {
        for res in rx {
            match res {
                Ok(event) => {
                    // Check if the event is a modification
                    if event.kind.is_modify() {
                        // Emit an event to the frontend
                        app_handle_clone.emit("file-changed", ()).unwrap();
                    }
                }
                Err(e) => println!("watch error: {:?}", e),
            }
        }
    });
    
    // Store the watcher in the app state
    let mut file_watcher = state.file_watcher.lock().unwrap();
    *file_watcher = Some(watcher);
    
    Ok(())
}

#[tauri::command]
fn stop_file_watcher(state: tauri::State<AppState>) -> Result<(), String> {
    let mut file_watcher = state.file_watcher.lock().unwrap();
    *file_watcher = None;
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .manage(AppState::default())
        .invoke_handler(tauri::generate_handler![
            select_folder,
            read_todo_file,
            write_todo_file,
            read_automation_file,
            start_file_watcher,
            stop_file_watcher
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
