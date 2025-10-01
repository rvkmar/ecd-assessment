# modules/scoring.R
library(plumber)
library(jsonlite)

scoring_api <- function() {
  pr <- Plumber$new()

  #* @post /score
  pr$handle("POST", "/score", function(req, res) {
    body <- tryCatch(jsonlite::fromJSON(req$postBody), error = function(e) NULL)
    correct <- !is.null(body$rawAnswer) && !is.null(body$correctAnswer) &&
               body$rawAnswer == body$correctAnswer
    list(message = "Scoring placeholder", scoredValue = ifelse(correct, 1, 0))
  })

  pr
}
