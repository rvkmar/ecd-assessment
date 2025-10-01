# api.R
library(plumber)

# Load modules
source("modules/irt.R")

# Create router
pr <- Plumber$new()
cat("Mounted so far: (none)\n")

# try mounting inside tryCatch to capture error
m1 <- tryCatch({
  pr$mount("/irt", irt_api())
  "ok"
}, error = function(e) e)

print(m1)

# Attach endpoints from modules
# pr$mount("/irt", irt_api())

# Add a ping endpoint for health checks
pr$handle("GET", "/ping", function(req, res) {
  list(status = "ok", time = Sys.time())
})

# pr
print("After mounting /irt, endpoints:")
print(pr$endpoints)