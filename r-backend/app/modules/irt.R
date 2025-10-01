# modules/irt.R
# IRT endpoints for ECD assessment with logging and robust fallbacks

library(plumber)
library(jsonlite)
library(mirt)

# ---------------------------
# Helpers
# ---------------------------
.as_num <- function(x, default = NA_real_) {
  if (is.null(x)) return(default)
  suppressWarnings(as.numeric(x))
}

.parse_body <- function(req) {
  tryCatch({
    if (is.null(req$postBody) || nchar(req$postBody) == 0) return(NULL)
    jsonlite::fromJSON(req$postBody, simplifyVector = FALSE)
  }, error = function(e) {
    message("[irt] Failed to parse body: ", e$message)
    NULL
  })
}

.fallback_theta <- function(resp_vec, note) {
  prop <- mean(resp_vec, na.rm = TRUE)
  theta_est <- qnorm(min(max(prop, 1e-6), 1 - 1e-6))
  message("[irt] Fallback triggered: ", note, ", theta=", theta_est)
  return(list(method = note, theta = theta_est, stderr = NA_real_,
              nItemsAnswered = sum(!is.na(resp_vec)), note = note))
}

# ---------------------------
# IRT API factory
# ---------------------------
irt_api <- function() {
  pr <- Plumber$new()

  # ---------------------------
  # POST /irt/estimate
  # ---------------------------
  pr$handle("POST", "/irt/estimate", function(req, res) {
    body <- .parse_body(req)
    if (is.null(body)) {
      res$status <- 400
      return(list(error = "Invalid JSON body"))
    }

    responses <- body$responses
    items <- body$itemBank
    method_in <- if (!is.null(body$method)) toupper(as.character(body$method)) else "EAP"
    method <- if (method_in %in% c("EAP", "MLE")) method_in else "EAP"

    if (is.null(responses) || length(responses) == 0) {
      res$status <- 400
      return(list(error = "No responses provided"))
    }
    if (is.null(items) || length(items) == 0) {
      res$status <- 400
      return(list(error = "No itemBank provided"))
    }

    qids <- vapply(items, FUN = function(i) as.character(i$id), FUN.VALUE = "")
    resp_vec <- rep(NA_real_, length(qids))
    names(resp_vec) <- qids

    for (r in responses) {
      qid <- if (!is.null(r$questionId)) as.character(r$questionId) else NULL
      val <- if (!is.null(r$scoredValue)) .as_num(r$scoredValue) else NA_real_
      if (!is.null(qid) && qid %in% qids) resp_vec[[qid]] <- val
    }

    nAnswered <- sum(!is.na(resp_vec))
    if (nAnswered < 2) {
      return(.fallback_theta(resp_vec, "Too few items answered"))
    }

    resp_df <- as.data.frame(t(resp_vec), stringsAsFactors = FALSE)
    resp_df[] <- lapply(resp_df, as.numeric)

    a_par <- sapply(items, function(i) if (!is.null(i$a)) .as_num(i$a) else 1.0)
    b_par <- sapply(items, function(i) if (!is.null(i$b)) .as_num(i$b) else 0.0)
    c_par <- sapply(items, function(i) if (!is.null(i$c)) .as_num(i$c) else 0.0)

    par_table <- data.frame(a1 = a_par, d = -a_par * b_par, g = c_par, u = 1,
                            row.names = qids, stringsAsFactors = FALSE)

    fit_model <- NULL
    estimation_method_used <- method

    tryCatch({
      provided_params <- sum(!is.na(a_par) | !is.na(b_par) | !is.na(c_par))
      if (provided_params >= max(2, floor(0.5 * length(qids)))) {
        itemtype <- ifelse(any(c_par > 0), "3PL", "2PL")
        fit_model <- mirt(resp_df, 1, itemtype = itemtype, pars = par_table,
                          SE = TRUE, verbose = FALSE, technical = list(NCYCLES = 50))
      }
      if (is.null(fit_model)) {
        itemtype <- ifelse(any(c_par > 0), "3PL", "2PL")
        fit_model <- suppressWarnings(mirt(resp_df, 1, itemtype = itemtype, verbose = FALSE))
      }
    }, error = function(e) {
      message("[irt] Model fitting failed: ", e$message)
      fit_model <<- NULL
    })

    if (is.null(fit_model)) {
      return(.fallback_theta(resp_vec, "IRT model fitting failed"))
    }

    fs <- tryCatch({
      if (method == "MLE") {
        out <- fscores(fit_model, method = "ML", full.scores.SE = TRUE)
        if (is.null(out)) {
          estimation_method_used <- "EAP (fallback)"
          out <- fscores(fit_model, method = "EAP", full.scores.SE = TRUE)
        }
        out
      } else {
        estimation_method_used <- "EAP"
        fscores(fit_model, method = "EAP", full.scores.SE = TRUE)
      }
    }, error = function(e) {
      message("[irt] fscores failed: ", e$message)
      NULL
    })

    if (is.null(fs)) {
      return(.fallback_theta(resp_vec, "fscores computation failed"))
    }

    theta_val <- as.numeric(fs[1, 1])
    stderr_val <- as.numeric(fs[1, 2])

    item_info <- tryCatch({
      sapply(qids, function(qid) {
        ii <- tryCatch({ iteminfo(fit_model, Theta = theta_val)[, qid] }, error = function(e) NA_real_)
        if (is.null(ii) || length(ii) == 0) NA_real_ else as.numeric(ii)
      })
    }, error = function(e) {
      message("[irt] iteminfo failed: ", e$message)
      rep(NA_real_, length(qids))
    })

    test_info_val <- tryCatch({ testinfo(fit_model, Theta = theta_val) }, error = function(e) {
      message("[irt] testinfo failed: ", e$message)
      NA_real_
    })

    itemInfos <- lapply(seq_along(qids), function(i) list(id = qids[i], info = as.numeric(item_info[i])))

    return(list(method = estimation_method_used, theta = theta_val, stderr = stderr_val,
                nItemsAnswered = nAnswered, itemInfos = itemInfos, testInfo = as.numeric(test_info_val)))
  })

  # ---------------------------
  # POST /irt/calibrate
  # ---------------------------
  pr$handle("POST", "/irt/calibrate", function(req, res) {
    body <- .parse_body(req)
    if (is.null(body)) {
      res$status <- 400
      return(list(error = "Invalid JSON body"))
    }

    responses <- body$responses
    evModel <- body$evidenceModel

    if (is.null(responses) || length(responses) == 0) {
      res$status <- 400
      return(list(error = "No responses provided for calibration"))
    }
    if (is.null(evModel$measurementModel$irtConfig$model)) {
      res$status <- 400
      return(list(error = "Evidence Model missing irtConfig$model"))
    }

    model_type <- evModel$measurementModel$irtConfig$model
    if (!(model_type %in% c("2PL", "3PL"))) {
      res$status <- 400
      return(list(error = paste("Unsupported IRT model:", model_type)))
    }

    all_qids <- unique(unlist(lapply(responses, function(r) names(r$answers))))
    mat <- do.call(rbind, lapply(responses, function(r) {
      row <- rep(NA_real_, length(all_qids))
      names(row) <- all_qids
      for (qid in names(r$answers)) row[qid] <- .as_num(r$answers[[qid]])
      row
    }))
    resp_df <- as.data.frame(mat)

    model <- tryCatch({
      mirt(resp_df, 1, itemtype = model_type, verbose = FALSE)
    }, error = function(e) {
      message("[irt] Calibration failed: ", e$message)
      NULL
    })

    if (is.null(model)) {
      return(list(error = "Calibration failed"))
    }

    coefs <- coef(model, IRTpars = TRUE, simplify = TRUE)$items
    items_out <- lapply(1:nrow(coefs), function(i) {
      list(id = rownames(coefs)[i],
           a = unname(coefs[i, "a1"]),
           b = unname(coefs[i, "b"]),
           c = if ("g" %in% colnames(coefs)) unname(coefs[i, "g"]) else 0)
    })

    return(list(model = model_type, items = items_out))
  })

  pr
}
