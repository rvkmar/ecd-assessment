# modules/utils.R
entropy <- function(p) {
  if (p <= 0 || p >= 1) return(0)
  -p * log2(p) - (1 - p) * log2(1 - p)
}
