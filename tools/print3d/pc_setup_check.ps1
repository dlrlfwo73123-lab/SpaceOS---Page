<#
 내 PC 적용 점검 스크립트 (읽기 전용: 설치·삭제·수정 없음, 보고서 파일만 생성)
 사용: 저장소 루트에서  powershell -ExecutionPolicy Bypass -File tools\print3d\pc_setup_check.ps1 -BaseSha <전체 40자 SHA>
 결과: print3d-pc-check.md (PASS/FAIL/WARN 표) → 화면 캡처해서 사진 증빙으로 사용
 주의: 이 스크립트는 Windows에서 아직 실행해 보지 못했다(작성 환경에 PowerShell 없음).
#>
param([string]$BaseSha = "")
$ErrorActionPreference = "Continue"
$rows = New-Object System.Collections.Generic.List[object]
function Add-Row($no, $item, $status, $detail) { $rows.Add([pscustomobject]@{ No = $no; Item = $item; Status = $status; Detail = $detail }) }
function Cmd-Version($exe, $arg) { try { (& $exe $arg 2>&1 | Select-Object -First 1) -as [string] } catch { $null } }

# 0/1. 저장소·기준 커밋
$head = (git rev-parse HEAD 2>$null)
if ($head) { Add-Row "1" "git 저장소 인식" "PASS" $head } else { Add-Row "1" "git 저장소 인식" "FAIL" "저장소 루트에서 실행했는지 확인" }
$remote = (git remote get-url origin 2>$null); Add-Row "1" "remote URL" "INFO" "$remote"
if ($BaseSha -match '^[0-9a-f]{40}$') {
  if ($head -eq $BaseSha) { Add-Row "1" "기준 SHA 일치" "PASS" $BaseSha }
  else { Add-Row "1" "기준 SHA 일치" "FAIL" "HEAD=$head / 기준=$BaseSha  (git switch --detach 기준SHA)" }
} else { Add-Row "1" "기준 SHA 일치" "WARN" "-BaseSha 에 소유자가 준 전체 40자 SHA를 넣어야 함" }
$dirty = (git status --short 2>$null); if ($dirty) { Add-Row "1" "작업 트리 상태" "WARN" "미커밋 변경 있음" } else { Add-Row "1" "작업 트리 상태" "PASS" "깨끗함" }

# 1. 데이터 파일(추적 여부) / ignore
foreach ($f in "data/gold/garosugil/page_building_master.geojson","data/gold/garosugil/vacant_floor_units.json") {
  if (git ls-files $f 2>$null) { Add-Row "1" "데이터 추적: $f" "PASS" "clone에 포함됨" } else { Add-Row "1" "데이터 추적: $f" "WARN" "이 저장소에 없음 → 소유자에게 별도 전달 요청" }
}

# 1 (보고서 1장 기준). 대상 저장소·작업 브랜치·clone에서 빠지는 것
if ($remote -match 'seoghyeonbag36-max/spaceos') { Add-Row "1" "대상 저장소(보고서 기준)" "PASS" $remote } else { Add-Row "1" "대상 저장소(보고서 기준)" "FAIL" "보고서는 seoghyeonbag36-max/spaceos 를 가리킴. 현재: $remote" }
$branch = (git branch --show-current 2>$null)
if ($branch -eq "chore/3d-print-poc-worker") { Add-Row "1" "작업 브랜치" "PASS" $branch } else { Add-Row "1" "작업 브랜치" "WARN" "detached 후 git switch -c chore/3d-print-poc-worker (현재: '$branch')" }
foreach ($doc in "AGENTS.md","CLAUDE.md") { if (Test-Path $doc) { Add-Row "1" "$doc 읽기 대상" "PASS" "Get-Content -Encoding UTF8 $doc" } else { Add-Row "1" "$doc" "WARN" "없음" } }
git check-ignore --no-index data/gold/garosugil/page_building_master.geojson 2>$null | Out-Null
$ig = $LASTEXITCODE
if ($ig -eq 1) { Add-Row "1" "gold geojson ignore 여부" "PASS" "무시되지 않음(종료코드 1)" } elseif ($ig -eq 0) { Add-Row "1" "gold geojson ignore 여부" "WARN" "무시됨(종료코드 0): 별도 전달 필요" } else { Add-Row "1" "gold geojson ignore 여부" "WARN" "종료코드 $ig (오류)" }
git check-ignore --no-index model.glb 2>$null | Out-Null
if ($LASTEXITCODE -eq 0) { Add-Row "1" "*.glb ignore" "INFO" "GLB는 무시 대상 → 만든 모델은 clone/배포로 전달 안 됨" }
Add-Row "1" "clone으로 오지 않는 것" "INFO" "바탕화면 참고 PDF, 미커밋 파일, ignore 대상은 소유자에게 별도 전달 받아야 함"
if (Test-Path "scripts/pppp_status.py") { Add-Row "1" "pppp_status.py --all" "INFO" "읽기 전용 확인: ACTIVE_HUBS 개수 보고" }
$gb = @("C:\Program Files\Git\bin\bash.exe","C:\Program Files (x86)\Git\bin\bash.exe") | Where-Object { Test-Path $_ } | Select-Object -First 1
if ($gb) { Add-Row "2" "Git Bash(SessionStart/Bash용)" "PASS" $gb } else { Add-Row "2" "Git Bash(SessionStart/Bash용)" "WARN" "보고서: Windows에서 Git Bash 경로 확인 필요" }
if (Test-Path ".claude/settings.local.json") { Add-Row "6" ".claude/settings.local.json" "INFO" "개인 파일: 복사·전달 금지, 값은 읽지 않음" }

# 2. 도구 설치
$py = Cmd-Version "py" "-3.11 --version"; if (-not $py) { $py = Cmd-Version "python" "--version" }
if ($py -match '3\.11') { Add-Row "2" "Python 3.11" "PASS" $py } else { Add-Row "2" "Python 3.11" "FAIL" "$py (3.11 필요)" }
$gv = Cmd-Version "git" "--version"; if ($gv) { Add-Row "2" "Git" "PASS" $gv } else { Add-Row "2" "Git" "FAIL" "미설치" }
$cc = Cmd-Version "claude" "--version"; if ($cc) { Add-Row "2" "Claude Code" "PASS" $cc } else { Add-Row "2" "Claude Code" "WARN" "미설치 또는 PATH 없음" }
$blender = Get-ChildItem "C:\Program Files\Blender Foundation" -Recurse -Filter blender.exe -ErrorAction SilentlyContinue | Select-Object -First 1
if ($blender) { Add-Row "2" "Blender" "PASS" $blender.FullName } else { Add-Row "2" "Blender" "FAIL" "winget install BlenderFoundation.Blender (ID는 winget search blender 로 확인)" }
$slicer = @("C:\Program Files\Prusa3D\PrusaSlicer\prusa-slicer.exe","C:\Program Files\OrcaSlicer\orca-slicer.exe","C:\Program Files\UltiMaker Cura*\UltiMaker-Cura.exe") | ForEach-Object { Get-ChildItem $_ -ErrorAction SilentlyContinue } | Select-Object -First 1
if ($slicer) { Add-Row "2" "슬라이서" "PASS" $slicer.FullName } else { Add-Row "2" "슬라이서" "FAIL" "PrusaSlicer/OrcaSlicer/Cura 중 하나 설치(프린터 기종에 맞춰 선택)" }
if (Test-Path "AGENTS.md") { Add-Row "2" "AGENTS.md / CLAUDE.md" "PASS" "하위 지침 존재 → 먼저 읽을 것" } else { Add-Row "2" "AGENTS.md" "WARN" "없음(이 저장소 기준)" }

# 4/7. 가상환경·테스트
if (Test-Path "tools/print3d/requirements.txt") {
  if (-not (Test-Path ".venv-print3d")) { Add-Row "7" "가상환경 .venv-print3d" "WARN" "py -3.11 -m venv .venv-print3d 후 pip install -r tools/print3d/requirements.txt" }
  else {
    $out = & .\.venv-print3d\Scripts\python.exe -m pytest tools/print3d/tests -q 2>&1 | Select-Object -Last 1
    if ($out -match 'passed' -and $out -notmatch 'failed') { Add-Row "7" "print3d 테스트" "PASS" $out } else { Add-Row "7" "print3d 테스트" "FAIL" $out }
  }
} else { Add-Row "7" "tools/print3d" "FAIL" "브랜치에 tools/print3d 없음" }

# 6. 비밀값
$envTracked = git ls-files | Select-String -Pattern '(^|/)\.env($|\.(?!example))|settings\.local\.json$'
if ($envTracked) { Add-Row "6" "추적 중인 비밀 파일" "FAIL" ($envTracked -join ", ") } else { Add-Row "6" "추적 중인 비밀 파일" "PASS" "없음" }
foreach ($e in "apps/frontend/.env","apps/backend/.env","data/.env") { if (Test-Path $e) { Add-Row "6" "로컬 $e" "INFO" "있음(값은 읽지 않음). git check-ignore 로 무시되는지 확인" } }

$md = @("# print3d PC 점검 결과 ($(Get-Date -Format s))", "", "| 단계 | 항목 | 상태 | 상세 |", "|---|---|---|---|")
$rows | ForEach-Object { $md += "| $($_.No) | $($_.Item) | $($_.Status) | $($_.Detail) |" }
$md | Set-Content -Encoding UTF8 print3d-pc-check.md
$rows | Format-Table -AutoSize -Wrap
$fail = ($rows | Where-Object Status -eq "FAIL").Count; $warn = ($rows | Where-Object Status -eq "WARN").Count
Write-Host "`nFAIL=$fail WARN=$warn  → print3d-pc-check.md 저장됨"
