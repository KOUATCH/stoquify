import VerifyOTPForm from "@/components/Forms/VerifyForm";
import { GridBackground } from "@/components/reusable-ui/grid-background";

  const   Page= async({params,searchParams}:{
    params:Promise<{userId:string}>
    searchParams:Promise<{[key:string]:string | string[] | undefined, email:string}>}

  )=> {

    const {userId} = await params
    const email= (await searchParams).email as string

  return (
    <GridBackground>
      <div className="px-4">
        <VerifyOTPForm userId={userId} email={email}/>
      </div>
    </GridBackground>
  );
}
export default Page
