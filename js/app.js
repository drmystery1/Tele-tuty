
const SB_URL="https://xzjyrrkhgmtrfkhyxfxy.supabase.co";
const SB_KEY="sb_publishable_Pej2qGcsvSfKURuKD1mMZg_tocqoCAe";
const db=supabase.createClient(SB_URL,SB_KEY);

const S={session:null,profile:null,page:"home",search:"",jobs:[],assignments:[],profiles:[],requests:[],directory:[],battery:[],earth:[],street:[],renovations:[],customers:[],notif:[]};

const esc=v=>String(v??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]));
const person=id=>S.profiles.find(p=>String(p.id)===String(id));
const pname=id=>person(id)?.full_name||"—";
const isAdmin=()=>S.profile?.role==="admin";
const isEngineer=()=>S.profile?.role==="engineer";
const isTech=()=>S.profile?.role==="worker";
const statusBadge=s=>{let c=s==="completed"?"green":(s==="pending"||s==="in_progress")?"orange":"red";return `<span class="badge ${c}">${esc(String(s||"").replaceAll("_"," "))}</span>`};

async function q(table,columns="*"){const r=await db.from(table).select(columns);if(r.error)throw r.error;return r.data||[]}
async function loadData(){
  const [profiles,jobs,assignments,requests,directory,battery,earth,street,renovations,customers,notif]=await Promise.all([
    q("profiles"),q("jobs"),q("job_assignments"),q("service_requests"),q("telephone_directory"),
    q("battery_maintenance"),q("earthpit_maintenance"),q("street_light_surveys"),q("renovations"),q("customers"),q("notifications")
  ]);
  Object.assign(S,{profiles,jobs,assignments,requests,directory,battery,earth,street,renovations,customers,notif});
}
function uniqueJobs(){return [...new Map(S.jobs.map(j=>[String(j.id),j])).values()]}
function completedBy(jobId){
  const rows=S.assignments.filter(a=>String(a.job_id)===String(jobId)&&a.status==="completed").sort((a,b)=>new Date(b.status_updated_at||b.assigned_at||0)-new Date(a.status_updated_at||a.assigned_at||0));
  return rows[0]?.technician_id||null;
}
function customerName(id){return S.customers.find(c=>String(c.id)===String(id))?.name||"—"}
function counts(){
  const jobs=uniqueJobs();
  return {total:jobs.length,completed:jobs.filter(j=>j.status==="completed").length,pending:jobs.filter(j=>["pending","in_progress"].includes(j.status)).length,notCompleted:jobs.filter(j=>j.status==="not_completed").length}
}
function requestedBy(j){return pname(j.created_by)}
function approvedEngineer(j){return pname(j.approved_by)}
function completedName(j){return pname(completedBy(j.id))}
function jobFilter(){
  const q=S.search.toLowerCase();
  return uniqueJobs().filter(j=>`${j.job_code} ${j.location} ${j.work_description} ${requestedBy(j)} ${approvedEngineer(j)} ${completedName(j)}`.toLowerCase().includes(q))
}

function loginView(msg=""){
 return `<div class="login"><form class="loginCard" onsubmit="event.preventDefault();login()">
  <div class="logo">📡 <span class="gradient">Tele Tuty</span></div><p class="muted">Secure field operations dashboard</p>
  <label>Email</label><input id="email" type="email" required autocomplete="username">
  <label>Password</label><input id="password" type="password" required autocomplete="current-password">
  ${msg?`<p class="red">${esc(msg)}</p>`:""}<button class="btn primary" style="width:100%;margin-top:18px">Sign In</button>
 </form></div>`
}
async function login(){
 const email=document.querySelector("#email").value,password=document.querySelector("#password").value;
 const r=await db.auth.signInWithPassword({email,password});
 if(r.error)return render(loginView(r.error.message));
 await boot();
}
async function logout(){await db.auth.signOut();S.session=null;S.profile=null;render(loginView())}
async function boot(){
 const {data:{session}}=await db.auth.getSession();S.session=session;
 if(!session){render(loginView());return}
 const {data,error}=await db.from("profiles").select("*").eq("id",session.user.id).single();
 if(error){render(loginView("Profile not found for this account."));return}
 S.profile=data; await loadData(); render();
}
function navButton(page,label){return `<button class="${S.page===page?"active":""}" onclick="go('${page}')">${label}</button>`}
function shell(content){
 return `<header class="top"><div class="brand">📡 Tele Tuty</div><div class="role">${esc(S.profile?.full_name||"")} · ${esc(S.profile?.role||"")}</div><div class="spacer"></div>
 <button class="btn" onclick="go('notifications')">🔔</button><button class="btn" onclick="logout()">Logout</button></header>
 <main class="wrap">${content}</main><nav class="nav">${navButton("home","⌂ Home")}${navButton("jobs","▣ Jobs")}${navButton("technicians","♙ Team")}${navButton("directory","☎ Directory")}${navButton("reports","▥ Reports")}</nav>`
}
function go(p){S.page=p;S.search="";render()}

function home(){
 const c=counts();
 return `<section class="hero"><div class="role">FIELD OPERATIONS</div><h1>Welcome, ${esc(S.profile.full_name)} 👋</h1>
 <p>Clean rebuilt interface. Existing authentication and database user IDs are preserved.</p>
 <div class="actions"><button class="btn primary" onclick="go('jobs')">Open Jobs</button><button class="btn" onclick="go('maintenance')">Maintenance</button><button class="btn" onclick="go('directory')">Directory</button></div></section>
 <section class="grid"><div class="card metric"><div class="label">Total Jobs</div><div class="value blue">${c.total}</div></div>
 <div class="card metric"><div class="label">Completed</div><div class="value green">${c.completed}</div></div>
 <div class="card metric"><div class="label">Pending / Open</div><div class="value orange">${c.pending}</div></div>
 <div class="card metric"><div class="label">Not Completed</div><div class="value red">${c.notCompleted}</div></div></section>
 <div class="section"><div class="sectionHead"><h2>Job List</h2><button class="btn" onclick="go('jobs')">View All</button></div><div class="card">${uniqueJobs().slice(0,6).map(j=>`<div style="padding:12px 0;border-bottom:1px solid #183250"><b>${esc(j.job_code||"JOB-"+j.id)}</b> · ${esc(j.location||"")} <span style="float:right">${statusBadge(j.status)}</span><br><small class="muted">${esc(j.work_description||"")}</small></div>`).join("")||'<div class="muted">No jobs</div>'}</div></div>`
}

function jobs(){
 const rows=jobFilter();
 return `<div class="sectionHead"><h2>Jobs</h2><div class="actions"><button class="btn" onclick="go('serviceRequests')">Service Requests</button>${isEngineer()||isAdmin()?'<button class="btn primary" onclick="go(\\'newJob\\')">＋ Create Job</button>':''}</div></div>
 <div class="search"><input placeholder="Search job / location / name..." value="${esc(S.search)}" oninput="S.search=this.value;render()"></div>
 <div class="card tableBox"><table class="table"><thead><tr><th>Job</th><th>Location</th><th>Requested By</th><th>Approved Engineer</th><th>Completed By</th><th>Status</th></tr></thead><tbody>
 ${rows.map(j=>`<tr><td><b>${esc(j.job_code||"JOB-"+j.id)}</b><br><small>${esc(j.work_description||"")}</small></td><td>${esc(j.location||"—")}</td><td>${esc(requestedBy(j))}</td><td>${esc(approvedEngineer(j))}</td><td>${esc(completedName(j))}</td><td>${statusBadge(j.status)}</td></tr>`).join("")||'<tr><td colspan="6" class="muted">No jobs found</td></tr>'}</tbody></table></div>`
}

function technicians(){
 const techs=S.profiles.filter(p=>p.role==="worker");
 return `<div class="sectionHead"><h2>Technician Performance</h2><button class="btn" onclick="loadData().then(render)">↻ Refresh</button></div>
 <div class="techGrid">${techs.map(t=>{
  const a=S.assignments.filter(x=>String(x.technician_id)===String(t.id));
  const total=a.length,done=a.filter(x=>x.status==="completed").length,pending=a.filter(x=>["pending","in_progress"].includes(x.status)).length,nc=a.filter(x=>x.status==="not_completed").length;
  const rate=total?Math.round(done/total*100):0;
  return `<div class="card"><h3>${esc(t.full_name)}</h3><div class="grid" style="grid-template-columns:repeat(2,1fr);margin:12px 0"><div><small class="muted">Total</small><b style="display:block;font-size:26px">${total}</b></div><div><small class="muted">Completed</small><b class="green" style="display:block;font-size:26px">${done}</b></div><div><small class="muted">Pending</small><b class="orange" style="display:block;font-size:26px">${pending}</b></div><div><small class="muted">Not Completed</small><b class="red" style="display:block;font-size:26px">${nc}</b></div></div><div class="bar"><i style="width:${rate}%"></i></div><p class="muted">Success Rate <b class="blue">${rate}%</b></p></div>`
 }).join("")||'<div class="card muted">No technicians found</div>'}</div>`
}

function directory(){
 const q=S.search.toLowerCase();const rows=S.directory.filter(x=>`${x.name} ${x.designation} ${x.section} ${x.office_phone} ${x.residence_phone}`.toLowerCase().includes(q));
 return `<div class="sectionHead"><h2>Telephone Directory</h2></div><div class="notice">Directory information only. No job totals are shown here.</div>
 <div class="search"><input placeholder="Search name / designation / section / phone..." value="${esc(S.search)}" oninput="S.search=this.value;render()"></div>
 <div class="card tableBox"><table class="table"><thead><tr><th>Name</th><th>Designation</th><th>Section</th><th>Office</th><th>Residence</th></tr></thead><tbody>
 ${rows.map(x=>`<tr><td><b>${esc(x.name)}</b></td><td>${esc(x.designation||"—")}</td><td>${esc(x.section||"—")}</td><td>${esc(x.office_phone||"—")}</td><td>${esc(x.residence_phone||"—")}</td></tr>`).join("")||'<tr><td colspan="5" class="muted">No directory records</td></tr>'}</tbody></table></div>`
}

function reports(){
 const c=counts();
 return `<div class="sectionHead"><h2>Reports</h2></div><div class="split">
 <div class="card"><h3>Daily Work Report</h3><p class="muted">The report uses the same identity mapping as Jobs.</p>
 <p>Requested By → <b>jobs.created_by</b></p><p>Approved Engineer → <b>jobs.approved_by</b></p><p>Completed By → <b>completed job assignment technician</b></p>
 <button class="btn primary" onclick="printReport()">Print / Save PDF</button></div>
 <div class="card"><h3>Current Summary</h3><p>Total Jobs: <b>${c.total}</b></p><p class="green">Completed: <b>${c.completed}</b></p><p class="orange">Pending: <b>${c.pending}</b></p><p class="red">Not Completed: <b>${c.notCompleted}</b></p></div></div>`
}
function printReport(){
 const rows=uniqueJobs().map(j=>`<tr><td>${esc(j.job_code||j.id)}</td><td>${esc(j.location)}</td><td>${esc(requestedBy(j))}</td><td>${esc(approvedEngineer(j))}</td><td>${esc(completedName(j))}</td><td>${esc(j.status)}</td></tr>`).join("");
 const w=window.open("","_blank");w.document.write(`<html><head><title>Tele Tuty Report</title><style>body{font-family:Arial;padding:25px}table{border-collapse:collapse;width:100%}td,th{border:1px solid #ccc;padding:8px;text-align:left}</style></head><body><h1>Tele Tuty Daily Work Report</h1><table><tr><th>Job</th><th>Location</th><th>Requested By</th><th>Approved Engineer</th><th>Completed By</th><th>Status</th></tr>${rows}</table><script>window.print()<\/script></body></html>`);w.document.close()
}

function maintenance(){
 const box=(title,rows,fields)=>`<div class="card"><h3>${title}</h3><div class="muted">${rows.length} records</div>${rows.slice(0,5).map(r=>`<div style="padding:10px 0;border-bottom:1px solid #183250"><b>${esc(r.area_name||"")}</b><br><small class="muted">${esc(fields(r))}</small></div>`).join("")||'<p class="muted">No records</p>'}</div>`;
 return `<div class="sectionHead"><h2>Maintenance</h2></div><div class="grid" style="grid-template-columns:repeat(3,1fr)">
 ${box("🔋 Battery Maintenance",S.battery,r=>`${r.battery_status||"—"} · ${r.condition||"—"} · Due ${r.next_due_date||"—"}`)}
 ${box("🟣 Earth Pit Maintenance",S.earth,r=>`${r.condition||"—"} · Resistance ${r.resistance||"—"} · Due ${r.next_due_date||"—"}`)}
 ${box("💡 Street Light Survey",S.street,r=>`Total ${r.total_lights??0} · Working ${r.working_lights??0} · Fault ${r.fault_lights??0}`)}
 </div>`
}
function serviceRequests(){
 const rows=S.requests;
 return `<div class="sectionHead"><h2>Service Requests</h2></div><div class="card tableBox"><table class="table"><thead><tr><th>Request</th><th>Created By</th><th>Approved By</th><th>Status</th><th>Converted Job</th></tr></thead><tbody>
 ${rows.map(r=>`<tr><td>#${r.id}<br>${esc(r.work_description||"")}</td><td>${esc(pname(r.created_by))}</td><td>${esc(pname(r.approved_by))}</td><td>${statusBadge(r.status)}</td><td>${esc(r.converted_job_id||"—")}</td></tr>`).join("")||'<tr><td colspan="5" class="muted">No service requests</td></tr>'}</tbody></table></div>`
}
function newJob(){
 const techs=S.profiles.filter(p=>p.role==="worker"),engs=S.profiles.filter(p=>p.role==="engineer");
 return `<div class="sectionHead"><h2>Create Job</h2></div><form class="card formGrid" onsubmit="event.preventDefault();createJob()">
 <div><label>Work Description</label><textarea id="work"></textarea></div><div><label>Location</label><input id="location" required></div>
 <div><label>Engineer</label><select id="eng">${engs.map(e=>`<option value="${e.id}">${esc(e.full_name)}</option>`).join("")}</select></div>
 <div><label>Technician</label><select id="tech">${techs.map(t=>`<option value="${t.id}">${esc(t.full_name)}</option>`).join("")}</select></div>
 <div><label>Scheduled Date</label><input id="date" type="date"></div><div><label>Urgent</label><select id="urgent"><option value="false">No</option><option value="true">Yes</option></select></div>
 <div class="full"><button class="btn primary">Create & Assign</button></div></form>`
}
async function createJob(){
 const {data:{user}}=await db.auth.getUser();const jobCode="JOB-"+Date.now();
 const payload={job_code:jobCode,work_description:document.querySelector("#work").value,location:document.querySelector("#location").value,assigned_engineer:document.querySelector("#eng").value,assigned_worker:document.querySelector("#tech").value,status:"pending",scheduled_date:document.querySelector("#date").value||null,urgent:document.querySelector("#urgent").value==="true",created_by:user.id};
 const r=await db.from("jobs").insert(payload).select().single();if(r.error)return alert(r.error.message);
 const a=await db.from("job_assignments").insert({job_id:r.data.id,technician_id:payload.assigned_worker,status:"pending"});if(a.error)alert(a.error.message);
 await loadData();go("jobs")
}
function notifications(){
 const rows=S.notif.slice(0,30);return `<div class="sectionHead"><h2>Notifications</h2></div><div class="card">${rows.map(n=>`<div style="padding:12px 0;border-bottom:1px solid #183250"><b>${esc(n.title||"Notification")}</b><p class="muted">${esc(n.message||"")}</p></div>`).join("")||'<p class="muted">No notifications</p>'}</div>`
}
function render(){
 if(!S.session){document.querySelector("#app").innerHTML=loginView();return}
 let content=statePage();
 document.querySelector("#app").innerHTML=shell(content)
}
function statePage(){
 switch(S.page){case"jobs":return jobs();case"technicians":return technicians();case"directory":return directory();case"reports":return reports();case"maintenance":return maintenance();case"serviceRequests":return serviceRequests();case"newJob":return newJob();case"notifications":return notifications();default:return home()}
}
db.auth.onAuthStateChange((event)=>{if(event==="SIGNED_OUT"){S.session=null;S.profile=null;render()}});
boot();
