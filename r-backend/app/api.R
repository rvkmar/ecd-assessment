# api.R
library(plumber)

# Load modules
source("modules/irt.R")       # defines irt_api()
# source("modules/bn.R")      # optional later
# source("modules/scoring.R")
# source("modules/analytics.R")
# source("modules/utils.R")

# Create main router
pr <- Plumber$new()

# Mount module routers
pr$mount("/irt/", irt_api())
# pr$mount("/bn", bn_api())
# pr$mount("/scoring", scoring_api())
# pr$mount("/analytics", analytics_api())

# Health check endpoint with JSON serializer
#* @apiTitle ECD R Backend
#* @apiDescription Provides IRT, BN, scoring and analytics endpoints
#* @get /ping
#* @serializer json
function() {
  list(status = "ok", time = Sys.time())
}

# Return plumber router
pr
