param(
  [string]$InputMd  = "C:\Users\JANE EBERE\Desktop\CashTraka\PROCESS-FLOW.md",
  [string]$OutDocx  = "C:\Users\JANE EBERE\Desktop\CashTraka\PROCESS-FLOW.docx"
)

$ErrorActionPreference = "Stop"

# ── Read markdown ────────────────────────────────────────────────────────
$md = Get-Content -Path $InputMd -Raw

# ── Markdown → HTML (handles the subset our file uses) ───────────────────
function ConvertTo-Html([string]$src) {
  $lines = $src -split "`r?`n"
  $out   = New-Object System.Text.StringBuilder
  $i     = 0
  $inCode = $false
  $inUL   = $false
  $inOL   = $false

  function CloseLists {
    param([System.Text.StringBuilder]$o, [ref]$inUL, [ref]$inOL)
    if ($inUL.Value) { [void]$o.AppendLine("</ul>"); $inUL.Value = $false }
    if ($inOL.Value) { [void]$o.AppendLine("</ol>"); $inOL.Value = $false }
  }

  function EscapeHtml([string]$s) {
    return ($s -replace '&', '&amp;') -replace '<', '&lt;' -replace '>', '&gt;'
  }

  function InlineFormat([string]$s) {
    # Escape HTML first
    $s = EscapeHtml $s
    # Bold **text**
    $s = [regex]::Replace($s, '\*\*([^*]+)\*\*', '<strong>$1</strong>')
    # Inline code `code`
    $s = [regex]::Replace($s, '`([^`]+)`', '<code>$1</code>')
    # Links [text](url)
    $s = [regex]::Replace($s, '\[([^\]]+)\]\(([^\)]+)\)', '<a href="$2">$1</a>')
    return $s
  }

  $tableRows  = New-Object System.Collections.ArrayList
  $inTable    = $false
  $tableHead  = $null

  while ($i -lt $lines.Length) {
    $line = $lines[$i]

    # Fenced code block toggle
    if ($line -match '^```') {
      if (-not $inCode) {
        CloseLists $out ([ref]$inUL) ([ref]$inOL)
        [void]$out.AppendLine('<pre class="code">')
        $inCode = $true
      } else {
        [void]$out.AppendLine('</pre>')
        $inCode = $false
      }
      $i++; continue
    }

    if ($inCode) {
      [void]$out.AppendLine((EscapeHtml $line))
      $i++; continue
    }

    # Tables — header row | separator | rows
    if ($line -match '^\s*\|' -and -not $inTable -and ($i + 1) -lt $lines.Length -and $lines[$i + 1] -match '^\s*\|[\s\-\|:]+\|\s*$') {
      CloseLists $out ([ref]$inUL) ([ref]$inOL)
      $inTable   = $true
      $tableHead = ($line.Trim().Trim('|') -split '\|') | ForEach-Object { $_.Trim() }
      [void]$out.AppendLine('<table>')
      [void]$out.Append('<thead><tr>')
      foreach ($h in $tableHead) {
        [void]$out.Append('<th>' + (InlineFormat $h) + '</th>')
      }
      [void]$out.AppendLine('</tr></thead>')
      [void]$out.AppendLine('<tbody>')
      $i += 2  # skip header + separator
      continue
    }

    if ($inTable) {
      if ($line -match '^\s*\|') {
        $cells = ($line.Trim().Trim('|') -split '\|') | ForEach-Object { $_.Trim() }
        [void]$out.Append('<tr>')
        foreach ($c in $cells) {
          [void]$out.Append('<td>' + (InlineFormat $c) + '</td>')
        }
        [void]$out.AppendLine('</tr>')
        $i++; continue
      } else {
        [void]$out.AppendLine('</tbody></table>')
        $inTable = $false
        # fall through — don't skip this line
      }
    }

    # Headings
    if ($line -match '^(#{1,6})\s+(.+)$') {
      CloseLists $out ([ref]$inUL) ([ref]$inOL)
      $level = $matches[1].Length
      $text  = InlineFormat $matches[2]
      [void]$out.AppendLine("<h$level>$text</h$level>")
      $i++; continue
    }

    # Horizontal rule
    if ($line -match '^---+\s*$') {
      CloseLists $out ([ref]$inUL) ([ref]$inOL)
      [void]$out.AppendLine('<hr/>')
      $i++; continue
    }

    # Numbered list
    if ($line -match '^\s*(\d+)\.\s+(.+)$') {
      if ($inUL) { [void]$out.AppendLine("</ul>"); $inUL = $false }
      if (-not $inOL) { [void]$out.AppendLine("<ol>"); $inOL = $true }
      [void]$out.AppendLine('<li>' + (InlineFormat $matches[2]) + '</li>')
      $i++; continue
    }

    # Bullet list
    if ($line -match '^\s*-\s+(.+)$') {
      if ($inOL) { [void]$out.AppendLine("</ol>"); $inOL = $false }
      if (-not $inUL) { [void]$out.AppendLine("<ul>"); $inUL = $true }
      [void]$out.AppendLine('<li>' + (InlineFormat $matches[1]) + '</li>')
      $i++; continue
    }

    # Blank line
    if ($line -match '^\s*$') {
      CloseLists $out ([ref]$inUL) ([ref]$inOL)
      $i++; continue
    }

    # Paragraph
    CloseLists $out ([ref]$inUL) ([ref]$inOL)
    [void]$out.AppendLine('<p>' + (InlineFormat $line) + '</p>')
    $i++
  }

  CloseLists $out ([ref]$inUL) ([ref]$inOL)
  if ($inTable) { [void]$out.AppendLine('</tbody></table>') }

  $body = $out.ToString()

  $css = @"
<style>
  body { font-family: Calibri, Arial, sans-serif; font-size: 11pt; color: #1A1A1A; }
  h1   { font-size: 22pt; font-weight: 800; margin: 24pt 0 6pt; color: #0A2540; border-bottom: 2pt solid #00B8E8; padding-bottom: 4pt; }
  h2   { font-size: 16pt; font-weight: 700; margin: 20pt 0 4pt; color: #0A2540; }
  h3   { font-size: 13pt; font-weight: 700; margin: 14pt 0 4pt; color: #0A2540; }
  p    { margin: 6pt 0; line-height: 1.5; }
  ul, ol { margin: 6pt 0 6pt 18pt; }
  li   { margin: 3pt 0; line-height: 1.45; }
  pre.code {
    font-family: 'Consolas', 'Courier New', monospace;
    font-size: 9pt;
    background: #F4F6F8;
    border: 0.5pt solid #D0D7DE;
    padding: 8pt 10pt;
    white-space: pre;
    line-height: 1.25;
  }
  code {
    font-family: 'Consolas', 'Courier New', monospace;
    font-size: 10pt;
    background: #F4F6F8;
    padding: 1pt 4pt;
    border-radius: 2pt;
  }
  table { border-collapse: collapse; margin: 10pt 0; width: 100%; }
  th    { background: #0A2540; color: #FFFFFF; text-align: left; padding: 6pt 8pt; font-weight: 700; font-size: 10pt; }
  td    { border: 0.5pt solid #D0D7DE; padding: 5pt 8pt; font-size: 10pt; vertical-align: top; }
  hr    { border: none; border-top: 0.5pt solid #D0D7DE; margin: 14pt 0; }
  strong { font-weight: 700; }
  a     { color: #00B8E8; text-decoration: none; }
</style>
"@

  return @"
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>CashTraka — Process Flow</title>
$css
</head>
<body>
$body
</body>
</html>
"@
}

$html = ConvertTo-Html $md

# Write HTML to a temp file — Word's HTML import is most reliable from disk
$tmpHtml = Join-Path $env:TEMP ("cashtraka-process-flow-" + [Guid]::NewGuid().ToString("N") + ".html")
[System.IO.File]::WriteAllText($tmpHtml, $html, [System.Text.Encoding]::UTF8)

# ── Open in Word, Save As .docx ───────────────────────────────────────────
$word = New-Object -ComObject Word.Application
$word.Visible = $false
$word.DisplayAlerts = 0  # wdAlertsNone

try {
  $doc = $word.Documents.Open($tmpHtml, $false, $true)  # ReadOnly = true
  # wdFormatDocumentDefault = 16 (modern .docx)
  $doc.SaveAs([ref]$OutDocx, [ref]16)
  $doc.Close($false)
  Write-Output "Saved: $OutDocx"
} finally {
  $word.Quit()
  [System.Runtime.InteropServices.Marshal]::ReleaseComObject($word) | Out-Null
  Remove-Item $tmpHtml -ErrorAction SilentlyContinue
}
