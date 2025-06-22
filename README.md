# Todo Kanban MD / Todo カンバン Markdown

![alt text](<image/CleanShot 2025-06-22 at 09.17.34.png>)

A desktop Kanban board application that uses markdown files for storage, built with Tauri, React, and TypeScript.

マークダウンファイルを使用してデータを保存するデスクトップ向けカンバンボードアプリケーション。Tauri、React、TypeScriptで構築されています。

## Overview / 概要

Todo Kanban MD is a desktop application that provides a visual Kanban board interface for managing tasks stored in markdown files. It combines the simplicity of plain text storage with the convenience of a modern drag-and-drop interface.

Todo Kanban MDは、マークダウンファイルに保存されたタスクを管理するための視覚的なカンバンボードインターフェースを提供するデスクトップアプリケーションです。プレーンテキストストレージのシンプルさと、モダンなドラッグ＆ドロップインターフェースの利便性を組み合わせています。

### Key Features / 主な特徴

- **Markdown-based Storage / マークダウンベースのストレージ**: All data is stored in human-readable markdown files / すべてのデータは人間が読めるマークダウンファイルに保存されます
- **Drag-and-Drop Interface / ドラッグ＆ドロップインターフェース**: Intuitive task management with visual feedback / 視覚的フィードバックによる直感的なタスク管理
- **File Watching / ファイル監視**: Automatically syncs changes made externally / 外部で行われた変更を自動的に同期
- **Rich Metadata Support / 豊富なメタデータサポート**: Deadlines, tags, time tracking, and more / 期限、タグ、時間追跡など

## Current Features / 現在実装されている機能

### 1. Kanban Board Management / カンバンボード管理
- Multiple lanes with drag-and-drop support / ドラッグ＆ドロップ対応の複数レーン
- System lanes: IceBox, Todo, Doing, Pending, Done, Reject, Archive / システムレーン：IceBox、Todo、Doing、Pending、Done、Reject、Archive
- Custom lane creation, renaming, and deletion / カスタムレーンの作成、名前変更、削除
- Business logic for task movement between lanes / レーン間のタスク移動のビジネスロジック

### 2. Task Management / タスク管理
- Create, edit, and delete tasks / タスクの作成、編集、削除
- Double-click to edit task text directly / ダブルクリックでタスクテキストを直接編集
- Interactive tag management / インタラクティブなタグ管理:
  - Click "Add tag" button to add new tags / 「Add tag」ボタンをクリックして新しいタグを追加
  - Click X on tags to remove them / タグのXをクリックして削除
  - Tags are color-coded for easy identification / タグは識別しやすいように色分け表示
- Type management / タイプ管理:
  - Click "Add type" button to set task type / 「Add type」ボタンをクリックしてタスクタイプを設定
  - Double-click existing type to edit / 既存のタイプをダブルクリックして編集
  - Click X to remove type / Xをクリックしてタイプを削除
- Note integration with Obsidian / Obsidianとのノート連携:
  - Click note button to create a note file / ノートボタンをクリックしてノートファイルを作成
  - Note files are saved in `notes/` directory / ノートファイルは`notes/`ディレクトリに保存
  - File naming pattern: `{TaskName}_{Date}.md` / ファイル名パターン：`{タスク名}_{日付}.md`
  - Click link button to open note in Obsidian / リンクボタンをクリックしてObsidianでノートを開く
- Rich metadata support / 豊富なメタデータサポート:
  - Deadlines / 期限: `@YYYYMMDD` (date/日付), `@@hh:mm` (time/時刻)
  - Tags / タグ: `#tagname`
  - Type / タイプ: `$typename`
  - Time tracking / 時間追跡: `[(start,end)]`
  - Status / ステータス: `!timestamp` (done/完了), `!!timestamp` (rejected/却下)
- Automatic time tracking when moving between Doing/Pending / Doing/Pending間移動時の自動時間追跡

### 3. File Integration / ファイル連携
- Read/write markdown files / マークダウンファイルの読み書き
- File watching for external changes / 外部変更のファイル監視
- Automation rules support from automation.md / automation.mdからの自動化ルールサポート

### 4. UI Features / UI機能
- Color-coded tags / 色分けされたタグ
- Visual indicators for deadlines and time spent / 期限と経過時間の視覚的インジケーター
- Drag handle for easy task movement / ドラッグハンドルによる簡単なタスク移動
- Hover tooltips for better user guidance / より良いユーザーガイダンスのためのホバーツールチップ
- Responsive design / レスポンシブデザイン
- Keyboard shortcuts support / キーボードショートカットサポート
  - Cmd+Enter (Mac) or Ctrl+Enter (Windows/Linux) to save, Escape to cancel editing / Cmd+Enter（Mac）またはCtrl+Enter（Windows/Linux）で保存、Escapeで編集キャンセル

## Planned Features / 実装予定の機能

### Near-term / 短期的
- [ ] Search and filter functionality / 検索とフィルター機能
- [ ] Bulk operations on multiple tasks / 複数タスクの一括操作
- [ ] Undo/redo functionality / 元に戻す/やり直し機能

### Long-term / 長期的
- [ ] Advanced automation rules / 高度な自動化ルール
- [ ] Analytics and reporting / 分析とレポート

## Build Instructions / ビルド方法

### Prerequisites / 前提条件

1. Install Node.js (v18 or higher) / Node.js（v18以上）をインストール
2. Install Rust and Cargo / RustとCargoをインストール
3. Install Tauri CLI / Tauri CLIをインストール:
   ```bash
   npm install -g @tauri-apps/cli
   ```

### Development Build / 開発ビルド

```bash
# Install dependencies / 依存関係をインストール
npm install

# Run in development mode / 開発モードで実行
npm run tauri dev
```

### Production Build / プロダクションビルド

```bash
# Build the application / アプリケーションをビルド
npm run tauri build
```

The built application will be in `src-tauri/target/release/bundle/`.

ビルドされたアプリケーションは `src-tauri/target/release/bundle/` にあります。

## File Format / ファイルフォーマット

### todo.md Format / todo.mdフォーマット

The todo.md file uses a specific markdown format to store tasks:

todo.mdファイルは、タスクを保存するために特定のマークダウン形式を使用します：

```markdown
## LaneName
- [ ] Task description @20241225 @@14:30 [(202412251000,202412251100)] !202412251200 #tag1 #tag2 $type
```

#### Format Elements / フォーマット要素:

- `## LaneName`: Lane header / レーンヘッダー
- `- [ ]`: Uncompleted task / 未完了タスク
- `- [x]`: Completed task / 完了タスク
- `@YYYYMMDD`: Deadline date / 期限日
- `@@hh:mm`: Deadline time / 期限時刻
- `[(start,end)]`: Time tracking records / 時間追跡記録
  - Format / 形式: `YYYYMMDDhhmm,YYYYMMDDhhmm`
  - Multiple records supported / 複数記録対応
- `!YYYYMMDDhhmm`: Completion timestamp / 完了タイムスタンプ
- `!!YYYYMMDDhhmm`: Rejection timestamp / 却下タイムスタンプ
- `#tagname`: Tags (multiple allowed) / タグ（複数可）
- `$typename`: Task type / タスクタイプ

### automation.md Format / automation.mdフォーマット

Automation rules are defined in automation.md:

自動化ルールはautomation.mdで定義されます：

```markdown
type:lane:[template1][template2]
```

Example / 例:
```markdown
daily:Todo:[Wake up @tomorrow @@08:00][Exercise @tomorrow @@09:00]
```

## Recommended IDE Setup / 推奨IDE設定

- [VS Code](https://code.visualstudio.com/) + [Tauri](https://marketplace.visualstudio.com/items?itemName=tauri-apps.tauri-vscode) + [rust-analyzer](https://marketplace.visualstudio.com/items?itemName=rust-lang.rust-analyzer)
