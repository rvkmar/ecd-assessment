# modules/bn.R
library(plumber)
library(jsonlite)

bn_api <- function() {
  pr <- Plumber$new()

  #* @post /update
  pr$handle("POST", "/update", function(req, res) {
    body <- tryCatch(jsonlite::fromJSON(req$postBody), error = function(e) NULL)
    list(message = "BN placeholder", received = body)
  })

  pr
}
