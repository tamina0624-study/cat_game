# セキュリティ検査

Windows用の検査環境をプロジェクト内のGit除外済み `work/` に導入済みです。システムPATH・レジストリは変更していません。

- Python公式埋め込み配布 3.12.10
- pre-commit 4.7.0
- Gitleaks 8.24.2（元の設定バージョン）
- uv 0.13.1（取得・依存パッケージ導入用）

## 実行

プロジェクトルートで実行します。

```powershell
./work/python-embed/python.exe 02.src/tools/run_checks.py
```

追跡済みファイルと、Git除外されていない新規ファイルの両方を対象にします。通常の `pre_commit run --all-files` は未追跡ファイルを含みません。Gitのpre-commitフックも有効化済みです。

Gitleaksは渡されたファイルの一時コピーを検査します。秘密値は表示せず、ファイル・行・ルールのみを報告します。検査実行失敗時もコミットを止めます。`.env*`・`.dev.vars*`（`.example`を除く）・`00.secret/` の混入、個人メール、実ユーザーのWindowsパスも検査します。大きなGLB・スクリーンショットはサイズ検査だけの例外で、Gitleaksからは除外しません。

## 独自検知語

`01.doc/security-keywords.example.json` を `00.secret/security-keywords.json` へコピーし、必要な語を配列に追加します。ローカルファイルは作成済みで、現状の配列は空です。具体的な個人名・会社名が指定されていないため、自動追加はしていません。

```json
{"name": [], "email": [], "company": []}
```

文字列を大文字小文字を区別せず部分一致で検査します。設定不正時は失敗として扱います。検知語そのものはログへ出しません。秘密情報や個人名を共有用サンプルへ記載しないでください。

サブモジュール内のkeywords.yamlは使用しません。サブモジュールで `git rm --cached` を実行する必要はありません。元の配布スクリプトはステージ差分だけを読み、キーワード欠落時に検査をスキップするため、ルート側の検査へ置き換えています。GitSecurityTool内のGitleaks設定は引き続き利用します。

## 再構築時

公式配布のuv・Python埋め込み版・Gitleaksをwork配下へ展開し、uvでpre-commitをPythonのLib/site-packagesへ導入します。Pythonのpython312._pthへLib/site-packagesを追加します。その後、次を実行してください。

```powershell
$env:PRE_COMMIT_HOME = Join-Path (Get-Location) 'work/pre-commit-cache'
./work/python-embed/python.exe 02.src/tools/install_checks.py
./work/python-embed/python.exe 02.src/tools/run_checks.py
```

この環境の `py` コマンドは不要です。別OSでは `.pre-commit-config.yaml` の実行パスをその環境のPython・Gitleaksに合わせる必要があります。
