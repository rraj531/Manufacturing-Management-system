require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const mysql = require('mysql2/promise');

const app = express();
const PORT = Number(process.env.PORT || 5000);
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'manufacturing_management',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  dateStrings: true,
  decimalNumbers: true
});
app.use(helmet());
app.use(cors({ origin: process.env.FRONTEND_ORIGIN ? process.env.FRONTEND_ORIGIN.split(',').map(s=>s.trim()) : true }));
app.use(express.json({ limit: '1mb' }));
app.use((req,res,next)=>{res.setHeader('X-Content-Type-Options','nosniff');next()});

class HttpError extends Error { constructor(status,message){super(message);this.status=status;} }
const asyncRoute=fn=>(req,res,next)=>Promise.resolve(fn(req,res,next)).catch(next);
const positiveId=req=>{const n=Number(req.params.id);if(!Number.isSafeInteger(n)||n<1)throw new HttpError(400,'Invalid record id.');return n};
const required=(body,keys)=>{for(const k of keys){if(body[k]===undefined||body[k]===null||String(body[k]).trim()==='')throw new HttpError(400,k.replace(/_/g,' ')+' is required.')}};
const dateOk=v=>/^\d{4}-\d{2}-\d{2}$/.test(String(v||''))&&!Number.isNaN(Date.parse(v));
const numeric=(v,key,{min=0,nullable=false}={})=>{if(nullable&&(v===undefined||v===null||v===''))return null;const n=Number(v);if(!Number.isFinite(n)||n<min)throw new HttpError(400,key.replace(/_/g,' ')+' must be a valid number.');return n};
const dupSafe=asyncRoute(async(err,req,res,next)=>next(err));

app.get('/api/health', asyncRoute(async(req,res)=>{await pool.query('SELECT 1');res.json({status:'ok',service:'ForgeFlow API',database:'connected',time:new Date().toISOString()})}));
app.get('/api/dashboard',asyncRoute(async(req,res)=>{
 const [[e]]=await pool.query('SELECT COUNT(*) total FROM employees WHERE is_active=1');
 const [[a]]=await pool.query("SELECT COUNT(*) total FROM attendance WHERE attendance_date=CURDATE() AND status='Present'");
 const [[i]]=await pool.query('SELECT COUNT(*) total FROM inventory');
 const [[p]]=await pool.query("SELECT COUNT(*) total FROM production_orders WHERE status NOT IN ('Completed','Cancelled')");
 const [lowStock]=await pool.query('SELECT id,sku,name,quantity,unit,reorder_level FROM inventory WHERE quantity<=reorder_level ORDER BY quantity ASC LIMIT 8');
 const [productionSummary]=await pool.query('SELECT status,COUNT(*) total FROM production_orders GROUP BY status ORDER BY status');
 res.json({employees:e.total,presentToday:a.total,inventoryItems:i.total,openProduction:p.total,lowStock,productionSummary});
}));

const resources={
 employees:{table:'employees',endpoint:'employees',fields:['name','email','phone','department','designation','joining_date','salary'],required:['name','email','phone','department','designation','joining_date'],numbers:['salary'],dates:['joining_date'],defaults:{is_active:1}},
 inventory:{table:'inventory',endpoint:'inventory',fields:['sku','name','category','unit','quantity','reorder_level','unit_cost','supplier'],required:['sku','name','category','unit','quantity','reorder_level'],numbers:['quantity','reorder_level','unit_cost']},
 production:{table:'production_orders',endpoint:'production',fields:['order_no','product_name','planned_quantity','produced_quantity','start_date','due_date','status','assigned_to','notes'],required:['order_no','product_name','planned_quantity','start_date','due_date','status'],numbers:['planned_quantity','produced_quantity'],dates:['start_date','due_date']},
 dispatch:{table:'dispatches',endpoint:'dispatch',fields:['dispatch_no','customer_name','product_name','quantity','dispatch_date','expected_delivery','status','tracking_no','notes'],required:['dispatch_no','customer_name','product_name','quantity','dispatch_date','status'],numbers:['quantity'],dates:['dispatch_date','expected_delivery']}
};
function sanitizePayload(cfg,body,isUpdate=false){
 required(body,isUpdate?[]:cfg.required);
 const out={};
 for(const key of cfg.fields){
   if(body[key]===undefined){if(!isUpdate&&cfg.required.includes(key))throw new HttpError(400,key+' is required.');continue}
   let v=body[key];
   if(v===null||v===''){if(cfg.required.includes(key))throw new HttpError(400,key+' is required.');out[key]=null;continue}
   if(cfg.numbers.includes(key))v=numeric(v,key,{nullable:!cfg.required.includes(key)});
   if(cfg.dates.includes(key)){if(!dateOk(v))throw new HttpError(400,key+' must use YYYY-MM-DD format.')}
   if(typeof v==='string')v=v.trim();
   out[key]=v;
 }
 return out;
}
function mountResource(name,cfg){
 app.get('/api/'+cfg.endpoint,asyncRoute(async(req,res)=>{const [rows]=await pool.query('SELECT * FROM '+cfg.table+(name==='employees'?' WHERE is_active=1':'')+' ORDER BY id DESC');res.json(rows)}));
 app.get('/api/'+cfg.endpoint+'/:id',asyncRoute(async(req,res)=>{const id=positiveId(req);const [rows]=await pool.execute('SELECT * FROM '+cfg.table+' WHERE id=?',[id]);if(!rows.length)throw new HttpError(404,'Record not found.');res.json(rows[0])}));
 app.post('/api/'+cfg.endpoint,asyncRoute(async(req,res)=>{const data=sanitizePayload(cfg,req.body||{});const keys=Object.keys(data);const sql='INSERT INTO '+cfg.table+' ('+keys.join(',')+') VALUES ('+keys.map(()=>'?').join(',')+')';const [r]=await pool.execute(sql,keys.map(k=>data[k]));if(name==='employees'){const code='EMP-'+String(r.insertId).padStart(5,'0');await pool.execute('UPDATE employees SET employee_code=? WHERE id=?',[code,r.insertId])}const [rows]=await pool.execute('SELECT * FROM '+cfg.table+' WHERE id=?',[r.insertId]);res.status(201).json(rows[0])}));
 app.put('/api/'+cfg.endpoint+'/:id',asyncRoute(async(req,res)=>{const id=positiveId(req),data=sanitizePayload(cfg,req.body||{},true),keys=Object.keys(data);if(!keys.length)throw new HttpError(400,'No editable fields supplied.');const [r]=await pool.execute('UPDATE '+cfg.table+' SET '+keys.map(k=>k+'=?').join(',')+' WHERE id=?',[...keys.map(k=>data[k]),id]);if(!r.affectedRows){const [exists]=await pool.execute('SELECT id FROM '+cfg.table+' WHERE id=?',[id]);if(!exists.length)throw new HttpError(404,'Record not found.')}const [rows]=await pool.execute('SELECT * FROM '+cfg.table+' WHERE id=?',[id]);res.json(rows[0])}));
 app.delete('/api/'+cfg.endpoint+'/:id',asyncRoute(async(req,res)=>{const id=positiveId(req);if(name==='employees'){const [r]=await pool.execute('UPDATE employees SET is_active=0 WHERE id=? AND is_active=1',[id]);if(!r.affectedRows)throw new HttpError(404,'Active employee not found.')}else{const [r]=await pool.execute('DELETE FROM '+cfg.table+' WHERE id=?',[id]);if(!r.affectedRows)throw new HttpError(404,'Record not found.')}res.json({message:'Record deleted.'})}));
}
Object.entries(resources).forEach(([name,cfg])=>mountResource(name,cfg));

app.get('/api/attendance',asyncRoute(async(req,res)=>{const date=req.query.date||new Date().toISOString().slice(0,10);if(!dateOk(date))throw new HttpError(400,'date must use YYYY-MM-DD format.');const [rows]=await pool.execute('SELECT a.id,a.employee_id,a.attendance_date,a.status,a.remarks,e.employee_code,e.name,e.department FROM attendance a JOIN employees e ON e.id=a.employee_id WHERE a.attendance_date=? AND e.is_active=1 ORDER BY e.name',[date]);res.json(rows)}));
app.post('/api/attendance/bulk',asyncRoute(async(req,res)=>{
 const {date,records}=req.body||{};if(!dateOk(date))throw new HttpError(400,'Valid date is required in YYYY-MM-DD format.');if(!Array.isArray(records))throw new HttpError(400,'records must be an array.');
 const conn=await pool.getConnection();try{await conn.beginTransaction();for(const row of records){const employeeId=Number(row.employee_id);if(!Number.isSafeInteger(employeeId)||employeeId<1)throw new HttpError(400,'Invalid employee_id.');if(!['Present','Absent','Leave'].includes(row.status))throw new HttpError(400,'Attendance status must be Present, Absent, or Leave.');await conn.execute('INSERT INTO attendance(employee_id,attendance_date,status) SELECT id,?,? FROM employees WHERE id=? AND is_active=1 ON DUPLICATE KEY UPDATE status=VALUES(status)',[date,row.status,employeeId]);}await conn.commit();res.json({message:'Attendance saved.',date,count:records.length})}catch(e){await conn.rollback();throw e}finally{conn.release()}
}));
app.get('/api/reports/summary',asyncRoute(async(req,res)=>{const [[e]]=await pool.query('SELECT COUNT(*) total FROM employees WHERE is_active=1');const [[a]]=await pool.query('SELECT COUNT(*) total FROM attendance');const [[i]]=await pool.query('SELECT COUNT(*) total FROM inventory');const [[p]]=await pool.query('SELECT COUNT(*) total FROM production_orders');const [[d]]=await pool.query('SELECT COUNT(*) total FROM dispatches');res.json({employees:e.total,attendance:a.total,inventory:i.total,production:p.total,dispatch:d.total})}));
app.get('/api/reports/:resource',asyncRoute(async(req,res)=>{const cfg=resources[req.params.resource];if(!cfg)throw new HttpError(404,'Unknown report resource.');const [rows]=await pool.query('SELECT * FROM '+cfg.table+' ORDER BY id DESC');res.json(rows)}));

app.use((req,res)=>res.status(404).json({message:'Route not found.'}));
app.use((err,req,res,next)=>{if(err&&err.code==='ER_DUP_ENTRY')return res.status(409).json({message:'A record with this unique code/email already exists.'});if(err&&err.code==='ER_NO_REFERENCED_ROW_2')return res.status(400).json({message:'Employee reference does not exist.'});const status=err.status||500;if(status===500)console.error(err);res.status(status).json({message:status===500?'Internal server error. Check backend logs and MySQL connection.':err.message})});
const server=app.listen(PORT,()=>console.log('ForgeFlow API listening on http://localhost:'+PORT));
async function shutdown(){server.close(async()=>{await pool.end();process.exit(0)})}
process.on('SIGINT',shutdown);process.on('SIGTERM',shutdown);
