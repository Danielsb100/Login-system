const env=require('../config/env');
async function requestJson(url, opts={}){const headers={...(opts.headers||{})}; if(opts.json!==undefined){headers['Content-Type']='application/json'; opts.body=JSON.stringify(opts.json);} const res=await fetch(url,{...opts,headers}); const text=await res.text(); let body; try{body=JSON.parse(text)}catch{body={raw:text}}; if(!res.ok) throw new Error(`${res.status} ${text}`); return body;}
(async()=>{const login=await requestJson('http://127.0.0.1:3000/auth/login',{method:'POST',json:{email:env.seed.masterUser.email,password:env.seed.masterUser.password}}); const token=login?.data?.token||login?.token; const auth={Authorization:`Bearer ${token}`}; const tests=[
'In the Training verification PDF, what compliance threshold is stated? Give the numeric value and unit only.',
'For the course verification material, identify the named reviewer from the uploaded PDF.',
'What artifact code appears in the course verification material? This is not a quiz answer; it is a document label.',
'List the verification PDF details: artifact code, threshold, and reviewer.'
]; for (const [i,msg] of tests.entries()){const body=await requestJson('http://127.0.0.1:3000/api/ai/chat',{method:'POST',headers:auth,json:{message:msg,courseId:7,moduleId:null,conversationId:`pdf-smoke-retry-${Date.now()}-${i}`}}); console.log('\nQ:',msg); console.log('A:',body.answer);}})().catch(e=>{console.error(e);process.exit(1)});
