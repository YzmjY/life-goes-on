# Inkwell Makefile (PowerShell)
# Usage: .\make.ps1 <command> [options]
# Commands: build, dev, clean, drafts, serve

param(
    [Parameter(Position = 0)]
    [ValidateSet('build', 'dev', 'clean', 'drafts', 'serve')]
    [string]$Command = 'build',

    [switch]$Drafts = $false
)

$ErrorActionPreference = 'Stop'

switch ($Command) {
    'build' {
        Write-Host "=== Building site (production) ===" -ForegroundColor Cyan
        node build.js
    }
    'dev' {
        Write-Host "=== Building + starting dev server ===" -ForegroundColor Cyan
        node serve.js
    }
    'clean' {
        Write-Host "=== Cleaning dist/ ===" -ForegroundColor Cyan
        if (Test-Path dist) {
            Remove-Item -Recurse -Force dist
            Write-Host "dist/ removed."
        } else {
            Write-Host "dist/ does not exist, nothing to clean."
        }
    }
    'drafts' {
        Write-Host "=== Building site (include drafts) ===" -ForegroundColor Cyan
        node build.js --drafts
    }
    'serve' {
        Write-Host "=== Preview server (dist only, no rebuild) ===" -ForegroundColor Cyan
        node serve.js --dist
    }
}
