import {z} from "zod"
import {createHash} from "node:crypto"
import {BusinessRuleError} from "@/services/_shared/action-errors"
export const correctionFields=["displayName","legalName"] as const
export const correctionPolicySchema=z.object({organizationId:z.string().min(1),version:z.string().min(1).max(40),allowedFields:z.array(z.enum(correctionFields)).min(1).max(2),reviewerId:z.string().min(1),supportLabelEn:z.string().min(1).max(120),supportLabelFr:z.string().min(1).max(120),approvalReference:z.string().min(8).max(200),effectiveFrom:z.string().datetime(),effectiveTo:z.string().datetime()}).strict()
export type CorrectionPolicy=z.infer<typeof correctionPolicySchema>
export const proposalSchema=z.object({displayName:z.string().trim().min(1).max(160).optional(),legalName:z.string().trim().min(1).max(200).optional()}).strict().refine(v=>Object.keys(v).length>0,"Choose an allowed field to correct")
export const correctionSubmitSchema=z.object({proposal:proposalSchema,reason:z.string().trim().min(8).max(1000),documentId:z.string().uuid().optional(),idempotencyKey:z.string().min(8).max(160)}).strict()
export const correctionAmendSchema=correctionSubmitSchema.extend({caseId:z.string().uuid(),revision:z.number().int().positive()})
export const correctionDecisionSchema=z.object({caseId:z.string().uuid(),revision:z.number().int().positive(),reviewVersion:z.string().length(64),decision:z.enum(["APPROVE","REJECT","RETURN","REASSIGN"]),acknowledged:z.literal(true),reason:z.string().trim().min(8).max(1000),idempotencyKey:z.string().min(8).max(160)}).strict()
export const correctionHash=(value:unknown)=>createHash("sha256").update(JSON.stringify(value)).digest("hex")
export function correctionPolicy(organizationId:string,now=new Date()):CorrectionPolicy|null{
 const raw=process.env.HRIS_PERSONAL_CORRECTION_POLICIES_JSON;if(!raw)return null
 let value:unknown;try{value=JSON.parse(raw)}catch{throw new BusinessRuleError("HRIS_CORRECTION_POLICY_UNAVAILABLE")}
 const result=z.array(correctionPolicySchema).max(200).parse(value).filter(p=>p.organizationId===organizationId&&new Date(p.effectiveFrom)<=now&&new Date(p.effectiveTo)>now)
 if(result.length>1)throw new BusinessRuleError("HRIS_CORRECTION_POLICY_AMBIGUOUS")
 return result[0]??null
}
