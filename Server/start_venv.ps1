# start_venv.ps1
$venvPath = ".venv"

# Step 1: Create the venv if it doesn't exist
if (-not (Test-Path "$venvPath")) {
    Write-Host "Creating virtual environment..."
    python -m venv $venvPath
} else {
    Write-Host "Virtual environment already exists."
}

# Step 2: Activate the venv
Write-Host "Activating virtual environment..."
& ".\.venv\Scripts\Activate.ps1"
