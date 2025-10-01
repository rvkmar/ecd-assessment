# start.R
options(plumber.methodNotAllowed = TRUE)

library(plumber)
pr <- plumber::plumb('/home/app/api.R')
pr$run(host='0.0.0.0', port=4000)
