import "server-only";
import { randomInt } from "node:crypto";

export const generateToken=(): string=> {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let token = "";

  // Generate 32 random characters
  for (let i = 0; i < 32; i++) {
    const randomIndex = randomInt(chars.length);
    token += chars[randomIndex];
  }

  return token;
}


// export const generateOtp=():string=>{
// const otp= Math.floor(Math.random()*1000000)
// return otp.toString().padStart(6,"0")
// }
