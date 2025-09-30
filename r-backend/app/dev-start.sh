#!/bin/sh
# dev-start.sh → autoreload R scripts on change

echo "🔄 Starting R backend in auto-reload mode..."
echo "Watching for changes in /home/app/*.R"

# Watch recursively and restart plumber in non-interactive mode
find /home/app -type f -name "*.R" | entr -rn sh -c '
  echo "\n⏰ Reload triggered at $(date)"
  Rscript /home/app/start.R
'