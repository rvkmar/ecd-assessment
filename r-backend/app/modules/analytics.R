# modules/analytics.R
library(plumber)
library(jsonlite)

analytics_api <- function() {
  pr <- Plumber$new()

  #* @post /class
  pr$handle("POST", "/class", function(req, res) {
    body <- tryCatch(jsonlite::fromJSON(req$postBody), error = function(e) NULL)
    n <- ifelse(is.null(body$sessions), 0, length(body$sessions))
    list(message = paste("Analytics class placeholder processed", n, "sessions"))
  })

  #* @post /district
  pr$handle("POST", "/district", function(req, res) {
    body <- tryCatch(jsonlite::fromJSON(req$postBody), error = function(e) NULL)
    n <- ifelse(is.null(body$classes), 0, length(body$classes))
    list(message = paste("Analytics district placeholder processed", n, "classes"))
  })

  pr
}
