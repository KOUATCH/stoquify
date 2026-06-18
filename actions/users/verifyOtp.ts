"use server";
import { logSafeActionWarning } from "@/actions/_shared/safe-action-responses";
import { verifyEmailOtpWorkflow } from "@/services/users/user-identity.service";

// import { generateNumericToken } from "@/lib/token";
// 

 const verifyOTP= async (userId:string,  otp:string)=>{
  try {
    return await verifyEmailOtpWorkflow(userId, otp)
  } catch (error) {
    logSafeActionWarning("Email verification failed", error, {
      action: "users.email.verify",
      component: "User",
    })
    return{
      status:403
    }
  }
}
export default verifyOTP
