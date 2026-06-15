@echo off
title CLogG5 Server Management
color 0A

:menu
cls
echo ====================================
echo     CLogG5 Server Management
echo ====================================
echo.
echo 1. Server Status
echo 2. Start Server
echo 3. Stop Server
echo 4. Setup Venv
echo 5. Test Python/Debug
echo 6. Quit
echo.
set /p choice="Select option (1-6): "

if "%choice%"=="1" goto status
if "%choice%"=="2" goto startserver
if "%choice%"=="3" goto stopserver
if "%choice%"=="4" goto setupvenv
if "%choice%"=="5" goto debug
if "%choice%"=="6" goto quit
echo Invalid choice. Please try again.
pause
goto menu

:status
cls
echo ====================================
echo         Server Status
echo ====================================
echo.
echo Checking for CLogG5 server on port 8847...
netstat -an | findstr ":8847"
if %errorlevel%==0 (
    echo [RUNNING] Server is running on port 8847
) else (
    echo [STOPPED] No server found on port 8847
)
echo.
echo Python processes:
tasklist | findstr python
echo.
pause
goto menu

:startserver
cls
echo ====================================
echo         Starting Server
echo ====================================
echo.
echo Checking if server is already running...
netstat -an | findstr ":8847" >nul
if %errorlevel%==0 (
    echo [WARNING] Server appears to already be running on port 8847
    echo.
    set /p confirm="Start anyway? (y/n): "
    if not "%confirm%"=="y" goto menu
)

echo Starting CLogG5 server...
cd /d "%~dp0"
if exist venv\Scripts\activate.bat (
    echo Activating virtual environment...
    if exist Server\main.py (
        start "CLogG5 Server" cmd /k "venv\Scripts\activate && cd Server && python main.py || pause"
        echo Server start command issued with venv.
        echo Check the new window that opened for server output.
        timeout /t 3 /nobreak >nul
        echo Checking if server started...
        netstat -an | findstr ":8847"
        if %errorlevel%==0 (
            echo [SUCCESS] Server appears to be running on port 8847
        ) else (
            echo [WARNING] Server may not have started properly
        )
    ) else (
        echo [ERROR] main.py not found in Server directory
    )
) else (
    echo [ERROR] Virtual environment not found at venv\Scripts\activate.bat
    echo Please create venv first: python -m venv venv
)
echo.
pause
goto menu

:stopserver
cls
echo ====================================
echo         Stopping Server
echo ====================================
echo.
echo Looking for Python processes...
tasklist | findstr python.exe >nul
if %errorlevel%==0 (
    echo Found Python processes. Stopping all python.exe processes...
    taskkill /f /im python.exe >nul 2>&1
    if %errorlevel%==0 (
        echo [SUCCESS] Python processes stopped
    ) else (
        echo [ERROR] Failed to stop some processes
    )
) else (
    echo [INFO] No Python processes found
)
echo.
pause
goto menu

:setupvenv
cls
echo ====================================
echo         Setup Virtual Environment
echo ====================================
echo.
cd /d "%~dp0"
if exist venv (
    echo Virtual environment already exists.
    set /p recreate="Recreate venv? (y/n): "
    if "%recreate%"=="y" (
        echo Removing existing venv...
        rmdir /s /q venv
    ) else (
        goto installpackages
    )
)

echo Creating virtual environment...
python -m venv venv
if %errorlevel%==0 (
    echo Virtual environment created successfully.
) else (
    echo Failed to create venv with 'python'. Trying 'python3'...
    python3 -m venv venv
    if %errorlevel%==0 (
        echo Virtual environment created successfully with python3.
    ) else (
        echo Failed to create virtual environment.
        pause
        goto menu
    )
)

:installpackages
echo.
echo Activating virtual environment and installing packages...
call venv\Scripts\activate.bat
pip install fastapi uvicorn websockets
if %errorlevel%==0 (
    echo [SUCCESS] All packages installed successfully.
    echo Virtual environment is ready.
) else (
    echo [ERROR] Failed to install some packages.
)
echo.
pause
goto menu

:debug
cls
echo ====================================
echo         Python Debug
echo ====================================
echo.
echo Testing Python installation...
python --version
if %errorlevel%==0 (
    echo Python found successfully
) else (
    echo Python not found, trying python3...
    python3 --version
    if %errorlevel%==0 (
        echo Python3 found - use python3 instead of python
    ) else (
        echo No Python installation found
    )
)
echo.
echo Checking Server directory...
cd /d "%~dp0Server"
if exist main.py (
    echo main.py found
    echo.
    echo Testing server script syntax...
    python -m py_compile main.py
    if %errorlevel%==0 (
        echo Syntax OK
    ) else (
        echo Syntax errors found
    )
) else (
    echo main.py NOT found in Server directory
)
echo.
pause
goto menu

:quit
cls
echo Goodbye!
exit