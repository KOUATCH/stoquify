import "server-only";
import { randomInt } from "node:crypto";

export const generateOtp=():string=>{
const otp= randomInt(1000000)
return otp.toString().padStart(6,"0")
}
