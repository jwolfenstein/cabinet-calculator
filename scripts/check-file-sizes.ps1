Get-ChildItem -Path "src" -Include *.ts,*.tsx -Recurse |
  ForEach-Object {
    $lines = (Get-Content $_.FullName -Raw).Split("`n").Count
    if ($lines -gt 500) {
      "{0} : {1} lines" -f $_.FullName, $lines
    }
  }
