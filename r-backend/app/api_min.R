# api_min.R
library(plumber)
library(jsonlite)
library(mirt)

# ---- helpers ----
.as_num <- function(x, default = NA_real_) {
  if (is.null(x)) return(default)
  suppressWarnings(as.numeric(x))
}

.parse_body <- function(req) {
  tryCatch({
    if (is.null(req$postBody) || nchar(req$postBody) == 0) return(NULL)
    jsonlite::fromJSON(req$postBody, simplifyVector = FALSE)
  }, error = function(e) NULL)
}

# ---- create router ----
pr <- Plumber$new()

# /irt/estimate
pr$handle("POST", "/irt/estimate", function(req, res) {
  body <- .parse_body(req)
  if (is.null(body)) {
    res$status <- 400
    return(list(error = "Invalid JSON body"))
  }

  responses <- body$responses
  items <- body$itemBank
  if (is.null(responses) || length(responses) == 0) {
    res$status <- 400
    return(list(error = "No responses provided"))
  }
  if (is.null(items) || length(items) == 0) {
    res$status <- 400
    return(list(error = "No itemBank provided"))
  }

  qids <- vapply(items, FUN = function(i) as.character(i$id), FUN.VALUE = "")
  resp_vec <- rep(NA_real_, length(qids)); names(resp_vec) <- qids
  for (r in responses) {
    qid <- if (!is.null(r$questionId)) as.character(r$questionId) else NULL
    val <- if (!is.null(r$scoredValue)) .as_num(r$scoredValue) else NA_real_
    if (!is.null(qid) && qid %in% qids) resp_vec[[qid]] <- val
  }

  nAnswered <- sum(!is.na(resp_vec))
  if (nAnswered < 1) {
    return(list(error = "Not enough responses"))
  }

  # fit trivial model
  resp_df <- as.data.frame(t(resp_vec))
  model <- tryCatch(mirt(resp_df, 1, itemtype = "2PL", verbose = FALSE),
                    error = function(e) NULL)

  if (is.null(model)) {
    return(list(error = "Model fitting failed"))
  }

  fs <- tryCatch(fscores(model, method = "EAP", full.scores.SE = TRUE),
                 error = function(e) NULL)
  if (is.null(fs)) {
    return(list(error = "fscores failed"))
  }

  list(theta = as.numeric(fs[1,1]), stderr = as.numeric(fs[1,2]))
})

# /ping
pr$handle("GET", "/ping", function() {
  list(status = "ok", time = Sys.time())
})

# ---- run ----
pr$run(host = "0.0.0.0", port = 4000)
