

export const generateOtp=():string=>{
const otp= Math.floor(Math.random()*1000000)
return otp.toString().padStart(6,"0")
}
