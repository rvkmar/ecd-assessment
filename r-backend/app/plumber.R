# api.R
library(plumber)
library(jsonlite)

# CORS filter (convenience for browser tests)
#* @filter cors
function(req, res){
  res$setHeader("Access-Control-Allow-Origin", "*")
  if (req$REQUEST_METHOD == "OPTIONS") {
    res$setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
    res$setHeader("Access-Control-Allow-Headers", "Content-Type")
    res$status <- 200
    return(list())
  }
  plumber::forward()
}

#* Ping
#* @get /ping
function(){
  list(status = "ok", time = Sys.time())
}

#* Sum numbers (POST JSON: {"nums":[1,2,3]})
#* @post /sum
function(req){
  body <- jsonlite::fromJSON(req$postBody)
  list(sum = sum(unlist(body$nums)))
}
