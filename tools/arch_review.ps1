# Architecture Review Script for Spelling Tutor
Write-Host "===================================================" -ForegroundColor Cyan
Write-Host "  Spelling Tutor -- Architecture Review" -ForegroundColor Cyan
Write-Host "===================================================" -ForegroundColor Cyan

$docs = Get-ChildItem "docs\architecture\*.md"
Write-Host "`nFound $($docs.Count) architecture documents:" -ForegroundColor Yellow
foreach ($doc in $docs) {
    Write-Host " - $($doc.Name)" -ForegroundColor Gray
}

Write-Host "`nGit Status Summary:" -ForegroundColor Yellow
git status -s

Write-Host "`nRecent Commits:" -ForegroundColor Yellow
git log --oneline -5

Write-Host "`n[Review completed]" -ForegroundColor Green
