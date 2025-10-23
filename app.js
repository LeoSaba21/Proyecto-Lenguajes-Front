// Datos y persistencia
const STORAGE_KEY = 'hrm_employees_v1'

const defaultData = {
  employees: [],
  roles: ['Manager','Sales','Developer','Support'],
  positions: ['Manager','Sales Associate','Software Engineer','Support Specialist'],
}

function loadData(){
  const raw = localStorage.getItem(STORAGE_KEY)
  if(!raw){
    // Indica que no hay datos en localStorage; el init intentará cargar data/employees.json
    return null
  }
  return JSON.parse(raw)
}

function saveData(data){
  localStorage.setItem(STORAGE_KEY,JSON.stringify(data))
}

// Render
let state = loadData()

// Inicialización: si no hay datos en localStorage, intentamos cargar data/employees.json
function initAfterData(){
  populateFilterOptions && populateFilterOptions()
  bindControls && bindControls()
  renderAll && renderAll()
}

// Estado para paginación y orden
let sortBy = 'name'
let sortDir = 'asc' // 'asc'|'desc'
let currentPage = 1
let pageSize = 10

function showFieldError(field,msg){
  const el = document.querySelector(`.field-error[data-for="${field}"]`)
  if(el){ el.textContent = msg; el.style.display = 'block' }
}

function clearFieldErrors(){
  document.querySelectorAll('.field-error').forEach(el=>{el.textContent=''; el.style.display='none'})
}

if(!state){
  fetch('data/employees.json').then(r=>r.json()).then(d=>{
    state = d
    saveData(state)
    initAfterData()
  }).catch(err=>{
    // fallback mínimo
    state = { employees: [], roles: ['Manager','Sales','Developer','Support'], positions: ['Manager'], branches:['SUCURSAL A','SUCURSAL B','SUCURSAL C','SUCURSAL D'] }
    saveData(state)
    initAfterData()
  })
} else {
  initAfterData()
}

function updateSummary(){
  document.getElementById('totalEmployees').textContent = state.employees.length
  document.getElementById('totalRoles').textContent = state.roles.length
  document.getElementById('totalBranches').textContent = state.branches? state.branches.length : 0
  document.getElementById('presentCount').textContent = state.employees.filter(e=>e.present).length
}

function renderBranches(){
  const el = document.getElementById('branchesList'); if(!el) return; el.innerHTML = ''
  (state.branches||[]).forEach(b=>{const li=document.createElement('li'); li.textContent = b; el.appendChild(li)})
}

function renderRoles(){
  const el = document.getElementById('rolesList'); el.innerHTML = ''
  state.roles.forEach(r=>{const li=document.createElement('li');li.textContent=r;el.appendChild(li)})
}

function renderPositions(){
  const el = document.getElementById('positionsList'); el.innerHTML = ''
  state.positions.forEach(p=>{const li=document.createElement('li');li.textContent=p;el.appendChild(li)})
}

function renderQuickEmployees(){
  const el = document.getElementById('quickEmployees'); if(!el) return
  el.innerHTML = ''
  state.employees.slice(0,6).forEach(e=>{const li=document.createElement('li'); li.textContent = e.name + ' — ' + (e.position||e.role); el.appendChild(li)})
}

function populateFilterOptions(){
  const fr = document.getElementById('filterRole')
  if(!fr) return
  const current = fr.value
  fr.innerHTML = '<option value="">Todos los roles</option>' + state.roles.map(r=>`<option value="${r}">${r}</option>`).join('')
  fr.value = current
}

function bindControls(){
  const addBtn = document.getElementById('addEmployeeBtn')
  if(addBtn) addBtn.addEventListener('click',()=>openModal())
  const cancelBtn = document.getElementById('cancelBtn')
  if(cancelBtn) cancelBtn.addEventListener('click',()=>closeModal())
  const fr = document.getElementById('filterRole')
  if(fr) fr.addEventListener('change',()=>renderEmployees(document.getElementById('search').value))
  const fs = document.getElementById('filterStatus')
  if(fs) fs.addEventListener('change',()=>renderEmployees(document.getElementById('search').value))
  const search = document.getElementById('search')
  if(search) search.addEventListener('input',e=>renderEmployees(e.target.value))
  // sorting headers
  document.querySelectorAll('#employeesTable thead th[data-sort]').forEach(th=>{
    th.style.cursor = 'pointer'
    th.addEventListener('click',()=>{
      const key = th.dataset.sort
      if(sortBy===key) sortDir = sortDir==='asc' ? 'desc' : 'asc'
      else { sortBy = key; sortDir = 'asc' }
      // update arrow markers
      document.querySelectorAll('#employeesTable thead th[data-sort]').forEach(x=>{ x.textContent = x.dataset.sort === sortBy ? `${x.textContent.split(' ')[0]} ${sortDir==='asc'? '▴':'▾'}` : x.textContent.split(' ')[0] })
      renderEmployees(document.getElementById('search').value)
    })
  })
  // pagination
  const prev = document.getElementById('prevPage')
  const next = document.getElementById('nextPage')
  const pageSizeEl = document.getElementById('pageSize')
  if(prev) prev.addEventListener('click',()=>{ if(currentPage>1) { currentPage--; renderEmployees(document.getElementById('search').value) } })
  if(next) next.addEventListener('click',()=>{ currentPage++; renderEmployees(document.getElementById('search').value) })
  if(pageSizeEl) pageSizeEl.addEventListener('change',e=>{ pageSize = Number(e.target.value); currentPage = 1; renderEmployees(document.getElementById('search').value) })
}

function renderEmployees(filter=''){
  const tbody = document.querySelector('#employeesTable tbody'); if(!tbody) return; tbody.innerHTML=''
  const roleFilter = document.getElementById('filterRole')?document.getElementById('filterRole').value:''
  const statusFilter = document.getElementById('filterStatus')?document.getElementById('filterStatus').value:''
  let items = state.employees.filter(e=>{
    if(roleFilter && e.role !== roleFilter) return false
    if(statusFilter && e.status !== statusFilter) return false
    return e.name.toLowerCase().includes(filter.toLowerCase())
  })
  // ordenar
  items.sort((a,b)=>{
    const A = (a[sortBy]||'').toString().toLowerCase()
    const B = (b[sortBy]||'').toString().toLowerCase()
    if(A<B) return sortDir==='asc'? -1:1
    if(A>B) return sortDir==='asc'? 1:-1
    return 0
  })
  // paginar
  const total = items.length
  const totalPages = Math.max(1, Math.ceil(total/pageSize))
  if(currentPage>totalPages) currentPage = totalPages
  const start = (currentPage-1)*pageSize
  const pageItems = items.slice(start,start+pageSize)
  pageItems.forEach(e=>{
    const tr = document.createElement('tr')
    tr.innerHTML = `<td>${e.name}</td><td>${e.role}</td><td>${e.position}</td><td>${e.branch||''}</td><td>${e.status}</td><td><button data-id="${e.id}" class="edit">Editar</button> <button data-id="${e.id}" class="del">Eliminar</button></td>`
    tbody.appendChild(tr)
  })
  // actualizar info de paginación
  const pageInfo = document.getElementById('pageInfo')
  if(pageInfo) pageInfo.textContent = `Página ${currentPage} de ${totalPages}`
}

function openModal(editId){
  const modal = document.getElementById('modal'); modal.classList.remove('hidden')
  const form = document.getElementById('employeeForm'); form.dataset.edit = editId||''
  document.getElementById('modalTitle').textContent = editId? 'Editar Empleado' : 'Nuevo Empleado'
  // fill selects
  const roleSelect = document.getElementById('roleSelect')
  const positionSelect = document.getElementById('positionSelect')
  roleSelect.innerHTML = state.roles.map(r=>`<option value="${r}">${r}</option>`).join('')
  positionSelect.innerHTML = state.positions.map(p=>`<option value="${p}">${p}</option>`).join('')
  const branchSelect = document.getElementById('branchSelect')
  // El select de sucursal ya tiene las opciones predefinidas en el HTML

  if(editId){
    const e = state.employees.find(x=>x.id==editId)
    form.name.value = e.name
    form.email.value = e.email||''
    form.phone.value = e.phone||''
    form.role.value = e.role
    form.position.value = e.position
    form.status.value = e.status
    if(form.branch) form.branch.value = e.branch || ''
  } else {
    form.reset()
  }
  clearFormError()
  setTimeout(()=>{ form.name.focus && form.name.focus() },50)
}

function closeModal(){document.getElementById('modal').classList.add('hidden')}

function showFormError(msg){
  const el = document.getElementById('formError'); if(!el) { alert(msg); return }
  el.textContent = msg; el.style.display = 'block'
}

function clearFormError(){
  const el = document.getElementById('formError'); if(!el) return; el.textContent=''; el.style.display='none'
}

function showToast(message, type = 'success'){
  // Remover toast anterior si existe
  const existing = document.querySelector('.toast')
  if(existing) existing.remove()
  
  const toast = document.createElement('div')
  toast.className = `toast ${type}`
  toast.textContent = message
  document.body.appendChild(toast)
  
  // Auto-remover después de 3 segundos
  setTimeout(() => {
    toast.style.animation = 'slideIn .3s ease-out reverse'
    setTimeout(() => toast.remove(), 300)
  }, 3000)
}

// Events
document.getElementById('addEmployeeBtn').addEventListener('click',()=>openModal())
document.getElementById('cancelBtn').addEventListener('click',()=>closeModal())

document.getElementById('employeeForm').addEventListener('submit',(ev)=>{
  ev.preventDefault();
  const form = ev.target
  clearFormError(); clearFieldErrors()
  // validaciones por campo
  let hasError = false
  if(!form.name.value.trim()){ showFieldError('name','El nombre es obligatorio'); hasError = true }
  if(form.email.value && !/^\S+@\S+\.\S+$/.test(form.email.value)){ showFieldError('email','Email inválido'); hasError = true }
  if(!form.branch.value){ showFieldError('branch','La sucursal es obligatoria'); hasError = true }
  // teléfono: al menos 7 dígitos (sin contar espacios/caracteres)
  if(form.phone.value){
    const digits = form.phone.value.replace(/\D/g,'')
    if(digits.length < 7){ showFieldError('phone','Teléfono inválido (mínimo 7 dígitos)'); hasError = true }
  }
  if(hasError) return
  const editId = form.dataset.edit
  const payload = {
    id: editId ? Number(editId) : (state.employees.reduce((m,e)=>Math.max(m,e.id),0)||0)+1,
    name: form.name.value.trim(),
    email: form.email.value.trim(),
    phone: form.phone.value.trim(),
    role: form.role.value,
    position: form.position.value,
    status: form.status.value,
    branch: form.branch ? form.branch.value : undefined,
    present: true
  }
  if(editId){
    const idx = state.employees.findIndex(e=>e.id==editId)
    state.employees[idx] = payload
  } else {
    state.employees.push(payload)
  }
  saveData(state)
  renderAll()
  closeModal()
  showToast(editId ? 'Empleado actualizado con éxito' : 'Empleado agregado con éxito')
})

document.querySelector('#employeesTable tbody').addEventListener('click',(ev)=>{
  const id = ev.target.dataset.id
  if(ev.target.classList.contains('edit')){openModal(id)}
  if(ev.target.classList.contains('del')){
    openConfirm('Eliminar empleado', '¿Desea eliminar este empleado?', ()=>{
      state.employees = state.employees.filter(e=>e.id!=id)
      saveData(state)
      renderAll()
      showToast('Empleado eliminado correctamente')
    })
  }
})

function openConfirm(title,message,onOk){
  const m = document.getElementById('confirmModal')
  const t = document.getElementById('confirmTitle')
  const msg = document.getElementById('confirmMessage')
  const ok = document.getElementById('confirmOk')
  const cancel = document.getElementById('confirmCancel')
  t.textContent = title; msg.textContent = message
  m.classList.remove('hidden')
  function cleanup(){ ok.removeEventListener('click',okHandler); cancel.removeEventListener('click',cancelHandler); m.classList.add('hidden') }
  function okHandler(){ cleanup(); onOk && onOk() }
  function cancelHandler(){ cleanup() }
  ok.addEventListener('click',okHandler)
  cancel.addEventListener('click',cancelHandler)
}

document.getElementById('search').addEventListener('input',e=>renderEmployees(e.target.value))

function renderChart(){
  const canvas = document.getElementById('attendanceChart')
  const ctx = canvas.getContext('2d')
  const present = state.employees.filter(e=>e.present).length
  const absent = state.employees.length - present
  // Draw a simple pie
  const total = Math.max(1,present+absent)
  let start=0
  ctx.clearRect(0,0,canvas.width,canvas.height)
  // present
  ctx.fillStyle = '#3b82f6'
  ctx.beginPath(); ctx.moveTo(150,75); ctx.arc(150,75,60,start,(present/total)*Math.PI*2); ctx.closePath(); ctx.fill()
  // absent
  start += (present/total)*Math.PI*2
  ctx.fillStyle = '#cbd5e1'
  ctx.beginPath(); ctx.moveTo(150,75); ctx.arc(150,75,60,start,Math.PI*2); ctx.closePath(); ctx.fill()
}

function renderAll(){ updateSummary(); renderRoles(); renderPositions(); renderBranches(); renderQuickEmployees(); renderEmployees(); renderChart(); renderReports(); populateFilterOptions() }

function renderReports(){
  const tbody = document.querySelector('#reportsTable tbody'); if(!tbody) return
  const reports = [
    {date:'2024-04-05', name:'Resumen de Asistencia', type:'Asistencia', status:'Completado'},
    {date:'2024-04-04', name:'Listado de Empleados', type:'Empleados', status:'Completado'},
    {date:'2024-04-02', name:'Reporte de Nómina', type:'Nómina', status:'Completado'}
  ]
  tbody.innerHTML = ''
  reports.forEach(r=>{const tr=document.createElement('tr'); tr.innerHTML = `<td>${r.date}</td><td>${r.name}</td><td>${r.type}</td><td>${r.status}</td>`; tbody.appendChild(tr)})
}

// Export/Import helpers
function exportJSON(){
  const blob = new Blob([JSON.stringify(state,null,2)],{type:'application/json'})
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a'); a.href = url; a.download = 'employees.json'; a.click(); URL.revokeObjectURL(url)
}

function exportCSV(){
  const rows = [['id','name','email','phone','role','position','branch','status','present']]
  state.employees.forEach(e=>rows.push([e.id,e.name,e.email,e.phone,e.role,e.position,e.branch||'',e.status,e.present]))
  const csv = rows.map(r=>r.map(c=>`"${String(c).replace(/"/g,'""')}"`).join(',')).join('\n')
  const blob = new Blob([csv],{type:'text/csv'})
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a'); a.href = url; a.download = 'employees.csv'; a.click(); URL.revokeObjectURL(url)
}

function handleImportFile(ev){
  const f = ev.target.files && ev.target.files[0]
  if(!f) return
  const reader = new FileReader()
  reader.onload = function(){
    try{
      const parsed = JSON.parse(reader.result)
      if(parsed.employees && Array.isArray(parsed.employees)){
        state = parsed
        saveData(state)
        renderAll()
        showToast('Datos importados correctamente')
      } else showToast('JSON no contiene la estructura esperada', 'error')
    }catch(e){showToast('Error al leer el archivo JSON', 'error')}
  }
  reader.readAsText(f)
}

// init is handled in initAfterData() when data is loaded
