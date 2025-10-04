 // server/cron/autoFinishCron.js
 // Schedule periodic auto-finish sweeps.
 
 import cron from "node-cron";
 import { autoFinishDueSessions } from "../utils/autoFinish.js";
 
 /**
  * Start the cron job that runs every minute to check for expired sessions.
  * Logs which sessions were auto-finished.
  */
 export default function startAutoFinishCron() {
   // Run every minute (adjust if needed)
   cron.schedule(
     "* * * * *",
     () => {
       try {
         const changed = autoFinishDueSessions();
         if (changed.length > 0) {
           console.log(
             `[autoFinishCron] auto-finished sessions: ${changed.join(", ")}`
           );
         }
       } catch (err) {
         console.error("[autoFinishCron] error:", err);
       }
     },
     { timezone: "UTC" }
   );
 }
