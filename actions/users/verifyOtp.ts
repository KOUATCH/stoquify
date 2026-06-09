"use server";
import { logSecurityEvent, SecurityEventType } from "@/lib/security/audit-log";
import { db } from "@/prisma/db";

// import { generateNumericToken } from "@/lib/token";
// 

 const verifyOTP= async (userId:string,  otp:string)=>{
  try {
       const user= await db.user.findUnique({
      where:{
        id:userId
      }
     
    })
    if(
      !user?.verificationToken ||
      user.verificationToken !== otp ||
      (user.verificationTokenExpires && user.verificationTokenExpires < new Date())
    ){
 return{
status:403
 }}
  await db.user.update({
  where:{
    id:userId
  },
  data:{
    isVerified:true,
    emailVerified: true,
    verificationToken: null,
    verificationTokenExpires: null
  }
 })
  await logSecurityEvent({
    type: SecurityEventType.AUTH_EMAIL_VERIFIED,
    userId: user.id,
    organizationId: user.organizationId,
    resource: user.email,
  })
    
    return{
      status:200
    }
  } catch (error) {
     return{
status:403
 }  
  }
}
export default verifyOTP
