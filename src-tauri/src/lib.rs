use notify::{Config, RecommendedWatcher, RecursiveMode, Watcher};
use std::process::Command;
use std::sync::mpsc::channel;
use std::sync::Mutex;
use std::time::Duration;
use tauri::Emitter;

#[derive(Default)]
struct AppState {
    #[allow(dead_code)]
    selected_folder: Mutex<Option<String>>,
    file_watcher: Mutex<Option<RecommendedWatcher>>,
}

/// フォルダ選択ダイアログを開いてフォルダパスを返す
/// 現在はカレントディレクトリを返すデフォルト実装
#[tauri::command]
fn select_folder() -> Result<String, String> {
    use std::env;
    // Return a default folder path for now
    // In production, this would use the dialog plugin
    Ok(env::current_dir().unwrap().to_string_lossy().to_string())
}

/// 指定されたフォルダパスからtodo.mdファイルを読み込む
/// ファイルが存在しない場合は、デフォルトのレーン構造を持つ新しいファイルを作成する
///
/// # Arguments
/// * `folder_path` - todo.mdファイルが格納されているフォルダのパス
///
/// # Returns
/// * `Ok(String)` - ファイルの内容
/// * `Err(String)` - エラーメッセージ
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

    fs::read_to_string(todo_path).map_err(|e| e.to_string())
}

/// todo.mdファイルに内容を書き込む
///
/// # Arguments
/// * `folder_path` - todo.mdファイルが格納されているフォルダのパス
/// * `content` - 書き込む内容
///
/// # Returns
/// * `Ok(())` - 成功
/// * `Err(String)` - エラーメッセージ
#[tauri::command]
fn write_todo_file(folder_path: String, content: String) -> Result<(), String> {
    use std::fs;
    use std::path::Path;

    let todo_path = Path::new(&folder_path).join("todo.md");
    fs::write(todo_path, content).map_err(|e| e.to_string())
}

/// automation.mdファイルを読み込む
/// ファイルが存在しない場合は空文字列を返す
///
/// # Arguments
/// * `folder_path` - automation.mdファイルが格納されているフォルダのパス
///
/// # Returns
/// * `Ok(String)` - ファイルの内容（存在しない場合は空文字列）
/// * `Err(String)` - エラーメッセージ
#[tauri::command]
fn read_automation_file(folder_path: String) -> Result<String, String> {
    use std::fs;
    use std::path::Path;

    let automation_path = Path::new(&folder_path).join("automation.md");

    if !automation_path.exists() {
        return Ok(String::new());
    }

    fs::read_to_string(automation_path).map_err(|e| e.to_string())
}

/// todo.mdファイルの変更を監視するウォッチャーを開始する
/// ファイルが変更されたときに"file-changed"イベントをフロントエンドに送信する
///
/// # Arguments
/// * `app_handle` - Tauriアプリケーションハンドル
/// * `state` - アプリケーション状態
/// * `folder_path` - 監視するtodo.mdファイルがあるフォルダのパス
///
/// # Returns
/// * `Ok(())` - 成功
/// * `Err(String)` - エラーメッセージ
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
        Config::default().with_poll_interval(Duration::from_secs(1)),
    )
    .map_err(|e| e.to_string())?;

    // Add a path to be watched
    watcher
        .watch(&todo_path, RecursiveMode::NonRecursive)
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

/// ファイルウォッチャーを停止する
///
/// # Arguments
/// * `state` - アプリケーション状態
///
/// # Returns
/// * `Ok(())` - 成功
/// * `Err(String)` - エラーメッセージ
#[tauri::command]
fn stop_file_watcher(state: tauri::State<AppState>) -> Result<(), String> {
    let mut file_watcher = state.file_watcher.lock().unwrap();
    *file_watcher = None;
    Ok(())
}

/// TODOアイテムに関連するノートファイルを作成する
/// ファイルが既に存在する場合は作成せず、既存のファイルパスを返す
///
/// # Arguments
/// * `folder_path` - ノートファイルを作成するベースフォルダのパス
/// * `todo_text` - TODOアイテムのテキスト（ファイル名に使用）
///
/// # Returns
/// * `Ok(String)` - 作成または既存のノートファイルの相対パス
/// * `Err(String)` - エラーメッセージ
#[tauri::command]
fn create_note_file(folder_path: String, todo_text: String) -> Result<String, String> {
    use chrono::Local;
    use std::fs;
    use std::path::Path;

    // Create notes directory if it doesn't exist
    let notes_dir = Path::new(&folder_path).join("notes");
    if !notes_dir.exists() {
        fs::create_dir(&notes_dir).map_err(|e| e.to_string())?;
    }

    // Sanitize todo text for filename
    let safe_text = todo_text
        .chars()
        .filter(|c| c.is_alphanumeric() || c.is_whitespace() || *c == '-' || *c == '_')
        .collect::<String>()
        .trim()
        .replace(' ', "_");

    // Create filename without date
    let filename = format!("{}.md", safe_text);
    let file_path = notes_dir.join(&filename);

    // Create the file with initial content if it doesn't exist
    if !file_path.exists() {
        let content = format!(
            "# {}\n\nCreated: {}\n\n## Notes\n\n",
            todo_text,
            Local::now().format("%Y-%m-%d %H:%M:%S")
        );
        fs::write(&file_path, content).map_err(|e| e.to_string())?;
    }

    // Return relative path from folder_path
    Ok(format!("notes/{}", filename))
}

/// 指定されたノートファイルをObsidianで開く
/// プラットフォーム固有のコマンドを使用してObsidian URIスキームを起動する
///
/// # Arguments
/// * `folder_path` - ベースフォルダのパス
/// * `note_path` - ノートファイルの相対パス
///
/// # Returns
/// * `Ok(())` - 成功
/// * `Err(String)` - エラーメッセージ
#[tauri::command]
fn open_in_obsidian(folder_path: String, note_path: String) -> Result<(), String> {
    use std::path::Path;

    let full_path = Path::new(&folder_path).join(&note_path);
    let full_path_str = full_path.to_string_lossy();

    // Create Obsidian URI
    let obsidian_uri = format!(
        "obsidian://open?path={}",
        urlencoding::encode(&full_path_str)
    );

    // Open the URI based on the platform
    #[cfg(target_os = "macos")]
    {
        Command::new("open")
            .arg(&obsidian_uri)
            .spawn()
            .map_err(|e| e.to_string())?;
    }

    #[cfg(target_os = "windows")]
    {
        Command::new("cmd")
            .args(&["/C", "start", "", &obsidian_uri])
            .spawn()
            .map_err(|e| e.to_string())?;
    }

    #[cfg(target_os = "linux")]
    {
        Command::new("xdg-open")
            .arg(&obsidian_uri)
            .spawn()
            .map_err(|e| e.to_string())?;
    }

    Ok(())
}

/// アーカイブファイルを作成して内容を書き込む
/// 完了したTODOアイテムをアーカイブするために使用される
///
/// # Arguments
/// * `folder_path` - アーカイブファイルを作成するフォルダのパス
/// * `file_name` - アーカイブファイル名
/// * `content` - アーカイブファイルの内容
///
/// # Returns
/// * `Ok(())` - 成功
/// * `Err(String)` - エラーメッセージ
#[tauri::command]
fn write_archive_file(
    folder_path: String,
    file_name: String,
    content: String,
) -> Result<(), String> {
    use std::fs;
    use std::path::Path;

    let archive_path = Path::new(&folder_path).join(&file_name);
    fs::write(archive_path, content).map_err(|e| e.to_string())
}

/// Tauriアプリケーションのエントリポイント
/// アプリケーションを初期化し、すべてのコマンドハンドラーを登録する
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
            stop_file_watcher,
            create_note_file,
            open_in_obsidian,
            write_archive_file
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
