import {TextDecoder} from 'node:util'
import {decodeHandoffCsvUtf8} from '../payroll-handoff-download'

beforeAll(()=>{Object.defineProperty(globalThis,'TextDecoder',{configurable:true,value:TextDecoder})})
test.each(['\uFEFF',''])('decodes long Unicode CSV without changing marker %j',marker=>{
 const csv=marker+'"Employé","Référence"\r\n'+('"Éléonore","Nom, ""cité"""\r\n').repeat(100)
 const bytes=Buffer.from(csv,'utf8')
 expect(Buffer.from(decodeHandoffCsvUtf8(bytes.toString('base64')),'utf8')).toEqual(bytes)
})
test('rejects invalid UTF-8 rather than silently altering retained bytes',()=>{
 expect(()=>decodeHandoffCsvUtf8(Buffer.from([0xff]).toString('base64'))).toThrow()
})
