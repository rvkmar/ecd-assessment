# api.R
# Script to start the API server

# Source the IRT module
source("/home/app/modules/irt.R")

# Create the API instance
api <- irt_api()

# Start the server on port 4000
api$run(
  host = "0.0.0.0",
  port = 4000,
  swagger = FALSE  # Set to TRUE if you want Swagger docs
)

# The server will run and display:
# Running plumber API at http://0.0.0.0:4000
# Running swagger Docs at http://127.0.0.1:4000/__docs__/ (if swagger=TRUE)